import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { mockJudgments } from '../../data/mockJudgments';
import { judgmentService } from '../../services/library/judgmentService';
import { notesService } from '../../services/library/notesService';

const DetailSection = ({ icon, title, children, accent = 'blue' }) => {
  const accentMap = {
    blue:    'border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10',
    amber:   'border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10',
    red:     'border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10',
    purple:  'border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-900/10',
    emerald: 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10',
    slate:   'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30',
  };
  return (
    <div className={`rounded-2xl border p-6 ${accentMap[accent]}`}>
      <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white mb-3">
        <span className="text-xl">{icon}</span>
        {title}
      </h3>
      <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{children}</div>
    </div>
  );
};

const JudgmentDetails = () => {
  const { judgmentId } = useParams();
  const judgment = mockJudgments.find(j => j.id === judgmentId);
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (judgment) judgmentService.isSaved(judgment.id).then(setIsSaved);
  }, [judgment?.id]);

  if (!judgment) {
    return (
      <div className="p-8 text-center h-full flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Judgment Not Found</h2>
        <Link to="/dashboard/library/judgments" className="mt-4 text-primary hover:underline">Return to Library</Link>
      </div>
    );
  }

  const handleSaveToggle = async () => {
    if (isSaved) {
      await judgmentService.removeJudgment(judgment.id);
      setIsSaved(false);
      toast.success('Removed from saved judgments');
    } else {
      await judgmentService.saveJudgment(judgment);
      setIsSaved(true);
      toast.success('Judgment saved');
    }
  };

  const handleCopy = () => {
    const text = [
      judgment.title,
      judgment.citation,
      '',
      `RATIO DECIDENDI\n${judgment.ratiodecidendi}`,
      '',
      `SUMMARY\n${judgment.summary}`,
      '',
      `KEY PRINCIPLES\n${judgment.keyPrinciples.map((p,i) => `${i+1}. ${p}`).join('\n')}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Judgment copied to clipboard');
  };

  const handleSaveToNotes = async () => {
    setIsSavingNote(true);
    try {
      await notesService.createNote({
        title: judgment.title,
        content: [
          `Citation: ${judgment.citation}`,
          `Court: ${judgment.court} (${judgment.year})`,
          `Bench: ${judgment.bench}`,
          '',
          `LEGAL ISSUE\n${judgment.legalIssue}`,
          '',
          `RATIO DECIDENDI\n${judgment.ratiodecidendi}`,
          '',
          `SUMMARY\n${judgment.summary}`,
          '',
          `KEY PRINCIPLES\n${judgment.keyPrinciples.map((p,i) => `${i+1}. ${p}`).join('\n')}`,
        ].join('\n'),
        tags: [judgment.category, judgment.court, ...judgment.tags.slice(0, 3)],
        linkedActId: null,
        linkedActName: null,
      });
      toast.success('Saved to My Notes');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 md:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151f2e] flex-shrink-0 z-10">
        <div className="flex items-start gap-4 max-w-5xl mx-auto">
          <Link to="/dashboard/library/judgments" className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors flex-shrink-0 mt-1">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">{judgment.court}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{judgment.category}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{judgment.citation}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">{judgment.title}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{judgment.bench} • {judgment.year}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleSaveToggle} title={isSaved ? 'Remove' : 'Save'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${isSaved ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/40' : 'bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <span className={`material-symbols-outlined text-[18px] ${isSaved ? 'icon-fill' : ''}`}>bookmark</span>
              <span className="hidden md:inline">{isSaved ? 'Saved' : 'Save'}</span>
            </button>
            <button onClick={handleCopy} title="Copy" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
              <span className="hidden md:inline">Copy</span>
            </button>
            <button onClick={handleSaveToNotes} disabled={isSavingNote} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span className="hidden md:inline">{isSavingNote ? 'Saving...' : 'Save to Notes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto space-y-5">

          {/* Parties & Judges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider mb-2">Parties</p>
              <p className="text-sm text-slate-800 dark:text-slate-200"><span className="font-semibold">Petitioner:</span> {judgment.parties.petitioner}</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 mt-1"><span className="font-semibold">Respondent:</span> {judgment.parties.respondent}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider mb-2">Judges</p>
              <ul className="space-y-0.5">
                {judgment.judges.map((j, i) => (
                  <li key={i} className="text-sm text-slate-800 dark:text-slate-200">{j}</li>
                ))}
              </ul>
            </div>
          </div>

          <DetailSection icon="⚖️" title="Legal Issue" accent="blue">
            {judgment.legalIssue}
          </DetailSection>

          <DetailSection icon="🏛" title="Ratio Decidendi (Binding Principle)" accent="purple">
            <p className="font-medium italic">{judgment.ratiodecidendi}</p>
          </DetailSection>

          <DetailSection icon="📖" title="Summary" accent="amber">
            {judgment.summary}
          </DetailSection>

          <DetailSection icon="📋" title="Key Principles" accent="emerald">
            <ul className="space-y-2">
              {judgment.keyPrinciples.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </DetailSection>

          {/* Tags & Related Acts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {judgment.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-medium">{tag}</span>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider mb-3">Related Acts</p>
              <ul className="space-y-1">
                {judgment.relatedActs.map(act => (
                  <li key={act} className="text-sm text-primary hover:underline cursor-pointer">{act}</li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default JudgmentDetails;
