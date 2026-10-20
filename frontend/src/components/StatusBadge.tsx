import React from 'react';
import { CheckCircle2, Clock, AlertCircle, FileCheck, FileText, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status: 'published' | 'draft' | 'closed' | 'submitted' | 'late' | 'graded';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  switch (status) {
    case 'published':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Published
        </span>
      );
    case 'draft':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          <FileText className="w-3 h-3 text-slate-500" />
          Draft
        </span>
      );
    case 'closed':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
          <Ban className="w-3 h-3 text-rose-500" />
          Closed
        </span>
      );
    case 'submitted':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
          <FileCheck className="w-3 h-3 text-blue-500" />
          Submitted
        </span>
      );
    case 'late':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
          <Clock className="w-3 h-3 text-amber-500" />
          Late Submission
        </span>
      );
    case 'graded':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}>
          <CheckCircle2 className="w-3 h-3 text-purple-500" />
          Graded
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-600 ${sizeClasses}`}>
          <AlertCircle className="w-3 h-3" />
          {status}
        </span>
      );
  }
};
