import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Calendar, Clock, AlignLeft, CheckCircle2, Bell } from 'lucide-react';

interface ActivityFormProps {
    onSubmit: (e: React.FormEvent, data: any) => void;
    onCancel: () => void;
    initialData?: any;
    isEdit?: boolean;
    defaultType?: string;
}

const typeOptions = ['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE', 'QUOTATION'];

// Quick reminder options - value in minutes from NOW
const quickReminderOptions = [
    { value: '', label: 'กำหนดเอง / ไม่ต้องเตือน' },
    { value: '60', label: 'อีก 1 ชั่วโมง' },
    { value: '1440', label: 'อีก 1 วัน' },
    { value: '4320', label: 'อีก 3 วัน' },
    { value: '7200', label: 'อีก 5 วัน' },
    { value: '10080', label: 'อีก 1 สัปดาห์' },
];

export default function ActivityForm({ onSubmit, onCancel, initialData, isEdit = false, defaultType }: ActivityFormProps) {
    const [formData, setFormData] = useState(() => {
        if (initialData) {
            return {
                title: initialData.title,
                type: initialData.type,
                description: initialData.description || '',
                dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
                dueTime: initialData.dueDate ? new Date(initialData.dueDate).toTimeString().slice(0, 5) : '',
                duration: initialData.duration || 30,
                reminderMinutes: initialData.reminderAt ? '0' : '', // If reminder exists, assume it's set
                completed: initialData.completed || false,
            };
        }

        // Default to today
        const now = new Date();
        return {
            title: '',
            type: defaultType || 'TASK',
            description: '',
            dueDate: now.toISOString().split('T')[0],
            dueTime: now.toTimeString().slice(0, 5),
            duration: 30,
            reminderMinutes: '0', // 0 means reminderAt = dueDate
            completed: false,
        };
    });

    const [quickOption, setQuickOption] = useState('');

    const handleQuickOptionChange = (minutesStr: string) => {
        setQuickOption(minutesStr);
        if (!minutesStr) return;

        const minutes = parseInt(minutesStr);
        const targetDate = new Date(Date.now() + minutes * 60000);

        setFormData(prev => ({
            ...prev,
            dueDate: targetDate.toISOString().split('T')[0],
            dueTime: targetDate.toTimeString().slice(0, 5),
            reminderMinutes: '0' // Enable reminder at that time
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Combine date and time
        let dueDateTime = null;
        let reminderAt = null;

        if (formData.dueDate) {
            dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime || '00:00:00'}`);

            // If reminderMinutes is '0', set reminderAt same as dueDateTime
            if (formData.reminderMinutes === '0') {
                reminderAt = dueDateTime;
            }
        }

        // Clean payload to match API/Schema expectation
        const payload = {
            title: formData.title,
            type: formData.type,
            description: formData.description,
            dueDate: dueDateTime,
            reminderAt: reminderAt,
            duration: Number(formData.duration),
            completed: formData.completed,
        };

        onSubmit(e, payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    required
                    placeholder="e.g. Follow up call"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    >
                        {typeOptions.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (min)</label>
                    <input
                        type="number"
                        min="0"
                        step="15"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    />
                </div>
            </div>

            {/* Quick Schedule / Reminder */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-2">
                        <Bell size={14} className="text-amber-500" />
                        Quick Schedule & Remind
                    </span>
                </label>
                <select
                    value={quickOption}
                    onChange={(e) => handleQuickOptionChange(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm border-amber-200 focus:border-amber-400 focus:ring-amber-200"
                >
                    {quickReminderOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                    เลือกเพื่อตั้งวันเวลาและแจ้งเตือนอัตโนมัติ
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => {
                                setFormData({ ...formData, dueDate: e.target.value });
                                setQuickOption(''); // Reset quick option if manual change
                            }}
                            className="w-full h-10 pl-10 pr-3 rounded-xl spotlight-input text-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                    <div className="relative">
                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="time"
                            value={formData.dueTime}
                            onChange={(e) => {
                                setFormData({ ...formData, dueTime: e.target.value });
                                setQuickOption(''); // Reset quick option if manual change
                            }}
                            className="w-full h-10 pl-10 pr-3 rounded-xl spotlight-input text-sm"
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <div className="relative">
                    <AlignLeft size={16} className="absolute left-3 top-3 text-gray-400" />
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full h-24 pl-10 pr-3 py-2 rounded-xl spotlight-input text-sm resize-none"
                        placeholder="Add details..."
                    />
                </div>
            </div>

            {isEdit && (
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="completed"
                        checked={formData.completed}
                        onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                        className="w-4 h-4 text-[#007AFF] rounded focus:ring-[#007AFF]"
                    />
                    <label htmlFor="completed" className="text-sm font-medium text-gray-700">Mark as completed</label>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="px-4 py-2.5 bg-[#007AFF] text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                    {isEdit ? 'Save Changes' : 'Schedule Activity'}
                </motion.button>
            </div>
        </form>
    );
}
