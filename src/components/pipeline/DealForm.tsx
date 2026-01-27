import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Briefcase, Link as LinkIcon, DollarSign, Target, Calendar, FileText, Building2, User } from 'lucide-react';

interface DealFormProps {
    onSubmit: (e: React.FormEvent, data: any) => Promise<void>;
    initialData?: any;
    isEdit?: boolean;
    onCancel: () => void;
    contacts: any[];
}

const stageConfig: Record<string, string> = {
    QUALIFIED: 'New',
    DISCOVERY: 'Discovery',
    PROPOSAL: 'Proposal',
    NEGOTIATION: 'Negotiation',
    CLOSED_WON: 'Closed Won',
    CLOSED_LOST: 'Closed Lost',
};

export default function DealForm({ onSubmit, initialData, isEdit = false, onCancel, contacts }: DealFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        value: '',
        currency: 'THB',
        stage: 'QUALIFIED',
        probability: 20,
        contactId: '',
        notes: '',
        startDate: '',
        closedAt: '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                value: initialData.value ? String(initialData.value) : '',
                currency: initialData.currency || 'THB',
                stage: initialData.stage || 'QUALIFIED',
                probability: initialData.probability || 20,
                contactId: initialData.contactId || initialData.contact?.id || '',
                notes: initialData.notes || '',
                startDate: initialData.createdAt
                    ? String(initialData.createdAt).slice(0, 10)
                    : '',
                closedAt: initialData.closedAt
                    ? String(initialData.closedAt).slice(0, 10)
                    : '',
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSubmit(e, {
                ...formData,
                value: parseFloat(formData.value),
                probability: parseInt(String(formData.probability)),
                contactId: formData.contactId || undefined,
                startDate: formData.startDate
                    ? new Date(formData.startDate).toISOString()
                    : undefined,
                closedAt: formData.closedAt
                    ? new Date(formData.closedAt).toISOString()
                    : undefined,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Deal Information */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <div className="p-1.5 bg-blue-50 rounded-lg">
                            <Briefcase className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Deal Information</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                Deal Title *
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                                    placeholder="e.g. Enterprise License"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                    <DollarSign size={12} /> Value *
                                </label>
                                <input
                                    type="number"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-bold text-gray-900"
                                    placeholder="50000"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Currency
                                </label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                                >
                                    <option value="THB">THB (฿)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                    <Target size={12} /> Stage
                                </label>
                                <select
                                    value={formData.stage}
                                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                                    className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                                >
                                    {Object.entries(stageConfig).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Probability (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.probability}
                                    onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                                    className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium text-blue-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                <Calendar size={12} /> Start Date
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full h-11 px-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium"
                            />
                            <p className="mt-1.5 text-[10px] text-gray-400 italic font-medium px-1">
                                System will default to creation date if left empty.
                            </p>
                        </div>

                        <AnimatePresence>
                            {(formData.stage === 'CLOSED_WON' || formData.stage === 'CLOSED_LOST') && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50"
                                >
                                    <label className="block text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                        <Target size={12} /> {formData.stage === 'CLOSED_WON' ? 'Won Date (วันที่ชนะ)' : 'Lost Date (วันที่แพ้)'}
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.closedAt}
                                        onChange={(e) => setFormData({ ...formData, closedAt: e.target.value })}
                                        className="w-full h-11 px-4 bg-white border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm font-bold text-emerald-700"
                                        required
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Column: Connection & Notes */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <div className="p-1.5 bg-purple-50 rounded-lg">
                            <LinkIcon className="w-4 h-4 text-purple-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Connection & Progress</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                <User size={12} /> Contact (Optional)
                            </label>
                            <select
                                value={formData.contactId}
                                onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                                className="w-full h-11 px-4 bg-purple-50/30 border-none rounded-2xl focus:ring-2 focus:ring-purple-500/20 transition-all text-sm font-medium"
                            >
                                <option value="">-- No linked contact --</option>
                                {contacts.map((contact) => (
                                    <option key={contact.id} value={contact.id}>
                                        {contact.firstName} {contact.lastName}
                                    </option>
                                ))}
                            </select>

                            <AnimatePresence>
                                {formData.contactId && (() => {
                                    const contact = contacts.find(c => c.id === formData.contactId);
                                    if (!contact?.company) return null;
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="mt-3 p-3 bg-white border border-purple-100 rounded-2xl flex items-center gap-3"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                                                <Building2 className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Working at</p>
                                                <p className="text-sm font-bold text-gray-700">{contact.company}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })()}
                            </AnimatePresence>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1">
                                <FileText size={12} /> Notes & Context
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full h-40 px-4 py-3 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium resize-none"
                                placeholder="Add history, key requirements, or project details..."
                            />
                        </div>
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
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/30 disabled:opacity-50 flex items-center gap-2 group"
                >
                    {isSubmitting ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Briefcase size={16} className="group-hover:rotate-12 transition-transform" />
                    )}
                    {isEdit ? 'Save Changes' : 'Confirm & Add Deal'}
                </motion.button>
            </div>
        </form>
    );
}
