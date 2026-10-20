import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileCheck2,
  GraduationCap,
  Users,
  Server,
  FilePlus2,
  ClipboardList,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

type NavItem = { to: string; label: string; icon: React.FC<{ className?: string }> };

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const studentLinks: NavItem[] = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/student/submissions', label: 'My Grades & Submissions', icon: FileCheck2 },
  ];

  const facultyLinks: NavItem[] = [
    { to: '/faculty/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/faculty/courses', label: 'My Courses', icon: BookOpen },
    { to: '/faculty/assignments', label: 'Manage Assignments', icon: ClipboardList },
    { to: '/faculty/create-assignment', label: 'Create Assignment', icon: FilePlus2 },
    { to: '/faculty/submissions', label: 'Grade & Reveal Marks', icon: GraduationCap },
  ];

  const adminLinks: NavItem[] = [
    { to: '/admin/dashboard', label: 'Overview & Stats', icon: LayoutDashboard },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/submissions', label: 'Submissions Oversight', icon: FileCheck2 },
    { to: '/admin/infrastructure', label: 'AWS Infrastructure', icon: Server },
  ];

  const links =
    user.role === 'student' ? studentLinks : user.role === 'faculty' ? facultyLinks : adminLinks;

  const activeColor =
    user.role === 'admin'
      ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
      : user.role === 'faculty'
      ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
      : 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30';

  const infraLabel =
    user.role === 'student'
      ? { service: 'S3 Storage', engine: 'RDS Backed', compute: 'EC2 Hosted' }
      : { service: 'Amazon S3', engine: 'RDS PostgreSQL', compute: 'Amazon EC2' };

  return (
    <aside className="w-60 shrink-0 hidden md:flex flex-col bg-white border-r border-slate-200/80 min-h-[calc(100vh-57px)] p-3">
      {/* Role label */}
      <div className="px-2 py-2 mb-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {user.role} Workspace
        </p>
      </div>

      {/* Nav Links */}
      <nav className="space-y-0.5 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                  isActive ? activeColor : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="leading-tight">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Cloud Status Card */}
      <div className="mt-4 p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <p className="text-[11px] font-bold tracking-wide">Cloud Infrastructure</p>
        </div>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Storage</span>
            <span className="font-mono text-emerald-400">Amazon S3</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Database</span>
            <span className="font-mono text-indigo-300">RDS</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Compute</span>
            <span className="font-mono text-indigo-300">EC2</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Monitoring</span>
            <span className="font-mono text-sky-300">CloudWatch</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
