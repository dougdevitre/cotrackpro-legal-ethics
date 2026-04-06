import React, { useState } from 'react';
import { Category, AssessmentState, AssessmentEntry, Witness, SeverityLevel } from '../types';
import { ViolationCard } from './ViolationCard';
import { Filter, ArrowLeft, ArrowRight, Sparkles, Loader2, ArrowDownUp } from 'lucide-react';
import { generateCategoryAnalysis } from '../services/geminiService';

interface AssessmentCategoryProps {
  category: Category;
  state: AssessmentState;
  witnesses?: Witness[];
  onUpdate: (id: string, updates: Partial<AssessmentEntry>) => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export const AssessmentCategory: React.FC<AssessmentCategoryProps> = ({ 
    category, 
    state,
    witnesses,
    onUpdate,
    onNext,
    onPrev,
    hasNext,
    hasPrev
}) => {
  const [filter, setFilter] = useState<'all' | 'observed'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'severity'>('default');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Clear analysis when category changes
  React.useEffect(() => {
    setAnalysis(null);
  }, [category.id]);

  const filteredItems = filter === 'all' 
    ? category.items 
    : category.items.filter(item => state[item.id]?.isObserved);

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'severity') {
      const getScore = (id: string) => {
        const severity = state[id]?.severity;
        if (severity === 'High') return 3;
        if (severity === 'Medium') return 2;
        if (severity === 'Low') return 1;
        return 0;
      };
      return getScore(b.id) - getScore(a.id);
    }
    return 0; // Default order (by ID implicitly via array order)
  });

  const observedCount = category.items.filter(item => state[item.id]?.isObserved).length;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
        const result = await generateCategoryAnalysis(category, state);
        setAnalysis(result);
    } catch (e) {
        console.error(e);
        setAnalysis("Failed to generate analysis. Please try again.");
    } finally {
        setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="bg-slate-50/95 backdrop-blur-sm p-6 rounded-b-lg shadow-sm border-b-2 border-slate-200 sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 -mt-4 md:-mt-8 mb-6 transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="bg-slate-800 text-white text-sm font-bold px-2 py-1 rounded mr-3">{category.id}</span>
                {category.title}
                </h2>
                <p className="text-gray-500 mt-1">Items {category.range}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1 rounded-lg self-start md:self-center">
                <div className="flex bg-white rounded-md shadow-sm mr-2">
                   <button 
                      onClick={() => setSortBy(sortBy === 'default' ? 'severity' : 'default')}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${sortBy === 'severity' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:text-gray-800'}`}
                      title={sortBy === 'severity' ? "Sorted by Severity (High to Low)" : "Sort by Severity"}
                  >
                      <ArrowDownUp className="w-3 h-3 mr-1" />
                      {sortBy === 'severity' ? 'Prioritized' : 'Default Order'}
                  </button>
                </div>

                <button 
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    All Items
                </button>
                <button 
                    onClick={() => setFilter('observed')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${filter === 'observed' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Filter className="w-3 h-3 mr-1" />
                    Observed Only
                </button>
            </div>
        </div>

        {/* AI Insight Section */}
        {observedCount > 0 && (
            <div className="mt-4 border-t pt-4">
                {!analysis && !analyzing && (
                    <button 
                        onClick={handleAnalyze}
                        className="text-sm flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analyze Findings in this Category
                    </button>
                )}
                
                {analyzing && (
                    <div className="flex items-center text-indigo-500 text-sm">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing observed violations...
                    </div>
                )}

                {analysis && (
                    <div className="bg-indigo-50 rounded-md p-4 text-sm text-indigo-900 border border-indigo-100 relative animate-slideDown">
                        <div className="flex items-start">
                            <Sparkles className="w-4 h-4 mr-2 mt-0.5 text-indigo-600 flex-shrink-0" />
                            <div className="prose prose-sm max-w-none text-indigo-900 leading-relaxed">
                                {analysis}
                            </div>
                        </div>
                        <button 
                            onClick={() => setAnalysis(null)} 
                            className="absolute top-2 right-2 text-indigo-300 hover:text-indigo-500"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="grid gap-4">
        {sortedItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">
                {filter === 'observed' ? (
                    <>
                        <p className="font-medium text-gray-600">No observed violations in this category yet.</p>
                        <button onClick={() => setFilter('all')} className="text-indigo-600 text-sm mt-2 hover:underline">Switch to "All Items" to add one</button>
                    </>
                ) : (
                    <p>No items found.</p>
                )}
            </div>
        ) : (
            sortedItems.map((item) => {
            const entry = state[item.id] || { isObserved: false, notes: '', date: '', time: '' };
            return (
                <ViolationCard 
                    key={item.id}
                    item={item}
                    entry={entry}
                    witnesses={witnesses}
                    onUpdate={onUpdate}
                />
            );
            })
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-200">
         <button
            onClick={onPrev}
            disabled={!hasPrev}
            className={`flex items-center px-4 py-2 rounded-md transition-colors ${!hasPrev ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-indigo-600'}`}
         >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous Category
         </button>
         <button
            onClick={onNext}
            disabled={!hasNext}
             className={`flex items-center px-4 py-2 rounded-md transition-colors ${!hasNext ? 'text-gray-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}
         >
            Next Category
            <ArrowRight className="w-4 h-4 ml-2" />
         </button>
      </div>
    </div>
  );
};
