import React, { useEffect, useState } from 'react';
import { submissionService } from '../../services/submissionService';
import { useNotification } from '../../context/NotificationContext';
import { Submission } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import {
  FileCheck2,
  Download,
  Award,
  Calendar,
  Clock,
  MessageSquare,
  FileText,
  AlertCircle,
  Lock,
  Unlock,
} from 'lucide-react';

export const StudentSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const { showToast } = useNotification();

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const res = await submissionService.getMySubmissions();
      setSubmissions(res.submissions);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load submissions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleDownload = async (sub: Submission) => {
    try {
      setDownloadingId(sub.id);
      const res = await submissionService.getDownloadUrl(sub.id);
      // Trigger download via anchor
      const link = document.createElement('a');
      link.href = res.downloadUrl;
      link.target = '_blank';
      link.download = res.fileName || 'submission-file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloading secure file from S3: ${res.fileName}`, 'info');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to get file download link.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Submissions & Evaluations</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Access your submitted archive from Amazon S3, track grading timestamps, and review faculty commentary.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80">
          <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No submissions found</h3>
          <p className="text-xs text-slate-500 mt-1">
            You haven't uploaded any deliverables yet. Check Available Assignments to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const isGraded = sub.grade_status === 'published' && sub.marks_awarded !== null;

            return (
              <div
                key={sub.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700">
                        {sub.course_code}
                      </span>
                      <StatusBadge status={sub.status} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{sub.assignment_title}</h3>
                    <p className="text-xs text-slate-400">Course: {sub.course_name}</p>
                  </div>

                  {/* Marks badge */}
                  {isGraded ? (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-right">
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Marks Released</span>
                      </p>
                      <p className="text-xl font-black text-emerald-900 mt-0.5">
                        {sub.marks_awarded} / {sub.max_marks || 100}
                      </p>
                    </div>
                  ) : sub.status === 'graded' ? (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-right">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center justify-end gap-1">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Marks Pending Release</span>
                      </p>
                      <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
                        Evaluation recorded • Withheld by faculty
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-right">
                      <p className="text-xs font-semibold text-slate-400">Grading Status</p>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">Awaiting Faculty Review</p>
                    </div>
                  )}
                </div>

                {/* File & Details row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File information pill */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 truncate">{sub.file_name}</p>
                        <p className="text-[11px] text-slate-400">{formatFileSize(sub.file_size_bytes)} • S3 Key: {sub.file_key}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownload(sub)}
                      disabled={downloadingId === sub.id}
                      className="shrink-0 ml-3 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 text-xs font-bold text-indigo-600 shadow-sm transition-all flex items-center gap-1.5"
                    >
                      {downloadingId === sub.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Download</span>
                    </button>
                  </div>

                  {/* Submission Timestamp details */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Submitted on: {new Date(sub.submitted_at).toLocaleString()}
                      </p>
                      {sub.graded_at && isGraded && (
                        <p className="flex items-center gap-1.5 text-purple-700 font-medium">
                          <Award className="w-3.5 h-3.5 text-purple-500" />
                          Evaluated on: {new Date(sub.graded_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Faculty Feedback block */}
                {isGraded && sub.faculty_feedback && (
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                      <MessageSquare className="w-4 h-4 text-purple-600" />
                      <span>Faculty Written Feedback</span>
                    </div>
                    <p className="text-xs text-purple-950 font-normal leading-relaxed pl-5 italic">
                      "{sub.faculty_feedback}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
