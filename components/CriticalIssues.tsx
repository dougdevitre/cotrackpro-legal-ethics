import React, { useState } from 'react';
import { AssessmentState, AssessmentEntry, Witness } from '../types';
import { CATEGORIES } from '../constants';
import { ViolationCard } from './ViolationCard';
import { ShieldAlert, CheckCircle, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { generateCriticalActionPlan } from '../services/geminiService';

interface CriticalIssuesProps {
  state: AssessmentState;
  witnesses: Witness[];
  onUpdate: (id: string, updates: Partial<AssessmentEntry>) => void;
}

export const CriticalIssues: React.FC<CriticalIssuesProps> = ({ state, witnesses, onUpdate }) => {
  const [strategy, setStrategy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Find all High Severity items
  const highSeverityItems = CATEGORIES.flatMap(cat => 
    cat.items
      .filter(item => state[item.id]?.isObserved && state[item.id]?.severity === 'High')
      .map(item => ({ 
        ...item, 
        categoryTitle: cat.title,
        categoryId: cat.id
      }))
  );

  // 2. Sort them: Items missing evidence/date come first (Needs Action), then completed ones
  const sortedItems = highSeverityItems.sort((a, b) => {
    const entryA = state[a.id];
    const entryB = state[b.id];

    const needsActionA = (!entryA.evidenceTypes || entryA.evidenceTypes.length === 0) || !entryA.date;
    const needsActionB = (!entryB.evidenceTypes || entryB.evidenceTypes.length === 0) || !entryB.date;

    if (needsActionA && !needsActionB) return -1;
    if (!needsActionA && needsActionB) return 1;
    return 0;
  });

  const incompleteCount = sortedItems.filter(item => {
    const entry = state[item.id];
    return (!entry.evidenceTypes || entry.evidenceTypes.length === 0) || !entry.date;
  }).length;

  const handleGenerateStrategy = async () => {
    setLoading(true);
    try {
        const itemsForAi = sortedItems.map(item => {
            const entry = state[item.id];
            return {
                text: item.text,
                missingEvidence: !entry.evidenceTypes || entry.evidenceTypes.length === 0,
                missingDate: !entry.date
            }
        });
        const plan = await generateCriticalActionPlan(itemsForAi);
        setStrategy(plan || "Unable to generate plan.");
    } catch (e) {
        setStrategy("Error generating strategy. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="bg-red-50 p-6 rounded-lg shadow-sm border-b-2 border-red-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-red-900 flex items-center">
              <ShieldAlert className="w-8 h-8 mr-3 text-red-600" />
              Critical Issues Manager
            </h2>
            <p className="text-red-700 mt-1">
              Prioritized list of all <strong>High Severity</strong> violations.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
                onClick={handleGenerateStrategy}
                disabled={loading || sortedItems.length === 0}
                className="flex items-center space-x-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors disabled:opacity-50"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? "Planning..." : "Get AI Recovery Plan"}</span>
            </button>
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-red-100 text-center min-w-[100px]">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">Pending Fixes</span>
                <span className="text-xl font-bold text-red-600">{incompleteCount}</span>
            </div>
          </div>
        </div>
      </div>

      {strategy && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 relative animate-slideDown">
            <h3 className="font-bold text-indigo-900 mb-2 flex items-center">
                <Sparkles className="w-4 h-4 mr-2" />
                Strategic Action Plan
            </h3>
            <div className="prose prose-sm max-w-none text-indigo-900 whitespace-pre-wrap">
                {strategy}
            </div>
            <button 
                onClick={() => setStrategy(null)} 
                className="absolute top-2 right-2 text-indigo-400 hover:text-indigo-600"
            >
                ✕
            </button>
        </div>
      )}

      {sortedItems.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm text-center border border-dashed border-gray-300">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Critical Issues Identified</h3>
            <p className="text-gray-500 mt-1">Mark violations as "High" severity in the assessment to track them here.</p>
        </div>
      ) : (
        <div className="grid gap-6">
            {incompleteCount > 0 && (
                <div className="flex items-center space-x-2 text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Focus on the top items: they are missing dates or evidence.</span>
                </div>
            )}
            
            {sortedItems.map((item) => {
            const entry = state[item.id];
            const isMissingEvidence = !entry.evidenceTypes || entry.evidenceTypes.length === 0;
            const isMissingDate = !entry.date;
            const needsAction = isMissingEvidence || isMissingDate;

            return (
                <div key={item.id} className={`relative ${needsAction ? 'ring-2 ring-offset-2 ring-red-400 rounded-lg' : ''}`}>
                    {needsAction && (
                        <div className="absolute -top-3 left-4 z-10 bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full flex items-center shadow-sm">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {isMissingEvidence && isMissingDate ? 'Missing Evidence & Date' : isMissingEvidence ? 'Missing Evidence' : 'Missing Date'}
                        </div>
                    )}
                    <ViolationCard 
                        item={item}
                        entry={entry}
                        witnesses={witnesses}
                        categoryContext={`${item.categoryId}: ${item.categoryTitle}`}
                        onUpdate={onUpdate}
                    />
                </div>
            );
            })}
        </div>
      )}
    </div>
  );
};
