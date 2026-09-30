import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { dictionaryService } from "../../services/library/dictionaryService";
import DictionaryCard from "../../components/library/DictionaryCard";
import { toast } from "sonner";

const LIMIT = 20;

const Dictionary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [terms, setTerms] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const trimmedQuery = searchQuery.trim();

  useEffect(() => {
    let cancelled = false;

    const fetchTerms = async () => {
      try {
        setLoading(true);
        const res = await dictionaryService.searchTerms(trimmedQuery, 1, LIMIT);
        if (cancelled) return;
        setTerms(res.items || []);
        setTotal(res.total || 0);
        setPage(1);
      } catch (error) {
        if (cancelled) return;
        console.error("Dictionary fetch error:", error);
        toast.error("Failed to load dictionary");
        setTerms([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchTerms, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [trimmedQuery]);

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const res = await dictionaryService.searchTerms(
        trimmedQuery,
        nextPage,
        LIMIT
      );
      setTerms((prev) => [...prev, ...(res.items || [])]);
      setPage(nextPage);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load more terms");
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = terms.length < total;

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/dashboard/library"
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Legal Dictionary
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Your comprehensive guide to legal terms and Latin maxims
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <div className="relative z-10">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-20">
              search
            </span>

            <input
              type="text"
              placeholder="Search legal terms, Latin maxims, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse"
              >
                <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            ))}
          </div>
        ) : terms.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {terms.map((term) => (
                <DictionaryCard key={term.id} term={term} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-60 transition"
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
              search_off
            </span>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              No terms found
            </h3>

            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your search
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dictionary;