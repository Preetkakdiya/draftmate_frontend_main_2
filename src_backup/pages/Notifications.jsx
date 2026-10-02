import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, CheckCircle2, FileText, Calendar, Zap, 
  Settings, Check, AlertCircle, ArrowUpRight, ShieldCheck, Mail
} from 'lucide-react';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'document', label: 'Documents' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'system', label: 'AI & System' }
];

/* ─────────────────────────────────────────────────────────────
   Dynamic Notification Loader
───────────────────────────────────────────────────────────── */
const getDynamicNotifications = () => {
  const readIds = new Set(JSON.parse(localStorage.getItem('draftmate_read_notif_ids') || '[]'));
  const dismissedIds = new Set(JSON.parse(localStorage.getItem('draftmate_dismissed_notif_ids') || '[]'));

  const items = [];

  // 1. Dynamic Hearings from draftmate_hearings & draftmate_cases
  try {
    const hearings = JSON.parse(localStorage.getItem('draftmate_hearings') || '[]');
    const cases = JSON.parse(localStorage.getItem('draftmate_cases') || '[]');

    hearings.forEach(h => {
      const id = `hearing-${h.id || h.caseNumber}`;
      if (!dismissedIds.has(id)) {
        items.push({
          id,
          type: 'calendar',
          title: 'Upcoming Hearing Reminder',
          message: `Matter "${h.caseTitle || 'Case'}" (${h.caseNumber || 'N/A'}) is scheduled for ${h.hearingDate ? new Date(h.hearingDate).toLocaleDateString() : 'soon'} at ${h.court || 'Court'}.`,
          time: h.hearingDate ? new Date(h.hearingDate).toLocaleDateString() : 'Upcoming',
          unread: !readIds.has(id),
          icon: Calendar,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          action: 'View Agenda',
          link: '/dashboard/library/hearings'
        });
      }
    });

    cases.forEach(c => {
      if (c.nextHearingDate && c.caseNumber !== 'GEN-0001' && c.caseTitle !== 'General Documents') {
        const id = `case-hearing-${c.id || c.caseNumber}`;
        if (!dismissedIds.has(id) && !items.some(i => i.id === id || (c.caseNumber && i.message.includes(c.caseNumber)))) {
          items.push({
            id,
            type: 'calendar',
            title: 'Hearing Scheduled',
            message: `Matter "${c.caseTitle}" (${c.caseNumber}) at ${c.court || 'Court'} has a scheduled next hearing on ${new Date(c.nextHearingDate).toLocaleDateString()}.`,
            time: new Date(c.nextHearingDate).toLocaleDateString(),
            unread: !readIds.has(id),
            icon: Calendar,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            action: 'View Case',
            link: `/dashboard/library/cases/${c.id}`
          });
        }
      }
    });
  } catch (err) {
    console.warn("Failed to load hearing notifications:", err);
  }

  // 2. Dynamic Documents from draftmate_cases documents
  try {
    const cases = JSON.parse(localStorage.getItem('draftmate_cases') || '[]');
    cases.forEach(c => {
      if (c.documents && Array.isArray(c.documents)) {
        c.documents.forEach(doc => {
          const docName = doc.name || doc.filename || 'Legal Document';
          const id = `doc-${doc.id || docName}`;
          if (!dismissedIds.has(id)) {
            items.push({
              id,
              type: 'document',
              title: docName.includes('Translated') ? 'Translation Complete' : 'Draft Generation Complete',
              message: `Your document "${docName}" in matter "${c.caseTitle || 'General'}" is ready for editing and review in your workspace.`,
              time: 'Recent',
              unread: !readIds.has(id),
              icon: FileText,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
              border: 'border-blue-200',
              action: 'View Document',
              link: '/dashboard/document-management'
            });
          }
        });
      }
    });
  } catch (err) {
    console.warn("Failed to load document notifications:", err);
  }

  // 3. System Notification
  const systemId = 'system-workspace-active';
  if (!dismissedIds.has(systemId)) {
    items.push({
      id: systemId,
      type: 'system',
      title: 'DraftMate Legal Engine Active',
      message: 'Your DraftMate Legal AI workspace is fully active. AI drafting, research, and case tracking services are online.',
      time: 'Active',
      unread: !readIds.has(systemId),
      icon: Zap,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      action: 'Legal Library',
      link: '/dashboard/library/cases'
    });
  }

  return items;
};

