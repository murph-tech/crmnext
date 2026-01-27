import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Calendar, Clock, AlignLeft, CheckCircle2, Bell, ClipboardList, Timer, AlertCircle, Briefcase } from 'lucide-react';

interface ActivityFormProps {
    onSubmit: (e: React.FormEvent, data: any) => void;
    onCancel: () => void;
    initialData?: any;
    isEdit?: boolean;
    defaultType?: string;
    deals?: any[];
}

const typeOptions = [
    { value: 'CALL', label: 'Phone Call' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'MEETING', label: 'Meeting' },
    { value: 'TASK', label: 'Task' },
    { value: 'NOTE', label: 'Note' },
    { value: 'QUOTATION', label: 'Quotation' },
];

const quickReminderOptions = [
    { value: '', label: 'Manual / No Alert' },
    { value: '60', label: 'In 1 Hour' },
    { value: '1440', label: 'In 1 Day' },
    { value: '4320', label: 'In 3 Days' },
    { value: '7200', label: 'In 5 Days' },
    { value: '10080', label: 'In 1 Week' },
];

export default function ActivityForm({ onSubmit, onCancel, initialData, isEdit = false, defaultType, deals = [] }: ActivityFormProps) {
    const [formData, setFormData] = useState(() => {
        if (initialData) {
            return {
                title: initialData.title,
                type: initialData.type,
                description: initialData.description || '',
                dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
                dueTime: initialData.dueDate ? new Date(initialData.dueDate).toTimeString().slice(0, 5) : '',
                duration: initialData.duration || 30,
                reminderMinutes: initialData.reminderAt ? '0' : '',
                completed: initialData.completed || false,
                dealId: initialData.dealId || initialData.deal?.id || '',
            };
        }

        const now = new Date();
        return {
            title: '',
            type: defaultType || 'TASK',
            description: '',
            dueDate: now.toISOString().split('T')[0],
            dueTime: now.toTimeString().slice(0, 5),
            duration: 30,
            reminderMinutes: '0',
            completed: false,
            dealId: '',
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
            reminderMinutes: '0'
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let dueDateTime = null;
        let reminderAt = null;

        if (formData.dueDate) {
            dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime || '00:00:00'}`);
            if (formData.reminderMinutes === '0') {
                reminderAt = dueDateTime;
            }
        }

        const payload = {
            title: formData.title,
            type: formData.type,
            description: formData.description,
            dueDate: dueDateTime,
            reminderAt: reminderAt,
            duration: Number(formData.duration),
            completed: formData.completed,
            dealId: formData.dealId || undefined,
        };

        onSubmit(e, payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Basic Info & Scheduling */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <div className="p-1.5 bg-purple-50 rounded-lg">
                            <ClipboardList className="w-4 h-4 text-purple-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Activity Basics</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                Subject *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/20 transition-all text-sm font-medium"
                                required
                                placeholder="e.g. Follow up call"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Type
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/20 transition-all text-sm font-medium"
                                >
                                    {typeOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                    <Timer size={12} /> Duration (m)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="15"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                                    className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/20 transition-all text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                <Briefcase size={12} /> Related Deal (Optional)
                            </label>
                            <select
                                value={formData.dealId}
                                onChange={(e) => setFormData({ ...formData, dealId: e.target.value })}
                                className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/20 transition-all text-sm font-medium"
                            >
                                <option value="">-- No linked deal --</option>
                                {deals.map((deal) => (
                                    <option key={deal.id} value={deal.id}>
                                        {deal.title} ({deal.contact?.company || 'No Company'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100/50">
                            <label className="block text-[11px] font-bold text-amber-600 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1">
                                <Bell size={12} /> Quick Schedule & Alert
                            </label>
                            <select
                                value={quickOption}
                                onChange={(e) => handleQuickOptionChange(e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-amber-100 rounded-xl focus:ring-2 focus:ring-amber-500/20 transition-all text-sm font-medium"
                            >
                                {quickReminderOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <p className="mt-1.5 text-[10px] text-amber-600/60 italic font-medium px-1">
                                Auto-sets time and enables smart notification.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Time & Details */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <div className="p-1.5 bg-blue-50 rounded-lg">
                            <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Timing & Content</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                    <Calendar size={12} /> Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => {
                                        setFormData({ ...formData, dueDate: e.target.value });
                                        setQuickOption('');
                                    }}
                                    className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                    <Clock size={12} /> Time
                                </label>
                                <input
                                    type="time"
                                    value={formData.dueTime}
                                    onChange={(e) => {
                                        setFormData({ ...formData, dueTime: e.target.value });
                                        setQuickOption('');
                                    }}
                                    className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                <AlignLeft size={12} /> Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full h-32 px-4 py-3 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium resize-none"
                                placeholder="Details about this activity..."
                            />
                        </div>

                        <AnimatePresence>
                            {isEdit && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl"
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${formData.completed ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-200 border border-emerald-100'}`}>
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                id="completed"
                                                checked={formData.completed}
                                                onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                                                className="hidden"
                                            />
                                            <span className={`text-sm font-bold transition-colors ${formData.completed ? 'text-emerald-700' : 'text-gray-400 group-hover:text-emerald-600'}`}>
                                                {formData.completed ? 'Activity Completed' : 'Mark as Done'}
                                            </span>
                                        </label>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition-all"
                >
                    Cancel
                </button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-purple-500/30 flex items-center gap-2 group"
                >
                    <Calendar size={16} className="group-hover:rotate-12 transition-transform" />
                    {isEdit ? 'Update Activity' : 'Confirm Schedule'}
                </motion.button>
            </div>
        </form>
    );
}
