'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  location?: string;
  deal?: { id: string; title: string };
  contact?: { id: string; firstName: string; lastName: string };
  activity?: { id: string; type: string };
}

interface CalendarViewProps {
  events: CalendarEvent[];
  stats: {
    totalEvents: number;
    thisMonthEvents: number;
    upcomingEvents: number;
  };
  loading: boolean;
  onEventCreate: (event: any) => void;
  onRefresh: () => void;
}

export function CalendarView({ events, stats, loading, onEventCreate, onRefresh }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'year'>('month');
  const [activeEvent, setActiveEvent] = useState<{ event: CalendarEvent; position: { x: number; y: number } } | null>(null);

  const formatDate = (date: Date) => {
    if (view === 'year') {
      return date.toLocaleDateString('th-TH', { year: 'numeric' });
    }
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'year') {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // Calculate position relative to viewport
    setActiveEvent({
      event,
      position: { x: rect.left, y: rect.bottom + 5 }
    });
  };

  // Close popup when clicking outside
  const closePopup = () => setActiveEvent(null);

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      return date;
    });

    return (
      <div className="flex flex-col h-[600px] overflow-y-auto">
        <div className="grid grid-cols-8 sticky top-0 bg-gray-50 z-20 border-b border-gray-200">
          <div className="p-2 border-r border-gray-200"></div>
          {weekDays.map((date) => (
            <div key={date.toString()} className="p-2 text-center border-r border-gray-200 last:border-r-0">
              <div className="text-xs font-medium text-gray-500 uppercase">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'][date.getDay()]}
              </div>
              <div className={`text-sm font-semibold ${date.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-gray-900'}`}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 relative">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100 min-h-[60px]">
              <div className="p-2 text-[10px] text-gray-400 text-right border-r border-gray-200 bg-gray-50">
                {`${hour.toString().padStart(2, '0')}:00`}
              </div>
              {weekDays.map((date) => {
                const dayEvents = events.filter(event => {
                  const evStart = new Date(event.startTime);
                  return evStart.toDateString() === date.toDateString() && evStart.getHours() === hour;
                });

                return (
                  <div key={date.toString() + hour} className="relative border-r border-gray-100 last:border-r-0 p-1 group hover:bg-gray-50 transition-colors">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(e, event)}
                        className="absolute inset-x-1 bg-blue-100 text-blue-800 text-[10px] p-1 rounded border border-blue-200 truncate cursor-pointer z-10 hover:bg-blue-200 transition-all hover:z-20"
                        style={{ top: '4px', height: 'fit-content', maxHeight: '52px' }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const months = Array.from({ length: 12 }, (_, i) => i);
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-8 bg-gray-50/30">
        {months.map((month) => {
          const firstDayOfMonth = new Date(currentDate.getFullYear(), month, 1);
          const daysInMonth = new Date(currentDate.getFullYear(), month + 1, 0).getDate();
          const startDay = firstDayOfMonth.getDay();

          const monthName = new Date(currentDate.getFullYear(), month, 1).toLocaleDateString('th-TH', { month: 'long' });

          const days = [];
          for (let i = 0; i < startDay; i++) days.push(null);
          for (let i = 1; i <= daysInMonth; i++) days.push(i);

          return (
            <div key={month} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50 hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-gray-900 mb-3 text-center text-blue-600">{monthName}</h3>
              <div className="grid grid-cols-7 gap-1 text-[10px]">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => (
                  <div key={d} className="text-gray-400 text-center font-medium">{d}</div>
                ))}
                {days.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} />;

                  const checkDate = new Date(currentDate.getFullYear(), month, day);
                  const hasEvents = events.some(e => new Date(e.startTime).toDateString() === checkDate.toDateString());
                  const isToday = checkDate.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={day}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentDate(checkDate);
                        setView('month');
                      }}
                      className={`
                        h-6 flex flex-col items-center justify-center rounded-lg cursor-pointer relative group
                        ${isToday ? 'bg-blue-600 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'}
                      `}
                    >
                      {day}
                      {hasEvents && !isToday && (
                        <div className="absolute bottom-0.5 w-1 h-1 bg-blue-400 rounded-full group-hover:scale-150 transition-transform" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startOfMonth.getDay());

    const calendarDays = [];
    const currentDay = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      // ... same logic but optimized
      const checkDate = new Date(currentDay);
      const dayEvents = getEventsForDate(checkDate);
      const isCurrentMonth = currentDay.getMonth() === currentDate.getMonth();
      const isToday = currentDay.toDateString() === new Date().toDateString();

      calendarDays.push(
        <div
          key={i}
          className={`min-h-[120px] border border-gray-100 p-2 relative transition-colors ${isCurrentMonth ? 'bg-white' : 'bg-gray-50/50'} ${isToday ? 'bg-blue-50/30' : ''}`}
          onClick={closePopup}
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-lg' : isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}`}>
              {currentDay.getDate()}
            </span>
          </div>
          <div className="space-y-1.5">
            {dayEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                onClick={(e) => handleEventClick(e, event)}
                className="text-[11px] bg-blue-100/50 text-blue-700 px-2 py-1.5 rounded-xl truncate cursor-pointer hover:bg-blue-200/50 transition-all font-semibold border border-blue-200/30 active:scale-95"
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-[10px] text-gray-400 font-bold ml-1">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );

      currentDay.setDate(currentDay.getDate() + 1);
    }

    return (
      <div className="grid grid-cols-7 gap-0">
        {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'].map((day) => (
          <div key={day} className="p-4 text-center text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-white">
            {day}
          </div>
        ))}
        {calendarDays}
      </div>
    );
  };

  // ... (loading check)

  return (
    <div className="relative bg-white" onClick={closePopup}>
      {/* Calendar Header */}
      <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-gray-50 p-1.5 rounded-2xl shadow-sm border border-gray-200/50">
            <button
              onClick={(e) => { e.stopPropagation(); navigateDate('prev'); }}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentDate(new Date()); }}
              className="px-6 py-2 text-sm font-bold text-gray-700 hover:text-blue-600 hover:bg-white rounded-xl transition-all"
            >
              วันนี้
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigateDate('next'); }}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 tracking-tight first-letter:uppercase">
            {formatDate(currentDate)}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50">
            <button
              onClick={(e) => { e.stopPropagation(); setView('month'); }}
              className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${view === 'month' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-900'}`}
            >
              เดือน
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setView('week'); }}
              className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${view === 'week' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-900'}`}
            >
              สัปดาห์
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setView('year'); }}
              className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${view === 'year' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200/50' : 'text-gray-500 hover:text-gray-900'}`}
            >
              ปี
            </button>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 bg-white border border-gray-200 rounded-2xl transition-all active:rotate-180"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-hidden">
        {view === 'month' ? renderMonthView() : view === 'week' ? renderWeekView() : renderYearView()}
      </div>

      {/* Event Popup */}
      {activeEvent && (
        <div
          className="fixed bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 z-50 w-80 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5"
          style={{
            top: Math.min(activeEvent.position.y, window.innerHeight - 350),
            left: Math.min(activeEvent.position.x, window.innerWidth - 350)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-bold text-gray-900 text-lg leading-tight">{activeEvent.event.title}</h4>
            <button onClick={closePopup} className="p-1 px-2.5 bg-gray-100 text-gray-400 hover:text-gray-900 rounded-xl transition-all">
              &times;
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <RefreshCw className="w-4 h-4" />
              </div>
              <p className="font-semibold text-gray-700">
                {new Date(activeEvent.event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(activeEvent.event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {activeEvent.event.description && (
              <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-2xl border border-gray-100 leading-relaxed">
                {activeEvent.event.description}
              </div>
            )}

            <div className="space-y-3 pt-2">
              {activeEvent.event.deal && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <p className="text-gray-600 flex-1"><span className="font-bold text-emerald-700">ดีล:</span> {activeEvent.event.deal.title}</p>
                </div>
              )}
              {activeEvent.event.contact && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <p className="text-gray-600 flex-1"><span className="font-bold text-purple-700">คู่ค้า:</span> {activeEvent.event.contact.firstName} {activeEvent.event.contact.lastName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}