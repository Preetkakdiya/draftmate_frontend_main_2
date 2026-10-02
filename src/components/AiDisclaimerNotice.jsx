import React from 'react';
import { Info } from 'lucide-react';

const AiDisclaimerNotice = ({ className = '', style = {}, text = 'AI can make mistakes. Always verify outputs before relying on them.' }) => {
  return (
    <div 
      className={`flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 py-1.5 px-3 select-none ${className}`} 
      style={style}
    >
      <Info size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />
      <span>{text}</span>
    </div>
  );
};

export default AiDisclaimerNotice;
