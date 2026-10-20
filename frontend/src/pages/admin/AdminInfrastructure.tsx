import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  Server,
  Cloud,
  Database,
  Shield,
  Activity,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Cpu,
  Layers,
} from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  aws: {
    region: string;
    s3_bucket: string;
    storage_mode: string;
    cloudwatch: string;
  };
  database: string;
}

export const AdminInfrastructure: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await api.get('/health');
      setHealth(res.data);
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AWS Infrastructure & Architecture</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cloud resource topology, Amazon S3 storage bucket parameters, and live system health metrics.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Health Probe</span>
        </button>
      </div>

      {/* Live System Diagnostics Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Application API Status:</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                  {health?.status || 'HEALTHY'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Probe Timestamp: {health?.timestamp || new Date().toISOString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-300">
            <div>
              <p className="text-slate-500">Uptime</p>
              <p className="font-mono font-bold text-white mt-0.5">
                {health ? `${(health.uptime / 60).toFixed(1)} mins` : '—'}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Environment</p>
              <p className="font-mono font-bold text-white mt-0.5">{health?.environment || 'production'}</p>
            </div>
            <div>
              <p className="text-slate-500">Database Driver</p>
              <p className="font-mono font-bold text-white mt-0.5">{health?.database || 'postgresql'}</p>
            </div>
          </div>
        </div>

        {/* AWS Resource Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold mb-1">
              <Cloud className="w-4 h-4" /> Amazon S3
            </div>
            <p className="text-xs font-mono text-white truncate">{health?.aws.s3_bucket}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Mode: {health?.aws.storage_mode}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
              <Database className="w-4 h-4" /> RDS PostgreSQL
            </div>
            <p className="text-xs font-mono text-white truncate">student_portal_db</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Engine: PostgreSQL 16+</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-1">
              <Activity className="w-4 h-4" /> CloudWatch Logs
            </div>
            <p className="text-xs font-mono text-white truncate">/aws/student-portal</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Stream: {health?.aws.cloudwatch}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
              <Shield className="w-4 h-4" /> AWS IAM Role
            </div>
            <p className="text-xs font-mono text-white truncate">StudentPortalAppRole</p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Least-Privilege Policy</p>
          </div>
        </div>
      </div>

      {/* Cloud Architecture Diagram Box */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>AWS Multi-Tier Architecture Topology</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visual breakdown of how student requests, files, and database queries traverse Amazon Web Services.
          </p>
        </div>

        {/* Visual architecture nodes */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
          {/* Node 1: Client */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
              <GlobeIcon className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">1. Client / Browser</p>
            <p className="text-[10px] text-slate-500 mt-1">React + Vite + Tailwind</p>
            <p className="text-[10px] text-indigo-600 font-semibold mt-1">HTTPS / TLS 1.3</p>
          </div>

          {/* Node 2: EC2 */}
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-2">
              <Server className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-900">2. Amazon EC2</p>
            <p className="text-[10px] text-slate-600 mt-1">Nginx Reverse Proxy</p>
            <p className="text-[10px] text-slate-600">Node.js Express REST API</p>
          </div>

          {/* Node 3: S3 */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center mx-auto mb-2">
              <Cloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-900">3. Amazon S3</p>
            <p className="text-[10px] text-slate-600 mt-1">Submissions & Materials</p>
            <p className="text-[10px] text-amber-700 font-semibold mt-1">Presigned Time URLs</p>
          </div>

          {/* Node 4: RDS */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2">
              <Database className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-900">4. Amazon RDS</p>
            <p className="text-[10px] text-slate-600 mt-1">PostgreSQL Database</p>
            <p className="text-[10px] text-emerald-700 font-semibold mt-1">Encrypted Metadata</p>
          </div>

          {/* Node 5: CloudWatch */}
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center mx-auto mb-2">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-900">5. CloudWatch</p>
            <p className="text-[10px] text-slate-600 mt-1">API & Access Audit Logs</p>
            <p className="text-[10px] text-purple-700 font-semibold mt-1">Metric Alarms</p>
          </div>
        </div>

        {/* CloudFormation & Production Deployment Code Snippet */}
        <div className="p-5 rounded-2xl bg-slate-900 text-slate-300 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 font-bold text-slate-300">
              <Terminal className="w-4 h-4 text-emerald-400" /> CloudFormation & EC2 Deployment
            </span>
            <span className="text-[11px] text-slate-500">infrastructure/cloudformation.yaml</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            # Run one-click AWS CloudFormation deployment stack:
          </p>
          <p className="text-emerald-400 select-all">
            aws cloudformation deploy --template-file infrastructure/cloudformation.yaml --stack-name student-portal-stack --capabilities CAPABILITY_IAM
          </p>
        </div>
      </div>
    </div>
  );
};

function GlobeIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" x2="22" y1="12" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}
