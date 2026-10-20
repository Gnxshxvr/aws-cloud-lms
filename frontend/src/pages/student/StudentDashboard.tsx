import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assignmentService } from '../../services/assignmentService';
import { submissionService } from '../../services/submissionService';
import { Assignment, Submission } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  Download,
  AlertCircle,
  Calendar,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignRes, subRes] = await Promise.all([
          assignmentService.listAssignments(),
          submissionService.getMySubmissions(),
        ]);
        setAssignments(assignRes.assignments);
        setSubmissions(subRes.submissions);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate quick stats
  const totalAssignments = assignments.length;
  const submittedCount = submissions.length;
  const pendingCount = assignments.filter((a) => !a.my_submission_id && a.status === 'published').length;

  const gradedSubmissions = submissions.filter((s) => s.grade_status === 'published' && s.marks_awarded !== null);
  const avgScore =
    gradedSubmissions.length > 0
      ? (
          gradedSubmissions.reduce((acc, curr) => acc + (curr.marks_awarded || 0), 0) /
          gradedSubmissions.length
        ).toFixed(1)
      : 'N/A';

  const upcomingAssignments = assignments
    .filter((a) => a.status === 'published')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-8 text-white shadow-xl shadow-indigo-950/10">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-indigo-200 border border-white/10 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Student Portal
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.full_name}! 👋
          </h1>
          <p className="mt-2 text-indigo-200 text-sm leading-relaxed">
            Manage your course deliverables, track submission deadlines, and review faculty evaluations backed by secure Amazon S3 storage.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/student/assignments"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs shadow-md transition-colors"
            >
              <span>Explore Assignments</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/student/submissions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-md transition-colors border border-white/10"
            >
              <span>View Grades & Feedback</span>
            </Link>
          </div>
        </div>

        {/* Ambient background blur elements */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Assignments</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalAssignments}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submitted</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{submittedCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Action</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Average Score</p>
            <p className="text-2xl font-black text-purple-600 mt-1">{avgScore}%</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two columns: Upcoming deadlines & Recent feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Upcoming Deadlines</h2>
            </div>
            <Link to="/student/assignments" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingAssignments.map((assign) => {
              const isOverdue = new Date(assign.due_date) < new Date();
              const hasSubmitted = !!assign.my_submission_id;

              return (
                <div
                  key={assign.id}
                  className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        {assign.course_code}
                      </span>
                      {hasSubmitted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Submitted
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                          Past Deadline
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Due Soon
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{assign.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Due: {new Date(assign.due_date).toLocaleDateString()} at{' '}
                      {new Date(assign.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <Link
                    to="/student/assignments"
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-500 text-xs font-bold text-indigo-600 shadow-sm transition-all"
                  >
                    {hasSubmitted ? 'View Submission' : 'Submit'}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Evaluations & Grades */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-bold text-slate-900">Recent Evaluations & Grades</h2>
            </div>
            <Link to="/student/submissions" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              Full History
            </Link>
          </div>

          {gradedSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No evaluations published yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Faculty feedback will appear here as soon as released.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {gradedSubmissions.slice(0, 3).map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-purple-50/20 hover:bg-purple-50/40 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                        {sub.course_code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{sub.assignment_title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Evaluated by {sub.faculty_name || 'Faculty'}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-purple-700">
                        {sub.marks_awarded} / {sub.max_marks || 100}
                      </span>
                      <p className="text-[11px] text-slate-400">Marks Awarded</p>
                    </div>
                  </div>

                  {sub.faculty_feedback && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-white/80 border border-purple-100 text-xs text-slate-700 italic">
                      "{sub.faculty_feedback}"
                    </div>
                  )}

                  {sub.download_url && (
                    <div className="mt-3 flex justify-end">
                      <a
                        href={sub.download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Evaluated Submission</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
