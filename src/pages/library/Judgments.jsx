import React, { useState, useMemo } from 'react';
import JudgmentCard from '../../components/library/JudgmentCard';
import { mockJudgments, judgmentCategories, judgmentCourts } from '../../data/mockJudgments';

const Judgments = () => {
  const [searchTerm, setSearchTerm]           = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCourt, setSelectedCourt]     = useState('All');
  const [activeTab, setActiveTab]             = useState('all'); // 'all' | 'saved'
  const [savedRefresh, setSavedRefresh]       = useState(0);

  const filteredJudgments = useMemo(() => {
    return mockJudgments.filter(j => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.citation.toLowerCase().includes(q) ||
        j.tags.some(t => t.toLowerCase().includes(q)) ||
        j.parties.petitioner.toLowerCase().includes(q) ||
        j.parties.respondent.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'All' || j.category === selectedCategory;
      const matchesCourt    = selectedCourt === 'All' || j.court === selectedCourt;
      return matchesSearch && matchesCategory && matchesCourt;
    });
  }, [searchTerm, selectedCategory, selectedCourt]);

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto flex flex-col">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Judgment Library</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Search and save landmark Indian court decisions.
            </p>
          </div>

          {/* Search */}
          <div className="w-full md:w-96 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Search by party, citation, or keyword..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          {[['all', 'All Judgments'], ['saved', 'Saved']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        {activeTab === 'all' && (
          <div className="flex flex-wrap gap-4">
            {/* Category pills */}
            <div className="flex overflow-x-auto pb-1 scrollbar-none gap-2 flex-1">
              {judgmentCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Court dropdown */}
            <select
              value={selectedCourt}
              onChange={e => setSelectedCourt(e.target.value)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
            >
              {judgmentCourts.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All Courts' : c}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Judgment Grid ── */}
        {activeTab === 'all' ? (
          filteredJudgments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredJudgments.map(j => (
                <JudgmentCard key={j.id} judgment={j} onSaveToggle={() => setSavedRefresh(p => p + 1)} />
              ))}
            </div>
          ) : (
            <EmptyState message="No judgments match your search." sub="Try a different keyword, court, or category." />
          )
        ) : (
          <SavedJudgments key={savedRefresh} />
        )}
      </div>
    </div>
  );
};

// ── Saved Tab ──────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { judgmentService } from '../../services/library/judgmentService';
import { Link } from 'react-router-dom';

const SavedJudgments = () => {
  const [savedList, setSavedList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    judgmentService.getSavedJudgments().then(d => { setSavedList(d); setIsLoading(false); });
  }, []);

  const handleRemove = async (id) => {
    await judgmentService.removeJudgment(id);
    setSavedList(prev => prev.filter(j => j.id !== id));
  };

  if (isLoading) return <div className="flex justify-center p-12"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></div>;

  if (savedList.length === 0) return (
    <EmptyState
      message="No saved judgments yet."
      sub="Browse the library and click the bookmark icon to save important cases here."
      action={{ label: 'Browse Judgments', onClick: () => {} }}
    />
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {savedList.map(j => (
        <div key={j.id} className="flex flex-col p-5 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all group">
          <div className="flex justify-between items-start gap-3 mb-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">{j.court}</span>
            <button onClick={() => handleRemove(j.id)} title="Remove" className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100">
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
          <Link to={`/dashboard/library/judgments/${j.id}`} className="font-bold text-slate-900 dark:text-white text-base leading-snug hover:text-primary transition-colors mb-1 line-clamp-2">{j.title}</Link>
          <p className="text-xs font-mono text-slate-500 mb-2">{j.citation}</p>
          <p className="text-xs text-slate-400">Saved {new Date(j.savedAt).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};

// ── Empty State ────────────────────────────────────────────────────────────
const EmptyState = ({ message, sub }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
      <span className="material-symbols-outlined text-slate-400 text-3xl">gavel</span>
    </div>
    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{message}</h3>
    <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{sub}</p>
  </div>
);

export default Judgments;
