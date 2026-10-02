import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus, FileText, Send, CheckCircle2, Clock, XCircle,
  PenTool, Users, Zap, Search, Filter, Sparkles
} from 'lucide-react';
import { esignService } from '../../services/esignService';
import AestheticHero from '../../components/AestheticHero';

const STATUS_STYLES = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', icon: FileText, label: 'Draft' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-600', icon: Send, label: 'Sent' },
  viewed: { bg: 'bg-purple-50', text: 'text-purple-600', icon: Clock, label: 'Viewed' },
  signed: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle2, label: 'Signed' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: CheckCircle2, label: 'Completed' },
  declined: { bg: 'bg-rose-50', text: 'text-rose-600', icon: XCircle, label: 'Voided' },
  expired: { bg: 'bg-amber-50', text: 'text-amber-600', icon: Clock, label: 'Expired' },
};

export default function ESignatureDashboard() {
  const navigate = useNavigate();
  const [envelopes, setEnvelopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadEnvelopes();
  }, []);

  const loadEnvelopes = async () => {
    try {
      const data = await esignService.listDocuments();
      setEnvelopes(data.documents || []);
    } catch (err) {
      toast.error('Failed to load envelopes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Stats
  const stats = {
    total: envelopes.length,
    pending: envelopes.filter(e => ['sent', 'viewed'].includes(e.status)).length,
    completed: envelopes.filter(e => e.status === 'completed').length,
    drafts: envelopes.filter(e => e.status === 'draft').length,
  };

  const filtered = envelopes.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── HERO HEADER ── */}
      <div className="mb-8 flex flex-col items-center">
        <AestheticHero
          badgeIcon="draw"
          badgeText="DraftMate E-Sign"
          title="Digital Signatures"
          highlightedTitle="Made Simple."
          subtitle="Send documents for legally-valid electronic signature. IT Act 2000 Compliant."
          inlineTitle={true}
        />
        <button
          onClick={() => navigate('/dashboard/esignature/new')}
          className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New Envelope</span>
        </button>
      </div>

      {/* ── STAT CARDS ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <StatCard
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Total Envelopes"
          value={stats.total}
        />
        <StatCard
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="Awaiting Signature"
          value={stats.pending}
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Completed"
          value={stats.completed}
        />
        <StatCard
          icon={PenTool}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          label="Drafts"
          value={stats.drafts}
        />
      </motion.div>

      {/* ── FILTERS & LIST ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-[24px] border border-slate-200/60 shadow-[0_4px_24px_rgba(15,28,46,0.04)] overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl focus-within:bg-white focus-within:border-blue-400 focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.1)] transition-all">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search envelopes..."
              className="bg-transparent border-none outline-none text-sm font-medium text-[#0F1C2E] w-full placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            {['all', 'draft', 'sent', 'completed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Envelope List */}
        <div className="p-2">
          {loading ? (
            <LoadingState />
          ) : filtered.length === 0 ? (
            envelopes.length === 0 ? (
              <EmptyState onCreate={() => navigate('/dashboard/esignature/new')} />
            ) : (
              <NoResultsState />
            )
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((env, idx) => (
                <EnvelopeRow
                  key={env.id}
                  envelope={env}
                  index={idx}
                  onClick={() => navigate(`/dashboard/esignature/${env.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function StatCard({ icon: Icon, iconBg, iconColor, label, value }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-[0_2px_12px_rgba(15,28,46,0.03)] hover:shadow-[0_4px_20px_rgba(15,28,46,0.06)] transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      <div className="text-3xl font-black text-[#0F1C2E] mb-1">{value}</div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
    </div>
  );
}

function EnvelopeRow({ envelope, index, onClick }) {
  const style = STATUS_STYLES[envelope.status] || STATUS_STYLES.draft;
  const StatusIcon = style.icon;
  const progress = envelope.total_signers > 0
    ? (envelope.signed_count / envelope.total_signers) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50/50 cursor-pointer transition-all group"
    >
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        <FileText className="w-5 h-5 text-blue-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-[#0F1C2E] truncate group-hover:text-blue-700 transition-colors">
            {envelope.name}
          </h3>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>
            <StatusIcon className="w-3 h-3" />
            {style.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {envelope.signed_count}/{envelope.total_signers} signed
          </span>
          <span>·</span>
          <span>{new Date(envelope.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {envelope.total_signers > 0 && (
        <div className="hidden md:flex flex-col items-end gap-1 w-32">
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400">{Math.round(progress)}%</span>
        </div>
      )}
    </motion.div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="py-20 px-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center shadow-inner"
      >
        <PenTool className="w-9 h-9 text-blue-600" />
      </motion.div>
      <h3 className="text-xl font-black text-[#0F1C2E] mb-2">No envelopes yet</h3>
      <p className="text-sm text-slate-500 font-medium mb-6 max-w-md mx-auto">
        Upload a PDF, add signers, and send it for electronic signature — all in one place.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 px-5 py-3 bg-[#0F1C2E] hover:bg-blue-900 text-white font-bold rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">Create your first envelope</span>
      </button>
    </div>
  );
}

function NoResultsState() {
  return (
    <div className="py-16 px-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Search className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-[#0F1C2E] mb-1">No matching envelopes</h3>
      <p className="text-sm text-slate-500 font-medium">Try adjusting your search or filters</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="p-4 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
          <div className="w-11 h-11 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 bg-slate-100 rounded" />
            <div className="h-3 w-1/3 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}