import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { dictionaryService } from "../../services/library/dictionaryService";
import { toast } from "sonner";

const TermDetails = () => {
  const { termId } = useParams();
  const [term, setTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTerm = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        const data = await dictionaryService.getTermById(termId);
        if (!cancelled) setTerm(data);
      } catch (error) {
        if (cancelled) return;
        if (error.status === 404) {
          setNotFound(true);
        } else {
          console.error(error);
          toast.error("Failed to load term");
        }
        setTerm(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTerm();
    return () => {
      cancelled = true;
    };
  }, [termId]);

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/dashboard/library/dictionary"
          className="inline-flex items-center gap-2 mb-6 text-slate-600 dark:text-slate-400 hover:text-primary"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Dictionary
        </Link>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        ) : notFound || !term ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
              search_off
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Term not found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              This term doesn't exist or isn't available.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl p-6 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
              {term.term}
            </h1>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {term.explanation}
            </p>
            {term.updated_at && (
              <p className="text-xs text-slate-400 mt-6">
                Last updated: {new Date(term.updated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TermDetails;