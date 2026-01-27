'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { CalendarView } from '@/components/calendar/CalendarView';
import { CreateEventModal } from '@/components/calendar/CreateEventModal';
// import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function CalendarPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/calendar/page.tsx:21', message: 'CalendarPage useEffect triggered', data: { token: token ? 'present' : 'missing' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'initial', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    loadEvents();
    loadStats();
  }, [token]);

  const loadStats = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/calendar/page.tsx:26', message: 'loadStats called', data: { token: token ? 'present' : 'missing' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'initial', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion

    try {
      const response = await api.getCalendarStats(token!);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/calendar/page.tsx:33', message: 'loadStats success', data: { totalEvents: response?.totalEvents || 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'initial', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion

      setStats(response);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/calendar/page.tsx:38', message: 'loadStats error', data: { error: error?.message || 'unknown' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'initial', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion

      console.error('Failed to load calendar stats:', error);
    }
  };

  const loadEvents = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/calendar/page.tsx:50', message: 'loadEvents called', data: { token: token ? 'present' : 'missing' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'initial', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    try {
      setLoading(true);
      const response = await api.getCalendarEvents(token!);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/calendar/page.tsx:57', message: 'loadEvents success', data: { eventCount: response?.length || 0 }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'initial', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion

      setEvents(response);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/calendar/page.tsx:62', message: 'loadEvents error', data: { error: error?.message || 'unknown' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'initial', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion

      console.error('Failed to load calendar events:', error);
      addToast({ type: 'error', message: 'ไม่สามารถโหลดข้อมูลปฏิทินได้' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    try {
      await api.createCalendarEvent(token!, eventData);
      addToast({ type: 'success', message: 'สร้างนัดหมายสำเร็จ' });
      setShowCreateEvent(false);
      loadEvents();
    } catch (error) {
      console.error('Failed to create event:', error);
      addToast({ type: 'error', message: 'ไม่สามารถสร้างนัดหมายได้' });
    }
  };


  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">ปฏิทิน</h1>
            <p className="text-gray-500 mt-1 font-medium">
              จัดการนัดหมายและการประชุมของคุณอย่างเป็นระบบ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Main Calendar Area */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <CalendarView
                events={events}
                stats={stats}
                loading={loading}
                onEventCreate={handleCreateEvent}
                onRefresh={() => {
                  loadEvents();
                  loadStats();
                }}
              />
            </div>
          </div>

          {/* Right Sidebar Stats */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">สรุปข้อมูล</h3>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">นัดหมายทั้งหมด</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalEvents || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">เดือนนี้</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.thisMonthEvents || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">รอการดำเนินการ</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.upcomingEvents || 0}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-50">
                <button
                  onClick={() => setShowCreateEvent(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all font-medium"
                >
                  <Plus size={18} />
                  เพิ่มกิจกรรมใหม่
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <Modal
          isOpen={showCreateEvent}
          onClose={() => setShowCreateEvent(false)}
          title="สร้างนัดหมาย"
          size="lg"
        >
          <CreateEventModal onSubmit={handleCreateEvent} />
        </Modal>
      </div>
    </div>
  );
}