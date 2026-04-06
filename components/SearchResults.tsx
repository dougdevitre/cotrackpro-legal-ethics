import React from 'react';
import { AssessmentState, AssessmentEntry, Witness } from '../types';
import { CATEGORIES } from '../constants';
import { ViolationCard } from './ViolationCard';
import { Search } from 'lucide-react';

interface SearchResultsProps {
  query: string;
  state: AssessmentState;
  witnesses?: Witness[];
  onUpdate: (id: string, updates: Partial<AssessmentEntry>) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ query, state, witnesses = [], onUpdate }) => {
  const normalizedQuery = query.toLowerCase().trim();
  
  const results = CATEGORIES.flatMap(cat => 
    cat.items
      .filter(item => item.text.toLowerCase().includes(normalizedQuery))
      .map(item => ({ ...item, categoryTitle: `${cat.id}. ${cat.title}` }))
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white p-6 rounded-lg shadow-sm border-b-2 border-indigo-200">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Search className="w-6 h-6 mr-3 text-indigo-600" />
          Search Results
        </h2>
        <p className="text-gray-500 mt-1">
          Found {results.length} results for "{query}"
        </p>
      </div>

      {results.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm text-center border border-dashed border-gray-300">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No matches found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className="grid gap-4">
            {results.map((item) => {
            const entry = state[item.id] || { isObserved: false, notes: '', date: '', time: '' };
            return (
                <ViolationCard 
                    key={item.id}
                    item={item}
                    entry={entry}
                    witnesses={witnesses}
                    categoryContext={item.categoryTitle}
                    onUpdate={onUpdate}
                    highlightTerm={query}
                />
            );
            })}
        </div>
      )}
    </div>
  );
};
