import React, { useEffect, useState } from 'react';
import { assignmentService } from '../../services/assignmentService';
import { submissionService } from '../../services/submissionService';
import { useNotification } from '../../context/NotificationContext';
import { Assignment } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { FileUploader } from '../../components/FileUploader';
import {
  Search,
  Clock,
  Award,
  Download,
  Calendar,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  Send,
  Lock,
  Unlock,
} from 'lucide-react';

export const StudentAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filtered, setFiltered] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  // Submit Modal state
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal state
  const [viewDetailAssignment, setViewDetailAssignment] = useState<Assignment | null>(null);

  const { showToast } = useNotification();

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const res = await assignmentService.listAssignments();
      setAssignments(res.assignments);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load assignments.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  useEffect(() => {
    let result = [...assignments];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.course_code.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    // Tab filter
    if (filterTab === 'pending') {
      result = result.filter((a) => !a.my_submission_id && a.status === 'published');
    } else if (filterTab === 'submitted') {
      result = result.filter((a) => !!a.my_submission_id);
    } else if (filterTab === 'graded') {
      result = result.filter((a) => a.my_grade_status === 'published');
    }

    setFiltered(result);
  }, [assignments, search, filterTab]);

  const handleOpenSubmit = (assign: Assignment) => {
    setSelectedAssignment(assign);
    setFileToUpload(null);
    setIsSubmitModalOpen(true);
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !fileToUpload) {
      showToast('Please select a file to submit.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await submissionService.submitAssignment(selectedAssignment.id, fileToUpload);
      showToast(res.message, res.status === 'late' ? 'warning' : 'success');
      setIsSubmitModalOpen(false);
      setFileToUpload(null);
      await loadAssignments();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to submit assignment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Available Assignments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View course expectations, access faculty reference documents, and submit deliverables to Amazon S3.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search course, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Assignments ({assignments.length})
        </button>
        <button
          onClick={() => setFilterTab('pending')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'pending'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Pending Action ({assignments.filter((a) => !a.my_submission_id && a.status === 'published').length})
        </button>
        <button
          onClick={() => setFilterTab('submitted')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'submitted'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Submitted ({assignments.filter((a) => !!a.my_submission_id).length})
        </button>
        <button
          onClick={() => setFilterTab('graded')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filterTab === 'graded'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Evaluated ({assignments.filter((a) => a.my_grade_status === 'published').length})
        </button>
      </div>

      {/* Assignments Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80">
          <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No assignments found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query or switching to another filter tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((assign) => {
            const hasSubmitted = !!assign.my_submission_id;
            const isOverdue = new Date(assign.due_date) < new Date();
            const isClosed = assign.status === 'closed';

            return (
              <div
                key={assign.id}
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  {/* Card Header badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {assign.course_code}
                    </span>
                    <StatusBadge status={hasSubmitted ? (assign.my_submission_status || 'submitted') : assign.status} />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">{assign.title}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{assign.course_name}</p>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                    {assign.description}
                  </p>

                  {/* Submission Evaluation Highlights */}
                  {hasSubmitted && assign.my_grade_status === 'published' && assign.my_marks_awarded !== null && (
                    <div className="mt-3.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Unlock className="w-4 h-4 text-emerald-600" /> Marks Released:
                      </span>
                      <span className="text-xs font-black text-emerald-800">
                        {assign.my_marks_awarded} / {assign.max_marks} marks
                      </span>
                    </div>
                  )}

                  {hasSubmitted && assign.my_submission_status === 'graded' && assign.my_grade_status !== 'published' && (
                    <div className="mt-3.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-600" /> Evaluation Recorded:
                      </span>
                      <span className="text-[11px] font-semibold text-amber-800">
                        Marks Pending Release 🔒
                      </span>
                    </div>
                  )}

                  {/* Specs Pill Box */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date:
                      </span>
                      <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                        {new Date(assign.due_date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-slate-400" /> Max Marks:
                      </span>
                      <span className="font-semibold text-slate-800">{assign.max_marks} pts</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Allowed Types:</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-600 uppercase">
                        {assign.allowed_file_types}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setViewDetailAssignment(assign)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    View Details
                  </button>

                  {isClosed ? (
                    <span className="text-xs font-bold text-slate-400">Assignment Closed</span>
                  ) : (
                    <button
                      onClick={() => handleOpenSubmit(assign)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ${
                        hasSubmitted
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{hasSubmitted ? 'Resubmit Work' : 'Submit Work'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title={`Submit: ${selectedAssignment?.title}`}
        subtitle={`${selectedAssignment?.course_code} • Max File Size: ${selectedAssignment?.max_file_size_mb}MB`}
      >
        {selectedAssignment && (
          <form onSubmit={handleSubmitAssignment} className="space-y-4">
            {new Date(selectedAssignment.due_date) < new Date() && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Notice: Submission Deadline Passed</p>
                  <p className="mt-0.5">This file will be tagged as Late Submission in faculty records.</p>
                </div>
              </div>
            )}

            <FileUploader
              onFileSelect={(file) => setFileToUpload(file)}
              allowedExtensions={selectedAssignment.allowed_file_types}
              maxSizeMb={selectedAssignment.max_file_size_mb}
              label="Select Submission File"
              helperText="The file will be encrypted and stored in Amazon S3."
            />

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!fileToUpload || submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading to Amazon S3...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Upload Submission</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Assignment Detail Modal */}
      <Modal
        isOpen={!!viewDetailAssignment}
        onClose={() => setViewDetailAssignment(null)}
        title={viewDetailAssignment?.title || 'Assignment Details'}
        subtitle={`${viewDetailAssignment?.course_code} • ${viewDetailAssignment?.course_name}`}
        maxWidth="xl"
      >
        {viewDetailAssignment && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Faculty Instructor
              </p>
              <p className="text-sm font-bold text-slate-800">
                {viewDetailAssignment.faculty_name} ({viewDetailAssignment.faculty_email})
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Assignment Instructions
              </h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {viewDetailAssignment.description}
              </p>
            </div>

            {/* Reference file attachment */}
            {viewDetailAssignment.reference_download_url && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-900">Faculty Reference Document</p>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    {viewDetailAssignment.reference_file_name || 'Assignment_Materials.pdf'}
                  </p>
                </div>
                <a
                  href={viewDetailAssignment.reference_download_url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download S3 File</span>
                </a>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewDetailAssignment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
