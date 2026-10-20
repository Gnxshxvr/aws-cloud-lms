import { api } from './api';
import { Course, CourseRosterStudent, Assignment } from '../types';

export interface CourseDetailsResponse {
  success: boolean;
  course: Course;
  roster: CourseRosterStudent[];
  assignments: Assignment[];
}

export const courseService = {
  // List courses
  listCourses: async (): Promise<{ success: boolean; count: number; courses: Course[] }> => {
    const res = await api.get('/courses');
    return res.data;
  },

  // Get course by ID with roster and assignments
  getCourseById: async (id: number | string): Promise<CourseDetailsResponse> => {
    const res = await api.get(`/courses/${id}`);
    return res.data;
  },

  // Get faculty list
  getFacultyList: async (): Promise<{ success: boolean; faculty: Array<{ id: number; full_name: string; email: string; department?: string }> }> => {
    const res = await api.get('/courses/faculty-list');
    return res.data;
  },

  // Create new course
  createCourse: async (data: {
    course_code: string;
    course_name: string;
    department?: string;
    description?: string;
    faculty_id?: number;
  }): Promise<{ success: boolean; message: string; course: Course }> => {
    const res = await api.post('/courses', data);
    return res.data;
  },

  // Update course
  updateCourse: async (
    id: number | string,
    data: {
      course_code?: string;
      course_name?: string;
      department?: string;
      description?: string;
      faculty_id?: number;
    }
  ): Promise<{ success: boolean; message: string; course: Course }> => {
    const res = await api.put(`/courses/${id}`, data);
    return res.data;
  },

  // Delete course
  deleteCourse: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/courses/${id}`);
    return res.data;
  },

  // Unenroll student from course
  unenrollStudent: async (
    courseId: number | string,
    studentId: number | string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/courses/${courseId}/students/${studentId}`);
    return res.data;
  },

  // Generate 30 random students for course
  generate30Students: async (
    courseId: number | string
  ): Promise<{
    success: boolean;
    message: string;
    course_code: string;
    students_count: number;
    submissions_generated: number;
    sample_students: Array<{ full_name: string; email: string; student_id_number: string }>;
  }> => {
    const res = await api.post(`/courses/${courseId}/generate-students`);
    return res.data;
  },

  // Import roster from Excel/CSV file or student array
  importRoster: async (
    courseId: number | string,
    fileOrStudents: File | Array<{ name: string; email: string; student_id_number?: string }>
  ): Promise<{
    success: boolean;
    message: string;
    course_code: string;
    total_processed: number;
    new_accounts_created: number;
    newly_enrolled: number;
    already_enrolled: number;
    students: any[];
  }> => {
    if (fileOrStudents instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrStudents);
      const res = await api.post(`/courses/${courseId}/import-roster`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    } else {
      const res = await api.post(`/courses/${courseId}/import-roster`, { students: fileOrStudents });
      return res.data;
    }
  },
};
