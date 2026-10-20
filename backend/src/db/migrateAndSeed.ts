import bcrypt from 'bcryptjs';
import { getDb } from '../config/db.js';
import { config } from '../config/env.js';
import { logger } from '../services/loggerService.js';

export async function migrateAndSeed(): Promise<void> {
  const db = getDb();
  const isPg = db.type === 'postgres';

  const serialType = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const boolType = isPg ? 'BOOLEAN DEFAULT TRUE' : 'INTEGER DEFAULT 1';
  const timestampType = isPg ? 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()' : 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP';

  // 1. Users Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id ${serialType},
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      department VARCHAR(100),
      student_id_number VARCHAR(100),
      is_active ${boolType},
      created_at ${timestampType},
      updated_at ${timestampType}
    )
  `);

  // 2. Assignments Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id ${serialType},
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      course_code VARCHAR(50) NOT NULL,
      course_name VARCHAR(255) NOT NULL,
      faculty_id INTEGER REFERENCES users(id),
      due_date ${timestampType} NOT NULL,
      max_marks INTEGER DEFAULT 100,
      allowed_file_types VARCHAR(255) DEFAULT 'pdf,docx,zip',
      max_file_size_mb INTEGER DEFAULT 25,
      status VARCHAR(50) DEFAULT 'published',
      reference_file_key TEXT,
      reference_file_name VARCHAR(255),
      reference_file_url TEXT,
      created_at ${timestampType},
      updated_at ${timestampType}
    )
  `);

  // 3. Submissions Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id ${serialType},
      assignment_id INTEGER REFERENCES assignments(id),
      student_id INTEGER REFERENCES users(id),
      file_key TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size_bytes INTEGER DEFAULT 0,
      file_type VARCHAR(100),
      submission_url TEXT,
      status VARCHAR(50) DEFAULT 'submitted',
      submitted_at ${timestampType},
      marks_awarded REAL,
      faculty_feedback TEXT,
      graded_by INTEGER REFERENCES users(id),
      graded_at ${timestampType},
      grade_status VARCHAR(50) DEFAULT 'draft'
    )
  `);

  // 4. Audit Logs Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id ${serialType},
      user_id INTEGER,
      action VARCHAR(100) NOT NULL,
      details TEXT,
      ip_address VARCHAR(100),
      created_at ${timestampType}
    )
  `);

  // 5. Courses Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id ${serialType},
      course_code VARCHAR(50) UNIQUE NOT NULL,
      course_name VARCHAR(255) NOT NULL,
      department VARCHAR(100) DEFAULT 'Computer Science',
      description TEXT,
      faculty_id INTEGER REFERENCES users(id),
      created_at ${timestampType},
      updated_at ${timestampType}
    )
  `);

  // 6. Course Enrollments Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS course_enrollments (
      id ${serialType},
      course_id INTEGER REFERENCES courses(id),
      student_id INTEGER REFERENCES users(id),
      enrolled_at ${timestampType},
      UNIQUE(course_id, student_id)
    )
  `);

  // 7. Email Notifications Table
  await db.query(`
    CREATE TABLE IF NOT EXISTS email_notifications (
      id ${serialType},
      recipient_email VARCHAR(255) NOT NULL,
      recipient_name VARCHAR(255),
      user_id INTEGER,
      subject VARCHAR(255) NOT NULL,
      body_text TEXT NOT NULL,
      trigger_type VARCHAR(50) NOT NULL,
      reference_id INTEGER,
      status VARCHAR(50) DEFAULT 'sent',
      sent_at ${timestampType}
    )
  `);

  // Check and seed initial courses if missing
  const existingCourses = await db.query('SELECT id FROM courses LIMIT 1');
  if (existingCourses.rowCount === 0) {
    const facultyUsers = await db.query("SELECT id, email FROM users WHERE role = 'faculty'");
    const fMap = new Map(facultyUsers.rows.map((u: any) => [u.email, u.id]));
    const fac1 = fMap.get('faculty@portal.edu') || 2;
    const fac2 = fMap.get('grace.hopper@portal.edu') || 3;

    await db.query(
      `INSERT INTO courses (course_code, course_name, department, description, faculty_id)
       VALUES 
       ('CS-401', 'Advanced Cloud Engineering', 'Computer Science', 'Comprehensive design and implementation of resilient cloud architectures on Amazon Web Services (AWS).', $1),
       ('CS-101', 'Fundamentals of Computer Science', 'Computer Science', 'Core principles of software systems, algorithms, computing architecture, and security.', $1),
       ('CS-505', 'Distributed Systems & Elastic Scaling', 'Computer Science', 'Distributed consensus, microservices architecture, fault-tolerance, and high-performance cloud elasticity.', $1),
       ('CS-302', 'Database Systems & Storage Internals', 'Computer Science', 'Relational database engines, ACID transactions, PostgreSQL indexing, and storage optimization.', $2)`,
      [fac1, fac2]
    );

    // Enroll existing students into CS-401 and CS-101
    const stuUsers = await db.query("SELECT id FROM users WHERE role = 'student'");
    const cs401Res = await db.query("SELECT id FROM courses WHERE course_code = 'CS-401'");
    if (cs401Res.rowCount > 0 && stuUsers.rowCount > 0) {
      const cId = cs401Res.rows[0].id;
      const insertSql = isPg
        ? `INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2) ON CONFLICT (course_id, student_id) DO NOTHING`
        : `INSERT OR IGNORE INTO course_enrollments (course_id, student_id) VALUES ($1, $2)`;
      for (const s of stuUsers.rows) {
        await db.query(insertSql, [cId, s.id]);
      }
    }
  }

  // Check if admin already exists
  const existingUsers = await db.query('SELECT id, email, role FROM users');
  if (existingUsers.rowCount === 0) {
    console.log('🌱 Seeding database with initial accounts and sample data...');

    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash(config.admin.password, salt);
    const facultyHash = await bcrypt.hash('FacultyPassword123!', salt);
    const studentHash = await bcrypt.hash('StudentPassword123!', salt);

    // Seed Admin
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, department, is_active)
       VALUES ($1, $2, $3, 'admin', 'Administration', 1)`,
      [config.admin.email, adminHash, config.admin.name]
    );

    // Seed Faculty 1
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, department, is_active)
       VALUES ($1, $2, $3, 'faculty', 'Computer Science', 1)`,
      ['faculty@portal.edu', facultyHash, 'Dr. Alan Turing']
    );

    // Seed Faculty 2
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, department, is_active)
       VALUES ($1, $2, $3, 'faculty', 'Cloud Computing', 1)`,
      ['grace.hopper@portal.edu', facultyHash, 'Prof. Grace Hopper']
    );

    // Seed Student 1
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, department, student_id_number, is_active)
       VALUES ($1, $2, $3, 'student', 'Computer Science', 'STU-2026-001', 1)`,
      ['student@portal.edu', studentHash, 'Alex Rivera']
    );

    // Seed Student 2
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, department, student_id_number, is_active)
       VALUES ($1, $2, $3, 'student', 'Computer Science', 'STU-2026-042', 1)`,
      ['sarah.chen@portal.edu', studentHash, 'Sarah Chen']
    );

    // Get user IDs
    const usersList = await db.query('SELECT id, email FROM users');
    const userMap = new Map(usersList.rows.map((u: any) => [u.email, u.id]));

    const facultyId1 = userMap.get('faculty@portal.edu') || 2;
    const facultyId2 = userMap.get('grace.hopper@portal.edu') || 3;
    const studentId1 = userMap.get('student@portal.edu') || 4;
    const studentId2 = userMap.get('sarah.chen@portal.edu') || 5;

    // Seed Assignments
    const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    await db.query(
      `INSERT INTO assignments 
       (title, description, course_code, course_name, faculty_id, due_date, max_marks, allowed_file_types, max_file_size_mb, status, reference_file_key, reference_file_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        'Distributed Cloud Architecture Project',
        'Design an end-to-end cloud-native microservices architecture on AWS using EC2, S3, RDS PostgreSQL, and CloudWatch. Include architecture diagrams and threat modeling analysis.',
        'CS-401',
        'Advanced Cloud Engineering',
        facultyId1,
        oneWeekFromNow,
        100,
        'pdf,docx,zip',
        30,
        'published',
        'assignments/CS-401/specification_v1.pdf',
        'Cloud_Architecture_Project_Brief.pdf',
      ]
    );

    await db.query(
      `INSERT INTO assignments 
       (title, description, course_code, course_name, faculty_id, due_date, max_marks, allowed_file_types, max_file_size_mb, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'Database Optimization and Indexing Report',
        'Analyze query execution plans on PostgreSQL with EXPLAIN ANALYZE. Propose B-tree and GiST indexing strategies to reduce query latency by at least 40%.',
        'CS-302',
        'Database Systems & Storage',
        facultyId2,
        threeDaysFromNow,
        50,
        'pdf,docx',
        15,
        'published',
      ]
    );

    await db.query(
      `INSERT INTO assignments 
       (title, description, course_code, course_name, faculty_id, due_date, max_marks, allowed_file_types, max_file_size_mb, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'Network Security Protocol Audit',
        'Perform a security assessment of TLS 1.3 handshake protocols and evaluate cipher suites against known vulnerabilities.',
        'CS-305',
        'Cybersecurity & Network Protocols',
        facultyId1,
        pastDate,
        100,
        'pdf,zip',
        25,
        'closed',
      ]
    );

    // Seed a submission with grade for Student 1
    const assignmentsList = await db.query('SELECT id, title FROM assignments');
    const assignmentMap = new Map(assignmentsList.rows.map((a: any) => [a.title, a.id]));
    const closedAssignmentId = assignmentMap.get('Network Security Protocol Audit') || 3;
    const archAssignmentId = assignmentMap.get('Distributed Cloud Architecture Project') || 1;

    // Submission 1: Graded
    await db.query(
      `INSERT INTO submissions 
       (assignment_id, student_id, file_key, file_name, file_size_bytes, file_type, submission_url, status, submitted_at, marks_awarded, faculty_feedback, graded_by, graded_at, grade_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        closedAssignmentId,
        studentId1,
        `submissions/${closedAssignmentId}/${studentId1}/network_security_audit_report.pdf`,
        'network_security_audit_report.pdf',
        1048576, // 1MB
        'application/pdf',
        '/uploads/network_security_audit_report.pdf',
        'graded',
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        94.5,
        'Exceptional thoroughness in cipher suite vulnerability analysis. Excellent packet capture inspection methodology.',
        facultyId1,
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        'published',
      ]
    );

    // Submission 2: Pending grading for Student 2
    await db.query(
      `INSERT INTO submissions 
       (assignment_id, student_id, file_key, file_name, file_size_bytes, file_type, submission_url, status, submitted_at, grade_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        archAssignmentId,
        studentId2,
        `submissions/${archAssignmentId}/${studentId2}/cloud_arch_final.pdf`,
        'cloud_arch_final.pdf',
        2097152, // 2MB
        'application/pdf',
        '/uploads/cloud_arch_final.pdf',
        'submitted',
        new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        'draft',
      ]
    );

    console.log('✓ Seeding complete with default demo users:');
    console.log('  - Administrator: admin@portal.edu / AdminPassword123!');
    console.log('  - Faculty:       faculty@portal.edu / FacultyPassword123!');
    console.log('  - Student:       student@portal.edu / StudentPassword123!');
  } else {
    console.log(`✓ Schema verified. Existing user count: ${existingUsers.rowCount}`);
  }
}
