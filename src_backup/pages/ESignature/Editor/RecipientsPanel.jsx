import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Users, Plus, Trash2, User, Mail, Eye, PenTool,
  GripVertical, Check, X
} from 'lucide-react';

export default function RecipientsPanel({
  signers,
  signingOrder,
  onSigningOrderChange,
  onAddSigner,
  onRemoveSigner,
  onUpdateSigner,
  selectedSignerId,
  onSelectSigner,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSigner, setNewSigner] = useState({ name: '', email: '', role: 'signer' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const handleAdd = async () => {
    if (!newSigner.name.trim() || !newSigner.email.trim()) {
      toast.error('Enter name and email');
      return;
    }
    await onAddSigner(newSigner);
    setNewSigner({ name: '', email: '', role: 'signer' });
    setShowAddForm(false);
  };

  const startEdit = (signer) => {
    setEditingId(signer.id);
    setEditData({ name: signer.name, email: signer.email, role: signer.role });
  };

  const saveEdit = async () => {
    await onUpdateSigner(editingId, editData);
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      {/* Header + signing order toggle */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="font-black text-[#0F1C2E]">Recipients</h3>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
              {signers.length}
            </span>
          </div>
        </div>

        {/* Parallel / Sequential toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => onSigningOrderChange('parallel')}
            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
              signingOrder === 'parallel'
                ? 'bg-white text-[#0F1C2E] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Parallel
          </button>
          <button
            onClick={() => onSigningOrderChange('sequential')}
            className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
              signingOrder === 'sequential'
                ? 'bg-white text-[#0F1C2E] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sequential
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 font-medium">
          {signingOrder === 'parallel'
            ? 'All signers receive email simultaneously.'
            : 'Signers are notified one after another in order.'}
        </p>
      </div>

      {/* Signers list */}
      <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {signers.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 font-medium">
              No recipients yet
            </div>
          ) : (
            signers.map((signer, idx) => {
              const isEditing = editingId === signer.id;
              const isSelected = selectedSignerId === signer.id;

              return (
                <motion.div
                  key={signer.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => !isEditing && onSelectSigner(signer.id)}
                  className={`p-2.5 rounded-xl border-2 transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Order badge for sequential */}
                  {signingOrder === 'sequential' && (
                    <div className="absolute -left-2 -top-2 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shadow-md"
                      style={{ backgroundColor: signer.color }}>
                      {idx + 1}
                    </div>
                  )}

                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        placeholder="Name"
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-medium"
                      />
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        placeholder="Email"
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-medium"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={saveEdit}
                          className="flex-1 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Color chip / avatar */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm"
                        style={{ backgroundColor: signer.color }}
                      >
                        {signer.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <div className="text-xs font-bold text-[#0F1C2E] truncate">
                            {signer.name}
                          </div>
                          {signer.role === 'viewer' && (
                            <Eye className="w-3 h-3 text-slate-400 shrink-0" title="Viewer only" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium truncate">
                          {signer.email}
                        </div>
                      </div>

                      {/* Action buttons (show on hover) */}
                      <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(signer);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="Edit"
                        >
                          <User className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove ${signer.name}?`)) onRemoveSigner(signer.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>

        {/* Add signer form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <input
                  type="text"
                  value={newSigner.name}
                  onChange={(e) => setNewSigner({ ...newSigner, name: e.target.value })}
                  placeholder="Full name"
                  autoFocus
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg font-medium focus:outline-none focus:border-blue-500"
                />
                <input
                  type="email"
                  value={newSigner.email}
                  onChange={(e) => setNewSigner({ ...newSigner, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg font-medium focus:outline-none focus:border-blue-500"
                />
                <select
                  value={newSigner.role}
                  onChange={(e) => setNewSigner({ ...newSigner, role: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="signer">🖋 Signer</option>
                  <option value="viewer">👁 Viewer (read-only)</option>
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={handleAdd}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewSigner({ name: '', email: '', role: 'signer' });
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 text-slate-500 hover:text-blue-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add recipient
          </button>
        )}
      </div>
    </div>
  );
}