import React from 'react';
import { motion } from 'framer-motion';
import { PenTool, Type, Calendar, User, Hash } from 'lucide-react';

const FIELD_TYPES = [
  { id: 'signature', label: 'Signature', icon: PenTool, description: 'Draw or type signature' },
  { id: 'initials', label: 'Initials', icon: Hash, description: 'Short initials' },
  { id: 'date', label: 'Date', icon: Calendar, description: 'Auto-filled date' },
  { id: 'name', label: 'Name', icon: User, description: 'Signer full name' },
  { id: 'text', label: 'Text', icon: Type, description: 'Free-form text' },
];

export default function FieldsPalette({ activeFieldType, onSelectFieldType, disabled = false }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2">
        <PenTool className="w-4 h-4 text-slate-400" />
        <h3 className="font-black text-[#0F1C2E]">Fields</h3>
      </div>

      <div className="p-3">
        {disabled && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-800 font-medium">
            💡 Select a recipient first to place fields
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {FIELD_TYPES.map((ft) => (
            <motion.button
              key={ft.id}
              whileHover={disabled ? {} : { scale: 1.03 }}
              whileTap={disabled ? {} : { scale: 0.97 }}
              onClick={() => !disabled && onSelectFieldType(ft.id)}
              disabled={disabled}
              className={`p-3 rounded-xl border-2 transition-all text-left ${
                disabled
                  ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-50'
                  : activeFieldType === ft.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <ft.icon className={`w-4 h-4 mb-1.5 ${
                activeFieldType === ft.id && !disabled ? 'text-blue-600' : 'text-slate-500'
              }`} />
              <div className={`text-xs font-bold ${
                activeFieldType === ft.id && !disabled ? 'text-blue-700' : 'text-[#0F1C2E]'
              }`}>
                {ft.label}
              </div>
            </motion.button>
          ))}
        </div>

        <p className="text-[10px] text-slate-400 mt-3 font-medium leading-relaxed">
          {activeFieldType && !disabled
            ? `👆 Click anywhere on the document to place a ${activeFieldType} field for the selected recipient.`
            : 'Select a field type, then click on the PDF to place it.'
          }
        </p>
      </div>
    </div>
  );
}