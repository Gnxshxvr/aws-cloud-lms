import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { assignmentService } from '../../services/assignmentService';
import { submissionService } from '../../services/submissionService';
import { useNotification } from '../../context/NotificationContext';
import { Assignment, Submission } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  Download,
  Award,
  CheckCircle2,
  FileCheck2,
  Clock,
  User,
  MessageSquare,
  Search,
  Filter,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Sparkles,
  BellRing,
} from 'lucide-react';

export const FacultySubmissionsView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlAssignmentId = searchParams.get('assignmentId');
  const urlCourseCode = searchParams.get('course');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(urlCourseCode || 'all');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>(urlAssignmentId || '');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignmentMeta, setAssignmentMeta] = useState<{ id: number; title: string; max_marks: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');

  // Grading Modal State
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [marksAwarded, setMarksAwarded] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [gradeStatus, setGradeStatus] = useState<'draft' | 'published'>('published');
  const [savingGrade, setSavingGrade] = useState(false);

  // Bulk Reveal Loading State
  const [revealingBulk, setRevealingBulk] = useState(false);

  const { showToast } = useNotification();

  // Load faculty's assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await assignmentService.listAssignments();
        setAssignments(res.assignments);

        if (!selectedAssignmentId && res.assignments.length > 0) {
          if (urlCourseCode) {
            const courseMatch = res.assignments.find((a) => a.course_code === urlCourseCode);
            if (courseMatch) {
              setSelectedAssignmentId(courseMatch.id.toString());
              return;
            }
          }
          setSelectedAssignmentId(res.assignments[0].id.toString());
        }
      } catch (err) {
        console.error('Failed to load assignments:', err);
      }
    };
    fetchAssignments();
  }, [urlCourseCode]);

  // Load submissions whenever selectedAssignmentId changes
  const loadSubmissions = async (assignId: string) => {
    if (!assignId) return;
    try {
      setLoading(true);
      const res = await submissionService.getAssignmentSubmissions(assignId);
      setSubmissions(res.submissions);
      setAssignmentMeta(res.assignment);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load assignment submissions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAssignmentId) {
      loadSubmissions(selectedAssignmentId);
      setSearchParams({ assignmentId: selectedAssignmentId });
    }
  }, [selectedAssignmentId]);

  const handleDownload = async (sub: Submission) => {
    try {
      const res = await submissionService.getDownloadUrl(sub.id);
      const link = document.createElement('a');
      link.href = res.downloadUrl;
      link.target = '_blank';
      link.download = res.fileName || 'student-submission';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloading S3 file: ${res.fileName}`, 'info');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to download submission.', 'error');
    }
  };

  const openGradingModal = (sub: Submission) => {
    setGradingSubmission(sub);
    setMarksAwarded(sub.marks_awarded !== null && sub.marks_awarded !== undefined ? sub.marks_awarded : 0);
    setFeedback(sub.faculty_feedback || '');
    setGradeStatus(sub.grade_status || 'published');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    if (marksAwarded < 0 || (assignmentMeta && marksAwarded > assignmentMeta.max_marks)) {
      showToast(`Marks must be between 0 and ${assignmentMeta?.max_marks || 100}.`, 'warning');
      return;
    }

    try {
      setSavingGrade(true);
      await submissionService.gradeSubmission(gradingSubmission.id, {
        marks_awarded: marksAwarded,
        faculty_feedback: feedback,
        grade_status: gradeStatus,
      });

      showToast(
        gradeStatus === 'published'
          ? `Marks (${marksAwarded}/${assignmentMeta?.max_marks}) revealed to ${gradingSubmission.student_name}.`
          : 'Grade saved as draft (marks hidden from student).',
        'success'
      );

      setGradingSubmission(null);
      await loadSubmissions(selectedAssignmentId);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to save grade.', 'error');
    } finally {
      setSavingGrade(false);
    }
  };

  // 1-Click Toggle Single Submission Mark Reveal
  const handleToggleSingleMarkReveal = async (sub: Submission) => {
    const nextStatus = sub.grade_status === 'published' ? 'draft' : 'published';
    try {
      await submissionService.revealSubmissionMark(sub.id, nextStatus);
      showToast(
        nextStatus === 'published'
          ? `Mark (${sub.marks_awarded}) revealed to ${sub.student_name}!`
          : `Mark for ${sub.student_name} hidden (draft mode).`,
        'success'
      );
      await loadSubmissions(selectedAssignmentId);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update mark visibility', 'error');
    }
  };

  // Bulk Reveal All Marks
  const handleRevealAllMarks = async () => {
    if (!selectedAssignmentId) return;
    try {
      setRevealingBulk(true);
      const res = await submissionService.revealAllAssignmentMarks(selectedAssignmentId);
      showToast(`Marks revealed to students for all ${res.revealed_count} evaluated submissions!`, 'success');
      await loadSubmissions(selectedAssignmentId);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reveal all marks', 'error');
    } finally {
      setRevealingBulk(false);
    }
  };

  // Bulk Hide All Marks
  const handleHideAllMarks = async () => {
    if (!selectedAssignmentId) return;
    try {
      setRevealingBulk(true);
      const res = await submissionService.hideAllAssignmentMarks(selectedAssignmentId);
      showToast(`All marks for this assignment set to draft (hidden from students).`, 'info');
      await loadSubmissions(selectedAssignmentId);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to hide all marks', 'error');
    } finally {
      setRevealingBulk(false);
    }
  };

  // Dispatch 24h Reminder
  const [sendingReminder, setSendingReminder] = useState(false);
  const handleSendReminder = async () => {
    if (!selectedAssignmentId) return;
    try {
      setSendingReminder(true);
      const res = await assignmentService.sendDeadlineReminder(selectedAssignmentId);
      showToast(res.message || '24h deadline reminder emails dispatched to pending students.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to dispatch deadline reminders.', 'error');
    } finally {
      setSendingReminder(false);
    }
  };

  // Distinct courses for selector
  const distinctCourses = Array.from(new Set(assignments.map((a) => a.course_code)));

  const filteredAssignments =
    selectedCourse === 'all'
      ? assignments
      : assignments.filter((a) => a.course_code === selectedCourse);

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      (sub.student_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.student_id_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.student_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.file_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return sub.status !== 'graded';
    if (statusFilter === 'graded') return sub.status === 'graded';
    return true;
  });

  const gradedCount = submissions.filter((s) => s.status === 'graded').length;
  const publishedCount = submissions.filter((s) => s.status === 'graded' && s.grade_status === 'published').length;
  const draftCount = submissions.filter((s) => s.status === 'graded' && s.grade_status !== 'published').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
              Evaluation & Mark Reveal Control
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Submissions & Grading</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Download deliverables from Amazon S3, evaluate deliverables, and reveal marks to students.
          </p>
        </div>

        {/* Filters for Course & Assignment */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Course Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Course:</label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                const c = e.target.value;
                setSelectedCourse(c);
                const matching = assignments.filter((a) => c === 'all' || a.course_code === c);
                if (matching.length > 0) {
                  setSelectedAssignmentId(matching[0].id.toString());
                }
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm"
            >
              <option value="all">All Courses</option>
              {distinctCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Assignment:</label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-sm max-w-xs truncate"
            >
              {filteredAssignments.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.course_code}] {a.title} ({a.total_submissions || 0} subs)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mark Reveal Control Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Unlock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              Mark Reveal Status
              {draftCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  {draftCount} Drafts Withheld
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-400/20 text-emerald-300 font-bold border border-emerald-400/30">
                  All Graded Marks Released
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {publishedCount} revealed to students • {draftCount} hidden in draft • {submissions.length - gradedCount} pending evaluation
            </p>
          </div>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRevealAllMarks}
            disabled={revealingBulk || gradedCount === 0}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-1.5 disabled:opacity-40"
            title="Publish all graded marks so students can view scores & feedback"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Reveal All Marks (🔓 Publish)</span>
          </button>

          <button
            onClick={handleHideAllMarks}
            disabled={revealingBulk || publishedCount === 0}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 disabled:opacity-40 border border-white/10"
            title="Hide all marks back to draft mode"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Hide All Marks (🔒)</span>
          </button>

          <button
            onClick={handleSendReminder}
            disabled={sendingReminder || !selectedAssignmentId}
            className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-1.5 disabled:opacity-40"
            title="Dispatch 24h deadline reminder to enrolled students who have not yet submitted"
          >
            <BellRing className={`w-3.5 h-3.5 ${sendingReminder ? 'animate-spin' : ''}`} />
            <span>Send 24h Reminder ⏰</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, ID, file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({submissions.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'pending' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Needs Grading ({submissions.filter((s) => s.status !== 'graded').length})
          </button>
          <button
            onClick={() => setStatusFilter('graded')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'graded' ? 'bg-amber-500 text-slate-950' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Graded ({submissions.filter((s) => s.status === 'graded').length})
          </button>
        </div>
      </div>

      {/* Submissions Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80">
          <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No submissions found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {submissions.length === 0
              ? 'No students have submitted to this assignment yet. You can enroll 30 random students from "My Courses"!'
              : 'No submissions match your active search filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Student Information</th>
                  <th className="py-3.5 px-6">Deliverable (Amazon S3)</th>
                  <th className="py-3.5 px-6">Submitted</th>
                  <th className="py-3.5 px-6">Submission Status</th>
                  <th className="py-3.5 px-6">Score & Reveal Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSubmissions.map((sub) => {
                  const isGraded = sub.status === 'graded' && sub.marks_awarded !== null;
                  const isRevealed = isGraded && sub.grade_status === 'published';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Student info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {sub.student_name ? sub.student_name.charAt(0) : 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{sub.student_name}</p>
                            <p className="text-[11px] text-slate-400">
                              {sub.student_id_number || sub.student_email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* File Info */}
                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-800 truncate max-w-xs">{sub.file_name}</p>
                        <p className="text-[10px] text-slate-400">
                          {sub.file_size_bytes ? `${(sub.file_size_bytes / 1024).toFixed(0)} KB` : ''} • Amazon S3
                        </p>
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-6">
                        <p className="font-medium text-slate-700">
                          {new Date(sub.submitted_at).toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <StatusBadge status={sub.status} size="sm" />
                      </td>

                      {/* Marks & Reveal status badge */}
                      <td className="py-4 px-6">
                        {isGraded ? (
                          <div className="space-y-1">
                            <span className="font-black text-slate-900 text-sm">
                              {sub.marks_awarded} / {assignmentMeta?.max_marks || 100}
                            </span>
                            <div>
                              {isRevealed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Unlock className="w-3 h-3 text-emerald-600" />
                                  <span>Revealed to Student</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  <span>Hidden (Draft)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium italic">Unscored</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* S3 Download */}
                          <button
                            onClick={() => handleDownload(sub)}
                            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Download student submission from Amazon S3"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* 1-Click Reveal / Hide Mark button if already graded */}
                          {isGraded && (
                            <button
                              onClick={() => handleToggleSingleMarkReveal(sub)}
                              className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                                isRevealed
                                  ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
                                  : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                              title={isRevealed ? 'Hide mark from student' : 'Reveal mark to student'}
                            >
                              {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}

                          {/* Grade Modal button */}
                          <button
                            onClick={() => openGradingModal(sub)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 ${
                              isGraded
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{isGraded ? 'Edit' : 'Grade'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      <Modal
        isOpen={!!gradingSubmission}
        onClose={() => setGradingSubmission(null)}
        title={`Grade: ${gradingSubmission?.student_name}`}
        subtitle={`Max Marks: ${assignmentMeta?.max_marks || 100} • Deliverable: ${gradingSubmission?.file_name}`}
      >
        {gradingSubmission && (
          <form onSubmit={handleSaveGrade} className="space-y-4">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">{gradingSubmission.file_name}</p>
                <p className="text-[11px] text-slate-400">
                  Submitted: {new Date(gradingSubmission.submitted_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDownload(gradingSubmission)}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 text-xs font-bold text-indigo-600 shadow-sm flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open S3 File</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Marks Awarded (out of {assignmentMeta?.max_marks || 100}) *
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                max={assignmentMeta?.max_marks || 100}
                value={marksAwarded}
                onChange={(e) => setMarksAwarded(parseFloat(e.target.value) || 0)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Written Faculty Feedback & Commentary
              </label>
              <textarea
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Constructive feedback, rubric notes, suggestions for improvement..."
                className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed"
              ></textarea>
            </div>

            {/* Mark Reveal Visibility */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mark Reveal Option
              </label>
              <select
                value={gradeStatus}
                onChange={(e) => setGradeStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
              >
                <option value="published">🔓 Revealed (Student can immediately see score & feedback)</option>
                <option value="draft">🔒 Draft / Hidden (Kept private until official release)</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGradingSubmission(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingGrade}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingGrade ? (
                  <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Award className="w-4 h-4" />
                )}
                <span>Save Evaluation</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
