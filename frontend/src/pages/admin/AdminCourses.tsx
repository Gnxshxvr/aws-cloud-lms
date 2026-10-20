import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { courseService } from '../../services/courseService';
import { useNotification } from '../../context/NotificationContext';
import { Course, CourseRosterStudent } from '../../types';
import { Modal } from '../../components/Modal';
import {
  BookOpen,
  Users,
  Plus,
  Sparkles,
  ClipboardList,
  GraduationCap,
  Calendar,
  Search,
  CheckCircle2,
  FileCheck2,
  UserCheck,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  Pencil,
  Trash2,
  RefreshCw,
  Layers,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

interface FacultyOption {
  id: number;
  full_name: string;
  email: string;
  department?: string;
}

export const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');
  const { showToast } = useNotification();

  // Create Course Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newDepartment, setNewDepartment] = useState('Computer Science');
  const [newFacultyId, setNewFacultyId] = useState<number | ''>('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Course Modal State
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editCourseName, setEditCourseName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editFacultyId, setEditFacultyId] = useState<number | ''>('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Course Modal State
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Generate 30 Students State
  const [generatingForCourseId, setGeneratingForCourseId] = useState<number | null>(null);

  // View Roster Modal State
  const [rosterCourse, setRosterCourse] = useState<Course | null>(null);
  const [roster, setRoster] = useState<CourseRosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [unenrollingStudentId, setUnenrollingStudentId] = useState<number | null>(null);

  // Import Excel Roster Modal State
  const [importCourse, setImportCourse] = useState<Course | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [previewStudents, setPreviewStudents] = useState<Array<{ name: string; email: string; student_id_number?: string }>>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesRes, facultyRes] = await Promise.all([
        courseService.listCourses(),
        courseService.getFacultyList().catch(() => ({ success: false, faculty: [] })),
      ]);
      setCourses(coursesRes.courses);
      if (facultyRes && facultyRes.faculty) {
        setFacultyList(facultyRes.faculty);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load courses.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute departments from available courses
  const departments = Array.from(new Set(courses.map((c) => c.department).filter(Boolean)));

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      !search ||
      c.course_code.toLowerCase().includes(search.toLowerCase()) ||
      c.course_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.faculty_name && c.faculty_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.faculty_email && c.faculty_email.toLowerCase().includes(search.toLowerCase()));

    const matchesDept = !deptFilter || c.department === deptFilter;
    const matchesFaculty = !facultyFilter || (c.faculty_id && String(c.faculty_id) === facultyFilter);

    return matchesSearch && matchesDept && matchesFaculty;
  });

  // Aggregated Stats
  const totalCourses = courses.length;
  const totalEnrollments = courses.reduce((sum, c) => sum + Number(c.enrolled_students_count || 0), 0);
  const uniqueFacultyCount = new Set(courses.map((c) => c.faculty_id).filter(Boolean)).size;
  const totalAssignments = courses.reduce((sum, c) => sum + Number(c.assignments_count || 0), 0);

  // Handle Create Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode || !newCourseName) {
      showToast('Course code and name are required', 'warning');
      return;
    }

    try {
      setCreating(true);
      const res = await courseService.createCourse({
        course_code: newCourseCode.trim().toUpperCase(),
        course_name: newCourseName.trim(),
        department: newDepartment.trim(),
        description: newDescription.trim(),
        faculty_id: newFacultyId !== '' ? Number(newFacultyId) : undefined,
      });

      showToast(`Course ${res.course.course_code} created successfully!`, 'success');
      setIsCreateModalOpen(false);
      setNewCourseCode('');
      setNewCourseName('');
      setNewDescription('');
      setNewFacultyId('');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create course.', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (course: Course) => {
    setEditCourse(course);
    setEditCourseCode(course.course_code);
    setEditCourseName(course.course_name);
    setEditDepartment(course.department || 'Computer Science');
    setEditFacultyId(course.faculty_id || '');
    setEditDescription(course.description || '');
  };

  // Handle Save Edit Course
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourse) return;

    try {
      setSavingEdit(true);
      const res = await courseService.updateCourse(editCourse.id, {
        course_code: editCourseCode.trim().toUpperCase(),
        course_name: editCourseName.trim(),
        department: editDepartment.trim(),
        description: editDescription.trim(),
        faculty_id: editFacultyId !== '' ? Number(editFacultyId) : undefined,
      });

      showToast(`Course ${res.course.course_code} updated successfully!`, 'success');
      setEditCourse(null);
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update course.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Delete Course
  const handleDeleteCourse = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      const res = await courseService.deleteCourse(deleteTarget.id);
      showToast(res.message || 'Course deleted successfully.', 'success');
      setDeleteTarget(null);
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to delete course.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Handle Generate 30 Students
  const handleGenerate30Students = async (course: Course) => {
    try {
      setGeneratingForCourseId(course.id);
      const res = await courseService.generate30Students(course.id);
      showToast(res.message, 'success');
      await loadData();
      if (rosterCourse && rosterCourse.id === course.id) {
        await handleOpenRoster(course);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to generate students', 'error');
    } finally {
      setGeneratingForCourseId(null);
    }
  };

  // Handle Open Roster Modal
  const handleOpenRoster = async (course: Course) => {
    setRosterCourse(course);
    setRosterLoading(true);
    setRosterSearch('');
    try {
      const details = await courseService.getCourseById(course.id);
      setRoster(details.roster || []);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load class roster', 'error');
    } finally {
      setRosterLoading(false);
    }
  };

  // Handle Unenroll Student
  const handleUnenrollStudent = async (studentId: number) => {
    if (!rosterCourse) return;
    try {
      setUnenrollingStudentId(studentId);
      await courseService.unenrollStudent(rosterCourse.id, studentId);
      showToast('Student removed from course roster.', 'success');
      setRoster((prev) => prev.filter((s) => s.id !== studentId));
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to remove student.', 'error');
    } finally {
      setUnenrollingStudentId(null);
    }
  };

  // Filtered Roster
  const filteredRoster = roster.filter(
    (s) =>
      s.full_name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      (s.student_id_number && s.student_id_number.toLowerCase().includes(rosterSearch.toLowerCase()))
  );

  // Handle Open Import Modal
  const handleOpenImport = (course: Course) => {
    setImportCourse(course);
    setExcelFile(null);
    setPreviewStudents([]);
  };

  // Handle Excel/CSV file selection and client-side parse preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const parsed: Array<{ name: string; email: string; student_id_number?: string }> = [];

        for (const row of data) {
          const keys = Object.keys(row);
          const nameKey = keys.find((k) =>
            /^(name|full[\s_-]?name|student[\s_-]?name|first[\s_-]?name)$/i.test(k.trim())
          );
          const emailKey = keys.find((k) =>
            /^(email|mail|email[\s_-]?id|mail[\s_-]?id|institutional[\s_-]?email)$/i.test(k.trim())
          );
          const idKey = keys.find((k) =>
            /^(student[\s_-]?id|id|roll[\s_-]?no|reg[\s_-]?no)$/i.test(k.trim())
          );

          const name = nameKey ? String(row[nameKey]).trim() : '';
          const email = emailKey ? String(row[emailKey]).trim().toLowerCase() : '';
          const student_id_number = idKey ? String(row[idKey]).trim() : undefined;

          if (name && email && email.includes('@')) {
            parsed.push({ name, email, student_id_number });
          }
        }

        setPreviewStudents(parsed);
        if (parsed.length === 0) {
          showToast('No valid student rows found. Ensure columns contain "Name" and "Email".', 'warning');
        }
      } catch (parseErr) {
        showToast('Failed to parse spreadsheet file. Please check file format.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (!importCourse || (!excelFile && previewStudents.length === 0)) {
      showToast('Please select a valid Excel or CSV file first', 'warning');
      return;
    }

    try {
      setImporting(true);
      const res = await courseService.importRoster(
        importCourse.id,
        excelFile ? excelFile : previewStudents
      );

      showToast(
        `Imported ${res.total_processed} students (${res.new_accounts_created} new accounts, ${res.newly_enrolled} enrolled)!`,
        'success'
      );
      setImportCourse(null);
      setExcelFile(null);
      setPreviewStudents([]);
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to import roster', 'error');
    } finally {
      setImporting(false);
    }
  };

  // Download Sample Excel Template
  const downloadSampleTemplate = () => {
    const templateData = [
      { 'Student Name': 'Alice Walker', 'Email ID': 'alice.walker@portal.edu', 'Student ID': 'STU-2026-001' },
      { 'Student Name': 'Bob Miller', 'Email ID': 'bob.miller@portal.edu', 'Student ID': 'STU-2026-002' },
      { 'Student Name': 'Catherine Zhang', 'Email ID': 'catherine.zhang@portal.edu', 'Student ID': 'STU-2026-003' },
      { 'Student Name': 'David Patel', 'Email ID': 'david.patel@portal.edu', 'Student ID': 'STU-2026-004' },
      { 'Student Name': 'Emma Johnson', 'Email ID': 'emma.johnson@portal.edu', 'Student ID': 'STU-2026-005' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Class Roster');
    XLSX.writeFile(workbook, 'Academic_Class_Roster_Template.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Admin Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-purple-200 border border-white/10 mb-3">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Institutional Curriculum Oversight
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Course & Curriculum Management</h1>
            <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
              Oversee academic courses across all departments, reassign faculty instructors, import verified student rosters from spreadsheets, or provision batch mock student pools.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Course</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-md transition-colors border border-white/10"
              title="Refresh course data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Courses</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalCourses}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{departments.length} Academic Depts</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Enrollments</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{totalEnrollments}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across all rosters</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Faculty</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{uniqueFacultyCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Assigned instructors</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assignments</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{totalAssignments}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Course deliverables</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course code, title, instructor name or email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="">All Faculty</option>
              {facultyList.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.full_name}
                </option>
              ))}
            </select>
          </div>

          {(search || deptFilter || facultyFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setDeptFilter('');
                setFacultyFilter('');
              }}
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Courses List / Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[350px] bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No courses found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {search || deptFilter || facultyFilter
              ? 'No courses match the active search filters. Try adjusting your parameters.'
              : 'No courses exist in the institution database yet. Click "Create New Course" above.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Course Info</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Assigned Faculty</th>
                  <th className="py-3 px-4 text-center">Roster</th>
                  <th className="py-3 px-4 text-center">Assignments</th>
                  <th className="py-3 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Course Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {course.course_code.split('-')[0] || 'CS'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {course.course_code}
                            </span>
                            <span className="font-bold text-slate-900 line-clamp-1">{course.course_name}</span>
                          </div>
                          {course.description && (
                            <p className="text-slate-400 text-[11px] line-clamp-1 mt-0.5 max-w-sm">
                              {course.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                        {course.department}
                      </span>
                    </td>

                    {/* Assigned Faculty */}
                    <td className="py-3.5 px-4">
                      {course.faculty_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {course.faculty_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{course.faculty_name}</p>
                            <p className="text-slate-400 text-[10px]">{course.faculty_email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Roster Count */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenRoster(course)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                        title="View Class Roster"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{course.enrolled_students_count || 0} Students</span>
                      </button>
                    </td>

                    {/* Assignments Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                        <span>{course.assignments_count || 0}</span>
                      </span>
                    </td>

                    {/* Admin Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Generate 30 Students */}
                        <button
                          onClick={() => handleGenerate30Students(course)}
                          disabled={generatingForCourseId === course.id}
                          className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Generate 30 Random Students & Submissions"
                        >
                          <Sparkles
                            className={`w-4 h-4 ${generatingForCourseId === course.id ? 'animate-spin' : ''}`}
                          />
                        </button>

                        {/* Import Excel Roster */}
                        <button
                          onClick={() => handleOpenImport(course)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Import Class Roster from Excel/CSV"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>

                        {/* Edit Course */}
                        <button
                          onClick={() => handleOpenEdit(course)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                          title="Edit Course Information"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Delete Course */}
                        <button
                          onClick={() => setDeleteTarget(course)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Delete Course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE COURSE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Institutional Course"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Course Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CS-401"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Course Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Advanced Cloud Engineering & Distributed Systems"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assigned Faculty Instructor
            </label>
            <select
              value={newFacultyId}
              onChange={(e) => setNewFacultyId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select Faculty Instructor (Optional)</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name} ({f.email}) — {f.department || 'Faculty'}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              The assigned faculty will have direct ownership to create assignments, grade submissions, and manage this course.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Course Description</label>
            <textarea
              rows={3}
              placeholder="Brief overview of course curriculum, syllabus, and learning objectives..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
            >
              {creating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Course</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT COURSE MODAL */}
      <Modal
        isOpen={Boolean(editCourse)}
        onClose={() => setEditCourse(null)}
        title={`Edit Course: ${editCourse?.course_code}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Course Code</label>
              <input
                type="text"
                value={editCourseCode}
                onChange={(e) => setEditCourseCode(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Course Name</label>
            <input
              type="text"
              value={editCourseName}
              onChange={(e) => setEditCourseName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assigned Faculty Instructor
            </label>
            <select
              value={editFacultyId}
              onChange={(e) => setEditFacultyId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Unassigned</option>
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.full_name} ({f.email}) — {f.department || 'Faculty'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Course Description</label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditCourse(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
            >
              {savingEdit ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE COURSE CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Course Confirmation"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">This action cannot be undone.</p>
              <p className="mt-0.5 text-rose-700">
                Are you sure you want to delete <span className="font-mono font-bold">{deleteTarget?.course_code}</span> ({deleteTarget?.course_name})? This will also unenroll all associated students.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteCourse}
              disabled={deleting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
            >
              {deleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* VIEW ROSTER MODAL */}
      <Modal
        isOpen={Boolean(rosterCourse)}
        onClose={() => setRosterCourse(null)}
        title={`Class Roster: ${rosterCourse?.course_code} — ${rosterCourse?.course_name}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students by name, email, or student ID..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => rosterCourse && handleOpenImport(rosterCourse)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
              <button
                onClick={() => rosterCourse && handleGenerate30Students(rosterCourse)}
                disabled={generatingForCourseId === rosterCourse?.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 ${generatingForCourseId === rosterCourse?.id ? 'animate-spin' : ''}`}
                />
                <span>Generate 30</span>
              </button>
            </div>
          </div>

          {rosterLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No students enrolled in this course yet.
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Student ID</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3 text-center">Submissions</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{student.full_name}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {student.student_id_number || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{student.email}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-600">
                        {student.submission_count || 0}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleUnenrollStudent(student.id)}
                          disabled={unenrollingStudentId === student.id}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline disabled:opacity-50"
                        >
                          {unenrollingStudentId === student.id ? 'Removing...' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span>
              Total enrolled: <strong className="text-slate-800">{roster.length}</strong> students
            </span>
            <button
              onClick={() => setRosterCourse(null)}
              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* IMPORT EXCEL ROSTER MODAL */}
      <Modal
        isOpen={Boolean(importCourse)}
        onClose={() => setImportCourse(null)}
        title={`Import Class Roster: ${importCourse?.course_code}`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Upload Excel or CSV Spreadsheet
            </p>
            <p className="text-[11px] text-indigo-700">
              Columns required: <strong>Student Name</strong> and <strong>Email / Mail ID</strong> (optional: Student ID / Roll No). Students will be added to this course, and institutional accounts will be provisioned automatically if not already registered.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample Excel Template (.xlsx)</span>
            </button>
          </div>

          {/* File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-purple-500 bg-slate-50/50 hover:bg-purple-50/30 rounded-2xl p-6 text-center cursor-pointer transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <Upload className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-800">
              {excelFile ? excelFile.name : 'Click to select or drag & drop class roster (.xlsx, .xls, .csv)'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {excelFile ? `${(excelFile.size / 1024).toFixed(1)} KB` : 'Maximum file size 10MB'}
            </p>
          </div>

          {/* Preview Table */}
          {previewStudents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Preview: {previewStudents.length} Students Identified</span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Import
                </span>
              </p>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Student ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewStudents.slice(0, 15).map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 font-semibold text-slate-800">{s.name}</td>
                        <td className="py-1.5 px-3 text-slate-600">{s.email}</td>
                        <td className="py-1.5 px-3 font-mono text-[10px] text-slate-500">
                          {s.student_id_number || 'Auto'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewStudents.length > 15 && (
                <p className="text-[10px] text-slate-400 italic text-right">
                  + {previewStudents.length - 15} more rows found in spreadsheet...
                </p>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setImportCourse(null);
                setExcelFile(null);
                setPreviewStudents([]);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing || previewStudents.length === 0}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
            >
              {importing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Importing Roster...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Import {previewStudents.length} Students</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default AdminCourses;
