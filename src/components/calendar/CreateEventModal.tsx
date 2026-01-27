'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, FileText, X, Plus } from 'lucide-react';

interface CreateEventModalProps {
  onSubmit: (eventData: any) => void;
}

interface Deal {
  id: string;
  title: string;
  contact?: {
    firstName: string;
    lastName: string;
    company?: string;
  };
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phone?: string;
}

export function CreateEventModal({ onSubmit }: CreateEventModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    attendees: [] as string[],
    dealId: '',
    contactId: '',
    activityId: '',
  });

  useEffect(() => {
    loadDealsAndContacts();
  }, [token]);

  const loadDealsAndContacts = async () => {
    try {
      const [dealsResponse, contactsResponse] = await Promise.all([
        api.getDeals(token!, { stage: 'DISCOVERY,PROPOSAL,NEGOTIATION,CLOSED_WON' }),
        api.getContacts(token!),
      ]);

      setDeals(dealsResponse);
      setContacts(contactsResponse);
    } catch (error) {
      console.error('Failed to load deals and contacts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.startTime || !formData.endTime) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addAttendee = (email: string) => {
    if (email && !formData.attendees.includes(email)) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, email]
      }));
    }
  };

  const removeAttendee = (email: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(att => att !== email)
    }));
  };

  const formatDateTimeLocal = (date: Date) => {
    return date.toISOString().slice(0, 16);
  };

  // Set default time (next hour to next hour + 1)
  useEffect(() => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

    const endTime = new Date(nextHour);
    endTime.setHours(endTime.getHours() + 1);

    setFormData(prev => ({
      ...prev,
      startTime: formatDateTimeLocal(nextHour),
      endTime: formatDateTimeLocal(endTime),
    }));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Event Basics */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Calendar className="w-4 h-4" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">ข้อมูลนัดหมายเบื้องต้น</h3>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">
                หัวข้อนัดหมาย *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                placeholder="เช่น ประชุมเสนอราคา, Follow up call"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                  <Clock size={12} />
                  เริ่มต้น *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                  <Clock size={12} />
                  สิ้นสุด *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                <MapPin size={12} />
                สถานที่
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                placeholder="เช่น Office, Zoom, Google Meet"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1 flex items-center gap-1">
                <FileText size={12} />
                รายละเอียดเพิ่มเติม
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all text-sm outline-none resize-none"
                placeholder="ระบุรายละเอียด หรือวาระการประชุม..."
              />
            </div>
          </div>
        </div>

        {/* Right Column: Connections & People */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Users className="w-4 h-4" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">ความเชื่อมโยงและบุคคล</h3>
          </div>

          <div className="space-y-4">
            {/* Deal Selection */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
              <label className="block text-xs font-bold text-emerald-600 uppercase mb-2 ml-1">
                เชื่อมโยงกับดีล (Deal)
              </label>
              <select
                value={formData.dealId}
                onChange={(e) => handleInputChange('dealId', e.target.value)}
                className="w-full h-11 px-4 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm outline-none appearance-none"
              >
                <option value="">-- ไม่ระบุดีล --</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title} - {deal.contact?.company || 'No Company'}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact Selection */}
            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100/50">
              <label className="block text-xs font-bold text-purple-600 uppercase mb-2 ml-1">
                เชื่อมโยงกับรายชื่อ (Contact)
              </label>
              <select
                value={formData.contactId}
                onChange={(e) => handleInputChange('contactId', e.target.value)}
                className="w-full h-11 px-4 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all text-sm outline-none appearance-none"
              >
                <option value="">-- ไม่ระบุรายชื่อ --</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.firstName} {contact.lastName} ({contact.company || 'Private'})
                  </option>
                ))}
              </select>
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1 flex items-center gap-1">
                <Users size={12} />
                ผู้เข้าร่วม (Attendees)
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="พิมพ์อีเมลแล้วกด Enter เพื่อเพิ่ม..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        addAttendee(input.value);
                        input.value = '';
                      }
                    }}
                    className="w-full h-11 px-4 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                    <Plus size={18} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-1">
                  {formData.attendees.map((email) => (
                    <motion.span
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={email}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-medium shadow-sm group hover:border-red-200 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-bold uppercase">
                        {email.charAt(0)}
                      </div>
                      {email}
                      <button
                        type="button"
                        onClick={() => removeAttendee(email)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </motion.span>
                  ))}
                  {formData.attendees.length === 0 && (
                    <p className="text-xs text-gray-400 italic mt-1 ml-1">ยังไม่มีผู้เข้าร่วม</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          <span className="text-red-500">*</span> จำเป็นต้องระบุข้อมูล
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-blue-800 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                <span>บันทึกนัดหมาย</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}