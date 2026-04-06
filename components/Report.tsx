import React, { useState, useEffect } from 'react';
import { AssessmentState, Witness } from '../types';
import { CATEGORIES } from '../constants';
import { generateEthicsReport } from '../services/geminiService';
import { 
  Printer, 
  Sparkles, 
  Loader2, 
  Paperclip, 
  User, 
  Calendar, 
  List, 
  PieChart, 
  TrendingUp, 
  AlertOctagon,
  Filter,
  Table as TableIcon,
  Download,
  Edit,
  Save,
  RotateCcw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ReportProps {
  state: AssessmentState;
  witnesses?: Witness[];
}

export const Report: React.FC<ReportProps> = ({ state, witnesses = [] }) => {
  const [aiReport, setAiReport] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'category' | 'chronological' | 'matrix'>('category');
  const [isEditingAi, setIsEditingAi] = useState(false);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --- Data Processing ---
  
  // Flatten all observed items
  const allObserved = CATEGORIES.flatMap(cat => 
    cat.items
      .filter(item => state[item.id]?.isObserved)
      .map(item => ({ ...item, categoryTitle: cat.title, categoryId: cat.id, entry: state[item.id] }))
  );

  // Apply Filters
  const filteredItems = allObserved.filter(item => {
    // Severity Filter
    if (severityFilter !== 'All' && item.entry.severity !== severityFilter) return false;
    
    // Date Filter
    if (startDate && (!item.entry.date || item.entry.date < startDate)) return false;
    if (endDate && (!item.entry.date || item.entry.date > endDate)) return false;

    return true;
  });

  // Calculate Stats based on Filtered Data
  const totalViolations = filteredItems.length;
  const highSeverityCount = filteredItems.filter(i => i.entry.severity === 'High').length;
  const substantiatedCount = filteredItems.filter(i => 
    (i.entry.evidenceTypes && i.entry.evidenceTypes.length > 0) || 
    (i.entry.witnessIds && i.entry.witnessIds.length > 0)
  ).length;

  // Prepare Timeline Data (Group by Month)
  const timelineData = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredItems.forEach(item => {
        if (!item.entry.date) return;
        const date = new Date(item.entry.date);
        // Format: "YYYY-MM" for sorting, display "Mon 'YY"
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        grouped[key] = (grouped[key] || 0) + 1;
    });

    return Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, count]) => {
            const [year, month] = key.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1);
            return {
                date: key,
                label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                count
            };
        });
  }, [filteredItems]);

  // Calculate Strength Score (Global, not filtered, for context)
  const calculateStrengthScore = () => {
    let totalPotentialScore = 0;
    let currentScore = 0;
    allObserved.forEach(item => {
        const severityWeight = item.entry.severity === 'High' ? 3 : item.entry.severity === 'Medium' ? 2 : 1;
        totalPotentialScore += severityWeight;
        const hasDocEvidence = item.entry.evidenceTypes && item.entry.evidenceTypes.length > 0;
        const hasWitness = item.entry.witnessIds && item.entry.witnessIds.length > 0;
        let strengthMultiplier = 0.1; 
        if (hasDocEvidence) strengthMultiplier = 1.0;
        else if (hasWitness) strengthMultiplier = 0.6;
        currentScore += (severityWeight * strengthMultiplier);
    });
    return totalPotentialScore > 0 ? Math.round((currentScore / totalPotentialScore) * 100) : 0;
  };

  const strengthScore = calculateStrengthScore();

  // --- Handlers ---

  const handleAiGeneration = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass the filtered list logic if desired, or full state. Using full state for comprehensive AI context.
      const report = await generateEthicsReport(state, witnesses);
      setAiReport(report);
      setIsEditingAi(false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getWitnessName = (id: string) => {
    return witnesses.find(w => w.id === id)?.name || "Unknown Witness";
  };

  // --- Render Sections ---

  const renderTimelineChart = () => {
    if (timelineData.length === 0) return null;
    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-8 print:border-gray-300 break-inside-avoid">
            <h4 className="text-sm font-bold text-gray-500 uppercase mb-4">Violation Frequency (Pattern of Escalation)</h4>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timelineData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{fontSize: 10}} />
                        <YAxis allowDecimals={false} tick={{fontSize: 10}} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Violations" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
  };

  const renderMatrixView = () => (
    <div className="overflow-x-auto">
        <table className="min-w-full text-xs text-left border-collapse">
            <thead>
                <tr className="bg-gray-100 border-b border-gray-300 print:bg-gray-200">
                    <th className="p-2 font-bold text-gray-700 w-24">Date</th>
                    <th className="p-2 font-bold text-gray-700 w-24">Severity</th>
                    <th className="p-2 font-bold text-gray-700">Violation Details</th>
                    <th className="p-2 font-bold text-gray-700 w-48">Evidence / Witness</th>
                    <th className="p-2 font-bold text-gray-700">Notes</th>
                </tr>
            </thead>
            <tbody>
                {filteredItems.map(item => (
                    <tr key={item.id} className="border-b border-gray-200 break-inside-avoid">
                        <td className="p-2 whitespace-nowrap font-mono text-gray-600 align-top">
                            {item.entry.date || <span className="text-gray-300">-</span>}
                        </td>
                        <td className="p-2 align-top">
                            {item.entry.severity && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                    item.entry.severity === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                                    item.entry.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-green-50 text-green-700 border-green-200'
                                }`}>
                                    {item.entry.severity}
                                </span>
                            )}
                        </td>
                        <td className="p-2 align-top">
                            <div className="font-medium text-gray-900">{item.text}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{item.categoryId}. {item.categoryTitle}</div>
                        </td>
                        <td className="p-2 align-top space-y-1">
                            {item.entry.evidenceTypes?.map(e => (
                                <div key={e} className="flex items-center text-[10px] text-indigo-700 bg-indigo-50 px-1 rounded border border-indigo-100">
                                    <Paperclip className="w-2 h-2 mr-1" /> {e}
                                </div>
                            ))}
                            {item.entry.witnessIds?.map(id => (
                                <div key={id} className="flex items-center text-[10px] text-blue-700 bg-blue-50 px-1 rounded border border-blue-100">
                                    <User className="w-2 h-2 mr-1" /> {getWitnessName(id)}
                                </div>
                            ))}
                        </td>
                        <td className="p-2 align-top text-gray-600 italic">
                            {item.entry.notes || '-'}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  const renderStandardItem = (item: any, entry: any) => (
     <div key={item.id} className={`pl-4 border-l-4 py-3 mb-4 break-inside-avoid ${entry.severity === 'High' ? 'border-red-600 bg-red-50/30 rounded-r' : 'border-gray-300'}`}>
        <div className="flex justify-between items-start mb-2">
            <div className="flex-1 mr-2">
                <p className="font-semibold text-gray-900 text-sm md:text-base">{item.text}</p>
                {viewMode === 'chronological' && (
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                        {item.categoryId}. {item.categoryTitle}
                    </span>
                )}
            </div>
            {entry.severity && (
                <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded border flex-shrink-0 ${
                    entry.severity === 'High' ? 'bg-white text-red-700 border-red-200' :
                    entry.severity === 'Medium' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    'bg-green-100 text-green-800 border-green-200'
                }`}>
                    {entry.severity}
                </span>
            )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-2">
            <div><span className="font-bold">Date:</span> {entry.date || 'N/A'}</div>
            <div><span className="font-bold">Time:</span> {entry.time || 'N/A'}</div>
        </div>

        <div className="flex flex-wrap gap-2 mb-2">
            {entry.evidenceTypes?.map((t: string) => (
                <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-100">
                    <Paperclip className="w-3 h-3 mr-1" />{t}
                </span>
            ))}
             {entry.witnessIds?.map((id: string) => (
                <span key={id} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-100">
                    <User className="w-3 h-3 mr-1" />{getWitnessName(id)}
                </span>
            ))}
        </div>

        {entry.notes && (
            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 font-mono">
                {entry.notes}
            </div>
        )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-20">
      
      {/* --- HEADER & CONTROLS --- */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-100 pb-6 mb-6 print:border-black">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Case Assessment Report</h2>
            <p className="text-gray-500 mt-1">Generated via Legal Ethics Tracker</p>
            <div className="text-xs text-gray-400 mt-2 hidden print:block">
                Report Date: {new Date().toLocaleDateString()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0 print:hidden">
             <button
              onClick={handleAiGeneration}
              disabled={loading}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50 text-sm font-medium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{aiReport ? 'Regenerate Analysis' : 'Generate AI Analysis'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* --- FILTERS (Print Hidden) --- */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 print:hidden">
            <div className="flex items-center mb-3 text-sm font-bold text-slate-700">
                <Filter className="w-4 h-4 mr-2" /> Report Filters
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
                    <select 
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value as any)}
                        className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="All">All Severities</option>
                        <option value="High">High Only</option>
                        <option value="Medium">Medium Only</option>
                        <option value="Low">Low Only</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div className="flex items-end">
                    <button 
                        onClick={() => { setStartDate(''); setEndDate(''); setSeverityFilter('All'); }}
                        className="text-xs text-gray-500 hover:text-indigo-600 underline mb-2 ml-2"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>
        </div>

        {/* --- STATISTICS DASHBOARD --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 print:grid-cols-4 print:gap-2">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center print:border-gray-200">
                <span className="block text-2xl font-bold text-slate-800">{totalViolations}</span>
                <span className="text-xs text-slate-500 uppercase font-bold">Violations Found</span>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center print:border-gray-200">
                <span className="block text-2xl font-bold text-red-600">{highSeverityCount}</span>
                <span className="text-xs text-red-500 uppercase font-bold">High Severity</span>
            </div>
             <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-center print:border-gray-200">
                <span className="block text-2xl font-bold text-indigo-600">{substantiatedCount}</span>
                <span className="text-xs text-indigo-500 uppercase font-bold">Documented</span>
            </div>
            
            {/* Readiness Score Gauge */}
            <div className={`p-4 rounded-lg border text-center print:border-gray-200 ${
                strengthScore > 75 ? 'bg-green-50 border-green-200 text-green-700' :
                strengthScore > 40 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
                <div className="flex items-center justify-center space-x-2">
                    <span className="text-2xl font-bold">{strengthScore}/100</span>
                </div>
                <span className="text-xs uppercase font-bold flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Readiness Score
                </span>
            </div>
        </div>

        {/* --- TIMELINE VISUALIZATION --- */}
        {renderTimelineChart()}

        {/* --- AI REPORT SECTION --- */}
        {error && (
             <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 print:hidden">
                {error}
             </div>
        )}

        {(aiReport || isEditingAi) && (
          <div className="mb-8 p-6 bg-indigo-50 rounded-lg border border-indigo-100 print:bg-white print:border-none print:p-0 group relative">
            <div className="flex justify-between items-center border-b border-indigo-200 pb-2 mb-3">
                <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-indigo-600" /> 
                    AI Strategic Analysis
                </h3>
                <div className="print:hidden">
                    {isEditingAi ? (
                        <button onClick={() => setIsEditingAi(false)} className="text-xs flex items-center text-green-600 hover:text-green-700 font-bold bg-white px-2 py-1 rounded shadow-sm">
                            <Save className="w-3 h-3 mr-1" /> Done
                        </button>
                    ) : (
                        <button onClick={() => setIsEditingAi(true)} className="text-xs flex items-center text-indigo-500 hover:text-indigo-700 font-medium">
                            <Edit className="w-3 h-3 mr-1" /> Edit Narrative
                        </button>
                    )}
                </div>
            </div>
            
            {isEditingAi ? (
                <textarea 
                    value={aiReport}
                    onChange={(e) => setAiReport(e.target.value)}
                    className="w-full h-96 p-4 text-sm font-serif leading-relaxed border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
            ) : (
                <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap font-serif leading-relaxed">
                    {aiReport}
                </div>
            )}
            
            <div className="mt-4 text-xs text-gray-400 italic print:hidden">
                * Review and verify all AI generated text before submitting to legal counsel.
            </div>
          </div>
        )}

        {/* --- DETAILED FINDINGS --- */}
        <div className="print:block mt-8">
            <div className="flex justify-between items-center mb-6 border-b pb-2 print:border-gray-300">
                 <h3 className="text-xl font-bold text-gray-800">Detailed Findings</h3>
                 
                 {/* View Toggles (Print Hidden) */}
                 <div className="flex bg-gray-100 p-1 rounded-md print:hidden">
                    <button
                        onClick={() => setViewMode('category')}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            viewMode === 'category' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <List className="w-3 h-3 mr-2" /> Category
                    </button>
                    <button
                        onClick={() => setViewMode('chronological')}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            viewMode === 'chronological' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Calendar className="w-3 h-3 mr-2" /> Timeline
                    </button>
                    <button
                        onClick={() => setViewMode('matrix')}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            viewMode === 'matrix' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <TableIcon className="w-3 h-3 mr-2" /> Evidence Matrix
                    </button>
                 </div>
            </div>

            {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                     <p>No violations match your current filters.</p>
                     <button onClick={() => {setStartDate(''); setEndDate(''); setSeverityFilter('All')}} className="text-indigo-600 text-sm mt-2 underline">Clear Filters</button>
                </div>
            ) : (
                <>
                    {viewMode === 'matrix' && renderMatrixView()}
                    
                    {viewMode === 'category' && (
                        <div className="space-y-8">
                            {CATEGORIES.map((cat) => {
                                const items = filteredItems.filter(i => i.categoryId === cat.id);
                                if (items.length === 0) return null;
                                return (
                                    <div key={cat.id} className="break-inside-avoid">
                                        <h4 className="text-lg font-bold text-slate-800 mb-3 bg-slate-100 p-2 rounded print:bg-transparent print:p-0 print:border-b">
                                            {cat.id}. {cat.title}
                                        </h4>
                                        <div className="space-y-3">
                                            {items.map(item => renderStandardItem(item, item.entry))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {viewMode === 'chronological' && (
                        <div className="space-y-4">
                            {filteredItems
                                .sort((a, b) => {
                                    if (!a.entry.date) return 1;
                                    if (!b.entry.date) return -1;
                                    return new Date(a.entry.date).getTime() - new Date(b.entry.date).getTime();
                                })
                                .map(item => renderStandardItem(item, item.entry))}
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
