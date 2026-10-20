import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { assignmentService } from '../../services/assignmentService';
import { courseService } from '../../services/courseService';
import { Assignment, Course } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import {
  BookOpen,
  FileCheck2,
  Clock,
  PlusCircle,
  GraduationCap,
  ArrowRight,
  Calendar,
  Users,
  Sparkles,
  Unlock,
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacultyData = async () => {
      try {
        const [assignRes, courseRes] = await Promise.all([
          assignmentService.listAssignments(),
          courseService.listCourses(),
        ]);
        setAssignments(assignRes.assignments);
        setCourses(courseRes.courses);
      } catch (err) {
        console.error('Failed to load faculty dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFacultyData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalCourses = courses.length;
  const totalEnrolledStudents = courses.reduce((acc, curr) => acc + (curr.enrolled_students_count || 0), 0);
  const totalAssignments = assignments.length;
  const totalSubmissions = assignments.reduce((acc, curr) => acc + (curr.total_submissions || 0), 0);

  return (
    <div className="space-y-6">
      {/* Faculty Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-amber-200 border border-white/10 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Faculty Portal
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome, {user?.full_name}
          </h1>
          <p className="mt-2 text-slate-300 text-sm leading-relaxed">
            Manage courses, review student submissions stored securely on Amazon S3, grade deliverables, and control when marks are released to students.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/faculty/courses"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>My Courses</span>
            </Link>
            <Link
              to="/faculty/submissions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Unlock className="w-4 h-4" />
              <span>Review & Reveal Marks</span>
            </Link>
            <Link
              to="/faculty/create-assignment"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-md transition-colors border border-white/10"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Assignment</span>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Courses Handled</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalCourses}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Students</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{totalEnrolledStudents}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assignments</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalAssignments}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Submissions Received</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{totalSubmissions}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Courses Handled Quick Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Courses</h2>
            <p className="text-xs text-slate-500">Manage rosters, assignments, and evaluations per course</p>
          </div>
          <Link
            to="/faculty/courses"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700"
          >
            <span>Manage All Courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div key={c.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
              <div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {c.course_code}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1.5 line-clamp-1">{c.course_name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  👥 {c.enrolled_students_count || 0} students • 📝 {c.assignments_count || 0} assignments
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <Link
                  to={`/faculty/courses`}
                  className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Manage Roster</span>
                </Link>
                <Link
                  to={`/faculty/submissions?course=${c.course_code}`}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Submissions →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignments and Submissions Overview */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Active Assignments</h2>
            <p className="text-xs text-slate-500">Track student submission velocity and grading progress</p>
          </div>
          <Link
            to="/faculty/create-assignment"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Assignment</span>
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No assignments created yet</p>
            <p className="text-xs text-slate-400 mt-0.5">Click 'Create New Assignment' above to publish your first deliverable.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assign) => (
              <div
                key={assign.id}
                className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {assign.course_code}
                    </span>
                    <StatusBadge status={assign.status} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{assign.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Due: {new Date(assign.due_date).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>Max Marks: {assign.max_marks}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{assign.total_submissions || 0}</p>
                    <p className="text-[11px] text-slate-400">Submissions</p>
                  </div>

                  <Link
                    to={`/faculty/submissions?assignmentId=${assign.id}`}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-amber-500 text-xs font-bold text-amber-700 shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Review & Reveal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
