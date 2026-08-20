import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed? This action cannot be undone.',
    confirmText = 'Delete',
    cancelText = 'Cancel',
    variant = 'danger' // 'danger' | 'warning' | 'primary'
}) {
    if (!isOpen) return null;

    const isDanger = variant === 'danger';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                />

                {/* Modal Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 16 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden z-10 space-y-4"
                >
                    {/* Header */}
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl shrink-0 ${
                            isDanger
                                ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                                : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30'
                        }`}>
                            {isDanger ? (
                                <Trash2 className="w-6 h-6" />
                            ) : (
                                <AlertTriangle className="w-6 h-6" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                                {title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                {message}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors -mt-1 -mr-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm?.();
                                onClose();
                            }}
                            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 ${
                                isDanger
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20 hover:shadow-red-500/30'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 hover:shadow-blue-500/30'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
