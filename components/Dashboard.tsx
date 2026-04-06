import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { AssessmentState, AssessmentEntry } from '../types';
import { CATEGORIES } from '../constants';
import { AlertTriangle, CheckCircle, FileText, Clock, ArrowRight, ShieldAlert, Paperclip, Calendar } from 'lucide-react';

interface DashboardProps {
  state: AssessmentState;
  onNavigateToCategory: (categoryId: string) => void;
  onNavigateToCritical?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onNavigateToCategory, onNavigateToCritical }) => {
  const chartData = CATEGORIES.map(cat => {
    const count = cat.items.filter(item => state[item.id]?.isObserved).length;
    return {
      name: cat.id,
      fullName: cat.title,
      count: count,
      total: cat.items.length
    };
  });

  const observedEntries = (Object.values(state) as AssessmentEntry[]).filter(s => s.isObserved);
  const totalViolations = observedEntries.length;
  const highSeverityCount = observedEntries.filter(s => s.severity === 'High').length;
  const categoriesAffected = chartData.filter(d => d.count > 0).length;

  // Identify Action Items
  const actionItems = (Object.entries(state) as [string, AssessmentEntry][])
    .filter(([_, entry]) => entry.isObserved)
    .map(([id, entry]) => {
      const cat = CATEGORIES.find(c => c.items.some(i => i.id === id));
      const item = cat?.items.find(i => i.id === id);
      let missingType: 'evidence' | 'date' | 'severity' | null = null;
      
      if (entry.severity === 'High' && (!entry.evidenceTypes || entry.evidenceTypes.length === 0)) {
        missingType = 'evidence';
      } else if (!entry.date) {
        missingType = 'date';
      } else if (!entry.severity) {
        missingType = 'severity';
      }

      return {
        id,
        text: item?.text || 'Unknown',
        category: cat,
        missingType,
        entry
      };
    })
    .filter(item => item.missingType !== null)
    .sort((a, b) => {
        // Sort High Severity missing evidence to top
        if (a.entry.severity === 'High' && b.entry.severity !== 'High') return -1;
        if (b.entry.severity === 'High' && a.entry.severity !== 'High') return 1;
        return 0;
    })
    .slice(0, 5);

  // Get recent activity
  const recentActivity = (Object.entries(state) as [string, AssessmentEntry][])
    .filter(([_, entry]) => entry.lastModified)
    .sort((a, b) => (b[1].lastModified || 0) - (a[1].lastModified || 0))
    .slice(0, 3)
    .map(([id, entry]) => {
        const cat = CATEGORIES.find(c => c.items.some(i => i.id === id));
        const item = cat?.items.find(i => i.id === id);
        return {
            id,
            text: item?.text || 'Unknown Item',
            category: cat,
            timestamp: entry.lastModified,
            entry
        };
    });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
            onClick={onNavigateToCritical}
            className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500 flex items-center justify-between hover:bg-red-50 transition-colors group text-left"
        >
          <div>
            <p className="text-sm text-gray-500 font-medium uppercase group-hover:text-red-600">High Severity Issues</p>
            <p className="text-3xl font-bold text-red-600">{highSeverityCount}</p>
          </div>
          <ShieldAlert className="w-10 h-10 text-red-500 opacity-20 group-hover:opacity-100 transition-opacity" />
        </button>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-amber-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium uppercase">Total Violations</p>
            <p className="text-3xl font-bold text-gray-900">{totalViolations}</p>
          </div>
          <AlertTriangle className="w-10 h-10 text-amber-500 opacity-20" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium uppercase">Assessment Progress</p>
            <p className="text-3xl font-bold text-gray-900">
              {Math.round((Object.keys(state).length / 100) * 100)}%
            </p>
          </div>
          <CheckCircle className="w-10 h-10 text-blue-500 opacity-20" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Violations by Category</h3>
            <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} onClick={(data) => onNavigateToCategory(data.name)}>
                    {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#ef4444' : '#e5e7eb'} cursor="pointer" />
                    ))}
                </Bar>
                </BarChart>
            </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-500 text-center mt-2">Click on a bar to view that category</p>
        </div>

        {/* Action Items Panel */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-indigo-500" />
                Recommended Actions
            </h3>
            <div className="flex-1 overflow-y-auto pr-2">
                {actionItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        {totalViolations > 0 ? (
                            <>
                                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                <p className="text-sm">Great job! Your data looks complete.</p>
                            </>
                        ) : (
                            <p className="text-sm">Start by checking items in Categories.</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {actionItems.map((item) => (
                            <div key={item.id} className="bg-orange-50 p-3 rounded-md border border-orange-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                         <p className="text-xs font-bold text-orange-800 uppercase mb-1">
                                            {item.missingType === 'evidence' ? 'Missing Evidence' : 
                                             item.missingType === 'date' ? 'Missing Date' : 'Rating Needed'}
                                        </p>
                                        <p className="text-xs text-gray-800 font-medium line-clamp-2">{item.text}</p>
                                    </div>
                                    <button 
                                        onClick={() => item.category && onNavigateToCategory(item.category.id)}
                                        className="text-orange-600 hover:text-orange-800 ml-2"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="mt-2 flex items-center text-[10px] text-gray-500">
                                    {item.missingType === 'evidence' && <Paperclip className="w-3 h-3 mr-1" />}
                                    {item.missingType === 'date' && <Calendar className="w-3 h-3 mr-1" />}
                                    <span>
                                        {item.missingType === 'evidence' ? 'High severity items need proof.' : 
                                         item.missingType === 'date' ? 'Timelines are crucial for context.' : 'Rate severity to prioritize.'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
             {recentActivity.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Recent Updates</p>
                    {recentActivity.map(act => (
                         <div key={act.id} className="text-xs text-gray-600 mb-1 truncate">
                            Updated: {act.text}
                         </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATEGORIES.map((cat) => {
            const items = cat.items.filter(item => state[item.id]?.isObserved);
            const count = items.length;
            const highCount = items.filter(i => state[i.id]?.severity === 'High').length;
            
            if (count === 0) return null;
            return (
                <div key={cat.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden" onClick={() => onNavigateToCategory(cat.id)}>
                    {highCount > 0 && (
                        <div className="absolute top-0 right-0 w-2 h-full bg-red-400" />
                    )}
                    <div className="flex justify-between items-center mb-2 pr-4">
                        <h4 className="font-semibold text-gray-800">{cat.id}. {cat.title}</h4>
                        <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-1 rounded-full">{count} Issues</span>
                    </div>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                        {items.slice(0, 3).map(item => (
                            <li key={item.id} className="truncate">
                                {state[item.id]?.severity === 'High' && <span className="text-red-500 font-bold mr-1">!</span>}
                                {item.text}
                            </li>
                        ))}
                        {count > 3 && <li className="list-none text-gray-400 pl-4 text-xs italic">...and {count - 3} more</li>}
                    </ul>
                </div>
            )
        })}
      </div>
    </div>
  );
};
