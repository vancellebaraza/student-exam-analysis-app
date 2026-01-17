
import React from 'react';

interface StudyNoteCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  colorClass: string;
}

const StudyNoteCard: React.FC<StudyNoteCardProps> = ({ title, icon, children, colorClass }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all">
      <div className={`px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 ${colorClass} dark:bg-opacity-10`}>
        <i className={`${icon} text-lg`}></i>
        <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-sm">{title}</h3>
      </div>
      <div className="p-6 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
};

export default StudyNoteCard;
