import { GoogleGenAI } from "@google/genai";
import { AssessmentState, Category, ViolationItem, Witness } from "../types";
import { CATEGORIES } from "../constants";

export const generateEthicsReport = async (state: AssessmentState, witnesses: Witness[] = []): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  // 1. Pre-process data & Calculate Metrics
  let allObservations: any[] = [];
  let highSeverityCount = 0;
  let substantiatedCount = 0;
  let unsubstantiatedCount = 0;
  
  // Scoring Variables
  let totalSeverityPoints = 0; // Max possible score based on allegations
  let actualEvidencePoints = 0; // Actual score based on evidence quality

  // Heuristic Counters
  const categoryCounts: Record<string, number> = {};
  const evidenceInventory: Set<string> = new Set();

  CATEGORIES.forEach(category => {
    const observed = category.items.filter(item => state[item.id]?.isObserved);
    
    if (observed.length > 0) {
      categoryCounts[category.title] = observed.length;
    }

    observed.forEach(item => {
      const entry = state[item.id];
      
      // Evidence Inventory
      entry.evidenceTypes?.forEach(e => evidenceInventory.add(e));

      const hasDocEvidence = entry.evidenceTypes && entry.evidenceTypes.length > 0;
      const hasWitness = entry.witnessIds && entry.witnessIds.length > 0;
      const hasEvidence = hasDocEvidence || hasWitness;
      
      // Basic Counts
      if (entry.severity === 'High') highSeverityCount++;
      if (hasEvidence) substantiatedCount++; else unsubstantiatedCount++;

      // Scoring Logic
      // High=3, Medium=2, Low=1
      const severityWeight = entry.severity === 'High' ? 3 : entry.severity === 'Medium' ? 2 : 1;
      totalSeverityPoints += severityWeight;

      // Multipliers: Docs=1.0, Witness=0.6, None=0.1
      let qualityMultiplier = 0.1;
      if (hasDocEvidence) qualityMultiplier = 1.0;
      else if (hasWitness) qualityMultiplier = 0.6;

      actualEvidencePoints += (severityWeight * qualityMultiplier);

      allObservations.push({
        ...item,
        category: category.title,
        categoryId: category.id,
        entry,
        hasEvidence
      });
    });
  });

  if (allObservations.length === 0) {
    return "No violations have been recorded yet. Please select at least one violation to generate a report.";
  }

  // Calculate Final 0-100 Score
  const caseStrengthScore = totalSeverityPoints > 0 
    ? Math.round((actualEvidencePoints / totalSeverityPoints) * 100) 
    : 0;

  // 2. Perform Heuristic Gap Analysis
  const strategicGaps: string[] = [];

  // Check Billing Mismatch
  if (categoryCounts['Billing Abuse & Financial Misconduct'] > 0) {
    if (!evidenceInventory.has('Billing Record') && !evidenceInventory.has('Financial Document')) {
      strategicGaps.push("ALERT: Allegations of Billing Abuse present, but no 'Billing Record' or 'Financial Document' logged as evidence.");
    }
  }
  // Check Communication Mismatch
  if (categoryCounts['Communication Violations'] > 0) {
    if (!evidenceInventory.has('Email') && !evidenceInventory.has('Text Message')) {
      strategicGaps.push("ALERT: Communication violations marked, but no 'Email' or 'Text Message' evidence found.");
    }
  }
  // Check Courtroom Mismatch
  if (categoryCounts['Courtroom Misconduct'] > 0) {
    if (!evidenceInventory.has('Transcript') && !evidenceInventory.has('Court Order')) {
      strategicGaps.push("ALERT: Courtroom misconduct alleged, but no 'Transcript' logged. This is often required for proof.");
    }
  }

  // Sort chronologically
  allObservations.sort((a, b) => {
    if (!a.entry.date) return 1;
    if (!b.entry.date) return -1;
    return new Date(a.entry.date).getTime() - new Date(b.entry.date).getTime();
  });

  // 3. Build Prompt
  let promptData = `ACT AS: A Senior Legal Ethics Analyst.\n\n`;
  
  promptData += `## CASE METRICS\n`;
  promptData += `- Case Strength Score: ${caseStrengthScore}/100 (Based on evidence quality vs allegation severity)\n`;
  promptData += `- Total Violations: ${allObservations.length}\n`;
  promptData += `- High Severity: ${highSeverityCount}\n`;
  promptData += `- Documented/Corroborated: ${substantiatedCount}\n`;
  promptData += `- Client Word Only: ${unsubstantiatedCount}\n\n`;

  if (strategicGaps.length > 0) {
    promptData += `## CRITICAL EVIDENTIARY GAPS (SYSTEM FLAGGED)\n`;
    strategicGaps.forEach(gap => promptData += `- ${gap}\n`);
    promptData += `\n`;
  }

  promptData += `## VIOLATION LOG (Chronological)\n`;
  allObservations.forEach(obs => {
    const evidenceStr = obs.entry.evidenceTypes?.join(', ') || "None";
    const witnessStr = obs.entry.witnessIds?.map((id: string) => witnesses.find(w => w.id === id)?.name).join(', ') || "None";
    const severityLabel = obs.entry.severity ? `[SEVERITY: ${obs.entry.severity.toUpperCase()}]` : "";
    const evidenceLabel = obs.hasEvidence ? "" : "[NO EVIDENCE]";

    promptData += `DATE: ${obs.entry.date || 'Unknown'} | CAT: ${obs.categoryId}\n`;
    promptData += `CLAIM: ${obs.text} ${severityLabel} ${evidenceLabel}\n`;
    promptData += `PROOF: ${evidenceStr} | WITNESS: ${witnessStr}\n`;
    if (obs.entry.notes) promptData += `NOTE: ${obs.entry.notes}\n`;
    promptData += `---\n`;
  });

  promptData += `\nTASK: Generate a strategic Legal Ethics Assessment Report.\n\n`;
  
  promptData += `REQUIRED SECTIONS:\n`;
  promptData += `1. **Executive Assessment**: Summarize the case. Explicitly reference the 'Case Strength Score' - is this a strong case backed by docs, or a weak case based on hearsay? Be blunt but professional.\n`;
  promptData += `2. **Strategic Gap Analysis**: Based on the "System Flagged" gaps above (if any) and your own analysis, list the top 3 documents the user MUST find immediately to save their case.\n`;
  promptData += `3. **Pattern of Conduct**: Identify the primary mode of misconduct (e.g. "Financial Predation", "Procedural Negligence", "Aggressive Litigation").\n`;
  promptData += `4. **Key Incident Timeline**: List the 3-5 most legally significant events.\n`;
  
  promptData += `TONE: Analytical, strategic, objective. Focus on *evidence* quality.`;

  let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    const key = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
}
  
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptData,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "Unable to generate report at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate report using Gemini.");
  }
};

