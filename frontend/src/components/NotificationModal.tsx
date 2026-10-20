import React, { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { EmailNotification } from '../types';
import {
  Mail,
  Bell,
  Clock,
  CheckCircle2,
  RefreshCw,
  Send,
  X,
  Sparkles,
  BookOpen,
  Award,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [notifications, setNotifications] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'assignment_assigned' | 'deadline_24h' | 'marks_released'>('all');
  const [selectedNotification, setSelectedNotification] = useState<EmailNotification | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // Faculty and Admin can inspect all platform email dispatches; students inspect their own
      const res =
        user?.role === 'admin' || user?.role === 'faculty'
          ? await notificationService.getAllNotifications()
          : await notificationService.getMyNotifications();
      setNotifications(res.notifications);
      if (res.notifications.length > 0 && !selectedNotification) {
        setSelectedNotification(res.notifications[0]);
      }
    } catch (err: any) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, user]);

  const handleManualScan = async () => {
    try {
      setScanning(true);
      const res = await notificationService.trigger24hScan();
      showToast(res.message, 'success');
      await loadNotifications();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to trigger 24h deadline scan', 'error');
    } finally {
      setScanning(false);
    }
  };

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    return n.trigger_type === activeTab;
  });

  const getBadge = (type: string) => {
    switch (type) {
      case 'assignment_assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
            <BookOpen className="w-3 h-3" /> Assignment Assigned
          </span>
        );
      case 'deadline_24h':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> 24h Left Reminder
          </span>
        );
      case 'marks_released':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Award className="w-3 h-3" /> Marks Released
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Automated Email Notification Hub</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  SES / Mail Trigger
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit trail for assignment created, 24h deadline approaching, and marks published events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(user?.role === 'admin' || user?.role === 'faculty') && (
              <button
                onClick={handleManualScan}
                disabled={scanning}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Scan for assignments due within 24 hours and trigger email alerts"
              >
                <Clock className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                <span>{scanning ? 'Scanning...' : 'Trigger 24h Scan'}</span>
              </button>
            )}

            <button
              onClick={loadNotifications}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Refresh notifications"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-400 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Logs ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('assignment_assigned')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'assignment_assigned'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
            }`}
          >
            <span>📘 Assigned</span>
            <span>({notifications.filter((n) => n.trigger_type === 'assignment_assigned').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('deadline_24h')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'deadline_24h'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            <span>⏰ 24h Reminder</span>
            <span>({notifications.filter((n) => n.trigger_type === 'deadline_24h').length})</span>
          </button>
          <button
            onClick={() => setActiveTab('marks_released')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'marks_released'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <span>🎉 Marks Released</span>
            <span>({notifications.filter((n) => n.trigger_type === 'marks_released').length})</span>
          </button>
        </div>

        {/* Content Body: Split view (List on Left, Email Viewer on Right) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
          {/* Notification List */}
          <div className="md:col-span-5 border-r border-slate-200 overflow-y-auto p-3 space-y-2 max-h-[550px]">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mb-2" />
                <p className="text-xs">Loading email notifications...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No email triggers found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  When assignments are created, deadlines reach ≤ 24h, or marks are published, dispatches will appear here.
                </p>
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedNotification?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedNotification(item)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-300 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      {getBadge(item.trigger_type)}
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(item.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.subject}</p>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span className="truncate max-w-[180px]">To: {item.recipient_name}</span>
                      <span className="font-semibold text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Delivered
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Email Preview Client */}
          <div className="md:col-span-7 bg-slate-50/50 p-6 overflow-y-auto max-h-[550px] flex flex-col justify-between">
            {selectedNotification ? (
              <div className="space-y-4">
                {/* Email Envelope Header */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    {getBadge(selectedNotification.trigger_type)}
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(selectedNotification.sent_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    {selectedNotification.subject}
                  </h3>

                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                        Recipient
                      </span>
                      <span className="font-semibold text-slate-800">
                        {selectedNotification.recipient_name}
                      </span>
                      <span className="text-slate-500 block text-[11px]">
                        &lt;{selectedNotification.recipient_email}&gt;
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                        Sender & Service
                      </span>
                      <span className="font-semibold text-indigo-700">AWS Portal Mailer</span>
                      <span className="text-emerald-600 block text-[11px] font-bold">
                        SES Simulated • Delivered
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email Body Card */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed font-sans whitespace-pre-line text-xs">
                    {selectedNotification.body_text}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-16">
                <Mail className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-600">Select an email to view full content</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Review the exact message sent to students for assignment releases, reminders, or marks.
                </p>
              </div>
            )}

            {/* Bottom SES Status Footer */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-semibold text-indigo-700">
                <Sparkles className="w-3.5 h-3.5" />
                Trigger: {selectedNotification?.trigger_type || 'Event Dispatcher'}
              </span>
              <span>Amazon SES • High Deliverability Queue</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
