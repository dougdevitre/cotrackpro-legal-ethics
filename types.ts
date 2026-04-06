export type SeverityLevel = 'Low' | 'Medium' | 'High';

export interface ViolationItem {
  id: string;
  text: string;
}

export interface Category {
  id: string;
  title: string;
  range: string;
  items: ViolationItem[];
}

export interface Witness {
  id: string;
  name: string;
  role: string; // e.g., "Nanny", "Grandmother", "Opposing Counsel"
  contactInfo?: string;
  credibilityNotes?: string;
}

export interface AssessmentEntry {
  isObserved: boolean;
  notes: string;
  date: string;
  time: string;
  lastModified?: number;
  evidenceTypes?: string[];
  severity?: SeverityLevel;
  externalLinks?: string[];
  witnessIds?: string[];
}

export interface AssessmentState {
  [violationId: string]: AssessmentEntry;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  ASSESSMENT = 'ASSESSMENT',
  REPORT = 'REPORT',
  SEARCH = 'SEARCH',
  TIMELINE = 'TIMELINE',
  CHAT = 'CHAT',
  GLOSSARY = 'GLOSSARY',
  WITNESSES = 'WITNESSES',
  CRITICAL = 'CRITICAL'
}