export const generateCategoryAnalysis = async (category: Category, state: AssessmentState): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const observedItems = category.items.filter(item => state[item.id]?.isObserved);
  
  if (observedItems.length === 0) {
    return "No violations recorded in this category yet.";
  }

  let promptData = `Category: ${category.title}\n\nObserved Violations:\n`;
  observedItems.forEach(item => {
    const entry = state[item.id];
    const severity = entry.severity ? `(${entry.severity} Severity)` : '';
    promptData += `- ${item.text} ${severity}\n`;
    if (entry.evidenceTypes?.length) {
        promptData += `  Evidence: ${entry.evidenceTypes.join(', ')}\n`;
    }
    if (entry.notes) promptData += `  Note: ${entry.notes}\n`;
  });

  promptData += "\nTASK: Briefly analyze these specific findings (max 200 words). Explain why these specific actions are ethically problematic in a family law context. If any are marked High Severity, emphasize why they are critical. Do not provide legal advice.";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptData,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "Unable to analyze category.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze category.");
  }
};

export const generateCriticalActionPlan = async (items: {text: string, missingEvidence: boolean, missingDate: boolean}[]) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  let promptData = "I need a strategic action plan to secure evidence for the following CRITICAL (High Severity) ethical violations by a family law attorney:\n\n";
  
  items.forEach((item, idx) => {
    promptData += `${idx + 1}. "${item.text}"\n`;
    if (item.missingEvidence) promptData += "   - STATUS: Missing Evidence (Critical Gap)\n";
    if (item.missingDate) promptData += "   - STATUS: Date Unknown (Needs Timeline)\n";
  });

  promptData += "\nTASK: Provide a concise, bulleted checklist of immediate actions the client should take to 'fix' these evidentiary gaps. Focus on what specific documents to request, who to subpoena, or what logs to check. Be practical and strategic. Do not provide legal advice.";

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptData,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to generate action plan.");
  }
}
