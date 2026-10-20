import { api } from './api';
import { Submission } from '../types';

export const submissionService = {
  async submitAssignment(assignmentId: number | string, file: File): Promise<{ success: boolean; message: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post(`/submissions/${assignmentId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async getMySubmissions(): Promise<{ success: boolean; count: number; submissions: Submission[] }> {
    const res = await api.get('/submissions/my');
    return res.data;
  },

  async getAssignmentSubmissions(assignmentId: number | string): Promise<{
    success: boolean;
    assignment: { id: number; title: string; max_marks: number };
    count: number;
    submissions: Submission[];
  }> {
    const res = await api.get(`/submissions/assignment/${assignmentId}`);
    return res.data;
  },

  async gradeSubmission(
    submissionId: number | string,
    data: { marks_awarded: number; faculty_feedback?: string; grade_status: 'draft' | 'published' }
  ): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/submissions/${submissionId}/grade`, data);
    return res.data;
  },

  async getDownloadUrl(submissionId: number | string): Promise<{ success: boolean; downloadUrl: string; fileName: string }> {
    const res = await api.get(`/submissions/${submissionId}/download`);
    return res.data;
  },

  async revealSubmissionMark(
    submissionId: number | string,
    grade_status: 'published' | 'draft'
  ): Promise<{ success: boolean; message: string; grade_status: string }> {
    const res = await api.patch(`/submissions/${submissionId}/reveal`, { grade_status });
    return res.data;
  },

  async revealAllAssignmentMarks(
    assignmentId: number | string
  ): Promise<{ success: boolean; message: string; revealed_count: number }> {
    const res = await api.post(`/submissions/assignment/${assignmentId}/reveal-all`);
    return res.data;
  },

  async hideAllAssignmentMarks(
    assignmentId: number | string
  ): Promise<{ success: boolean; message: string; hidden_count: number }> {
    const res = await api.post(`/submissions/assignment/${assignmentId}/hide-all`);
    return res.data;
  },
};
