import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  ArrowRight,
  UserCheck,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
} from 'lucide-react';

export const FacultyCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useNotification();

  // Create Course Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Generate 30 Students State
  const [generatingForCourseId, setGeneratingForCourseId] = useState<number | null>(null);

  // View Roster Modal State
  const [rosterCourse, setRosterCourse] = useState<Course | null>(null);
  const [roster, setRoster] = useState<CourseRosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  // Import Excel Roster Modal State
  const [importCourse, setImportCourse] = useState<Course | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [previewStudents, setPreviewStudents] = useState<Array<{ name: string; email: string; student_id_number?: string }>>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await courseService.listCourses();
      setCourses(res.courses);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode || !courseName) {
      showToast('Course code and course name are required', 'warning');
      return;
    }

    try {
      setCreating(true);
      const res = await courseService.createCourse({
        course_code: courseCode.trim().toUpperCase(),
        course_name: courseName.trim(),
        department: department.trim(),
        description: description.trim(),
      });

      showToast(`Course ${res.course.course_code} created successfully!`, 'success');
      setIsCreateModalOpen(false);
      setCourseCode('');
      setCourseName('');
      setDescription('');
      await fetchCourses();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create course', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleGenerate30Students = async (course: Course) => {
    try {
      setGeneratingForCourseId(course.id);
      const res = await courseService.generate30Students(course.id);
      showToast(
        `Enrolled 30 students & created ${res.submissions_generated} sample submissions for ${course.course_code}!`,
        'success'
      );
      await fetchCourses();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to generate 30 students', 'error');
    } finally {
      setGeneratingForCourseId(null);
    }
  };

  const handleOpenRoster = async (course: Course) => {
    setRosterCourse(course);
    try {
      setRosterLoading(true);
      const res = await courseService.getCourseById(course.id);
      setRoster(res.roster);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to load course roster', 'error');
    } finally {
      setRosterLoading(false);
    }
  };

  // Open Excel Import Modal
  const handleOpenImportModal = (course: Course) => {
    setImportCourse(course);
    setExcelFile(null);
    setPreviewStudents([]);
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Full Name': 'Alexander Rivera',
        'Email ID': 'student@portal.edu',
        'Student ID': 'STU-2026-001',
      },
      {
        'Full Name': 'Sarah Chen',
        'Email ID': 'sarah.chen@portal.edu',
        'Student ID': 'STU-2026-042',
      },
      {
        'Full Name': 'Marcus Johnson',
        'Email ID': 'marcus.j@portal.edu',
        'Student ID': 'STU-2026-105',
      },
      {
        'Full Name': 'Emily Davis',
        'Email ID': 'emily.d@portal.edu',
        'Student ID': 'STU-2026-106',
      },
      {
        'Full Name': 'Liam Patel',
        'Email ID': 'liam.p@portal.edu',
        'Student ID': 'STU-2026-107',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'Student_Roster_Template.xlsx');
    showToast('Downloaded Excel roster template!', 'info');
  };

  // Handle Excel File Selection & Parse Preview
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
        const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const parsed: Array<{ name: string; email: string; student_id_number?: string }> = [];

        for (const row of rawRows) {
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
          showToast('Could not find Name and Email columns in the spreadsheet.', 'warning');
        } else {
          showToast(`Found ${parsed.length} students in "${file.name}" ready to import.`, 'info');
        }
      } catch (err) {
        showToast('Failed to parse spreadsheet file. Ensure it is valid .xlsx, .xls, or .csv', 'error');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit Excel Import to Backend
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCourse || !excelFile || previewStudents.length === 0) {
      showToast('Please select a valid Excel file containing student records', 'warning');
      return;
    }

    try {
      setImporting(true);
      const res = await courseService.importRoster(importCourse.id, excelFile);

      showToast(
        `Imported ${res.total_processed} students for ${res.course_code}! (${res.new_accounts_created} new accounts, ${res.newly_enrolled} enrolled)`,
        'success'
      );

      setImportCourse(null);
      setExcelFile(null);
      setPreviewStudents([]);
      await fetchCourses();

      // If roster modal was open for this course, refresh its roster too
      if (rosterCourse && rosterCourse.id === importCourse.id) {
        await handleOpenRoster(importCourse);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to import student roster', 'error');
    } finally {
      setImporting(false);
    }
  };

  const filteredRoster = roster.filter((stu) => {
    const q = rosterSearch.toLowerCase();
    return (
      stu.full_name.toLowerCase().includes(q) ||
      (stu.student_id_number && stu.student_id_number.toLowerCase().includes(q)) ||
      stu.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              Multi-Course Administration
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Courses & Class Rosters</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage different academic courses, import student cohorts from Excel/CSV (multi-course enrollment), and oversee deliverables.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Course</span>
        </button>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No courses assigned</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">You have not created any courses yet.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"
          >
            Create Your First Course
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => {
            const isGenerating = generatingForCourseId === course.id;

            return (
              <div
                key={course.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-mono font-bold text-xs border border-indigo-100">
                      {course.course_code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {course.department}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">
                    {course.course_name}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                    {course.description || 'Comprehensive curriculum with hands-on deliverables.'}
                  </p>

                  {/* Metrics Badges */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Enrolled</p>
                        <p className="text-xs font-black text-slate-800">
                          {course.enrolled_students_count || 0} Students
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Assignments</p>
                        <p className="text-xs font-black text-slate-800">
                          {course.assignments_count || 0} Created
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Import Excel Roster Button */}
                    <button
                      onClick={() => handleOpenImportModal(course)}
                      className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      title="Import students from an Excel / CSV spreadsheet"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Import Excel</span>
                    </button>

                    {/* Generate 30 Students Button */}
                    <button
                      onClick={() => handleGenerate30Students(course)}
                      disabled={isGenerating}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                      title="Auto-enroll 30 randomized students with demo deliverables"
                    >
                      {isGenerating ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Cohort 30</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenRoster(course)}
                      className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>View Roster</span>
                    </button>

                    <Link
                      to={`/faculty/submissions?course=${course.course_code}`}
                      className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 text-center"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Submissions</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import Excel Modal */}
      <Modal
        isOpen={!!importCourse}
        onClose={() => setImportCourse(null)}
        title={`Import Student Roster: ${importCourse?.course_code}`}
        subtitle="Upload an Excel (.xlsx / .xls) or CSV spreadsheet with student Name and Email (Mail ID). Students can belong to multiple courses."
      >
        {importCourse && (
          <form onSubmit={handleImportSubmit} className="space-y-4">
            {/* Template Download helper */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-950">Spreadsheet Format</p>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Headers: <span className="font-mono font-bold">Full Name</span>, <span className="font-mono font-bold">Email ID</span>, and optional <span className="font-mono font-bold">Student ID</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 hover:border-indigo-500 text-xs font-bold text-indigo-700 shadow-sm transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Template (.xlsx)</span>
              </button>
            </div>

            {/* File Upload Drop Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Upload Class Spreadsheet (.xlsx, .xls, .csv) *
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  {excelFile ? excelFile.name : 'Click to select or drag and drop spreadsheet'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports Microsoft Excel (.xlsx, .xls) and CSV format
                </p>
              </div>
            </div>

            {/* Parsed Preview Table */}
            {previewStudents.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Parsed {previewStudents.length} Students from Spreadsheet</span>
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Ready to enroll into {importCourse.course_code}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200 text-xs">
                  {previewStudents.map((stu, i) => (
                    <div key={i} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">{stu.name}</p>
                        <p className="text-[11px] text-slate-500">{stu.email}</p>
                      </div>
                      <span className="font-mono text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                        {stu.student_id_number || 'Auto ID'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-course info banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Multi-Course Enrollment:</strong> Students can be enrolled in multiple courses across your department. Existing student accounts will simply be added to this course roster with no disruption to their other courses.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setImportCourse(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={importing || previewStudents.length === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {importing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>Import & Enroll ({previewStudents.length})</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create Course Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add New Course"
        subtitle="Provision an additional academic course to manage assignments and students"
      >
        <form onSubmit={handleCreateCourse} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Course Code *
            </label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g. CS-201 or AWS-301"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Course Name *
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Data Structures and Algorithms"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Computer Science"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Course Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Overview of syllabus, deliverables, and learning objectives..."
              className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            ></textarea>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {creating ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Create Course</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Roster Modal */}
      <Modal
        isOpen={!!rosterCourse}
        onClose={() => setRosterCourse(null)}
        title={`Class Roster: ${rosterCourse?.course_code} - ${rosterCourse?.course_name}`}
        subtitle={`Total Enrolled: ${roster.length} Students (Supports multi-course enrollment)`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students by name, ID, or email..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {rosterCourse && (
              <button
                onClick={() => {
                  const target = rosterCourse;
                  setRosterCourse(null);
                  handleOpenImportModal(target);
                }}
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Import Excel</span>
              </button>
            )}
          </div>

          {rosterLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl">
              <p className="text-xs text-slate-500 mb-2">
                {roster.length === 0
                  ? 'No students enrolled in this course yet.'
                  : 'No students match your search.'}
              </p>
              {rosterCourse && (
                <button
                  onClick={() => {
                    const target = rosterCourse;
                    setRosterCourse(null);
                    handleOpenImportModal(target);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Import Students from Excel
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-100">
              {filteredRoster.map((student, idx) => (
                <div key={student.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-400 w-5">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {student.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{student.full_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {student.student_id_number || 'N/A'} • {student.email}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Enrolled
                    </span>
                    {student.submission_count !== undefined && student.submission_count > 0 && (
                      <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                        {student.submission_count} Deliverables
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
