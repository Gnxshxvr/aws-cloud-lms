import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/env.js';
import { initDb, getDb } from './config/db.js';
import { migrateAndSeed } from './db/migrateAndSeed.js';
import { logger } from './services/loggerService.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { EmailService } from './services/emailService.js';

const app = express();

// Middleware
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static route for local uploaded files fallback
const uploadsDir = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint (for AWS ALB / Route53 / CloudWatch Synthetics)
app.get('/api/health', async (_req, res) => {
  try {
    const db = getDb();
    await db.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      aws: {
        region: config.aws.region,
        s3_bucket: config.aws.s3Bucket,
        storage_mode: config.aws.useLocalStorage ? 'local_fallback' : 'amazon_s3',
        cloudwatch: config.cloudwatch.enabled ? 'enabled' : 'disabled',
      },
      database: db.type,
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: err.message,
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Centralized error handling
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    console.log('----------------------------------------------------');
    console.log('🚀 Starting AWS Student Submission Portal Backend...');
    console.log(`   Node Version: ${process.version}`);
    console.log(`   Environment:  ${config.nodeEnv}`);
    console.log(`   Port:         ${config.port}`);
    console.log('----------------------------------------------------');

    // Initialize Database
    await initDb();

    // Run Migrations and Seed initial data
    await migrateAndSeed();

    // Initialize 24-hour deadline reminder background job
    EmailService.initDeadlineCron();

    app.listen(config.port, () => {
      console.log(`\n✅ Server is actively listening on http://localhost:${config.port}`);
      console.log(`📡 Health Check URL: http://localhost:${config.port}/api/health\n`);
      logger.info(`Server started successfully on port ${config.port}`);
    });
  } catch (err: any) {
    console.error('❌ Failed to start backend server:', err);
    process.exit(1);
  }
}

startServer();
