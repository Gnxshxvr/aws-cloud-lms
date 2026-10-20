export type UserRole = 'student' | 'faculty' | 'admin';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  full_name: string;
  department?: string;
  student_id_number?: string;
  is_active?: boolean | number;
  created_at?: string;
}

export interface Course {
  id: number;
  course_code: string;
  course_name: string;
  department: string;
  description?: string;
  faculty_id?: number;
  faculty_name?: string;
  faculty_email?: string;
  enrolled_students_count?: number;
  assignments_count?: number;
  created_at?: string;
}

export interface CourseRosterStudent {
  id: number;
  full_name: string;
  email: string;
  student_id_number?: string;
  department?: string;
  enrolled_at?: string;
  submission_count?: number;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  course_code: string;
  course_name: string;
  faculty_id: number;
  faculty_name?: string;
  faculty_email?: string;
  faculty_department?: string;
  due_date: string;
  max_marks: number;
  allowed_file_types: string;
  max_file_size_mb: number;
  status: 'draft' | 'published' | 'closed';
  reference_file_key?: string;
  reference_file_name?: string;
  reference_download_url?: string;
  created_at: string;
  total_submissions?: number;
  is_overdue?: boolean;
  my_submission_id?: number | null;
  my_submission_status?: 'submitted' | 'late' | 'graded' | null;
  my_submitted_at?: string | null;
  my_grade_status?: 'draft' | 'published' | null;
  my_marks_awarded?: number | null;
  my_submission?: Submission | null;
}

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  student_id_number?: string;
  student_department?: string;
  file_key: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  submission_url?: string;
  download_url?: string;
  status: 'submitted' | 'late' | 'graded';
  submitted_at: string;
  marks_awarded?: number | null;
  faculty_feedback?: string | null;
  graded_by?: number | null;
  grader_name?: string | null;
  graded_at?: string | null;
  grade_status: 'draft' | 'published';
  assignment_title?: string;
  course_code?: string;
  course_name?: string;
  due_date?: string;
  max_marks?: number;
  faculty_name?: string;
}

export interface PlatformStats {
  users: {
    total_users: number;
    total_students: number;
    total_faculty: number;
    total_admins: number;
    active_users: number;
  };
  assignments: {
    total_assignments: number;
    published_assignments: number;
    closed_assignments: number;
    draft_assignments: number;
  };
  submissions: {
    total_submissions: number;
    graded_submissions: number;
    late_submissions: number;
    total_storage_bytes: number;
  };
  aws_info: {
    s3_bucket: string;
    region: string;
    storage_mode: string;
    cloudwatch_status: string;
    db_engine: string;
  };
  recentActivity: Array<{
    id: number;
    action: string;
    details: string;
    created_at: string;
    ip_address: string;
  }>;
}

export interface EmailNotification {
  id: number;
  recipient_email: string;
  recipient_name: string;
  user_id: number;
  subject: string;
  body_text: string;
  trigger_type: 'assignment_assigned' | 'deadline_24h' | 'marks_released';
  reference_id?: number | string | null;
  status: 'sent' | 'queued' | 'failed';
  sent_at: string;
}
