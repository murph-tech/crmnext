'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Calendar, Clock, MapPin, Users, FileText } from 'lucide-react';
// import { Button } from '@/components/ui/Button';

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          หัวข้อนัดหมาย *
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="เช่น ประชุมเสนอราคา"
        />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            เริ่มต้น *
          </label>
          <input
            type="datetime-local"
            required
            value={formData.startTime}
            onChange={(e) => handleInputChange('startTime', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            สิ้นสุด *
          </label>
          <input
            type="datetime-local"
            required
            value={formData.endTime}
            onChange={(e) => handleInputChange('endTime', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          สถานที่
        </label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="เช่น สำนักงาน, ห้องประชุม A, Zoom"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FileText className="w-4 h-4 inline mr-1" />
          รายละเอียด
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="รายละเอียดเพิ่มเติมของนัดหมาย"
        />
      </div>

      {/* Deal Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          เชื่อมโยงกับ Deal
        </label>
        <select
          value={formData.dealId}
          onChange={(e) => handleInputChange('dealId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">เลือก Deal (ไม่บังคับ)</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.title} - {deal.contact?.company || `${deal.contact?.firstName} ${deal.contact?.lastName}`}
            </option>
          ))}
        </select>
      </div>

      {/* Contact Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          เชื่อมโยงกับ Contact
        </label>
        <select
          value={formData.contactId}
          onChange={(e) => handleInputChange('contactId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">เลือก Contact (ไม่บังคับ)</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.firstName} {contact.lastName} - {contact.company || contact.email}
            </option>
          ))}
        </select>
      </div>

      {/* Attendees */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          ผู้เข้าร่วม
        </label>
        <div className="space-y-2">
          <input
            type="email"
            placeholder="เพิ่มอีเมลผู้เข้าร่วม"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const input = e.target as HTMLInputElement;
                addAttendee(input.value);
                input.value = '';
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {formData.attendees.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.attendees.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeAttendee(email)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Calendar className="w-4 h-4" />
          {loading ? 'กำลังสร้าง...' : 'สร้างนัดหมาย'}
        </button>
      </div>
    </form>
  );
}