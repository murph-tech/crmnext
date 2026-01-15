import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface DealFormProps {
    onSubmit: (e: React.FormEvent, data: any) => Promise<void>;
    initialData?: any;
    isEdit?: boolean;
    onCancel: () => void;
    contacts: any[]; // Pass contacts list to avoid fetching again
}

const stageConfig: Record<string, string> = {
    QUALIFIED: 'Qualified',
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
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Deal Title *</label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    placeholder="e.g. Enterprise License"
                    required
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Value *</label>
                    <input
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                        placeholder="50000"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                    <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    >
                        <option value="THB">THB</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Stage</label>
                    <select
                        value={formData.stage}
                        onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                        className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    >
                        {Object.entries(stageConfig).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Probability (%)</label>
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.probability}
                        onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                        className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact (Optional)</label>
                <select
                    value={formData.contactId}
                    onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                >
                    <option value="">No contact</option>
                    {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                            {contact.firstName} {contact.lastName}
                        </option>
                    ))}
                </select>
                {formData.contactId && (() => {
                    const contact = contacts.find(c => c.id === formData.contactId);
                    return contact?.company ? (
                        <div className="mt-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 flex items-center gap-2">
                            <span className="font-medium text-gray-700">Company:</span>
                            {contact.company}
                        </div>
                    ) : null;
                })()}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full h-24 px-3 py-2 rounded-xl spotlight-input text-sm resize-none"
                    placeholder="Add any additional details..."
                />
            </div>

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
                    disabled={isSubmitting}
                    className="px-4 py-2.5 bg-[#007AFF] text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {isEdit ? 'Save Changes' : 'Add Deal'}
                </motion.button>
            </div>
        </form>
    );
}
