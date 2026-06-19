import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { bookmarkService } from '../../services/library/bookmarkService';

const SectionToolbar = ({ act, chapter, section, onAddNote, onAIExplain }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  useEffect(() => {
    checkBookmarkStatus();
  }, [act.id, section.number]);

  const checkBookmarkStatus = async () => {
    const existing = await bookmarkService.isBookmarked(act.id, section.number);
    if (existing) {
      setIsBookmarked(true);
      setBookmarkId(existing.id);
    } else {
      setIsBookmarked(false);
      setBookmarkId(null);
    }
  };

  const fetchFolders = async () => {
    const f = await bookmarkService.getFolders();
    setFolders(f);
    if (f.length > 0) setSelectedFolder(f[0].id);
  };

  const handleBookmarkClick = async () => {
    if (isBookmarked) {
      // Remove bookmark
      await bookmarkService.removeBookmark(bookmarkId);
      setIsBookmarked(false);
      setBookmarkId(null);
      toast.success('Bookmark removed');
    } else {
      // Show save modal
      await fetchFolders();
      setShowFolderModal(true);
    }
  };

  const handleSaveBookmark = async () => {
    try {
      const b = await bookmarkService.addBookmark({
        actId: act.id,
        actName: act.name,
        actShortName: act.shortName,
        chapterId: chapter?.id,
        chapterTitle: chapter?.title,
        sectionNumber: section.number,
        sectionTitle: section.title,
        folderId: selectedFolder
      });
      setIsBookmarked(true);
      setBookmarkId(b.id);
      setShowFolderModal(false);
      toast.success('Section bookmarked successfully');
    } catch (error) {
      toast.error('Failed to save bookmark');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const newFolder = await bookmarkService.addFolder(newFolderName.trim());
      await fetchFolders();
      setSelectedFolder(newFolder.id);
      setIsCreatingFolder(false);
      setNewFolderName('');
      toast.success('Folder created');
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  const handleCopy = () => {
    const textToCopy = `Section ${section.number} - ${section.title}\n\n${section.content}\n\n(Source: ${act.name})`;
    navigator.clipboard.writeText(textToCopy);
    toast.success('Section copied to clipboard');
  };

  const handleShare = () => {
    // Basic share API or copy link
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button 
          onClick={handleBookmarkClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isBookmarked ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
        >
          <span className={`material-symbols-outlined text-[18px] ${isBookmarked ? 'icon-fill' : ''}`}>bookmark</span>
          {isBookmarked ? 'Saved' : 'Bookmark'}
        </button>
        <button 
          onClick={onAddNote}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">edit_note</span>
          Add Note
        </button>
        <button 
          onClick={onAIExplain}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors ml-auto"
        >
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          AI Explain
        </button>
        <button 
          onClick={handleCopy}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          title="Copy Section"
        >
          <span className="material-symbols-outlined text-[18px]">content_copy</span>
        </button>
        <button 
          onClick={handleShare}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          title="Share Link"
        >
          <span className="material-symbols-outlined text-[18px]">share</span>
        </button>
      </div>

      {/* Save Bookmark Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Save Bookmark</h3>
              <button onClick={() => setShowFolderModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Folder</label>
                <select 
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                >
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {!isCreatingFolder ? (
                <button 
                  onClick={() => setIsCreatingFolder(true)}
                  className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span> Create new folder
                </button>
              ) : (
                <div className="flex gap-2 items-center">
                  <input 
                    type="text"
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                    autoFocus
                  />
                  <button 
                    onClick={handleCreateFolder}
                    className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                    className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/30">
              <button 
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveBookmark}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SectionToolbar;
