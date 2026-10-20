import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cloud, ArrowLeft, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const homeHref = user
    ? user.role === 'student'
      ? '/student/dashboard'
      : user.role === 'faculty'
      ? '/faculty/dashboard'
      : '/admin/dashboard'
    : '/login';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/25">
        <Cloud className="w-10 h-10" />
      </div>

      <div className="text-8xl font-black text-indigo-100 leading-none select-none">404</div>

      <h1 className="text-2xl font-extrabold text-slate-900 mt-3 tracking-tight">Page Not Found</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">
        The route you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>

        <Link
          to={homeHref}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md hover:bg-indigo-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          {user ? 'Dashboard' : 'Sign In'}
        </Link>
      </div>
    </div>
  );
};
