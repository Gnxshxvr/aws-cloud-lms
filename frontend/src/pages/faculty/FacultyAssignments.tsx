import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assignmentService } from '../../services/assignmentService';
import { useNotification } from '../../context/NotificationContext';
import { Assignment } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import {
  PlusCircle,
  Clock,
  Calendar,
  Trash2,
  ExternalLink,
  Download,
  AlertTriangle,
  BellRing,
} from 'lucide-react';

export const FacultyAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const res = await assignmentService.listAssignments();
      setAssignments(res.assignments);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to fetch assignments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const handleStatusChange = async (assign: Assignment, newStatus: 'published' | 'closed' | 'draft') => {
    try {
      const formData = new FormData();
      formData.append('status', newStatus);
      await assignmentService.updateAssignment(assign.id, formData);
      showToast(`Assignment '${assign.title}' status updated to ${newStatus}.`, 'success');
      loadAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update assignment status.', 'error');
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete assignment '${title}'? This action is permanent.`)) {
      return;
    }

    try {
      await assignmentService.deleteAssignment(id);
      showToast(`Assignment '${title}' deleted successfully.`, 'success');
      loadAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete assignment.', 'error');
    }
  };

  const handleSendReminder = async (id: number, title: string) => {
    try {
      const res = await assignmentService.sendDeadlineReminder(id);
      showToast(res.message || `24h reminder emails dispatched for '${title}'.`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to dispatch deadline reminder.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Course Assignments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your assignments, adjust deadlines, publish drafts, and access student submissions.
          </p>
        </div>

        <Link
          to="/faculty/create-assignment"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Assignment</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No assignments created yet</h3>
          <p className="text-xs text-slate-500 mt-1">Get started by creating your first course assignment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {assignments.map((assign) => (
            <div
              key={assign.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-900">
                    {assign.course_code}
                  </span>
                  <StatusBadge status={assign.status} />
                </div>

                <h3 className="text-base font-bold text-slate-900">{assign.title}</h3>
                <p className="text-xs text-slate-400 font-semibold">{assign.course_name}</p>

                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {assign.description}
                </p>

                {/* Reference file info */}
                {assign.reference_file_name && assign.reference_download_url && (
                  <div className="mt-3 p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-900 truncate">
                      📎 {assign.reference_file_name}
                    </span>
                    <a
                      href={assign.reference_download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> S3
                    </a>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Due: {new Date(assign.due_date).toLocaleDateString()}
                  </span>
                  <span className="font-bold text-slate-800">
                    {assign.total_submissions || 0} Submissions
                  </span>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {assign.status === 'published' && (
                    <button
                      onClick={() => handleStatusChange(assign, 'closed')}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Close assignment to prevent new submissions"
                    >
                      Close Submissions
                    </button>
                  )}
                  {assign.status === 'closed' && (
                    <button
                      onClick={() => handleStatusChange(assign, 'published')}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Reopen assignment"
                    >
                      Reopen
                    </button>
                  )}
                  {assign.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(assign, 'published')}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      Publish
                    </button>
                  )}

                  {assign.status === 'published' && (
                    <button
                      onClick={() => handleSendReminder(assign.id, assign.title)}
                      className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1 border border-amber-200"
                      title="Dispatch 24h deadline reminder to unsubmitted students"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                      <span>24h Reminder</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(assign.id, assign.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Link
                  to={`/faculty/submissions?assignmentId=${assign.id}`}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>Review Submissions ({assign.total_submissions || 0})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
