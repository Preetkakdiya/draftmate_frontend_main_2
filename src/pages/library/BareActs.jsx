import React, { useState, useMemo } from 'react';
import ActCard from '../../components/library/ActCard';
import { mockBareActs, categories } from '../../data/mockBareActs';

const BareActs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredActs = useMemo(() => {
    return mockBareActs.filter(act => {
      const matchesSearch = 
        act.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        searchTerm.toLowerCase().includes('section'); // Basic fallback for now, real section search requires deep search

      const matchesCategory = selectedCategory === 'All' || act.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto flex flex-col">
      <div className="max-w-6xl mx-auto w-full space-y-8 flex-1">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bare Acts Library</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Browse, search, and understand Indian laws.</p>
          </div>
          
          <div className="w-full md:w-96 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              type="text" 
              placeholder="Search by Act Name, Short Name, or Section..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex overflow-x-auto pb-2 scrollbar-none gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filteredActs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredActs.map(act => (
              <ActCard key={act.id} act={act} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-400 text-3xl">search_off</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No acts found</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm">We couldn't find any Bare Acts matching your search criteria. Try a different keyword or category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BareActs;