/* ─────────────────────────────────────────────────────────────
   Main Notifications Component
───────────────────────────────────────────────────────────── */
export default function Notifications() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([]);

  const refreshNotifications = useCallback(() => {
    setNotifications(getDynamicNotifications());
  }, []);

  useEffect(() => {
    refreshNotifications();
    window.addEventListener('cases_updated', refreshNotifications);
    window.addEventListener('hearings_updated', refreshNotifications);
    window.addEventListener('tracked_cases_updated', refreshNotifications);
    return () => {
      window.removeEventListener('cases_updated', refreshNotifications);
      window.removeEventListener('hearings_updated', refreshNotifications);
      window.removeEventListener('tracked_cases_updated', refreshNotifications);
    };
  }, [refreshNotifications]);

  // Handlers
  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const readIds = new Set(JSON.parse(localStorage.getItem('draftmate_read_notif_ids') || '[]'));
    allIds.forEach(id => readIds.add(id));
    localStorage.setItem('draftmate_read_notif_ids', JSON.stringify(Array.from(readIds)));
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const markAsRead = (id) => {
    const readIds = new Set(JSON.parse(localStorage.getItem('draftmate_read_notif_ids') || '[]'));
    readIds.add(id);
    localStorage.setItem('draftmate_read_notif_ids', JSON.stringify(Array.from(readIds)));
    setNotifications(notifications.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const removeNotification = (id) => {
    const dismissedIds = new Set(JSON.parse(localStorage.getItem('draftmate_dismissed_notif_ids') || '[]'));
    dismissedIds.add(id);
    localStorage.setItem('draftmate_dismissed_notif_ids', JSON.stringify(Array.from(dismissedIds)));
    setNotifications(notifications.filter(n => n.id !== id));
  };

  // Filtering Logic
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return n.unread;
    return n.type === activeTab;
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-2">
      
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[24px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#0F1C2E] flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {unreadCount} New
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 font-medium">Stay updated on your cases, drafts, and schedule.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all border border-slate-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 hover:bg-slate-50 hover:text-blue-600"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark all as read
          </button>
          <button className="p-2.5 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── FILTER TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[#0F1C2E] text-white shadow-md'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 shadow-sm'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── NOTIFICATION LIST ── */}
      <div className="space-y-4 min-h-[400px]">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 border-dashed rounded-[24px] p-12 flex flex-col items-center justify-center text-center shadow-sm"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-[#0F1C2E] mb-1">You're all caught up!</h3>
              <p className="text-sm text-slate-500">No new notifications in this category right now.</p>
            </motion.div>
          ) : (
            filteredNotifications.map((note) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                key={note.id}
                onClick={() => markAsRead(note.id)}
                className={`relative bg-white rounded-[20px] p-5 md:p-6 transition-all duration-300 border hover:shadow-md cursor-pointer group ${
                  note.unread ? `border-blue-300 shadow-sm bg-blue-50/10` : 'border-slate-200 shadow-sm hover:border-blue-200 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Unread Dot */}
                {note.unread && (
                  <div className="absolute top-6 right-6 w-2.5 h-2.5 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
                )}

                <div className="flex items-start gap-4 md:gap-5">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 border ${note.bg} ${note.color} ${note.border}`}>
                    <note.icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  
                  <div className="flex-1 pr-6">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-1">
                      <h3 className={`text-base font-bold transition-colors ${note.unread ? 'text-[#0F1C2E]' : 'text-slate-700 group-hover:text-[#0F1C2E]'}`}>
                        {note.title}
                      </h3>
                      <span className="text-[11px] font-bold text-slate-400">{note.time}</span>
                    </div>
                    
                    <p className={`text-sm leading-relaxed mb-4 ${note.unread ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                      {note.message}
                    </p>
                    
                    <div className="flex items-center gap-3">
                      {note.action && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(note.id);
                            if (note.link) navigate(note.link);
                          }}
                          className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          {note.action} <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeNotification(note.id); }}
                        className="text-xs font-semibold text-slate-400 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* ── PREMIUM "COMING SOON" BANNER ── */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="mt-12 bg-gradient-to-br from-[#0F1C2E] to-slate-900 rounded-[24px] p-8 text-white relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-3">
            <Zap className="w-3 h-3" /> Coming Soon
          </div>
          <h3 className="text-xl font-bold mb-2">Advanced Notification Routing</h3>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            Soon you will be able to route urgent court deadlines and AI research completions directly to your Email and WhatsApp.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <button className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
            <Mail className="w-4 h-4" /> Notify Me When Live
          </button>
        </div>
      </motion.div>

    </div>
  );
}