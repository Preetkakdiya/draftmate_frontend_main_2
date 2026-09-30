import React from "react";
import { Link } from "react-router-dom";

const DictionaryCard = ({ term }) => {
  const isExactMatch = term.matchType === "EXACT";
  const isSimilarMatch = term.matchType === "SIMILAR";

  return (
    <Link to={`/dashboard/library/dictionary/${term.id}`} className="block">
      <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-all hover:shadow-md hover:border-primary/30 h-full">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
              {term.term}
            </h3>

            {(isExactMatch || isSimilarMatch) && (
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  isExactMatch
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                }`}
              >
                {isExactMatch ? "Exact Match" : "Similar Match"}
              </span>
            )}
          </div>

          <div className="text-primary shrink-0">
            <span className="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default DictionaryCard;