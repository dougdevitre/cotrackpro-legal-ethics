import React, { useState } from 'react';
import { AssessmentState, AssessmentEntry } from '../types';
import { CATEGORIES } from '../constants';
import { Calendar, Clock, AlertCircle, ArrowDown, ArrowUp, CalendarOff } from 'lucide-react';

interface TimelineProps {
  state: AssessmentState;
  onNavigateToCategory: (categoryId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ state, onNavigateToCategory }) => {
  const [sortAsc, setSortAsc] = useState(true);

  // Aggregate and process data
  const allEvents = (Object.entries(state) as [string, AssessmentEntry][])
    .filter(([_, entry]) => entry.isObserved)
    .map(([id, entry]) => {
      // Find item details
      let itemDetails = null;
      let categoryDetails = null;
      
      for (const cat of CATEGORIES) {
        const found = cat.items.find(i => i.id === id);
        if (found) {
          itemDetails = found;
          categoryDetails = cat;
          break;
        }
      }

      return {
        id,
        entry,
        item: itemDetails,
        category: categoryDetails,
        dateObj: entry.date ? new Date(entry.date) : null
      };
    });

  const datedEvents = allEvents
    .filter(e => e.dateObj !== null)
    .sort((a, b) => {
      const timeA = a.dateObj!.getTime();
      const timeB = b.dateObj!.getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    });

  const undatedEvents = allEvents.filter(e => e.dateObj === null);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-20">
      <div className="bg-white p-6 rounded-lg shadow-sm border-b-2 border-indigo-200 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Calendar className="w-6 h-6 mr-3 text-indigo-600" />
            Case Timeline
          </h2>
          <p className="text-gray-500 mt-1">Chronological history of observed violations</p>
        </div>
        
        {datedEvents.length > 0 && (
          <button 
            onClick={() => setSortAsc(!sortAsc)}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition-colors"
          >
            {sortAsc ? <ArrowDown className="w-4 h-4 mr-2" /> : <ArrowUp className="w-4 h-4 mr-2" />}
            {sortAsc ? 'Oldest First' : 'Newest First'}
          </button>
        )}
      </div>

      {datedEvents.length === 0 && undatedEvents.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
           <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <p className="text-gray-500">No observed violations recorded yet.</p>
        </div>
      )}

      {datedEvents.length > 0 && (
        <div className="relative border-l-2 border-indigo-200 ml-4 md:ml-6 space-y-12 my-8">
            {datedEvents.map((event, index) => (
                <div key={event.id} className="relative pl-8 md:pl-12">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-indigo-600 rounded-full border-4 border-white shadow-sm" />
                    
                    {/* Date Label */}
                    <div className="absolute -top-1 left-8 md:left-12 text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mb-2">
                        {formatDate(event.entry.date)}
                    </div>

                    {/* Content Card */}
                    <div className="mt-8 bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:border-indigo-300 transition-all">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                                {event.item?.text}
                            </h3>
                            {event.entry.time && (
                                <div className="flex items-center text-gray-500 text-sm font-medium whitespace-nowrap bg-gray-50 px-2 py-1 rounded">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {event.entry.time}
                                </div>
                            )}
                        </div>
                        
                        <div className="mb-3">
                             <button 
                                onClick={() => event.category && onNavigateToCategory(event.category.id)}
                                className="text-xs font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-wide transition-colors"
                             >
                                {event.category?.id}. {event.category?.title}
                            </button>
                        </div>

                        {event.entry.notes && (
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-md text-sm text-gray-800 flex items-start">
                                <AlertCircle className="w-4 h-4 mr-2 text-amber-500 mt-0.5 flex-shrink-0" />
                                <div className="whitespace-pre-wrap">{event.entry.notes}</div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      )}

      {undatedEvents.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-700 flex items-center mb-6">
                <CalendarOff className="w-5 h-5 mr-2" />
                Undated Observations ({undatedEvents.length})
            </h3>
            <div className="grid gap-4">
                {undatedEvents.map(event => (
                    <div key={event.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 opacity-90 hover:opacity-100 transition-opacity">
                         <div className="flex flex-col md:flex-row md:items-start justify-between gap-2 mb-1">
                            <span className="font-medium text-gray-800">{event.item?.text}</span>
                            <button 
                                onClick={() => event.category && onNavigateToCategory(event.category.id)}
                                className="text-xs font-bold text-gray-400 uppercase whitespace-nowrap"
                             >
                                {event.category?.id}
                            </button>
                        </div>
                        {event.entry.notes && (
                            <p className="text-sm text-gray-600 mt-2 pl-3 border-l-2 border-gray-300">
                                {event.entry.notes}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};