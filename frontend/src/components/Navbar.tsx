import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cloud, LogOut, Bell } from 'lucide-react';
import { NotificationModal } from './NotificationModal';
import { notificationService } from '../services/notificationService';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      if (!user) return;
      try {
        const res =
          user.role === 'admin' || user.role === 'faculty'
            ? await notificationService.getAllNotifications()
            : await notificationService.getMyNotifications();
        setNotificationCount(res.count || res.notifications.length);
      } catch {
        // silent — notification count is non-critical
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const avatarColor =
    user?.role === 'admin'
      ? 'bg-purple-600'
      : user?.role === 'faculty'
      ? 'bg-amber-600'
      : 'bg-indigo-600';

  const roleBadgeColor =
    user?.role === 'admin'
      ? 'bg-purple-100 text-purple-700'
      : user?.role === 'faculty'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-indigo-100 text-indigo-700';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Cloud className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-[15px] leading-tight">
                  Academic Submission Portal
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-px rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                  Cloud-Native
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block leading-tight mt-px">
                Amazon S3 · RDS · CloudWatch
              </p>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Notification Bell */}
            {user && (
              <button
                onClick={() => setNotificationModalOpen(true)}
                className="relative p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Email notifications"
                aria-label="Open email notifications"
              >
                <Bell className="w-[18px] h-[18px]" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-px rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>
            )}

            {/* User Profile Pill */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-sm ${avatarColor}`}
                >
                  {user.full_name.charAt(0).toUpperCase()}
                </div>

                <div className="hidden sm:block text-left min-w-0">
                  <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">
                    {user.full_name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wide ${roleBadgeColor}`}
                    >
                      {user.role}
                    </span>
                    {user.department && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[90px]">
                        {user.department}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors ml-0.5"
                  title="Sign Out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* NotificationModal rendered OUTSIDE header to avoid z-index stacking context trap */}
      <NotificationModal
        isOpen={notificationModalOpen}
        onClose={() => setNotificationModalOpen(false)}
      />
    </>
  );
};
