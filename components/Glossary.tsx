import React, { useState } from 'react';
import { GLOSSARY_TERMS } from '../constants';
import { Book, Search, X } from 'lucide-react';

export const Glossary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTerms = GLOSSARY_TERMS.filter(item => 
    item.term.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.definition.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => a.term.localeCompare(b.term));

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="bg-white p-6 rounded-lg shadow-sm border-b-2 border-teal-200 sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Book className="w-6 h-6 mr-3 text-teal-600" />
              Legal Glossary
            </h2>
            <p className="text-gray-500 mt-1">Definitions of common legal terms found in family law ethics</p>
          </div>
          
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter terms..."
              className="block w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
            />
            {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTerms.length > 0 ? (
          filteredTerms.map((item) => (
            <div key={item.term} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 hover:border-teal-200 transition-colors flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-2 border-b border-gray-100 pb-2">{item.term}</h3>
              <p className="text-gray-600 text-sm leading-relaxed flex-1">
                {item.definition}
              </p>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">
            <p>No terms found matching "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
};
