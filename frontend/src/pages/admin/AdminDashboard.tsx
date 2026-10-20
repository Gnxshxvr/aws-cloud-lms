import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { PlatformStats } from '../../types';
import {
  Users,
  GraduationCap,
  BookOpen,
  FileCheck2,
  HardDrive,
  Cloud,
  Database,
  Shield,
  Activity,
  ArrowRight,
  Server,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const res = await adminService.getStats();
        setStats(res.stats);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 MB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Admin Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-purple-200 border border-white/10 mb-3">
            <Shield className="w-3.5 h-3.5 text-purple-400" /> System Administration Console
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Platform Command Center</h1>
          <p className="mt-2 text-slate-300 text-sm leading-relaxed">
            Monitor AWS infrastructure health, manage institutional accounts, and oversee submissions stored in Amazon S3 and Amazon RDS.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Manage User Accounts</span>
            </Link>
            <Link
              to="/admin/infrastructure"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-md transition-colors border border-white/10"
            >
              <Server className="w-4 h-4" />
              <span>AWS Infrastructure</span>
            </Link>
          </div>
        </div>

        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Registered</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.users.total_users}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats.users.total_students} Students • {stats.users.total_faculty} Faculty
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assignments</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{stats.assignments.total_assignments}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats.assignments.published_assignments} Published • {stats.assignments.closed_assignments} Closed
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Submissions</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.submissions.total_submissions}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats.submissions.graded_submissions} Graded • {stats.submissions.late_submissions} Late
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">S3 Storage Used</p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {formatBytes(stats.submissions.total_storage_bytes)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Amazon S3 Encrypted</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <HardDrive className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Cloud Infrastructure Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AWS Services Status Card */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Cloud className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">AWS Infrastructure Health</h2>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Amazon S3 Bucket</p>
                <p className="text-[11px] font-mono text-slate-400 truncate max-w-[180px]">
                  {stats.aws_info.s3_bucket}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {stats.aws_info.storage_mode}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Relational Database</p>
                <p className="text-[11px] text-slate-400">{stats.aws_info.db_engine}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Amazon CloudWatch</p>
                <p className="text-[11px] text-slate-400">{stats.aws_info.cloudwatch_status}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                Active
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">AWS Region</p>
                <p className="text-[11px] font-mono text-slate-400">{stats.aws_info.region}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                Global
              </span>
            </div>
          </div>

          <Link
            to="/admin/infrastructure"
            className="block text-center py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700"
          >
            Explore Cloud Architecture Diagram & Settings →
          </Link>
        </div>

        {/* Audit Logs Stream */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-bold text-slate-900">Security & Activity Audit Trail</h2>
            </div>
            <span className="text-[11px] text-slate-400">Captured in CloudWatch & DB</span>
          </div>

          <div className="space-y-2.5">
            {stats.recentActivity.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition-colors flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-100 text-purple-800">
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">{log.ip_address}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 mt-1">{log.details}</p>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
