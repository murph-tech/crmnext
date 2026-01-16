'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  TrendingUp,
  Target,
  ArrowRight,
  Calendar,
  Loader2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import StatCard from '@/components/dashboard/StatCard';
import ActivityTable from '@/components/dashboard/ActivityTable';

interface DashboardStats {
  totalRevenue: number;
  newLeads: number;
  activeDeals: number;
  conversionRate: number;
  totalLeads: number;
  totalContacts: number;
  totalDeals: number;
  closedWonCount: number;
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const promises: Promise<any>[] = [
          api.getDashboardStats(token!),
          api.getRecentActivity(token!),
          api.getReminders(token!),
        ];

        const results = await Promise.all(promises);

        setStats(results[0]);
        setActivities(results[1]);
        setReminders(results[2]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      loadDashboardData();
    }
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const statsData = [
    {
      title: 'รายรับรวม',
      value: formatCurrency(stats?.totalRevenue || 0),
      change: { value: '12.5%', positive: true },
      icon: DollarSign,
      color: '#007AFF', // Blue
    },
    {
      title: 'ลูกค้าใหม่',
      value: String(stats?.newLeads || 0),
      change: { value: '8.2%', positive: true },
      icon: Users,
      color: '#34C759', // Green
    },
    {
      title: 'ดีลที่กำลังดำเนินการ',
      value: String(stats?.activeDeals || 0),
      change: { value: '3.1%', positive: false },
      icon: TrendingUp,
      color: '#FF9500', // Orange
    },
    {
      title: 'อัตราการปิดการขาย',
      value: `${stats?.conversionRate || 0}%`,
      change: { value: '5.4%', positive: true },
      icon: Target,
      color: '#AF52DE', // Purple
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
              สวัสดีตอนบ่าย, {user?.name?.split(' ')[0] || 'คุณ'}
            </h1>
            <p className="text-gray-500 mt-1">
              นี่คือความคืบหน้าของงานขายของคุณในวันนี้
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#007AFF] text-white rounded-xl font-medium text-sm shadow-lg shadow-blue-500/20 hover:bg-[#0056CC] transition-colors duration-200"
          >
            <Calendar size={16} />
            <span>นัดหมายประชุม</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statsData.map((stat, index) => (
          <StatCard
            key={stat.title}
            {...stat}
            delay={index * 0.1}
          />
        ))}
      </div>



      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Main Column (2/3) - Reminders & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-card rounded-3xl p-6 min-h-[500px]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#AF52DE]/10 flex items-center justify-center">
                  <Clock size={20} className="text-[#AF52DE]" />
                </div>
                งานที่ต้องทำ & การแจ้งเตือน
              </h2>
              <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
                {reminders.length} รายการ
              </span>
            </div>

            {reminders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reminders.map((reminder) => {
                  const dueDate = new Date(reminder.dueDate || reminder.reminderAt);
                  const now = new Date();
                  const isOverdue = dueDate < now;
                  const isDueToday = dueDate.toDateString() === now.toDateString();
                  // Due within 3 days (including today)
                  const isDueSoon = !isOverdue && (dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000);

                  return (
                    <motion.div
                      key={reminder.id}
                      whileHover={{ y: -2 }}
                      className={`p-5 rounded-2xl border transition-all hover:shadow-lg group ${isOverdue
                        ? 'bg-red-50 border-red-100'
                        : isDueSoon
                          ? 'bg-amber-50 border-amber-100'
                          : 'bg-white border-gray-100 shadow-sm'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {isOverdue && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-100 text-red-600 uppercase tracking-wide">
                                เกินกำหนด
                              </span>
                            )}
                            {isDueToday && !isOverdue && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700 uppercase tracking-wide">
                                วันนี้
                              </span>
                            )}
                            {isDueSoon && !isDueToday && !isOverdue && (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700 uppercase tracking-wide">
                                เร็วๆนี้
                              </span>
                            )}
                            <span className={`text-xs font-semibold px-2 py-1 rounded-lg uppercase tracking-wide ${reminder.type === 'CALL' ? 'bg-blue-100 text-blue-700' :
                              reminder.type === 'MEETING' ? 'bg-purple-100 text-purple-700' :
                                reminder.type === 'EMAIL' ? 'bg-green-100 text-green-700' :
                                  'bg-gray-100 text-gray-700'
                              }`}>
                              {reminder.type}
                            </span>
                          </div>

                          <h3 className={`text-base font-semibold truncate mb-1 ${isOverdue ? 'text-red-900' : 'text-gray-900'}`}>
                            {reminder.title || 'Untitled Task'}
                          </h3>

                          {(reminder.lead || reminder.deal) && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                              <Users size={14} />
                              <span className="truncate">
                                {reminder.lead ? `${reminder.lead.firstName} ${reminder.lead.lastName}` : reminder.deal?.title}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-black/[0.05] flex items-center justify-between text-xs font-medium text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {new Date(reminder.dueDate || reminder.reminderAt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}>
                          <Clock size={14} />
                          {new Date(reminder.dueDate || reminder.reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">เสร็จสิ้นภารกิจ!</h3>
                <p className="text-gray-500 mt-1 max-w-xs mx-auto">คุณไม่มีการแจ้งเตือนหรือภารกิจที่ต้องทำในวันนี้</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Sidebar Column (1/3) - Quick Actions & Recent Activity */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="glass-card rounded-3xl p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">เมนูด่วน</h2>

            <div className="space-y-3">
              {[
                { label: 'เพิ่มลูกค้าใหม่', color: '#007AFF', href: '/leads' },
                { label: 'สร้างดีลใหม่', color: '#34C759', href: '/pipeline' },
                { label: 'นัดหมายการโทร', color: '#AF52DE', href: '/contacts' },
              ].map((action) => (
                <Link key={action.label} href={action.href} passHref legacyBehavior>
                  <motion.a
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-black/[0.03] transition-colors duration-200 group block cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${action.color}12` }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: action.color }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{action.label}</span>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
                  </motion.a>
                </Link>
              ))}
            </div>

            {/* Performance Summary */}
            <div className="mt-6 pt-6 border-t border-black/[0.06]">
              <h3 className="text-sm font-medium text-gray-500 mb-4">ผลงานสัปดาห์นี้</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">ความคืบหน้าดีล</span>
                    <span className="font-medium text-gray-900">73%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '73%' }}
                      transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-[#007AFF] to-[#5856D6] rounded-full"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600">งานที่สำเร็จ</span>
                    <span className="font-medium text-gray-900">89%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '89%' }}
                      transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-[#34C759] to-[#30D158] rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recent Activity (Moved to Sidebar) */}
          <div className="glass-card rounded-3xl overflow-hidden p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">กิจกรรมล่าสุด</h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto px-1 custom-scrollbar">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 items-start pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${activity.type === 'CALL' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'MEETING' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                    {activity.type === 'CALL' ? <Users size={14} /> :
                      activity.type === 'MEETING' ? <Calendar size={14} /> :
                        <CheckCircle2 size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {activity.lead ? `Lead: ${activity.lead.firstName}` : activity.deal ? `Deal: ${activity.deal.title}` : 'No reference'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer spacing */}
      <div className="h-8" />
    </div>
  );
}
