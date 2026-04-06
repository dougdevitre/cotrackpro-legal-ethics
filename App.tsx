import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Scale, 
  Menu,
  X,
  Search,
  Download,
  Upload,
  Settings,
  History,
  MessageSquare,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Lock,
  Book,
  Users,
  ShieldAlert,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { AssessmentCategory } from './components/AssessmentCategory';
import { Report } from './components/Report';
import { SearchResults } from './components/SearchResults';
import { Timeline } from './components/Timeline';
import { ChatAssistant } from './components/ChatAssistant';
import { Glossary } from './components/Glossary';
import { WitnessManager } from './components/WitnessManager';
import { CriticalIssues } from './components/CriticalIssues';
import { CATEGORIES } from './constants';
import { AppView, AssessmentState, AssessmentEntry, Witness } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id);
  const [assessmentState, setAssessmentState] = useState<AssessmentState>({});
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [privacyMode, setPrivacyMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial state from local storage
  useEffect(() => {
    const savedData = localStorage.getItem('ethics-assessment-data');
    if (savedData) {
      try {
        setAssessmentState(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to load saved assessment data");
      }
    }

    const savedWitnesses = localStorage.getItem('ethics-assessment-witnesses');
    if (savedWitnesses) {
        try {
            setWitnesses(JSON.parse(savedWitnesses));
        } catch (e) {
            console.error("Failed to load saved witnesses");
        }
    }
    
    const handleResize = () => {
        setIsMobile(window.innerWidth < 1024);
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
        else setIsSidebarOpen(true);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save state to local storage on change
  useEffect(() => {
    localStorage.setItem('ethics-assessment-data', JSON.stringify(assessmentState));
  }, [assessmentState]);

  useEffect(() => {
    localStorage.setItem('ethics-assessment-witnesses', JSON.stringify(witnesses));
  }, [witnesses]);

  const updateEntry = (id: string, updates: Partial<AssessmentEntry>) => {
    setAssessmentState(prev => {
      const existing = prev[id] || { isObserved: false, notes: '', date: '', time: '' };
      return {
        ...prev,
        [id]: { 
            ...existing, 
            ...updates,
            lastModified: Date.now() // Track modification time
        }
      };
    });
  };

  const handleAddWitness = (witness: Witness) => {
    setWitnesses(prev => [...prev, witness]);
  };

  const handleDeleteWitness = (id: string) => {
    setWitnesses(prev => prev.filter(w => w.id !== id));
    // Also remove from any linked violations
    setAssessmentState(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(key => {
            if (newState[key].witnessIds) {
                newState[key] = {
                    ...newState[key],
                    witnessIds: newState[key].witnessIds?.filter(wid => wid !== id)
                };
            }
        });
        return newState;
    });
  };

  const handleNavigateCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    setView(AppView.ASSESSMENT);
    setSearchQuery(''); // Clear search when navigating
    if (isMobile) setIsSidebarOpen(false);
    // Scroll to top of main content
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.scrollTop = 0;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setView(AppView.SEARCH);
    } else {
      if (view === AppView.SEARCH) {
        setView(AppView.DASHBOARD);
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setView(AppView.DASHBOARD);
  };

  const clearData = () => {
      if(window.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
          setAssessmentState({});
          setWitnesses([]);
          localStorage.removeItem('ethics-assessment-data');
          localStorage.removeItem('ethics-assessment-witnesses');
          window.location.reload();
      }
  };

  const exportData = () => {
    const backup = {
        assessment: assessmentState,
        witnesses: witnesses
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ethics_assessment_" + new Date().toISOString().slice(0, 10) + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const exportToCSV = () => {
    // 1. Header Row
    let csvContent = "Category ID,Category Name,Violation ID,Violation Text,Severity,Date,Time,Evidence Types,External Links,Witnesses,Notes\n";

    // 2. Iterate through all items
    CATEGORIES.forEach(cat => {
        cat.items.forEach(item => {
            const entry = assessmentState[item.id];
            if (entry && entry.isObserved) {
                // Escape quotes and handle newlines in notes
                const cleanNotes = entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : "";
                const cleanText = `"${item.text.replace(/"/g, '""')}"`;
                const evidence = entry.evidenceTypes ? `"${entry.evidenceTypes.join('; ')}"` : "";
                const severity = entry.severity || "";
                const links = entry.externalLinks ? `"${entry.externalLinks.join(' ')}"` : "";
                const witnessNames = entry.witnessIds ? `"${entry.witnessIds.map(id => witnesses.find(w => w.id === id)?.name).filter(Boolean).join(', ')}"` : "";
                
                csvContent += `${cat.id},"${cat.title}",${item.id},${cleanText},${severity},${entry.date || ""},${entry.time || ""},${evidence},${links},${witnessNames},${cleanNotes}\n`;
            }
        });
    });

    // 3. Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ethics_violations_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && typeof json === 'object') {
            if(window.confirm("Importing data will overwrite your current assessment. Continue?")) {
                // Backward compatibility for old exports (which only had assessment state)
                if (json.assessment) {
                    setAssessmentState(json.assessment);
                    setWitnesses(json.witnesses || []);
                } else {
                    // Old format
                    setAssessmentState(json);
                    setWitnesses([]);
                }
                alert("Data imported successfully!");
            }
        }
      } catch (err) {
        alert("Invalid file format.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Navigation Logic
  const activeCategoryIndex = CATEGORIES.findIndex(c => c.id === activeCategory);
  const hasNextCategory = activeCategoryIndex < CATEGORIES.length - 1;
  const hasPrevCategory = activeCategoryIndex > 0;

  const handleNextCategory = () => {
      if (hasNextCategory) {
          handleNavigateCategory(CATEGORIES[activeCategoryIndex + 1].id);
      }
  };

  const handlePrevCategory = () => {
      if (hasPrevCategory) {
          handleNavigateCategory(CATEGORIES[activeCategoryIndex - 1].id);
      }
  };

  const handleCriticalNavigation = () => {
    setView(AppView.CRITICAL);
    if (isMobile) setIsSidebarOpen(false);
  };

  // Check for critical incomplete items
  const criticalIncompleteCount = (Object.values(assessmentState) as AssessmentEntry[]).filter(
      entry => entry.isObserved && entry.severity === 'High' && (!entry.evidenceTypes || entry.evidenceTypes.length === 0 || !entry.date)
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative">
      {/* Privacy Overlay */}
      {privacyMode && (
          <div 
            className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer transition-opacity duration-300"
            onClick={() => setPrivacyMode(false)}
          >
              <div className="bg-white/10 p-8 rounded-full mb-6 ring-4 ring-white/20 animate-pulse">
                  <Lock className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Privacy Mode Active</h2>
              <p className="text-slate-300">Click anywhere to reveal content</p>
          </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white shadow-lg z-20 sticky top-0">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center space-x-3 w-1/3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center space-x-2 truncate">
                <Scale className="w-6 h-6 text-red-400 flex-shrink-0" />
                <h1 className="text-lg md:text-xl font-bold tracking-tight hidden md:block">Legal Ethics Tracker</h1>
            </div>
          </div>
          
          <div className="flex-1 max-w-md mx-4">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400 group-focus-within:text-white" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearch}
                    placeholder="Search violations..."
                    className="block w-full pl-10 pr-8 py-2 border border-slate-700 rounded-md leading-5 bg-slate-800 text-slate-300 placeholder-slate-400 focus:outline-none focus:bg-slate-700 focus:text-white sm:text-sm transition-colors"
                />
                {searchQuery && (
                    <button 
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
          </div>

          <div className="flex items-center space-x-4 w-1/3 justify-end">
              <button 
                onClick={() => setPrivacyMode(!privacyMode)}
                className="flex items-center text-slate-300 hover:text-white transition-colors"
                title={privacyMode ? "Disable Privacy Mode" : "Enable Privacy Mode"}
              >
                  {privacyMode ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  <span className="ml-2 text-xs font-medium hidden lg:inline">Privacy</span>
              </button>
          </div>
        </div>
      </header>

      {/* Critical Fix Banner */}
      {criticalIncompleteCount > 0 && view !== AppView.CRITICAL && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-md relative z-10 animate-slideDown">
            <div className="flex items-center space-x-2 font-medium">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
                <span>Action Required: {criticalIncompleteCount} high severity violations missing evidence or dates.</span>
            </div>
            <button 
                onClick={handleCriticalNavigation}
                className="bg-white text-red-600 px-3 py-1 rounded text-sm font-bold flex items-center hover:bg-red-50 transition-colors"
            >
                Fix Critical Errors <ArrowRight className="w-4 h-4 ml-1" />
            </button>
        </div>
      )}

      <div className={`flex flex-1 overflow-hidden relative ${privacyMode ? 'filter blur-sm pointer-events-none' : ''}`}>
        {/* Sidebar Navigation */}
        <aside 
          className={`
            bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 ease-in-out absolute lg:static z-10 h-full overflow-y-auto shadow-xl lg:shadow-none flex flex-col
            ${isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full lg:w-0 lg:translate-x-0'}
          `}
        >
          <div className="p-4 space-y-6 flex-1">
            <div className="space-y-1">
              <button
                onClick={() => { setView(AppView.DASHBOARD); setSearchQuery(''); if(isMobile) setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === AppView.DASHBOARD ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard Overview</span>
              </button>

              <button
                onClick={handleCriticalNavigation}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === AppView.CRITICAL ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center">
                        <ShieldAlert size={18} className={`mr-3 ${view === AppView.CRITICAL ? 'text-red-600' : 'text-gray-500'}`} />
                        <span>Critical Issues</span>
                    </div>
                    {criticalIncompleteCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {criticalIncompleteCount}
                        </span>
                    )}
                </div>
              </button>

               <button
                onClick={() => { setView(AppView.TIMELINE); setSearchQuery(''); if(isMobile) setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === AppView.TIMELINE ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <History size={18} />
                <span>Case Timeline</span>
              </button>

              <button
                onClick={() => { setView(AppView.CHAT); setSearchQuery(''); if(isMobile) setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === AppView.CHAT ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <MessageSquare size={18} />
                <span>AI Assistant</span>
              </button>

              <button
                onClick={() => { setView(AppView.WITNESSES); setSearchQuery(''); if(isMobile) setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === AppView.WITNESSES ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Users size={18} />
                <span>Witness Directory</span>
              </button>

              <button
                onClick={() => { setView(AppView.GLOSSARY); setSearchQuery(''); if(isMobile) setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === AppView.GLOSSARY ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Book size={18} />
                <span>Legal Glossary</span>
              </button>
              
              <button
                onClick={() => { setView(AppView.REPORT); setSearchQuery(''); if(isMobile) setIsSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === AppView.REPORT ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <FileText size={18} />
                <span>Report & Analysis</span>
              </button>
            </div>

            <div>
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Assessment Categories
              </h3>
              <div className="space-y-1">
                {CATEGORIES.map(cat => {
                    const count = cat.items.filter(i => assessmentState[i.id]?.isObserved).length;
                    const total = cat.items.length;
                    const progress = (count / total) * 100;
                    
                    return (
                        <button
                            key={cat.id}
                            onClick={() => handleNavigateCategory(cat.id)}
                            className={`w-full relative overflow-hidden group px-4 py-2.5 rounded-lg text-sm transition-all ${
                            view === AppView.ASSESSMENT && activeCategory === cat.id 
                                ? 'bg-slate-100 text-slate-900 font-semibold' 
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center space-x-3 truncate flex-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[24px] text-center transition-colors ${
                                        count > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
                                    }`}>{cat.id}</span>
                                    <span className="truncate">{cat.title}</span>
                                </div>
                                {count > 0 && (
                                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full ml-2">
                                        {count}
                                    </span>
                                )}
                            </div>
                            {/* Simple Progress Indicator for sidebar */}
                             {count > 0 && (
                                <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-200 w-full">
                                    <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }}></div>
                                </div>
                             )}
                        </button>
                    )
                })}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
                <Settings className="w-3 h-3 mr-1" /> Data Management
            </h3>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={exportToCSV}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
                    title="Export to CSV (Excel)"
                >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>CSV</span>
                </button>
                <button 
                    onClick={exportData}
                    className="flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
                    title="Backup Data (JSON)"
                >
                    <Download className="w-3 h-3" />
                    <span>Backup</span>
                </button>
                <button 
                    onClick={triggerImport}
                    className="col-span-2 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
                >
                    <Upload className="w-3 h-3" />
                    <span>Import Backup</span>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImportFile}
                    accept=".json"
                    className="hidden"
                />
            </div>
             <button 
                onClick={clearData}
                className="w-full mt-3 text-xs text-red-400 hover:text-red-600 hover:underline text-center"
            >
                Reset Application Data
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:p-8" id="main-content">
          <div className="max-w-5xl mx-auto">
            {view === AppView.SEARCH ? (
              <SearchResults 
                query={searchQuery}
                state={assessmentState}
                witnesses={witnesses}
                onUpdate={updateEntry}
              />
            ) : (
                <>
                    {view === AppView.DASHBOARD && (
                    <Dashboard 
                        state={assessmentState} 
                        onNavigateToCategory={handleNavigateCategory} 
                        onNavigateToCritical={handleCriticalNavigation}
                    />
                    )}

                    {view === AppView.CRITICAL && (
                      <CriticalIssues 
                        state={assessmentState}
                        witnesses={witnesses}
                        onUpdate={updateEntry}
                      />
                    )}

                    {view === AppView.TIMELINE && (
                      <Timeline 
                        state={assessmentState} 
                        onNavigateToCategory={handleNavigateCategory} 
                      />
                    )}

                    {view === AppView.CHAT && (
                      <ChatAssistant state={assessmentState} />
                    )}

                    {view === AppView.GLOSSARY && (
                      <Glossary />
                    )}

                    {view === AppView.WITNESSES && (
                      <WitnessManager 
                        witnesses={witnesses}
                        onAddWitness={handleAddWitness}
                        onDeleteWitness={handleDeleteWitness}
                      />
                    )}
                    
                    {view === AppView.ASSESSMENT && (
                    <AssessmentCategory 
                        category={CATEGORIES.find(c => c.id === activeCategory)!}
                        state={assessmentState}
                        witnesses={witnesses}
                        onUpdate={updateEntry}
                        onNext={handleNextCategory}
                        onPrev={handlePrevCategory}
                        hasNext={hasNextCategory}
                        hasPrev={hasPrevCategory}
                    />
                    )}
                    
                    {view === AppView.REPORT && (
                    <Report state={assessmentState} witnesses={witnesses} />
                    )}
                </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;