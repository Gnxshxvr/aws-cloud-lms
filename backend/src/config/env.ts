import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-development-key-392819',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  db: {
    type: (process.env.DB_TYPE || 'sqlite').toLowerCase() as 'postgres' | 'sqlite',
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/student_portal',
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'password',
    database: process.env.PGDATABASE || 'student_portal',
  },

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN || '',
    s3Bucket: process.env.AWS_S3_BUCKET || 'aws-student-portal-bucket',
    useLocalStorage: process.env.USE_LOCAL_STORAGE === 'true' || !process.env.AWS_S3_BUCKET,
  },

  cloudwatch: {
    enabled: process.env.CLOUDWATCH_ENABLED === 'true',
    logGroup: process.env.CLOUDWATCH_LOG_GROUP || '/aws/student-portal',
    logStream: process.env.CLOUDWATCH_LOG_STREAM || 'api-server',
  },

  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@portal.edu',
    password: process.env.ADMIN_PASSWORD || 'AdminPassword123!',
    name: process.env.ADMIN_NAME || 'System Administrator',
  },
};
