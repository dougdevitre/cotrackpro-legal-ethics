import React, { useState } from 'react';
import { ViolationItem, AssessmentEntry, SeverityLevel, Witness } from '../types';
import { EVIDENCE_TYPES } from '../constants';
import { Calendar, Clock, AlertCircle, Paperclip, BarChart3, Link as LinkIcon, Plus, X, ExternalLink, Users, AlertTriangle } from 'lucide-react';

interface ViolationCardProps {
  item: ViolationItem;
  entry: AssessmentEntry;
  witnesses?: Witness[]; // New prop
  categoryContext?: string;
  onUpdate: (id: string, updates: Partial<AssessmentEntry>) => void;
  highlightTerm?: string;
}

export const ViolationCard: React.FC<ViolationCardProps> = ({ item, entry, witnesses = [], categoryContext, onUpdate, highlightTerm }) => {
  const [newLink, setNewLink] = useState('');
  const [linkError, setLinkError] = useState('');

  const renderText = (text: string) => {
    if (!highlightTerm || !highlightTerm.trim()) return text;
    
    // Escape special regex characters in the search term
    const escapedTerm = highlightTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedTerm})`, 'gi'));
    
    return parts.map((part, i) => 
      part.toLowerCase() === highlightTerm.toLowerCase() 
        ? <span key={i} className="bg-yellow-200 text-gray-900 font-semibold px-0.5 rounded-sm">{part}</span> 
        : part
    );
  };

  const toggleEvidenceType = (type: string) => {
    const currentTypes = entry.evidenceTypes || [];
    let newTypes;
    if (currentTypes.includes(type)) {
      newTypes = currentTypes.filter(t => t !== type);
    } else {
      newTypes = [...currentTypes, type];
    }
    onUpdate(item.id, { evidenceTypes: newTypes });
  };

  const toggleWitness = (witnessId: string) => {
    const currentIds = entry.witnessIds || [];
    let newIds;
    if (currentIds.includes(witnessId)) {
        newIds = currentIds.filter(id => id !== witnessId);
    } else {
        newIds = [...currentIds, witnessId];
    }
    onUpdate(item.id, { witnessIds: newIds });
  };

  const setSeverity = (level: SeverityLevel) => {
    onUpdate(item.id, { severity: level });
  };

  const addLink = () => {
    if (!newLink.trim()) return;
    try {
        new URL(newLink); // Validate URL
        const currentLinks = entry.externalLinks || [];
        onUpdate(item.id, { externalLinks: [...currentLinks, newLink.trim()] });
        setNewLink('');
        setLinkError('');
    } catch (e) {
        setLinkError('Invalid URL (must start with http:// or https://)');
    }
  };

  const removeLink = (index: number) => {
    const currentLinks = entry.externalLinks || [];
    const newLinks = currentLinks.filter((_, i) => i !== index);
    onUpdate(item.id, { externalLinks: newLinks });
  };

  const isHighSeverityMissingEvidence = entry.severity === 'High' && (!entry.evidenceTypes || entry.evidenceTypes.length === 0);

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border transition-all duration-200 ${
        entry.isObserved ? 'border-red-400 ring-1 ring-red-100' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="pt-1">
            <input
              type="checkbox"
              id={`check-${item.id}`}
              checked={entry.isObserved}
              onChange={(e) => onUpdate(item.id, { isObserved: e.target.checked })}
              className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-gray-300 cursor-pointer"
            />
          </div>
          <label htmlFor={`check-${item.id}`} className="flex-1 cursor-pointer">
            <div className="flex flex-col">
                {categoryContext && (
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                        {categoryContext}
                    </span>
                )}
                <div className="flex justify-between items-start">
                    <span className={`text-base font-medium ${entry.isObserved ? 'text-gray-900' : 'text-gray-700'}`}>
                        {renderText(item.text)}
                    </span>
                    {entry.isObserved && entry.severity && (
                        <span className={`ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full flex-shrink-0 ${
                            entry.severity === 'High' ? 'bg-red-100 text-red-700' :
                            entry.severity === 'Medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                        }`}>
                            {entry.severity} Impact
                        </span>
                    )}
                </div>
                {/* Inline Validation Warning */}
                {entry.isObserved && isHighSeverityMissingEvidence && (
                    <div className="flex items-center mt-2 text-red-600 text-xs font-bold animate-pulse">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Critical Issue: Evidence required for high severity allegations.
                    </div>
                )}
            </div>
          </label>
        </div>

        {entry.isObserved && (
          <div className="mt-4 pl-8 space-y-4 animate-slideDown">
             {/* Severity Selection */}
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center">
                    <BarChart3 className="w-3 h-3 mr-1" /> Estimated Impact / Severity
                </label>
                <div className="flex space-x-2">
                    {['Low', 'Medium', 'High'].map((level) => (
                        <button
                            key={level}
                            onClick={() => setSeverity(level as SeverityLevel)}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold uppercase tracking-wide border transition-all ${
                                entry.severity === level 
                                    ? level === 'High' ? 'bg-red-500 text-white border-red-600 shadow-sm' :
                                      level === 'Medium' ? 'bg-amber-400 text-white border-amber-500 shadow-sm' :
                                      'bg-green-500 text-white border-green-600 shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" /> Date of Occurrence
                </label>
                <input
                  type="date"
                  value={entry.date}
                  onChange={(e) => onUpdate(item.id, { date: e.target.value })}
                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> Time (Optional)
                </label>
                <input
                  type="time"
                  value={entry.time}
                  onChange={(e) => onUpdate(item.id, { time: e.target.value })}
                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            {/* Witnesses */}
            <div>
                 <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center">
                    <Users className="w-3 h-3 mr-1" /> Witnesses Present (Corroboration)
                </label>
                {witnesses.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No witnesses in directory. Add them in the "Witnesses" tab.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                         {witnesses.map(w => {
                             const isSelected = (entry.witnessIds || []).includes(w.id);
                             return (
                                <button
                                    key={w.id}
                                    onClick={() => toggleWitness(w.id)}
                                    className={`px-2 py-1 text-xs rounded-md border flex items-center transition-colors ${
                                        isSelected 
                                            ? 'bg-blue-100 text-blue-700 border-blue-200 font-medium' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-50"></span>
                                    {w.name}
                                </button>
                             )
                         })}
                    </div>
                )}
            </div>

            {/* Evidence Types */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center">
                  <Paperclip className="w-3 h-3 mr-1" /> Supporting Evidence Type(s)
              </label>
              <div className={`flex flex-wrap gap-2 p-2 rounded-md ${isHighSeverityMissingEvidence ? 'bg-red-50 border border-red-100' : ''}`}>
                {EVIDENCE_TYPES.map(type => {
                    const isSelected = (entry.evidenceTypes || []).includes(type);
                    return (
                        <button
                            key={type}
                            onClick={() => toggleEvidenceType(type)}
                            className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                isSelected 
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 font-medium' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {type}
                        </button>
                    )
                })}
              </div>
            </div>

            {/* External Links */}
            <div>
                 <label className="block text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center">
                    <LinkIcon className="w-3 h-3 mr-1" /> External Links (Google Drive, Dropbox, etc.)
                </label>
                <div className="space-y-2">
                    {entry.externalLinks && entry.externalLinks.map((link, idx) => (
                        <div key={idx} className="flex items-center text-sm bg-gray-50 p-2 rounded border border-gray-200">
                             <a href={link} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-blue-600 hover:underline flex items-center">
                                <ExternalLink className="w-3 h-3 mr-1 flex-shrink-0" />
                                {link}
                             </a>
                             <button onClick={() => removeLink(idx)} className="text-gray-400 hover:text-red-500 ml-2">
                                <X className="w-4 h-4" />
                             </button>
                        </div>
                    ))}
                    <div className="flex items-center">
                        <input 
                            type="text" 
                            value={newLink}
                            onChange={(e) => setNewLink(e.target.value)}
                            placeholder="https://"
                            className="flex-1 text-sm border-gray-300 rounded-l-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <button 
                            onClick={addLink}
                            className="bg-indigo-600 text-white px-3 py-2 rounded-r-md hover:bg-indigo-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    {linkError && <p className="text-xs text-red-500 mt-1">{linkError}</p>}
                </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" /> Specific Details & Notes
              </label>
              <textarea
                value={entry.notes}
                onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
                placeholder="Describe the incident, names of witnesses, or location of evidence..."
                rows={3}
                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
