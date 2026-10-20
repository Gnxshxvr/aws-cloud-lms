import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assignmentService } from '../../services/assignmentService';
import { courseService } from '../../services/courseService';
import { useNotification } from '../../context/NotificationContext';
import { FileUploader } from '../../components/FileUploader';
import { Course } from '../../types';
import {
  FilePlus2,
  Calendar,
  Award,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  Save,
} from 'lucide-react';

export const FacultyCreateAssignment: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [courses, setCourses] = useState<Course[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    course_code: 'CS-401',
    course_name: 'Advanced Cloud Engineering',
    description: '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_time: '23:59',
    max_marks: 100,
    allowed_file_types: 'pdf,docx,zip',
    max_file_size_mb: 25,
    status: 'published' as 'published' | 'draft',
  });

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const res = await courseService.listCourses();
        setCourses(res.courses);
        if (res.courses.length > 0) {
          setFormData((prev) => ({
            ...prev,
            course_code: res.courses[0].course_code,
            course_name: res.courses[0].course_name,
          }));
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    loadCourses();
  }, []);

  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      showToast('Please provide both title and description.', 'warning');
      return;
    }

    try {
      setLoading(true);

      const submissionPayload = new FormData();
      submissionPayload.append('title', formData.title);
      submissionPayload.append('course_code', formData.course_code);
      submissionPayload.append('course_name', formData.course_name);
      submissionPayload.append('description', formData.description);

      // Combine date and time
      const combinedDueDate = new Date(`${formData.due_date}T${formData.due_time}:00`).toISOString();
      submissionPayload.append('due_date', combinedDueDate);

      submissionPayload.append('max_marks', formData.max_marks.toString());
      submissionPayload.append('allowed_file_types', formData.allowed_file_types);
      submissionPayload.append('max_file_size_mb', formData.max_file_size_mb.toString());
      submissionPayload.append('status', formData.status);

      if (referenceFile) {
        submissionPayload.append('reference_file', referenceFile);
      }

      await assignmentService.createAssignment(submissionPayload);
      showToast(`Assignment '${formData.title}' created and published successfully!`, 'success');
      navigate('/faculty/assignments');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create assignment.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/faculty/assignments')}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create New Assignment</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure submission guidelines and upload reference materials to Amazon S3.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
        {/* Course Selection */}
        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
          <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Select Handled Course</span>
          </label>
          {courses.length > 0 && (
            <select
              value={formData.course_code}
              onChange={(e) => {
                const selected = courses.find((c) => c.course_code === e.target.value);
                if (selected) {
                  setFormData((prev) => ({
                    ...prev,
                    course_code: selected.course_code,
                    course_name: selected.course_name,
                  }));
                } else {
                  handleChange(e);
                }
              }}
              className="w-full mb-3 px-3.5 py-2.5 rounded-xl border border-amber-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.course_code}>
                  [{c.course_code}] {c.course_name} ({c.enrolled_students_count || 0} enrolled students)
                </option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Course Code
              </label>
              <input
                type="text"
                name="course_code"
                value={formData.course_code}
                onChange={handleChange}
                placeholder="e.g. CS-401"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Course Name
              </label>
              <input
                type="text"
                name="course_name"
                value={formData.course_name}
                onChange={handleChange}
                placeholder="e.g. Advanced Cloud Engineering"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Assignment Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Assignment Title *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Microservices Architecture on AWS EC2 & S3"
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* Description & Detailed Instructions */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Detailed Assignment Description & Submission Guidelines *
          </label>
          <textarea
            name="description"
            rows={5}
            value={formData.description}
            onChange={handleChange}
            placeholder="Outline expected deliverables, rubric criteria, formatting guidelines, and architectural components..."
            required
            className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed"
          ></textarea>
        </div>

        {/* Deadlines, Marks & Limits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Due Date *
            </label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Due Time *
            </label>
            <input
              type="time"
              name="due_time"
              value={formData.due_time}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Max Marks
            </label>
            <input
              type="number"
              name="max_marks"
              value={formData.max_marks}
              onChange={handleChange}
              min={1}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Max File Size (MB)
            </label>
            <input
              type="number"
              name="max_file_size_mb"
              value={formData.max_file_size_mb}
              onChange={handleChange}
              min={1}
              max={100}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        {/* Allowed formats and Publishing Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Allowed File Formats (comma separated)
            </label>
            <input
              type="text"
              name="allowed_file_types"
              value={formData.allowed_file_types}
              onChange={handleChange}
              placeholder="pdf,docx,zip"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Example: pdf, docx, zip, txt</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Initial Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            >
              <option value="published">Published (Visible to students immediately)</option>
              <option value="draft">Draft (Save privately)</option>
            </select>
          </div>
        </div>

        {/* Optional reference document attachment for S3 */}
        <div className="pt-2 border-t border-slate-100">
          <FileUploader
            onFileSelect={(file) => setReferenceFile(file)}
            allowedExtensions="pdf,docx,zip,txt"
            maxSizeMb={30}
            label="Optional Reference Material / Project Brief (S3 Upload)"
            helperText="Upload project specifications, rubric documents, or starter archives."
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/faculty/assignments')}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Publish Assignment</span>
          </button>
        </div>
      </form>
    </div>
  );
};
