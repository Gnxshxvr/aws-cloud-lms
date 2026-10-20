import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { submissionService } from '../../services/submissionService';
import { useNotification } from '../../context/NotificationContext';
import { Submission } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import {
  FileCheck2,
  Download,
  Search,
  Award,
  Calendar,
  Clock,
  User,
  BookOpen,
} from 'lucide-react';

export const AdminSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showToast } = useNotification();

  useEffect(() => {
    const fetchAllSubmissions = async () => {
      try {
        setLoading(true);
        const res = await adminService.listAllSubmissions();
        setSubmissions(res.submissions);
      } catch (err: any) {
        showToast(err.response?.data?.message || 'Failed to load platform submissions.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAllSubmissions();
  }, []);

  const handleDownload = async (sub: Submission) => {
    try {
      const res = await submissionService.getDownloadUrl(sub.id);
      const link = document.createElement('a');
      link.href = res.downloadUrl;
      link.target = '_blank';
      link.download = res.fileName || 'submission';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloading file from S3: ${res.fileName}`, 'info');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to download submission.', 'error');
    }
  };

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.student_name || '').toLowerCase().includes(q) ||
      (s.assignment_title || '').toLowerCase().includes(q) ||
      (s.course_code || '').toLowerCase().includes(q) ||
      (s.file_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform Submissions Oversight</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit deliverables, inspect evaluation records, and access Amazon S3 storage keys across all departments.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, course, file..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80">
          <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No submissions found</h3>
          <p className="text-xs text-slate-500 mt-1">There are no student submissions matching your search.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Student</th>
                  <th className="py-3.5 px-6">Course & Assignment</th>
                  <th className="py-3.5 px-6">Faculty Evaluator</th>
                  <th className="py-3.5 px-6">File (Amazon S3)</th>
                  <th className="py-3.5 px-6">Status & Marks</th>
                  <th className="py-3.5 px-6 text-right">S3 Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{sub.student_name}</p>
                      <p className="text-[11px] text-slate-400">{sub.student_email}</p>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px] mr-1.5">
                        {sub.course_code}
                      </span>
                      <span className="font-semibold text-slate-800">{sub.assignment_title}</span>
                    </td>

                    <td className="py-4 px-6 font-medium text-slate-600">
                      {sub.faculty_name || 'Faculty Member'}
                    </td>

                    <td className="py-4 px-6 font-mono text-[11px] text-slate-600 truncate max-w-xs">
                      {sub.file_name}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={sub.status} size="sm" />
                        {sub.marks_awarded !== null && sub.marks_awarded !== undefined && (
                          <span className="font-bold text-purple-800">
                            {sub.marks_awarded} / {sub.max_marks || 100}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleDownload(sub)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
