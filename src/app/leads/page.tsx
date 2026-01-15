'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Filter, Edit2, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Modal from '@/components/ui/Modal';

interface Lead {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    taxId?: string;
    address?: string;
    source: string;
    status: string;
    notes?: string;
    createdAt: string;
}

const sourceOptions = ['WEBSITE', 'REFERRAL', 'LINKEDIN', 'COLD_CALL', 'ADVERTISEMENT', 'OTHER'];
const statusOptions = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'];

const statusColors: Record<string, string> = {
    NEW: '#007AFF',
    CONTACTED: '#FF9500',
    QUALIFIED: '#34C759',
    UNQUALIFIED: '#FF3B30',
    CONVERTED: '#AF52DE',
};

export default function LeadsPage() {
    const { token } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        jobTitle: '',
        taxId: '',
        address: '',
        source: 'OTHER',
        notes: '',
    });

    useEffect(() => {
        if (token) loadLeads();
    }, [token]);

    const loadLeads = async () => {
        try {
            const data = await api.getLeads(token!, { search: searchQuery || undefined });
            setLeads(data);
        } catch (error) {
            console.error('Failed to load leads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            company: '',
            jobTitle: '',
            taxId: '',
            address: '',
            source: 'OTHER',
            notes: '',
        });
    };

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.createLead(token!, formData);
            await loadLeads();
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Failed to create lead:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLead) return;
        setIsSubmitting(true);
        try {
            await api.updateLead(token!, selectedLead.id, formData);
            await loadLeads();
            setShowEditModal(false);
            setSelectedLead(null);
            resetForm();
        } catch (error) {
            console.error('Failed to update lead:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLead = async () => {
        if (!selectedLead) return;
        setIsSubmitting(true);
        try {
            await api.deleteLead(token!, selectedLead.id);
            await loadLeads();
            setShowDeleteModal(false);
            setSelectedLead(null);
        } catch (error) {
            console.error('Failed to delete lead:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConvertLead = async () => {
        if (!selectedLead) return;
        setIsSubmitting(true);
        try {
            await api.convertLead(token!, selectedLead.id);
            await loadLeads();
            setShowConvertModal(false);
            setSelectedLead(null);
        } catch (error) {
            console.error('Failed to convert lead:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (lead: Lead) => {
        setSelectedLead(lead);
        setFormData({
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone || '',
            company: lead.company || '',
            jobTitle: lead.jobTitle || '',
            taxId: lead.taxId || '',
            address: lead.address || '',
            source: lead.source,
            notes: lead.notes || '',
        });
        setShowEditModal(true);
    };

    const openDeleteModal = (lead: Lead) => {
        setSelectedLead(lead);
        setShowDeleteModal(true);
    };

    const openConvertModal = (lead: Lead) => {
        setSelectedLead(lead);
        setShowConvertModal(true);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadLeads();
    };

    // LeadForm moved outside to prevent re-rendering issues
    const renderLeadForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean = false) => (
        <LeadForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={onSubmit}
            isEdit={isEdit}
            isSubmitting={isSubmitting}
            onCancel={() => {
                if (isEdit) setShowEditModal(false);
                else setShowAddModal(false);
                resetForm();
            }}
        />
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-[#007AFF]" />
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto h-[calc(100vh-140px)] flex flex-col">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-4 flex-shrink-0"
            >
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#007AFF] flex items-center gap-2">
                        <Users size={24} />
                        Leads <span className="text-gray-400 font-normal text-sm ml-2">({leads.length})</span>
                    </h1>
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                            placeholder="Search leads..."
                            className="h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 w-64"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Leads Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col">
                {/* Table Header */}
                <div className="grid grid-cols-[40px_1.5fr_120px_1.5fr_1.2fr_120px_120px] gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider items-center">
                    <div className="flex justify-center">
                        <input type="checkbox" className="rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]" />
                    </div>
                    <div>Name</div>
                    <div>Status</div>
                    <div>Contact</div>
                    <div>Company</div>
                    <div>Source</div>
                    <div className="text-center">Owner</div>
                </div>

                {/* Table Body */}
                <div className="overflow-y-auto flex-1">
                    {leads.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Users size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium text-gray-500">No leads found</p>
                            <p className="text-sm mt-1">Start by adding your first lead</p>
                        </div>
                    ) : (
                        leads.map((lead, index) => (
                            <div key={lead.id} className="group grid grid-cols-[40px_1.5fr_120px_1.5fr_1.2fr_120px_120px] gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center text-sm">
                                <div className="flex justify-center">
                                    <input type="checkbox" className="rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]" />
                                </div>

                                {/* Name & Avatar */}
                                <div className="flex items-center gap-3 min-w-0 pr-4">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                                        style={{ backgroundColor: `${statusColors[lead.status]}15`, color: statusColors[lead.status] }}
                                    >
                                        {lead.firstName[0]}{lead.lastName[0]}
                                    </div>
                                    <div className="truncate">
                                        <span className="font-medium text-gray-900 block truncate">{lead.firstName} {lead.lastName}</span>
                                        {/* Row Actions - Visible on Hover */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                                            {lead.status !== 'CONVERTED' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openConvertModal(lead); }}
                                                    className="p-0.5 hover:bg-purple-100 rounded text-purple-600"
                                                    title="Convert to Contact"
                                                >
                                                    <ArrowRight size={12} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openEditModal(lead); }}
                                                className="p-0.5 hover:bg-gray-200 rounded text-gray-500"
                                                title="Edit"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openDeleteModal(lead); }}
                                                className="p-0.5 hover:bg-red-50 rounded text-red-500"
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <span
                                        className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full"
                                        style={{
                                            backgroundColor: `${statusColors[lead.status]}15`,
                                            color: statusColors[lead.status],
                                        }}
                                    >
                                        {lead.status}
                                    </span>
                                </div>

                                {/* Contact Info */}
                                <div className="truncate">
                                    <div className="text-gray-900 truncate">{lead.email}</div>
                                    <div className="text-xs text-gray-500 truncate">{lead.phone || '-'}</div>
                                </div>

                                {/* Company */}
                                <div className="truncate">
                                    <div className="text-gray-900 truncate">{lead.company || '-'}</div>
                                    <div className="text-xs text-gray-500 truncate">{lead.jobTitle || '-'}</div>
                                </div>

                                {/* Source */}
                                <div>
                                    <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded text-gray-600 bg-gray-100">
                                        {lead.source.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Owner */}
                                <div className="flex justify-center">
                                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                                        MT
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add Lead Row */}
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 hover:text-[#007AFF] transition-colors border-b border-gray-100 text-left"
                    >
                        <div className="w-10 flex justify-center">
                            <div className="w-4 h-4 rounded border border-gray-300 bg-white" />
                        </div>
                        <Plus size={16} />
                        <span className="font-medium">Add new lead</span>
                    </button>
                </div>
            </div>

            {/* Add Lead Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Lead" size="lg">
                {renderLeadForm(handleAddLead)}
            </Modal>

            {/* Edit Lead Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Lead" size="lg">
                {renderLeadForm(handleEditLead, true)}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Lead">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <Trash2 size={24} className="text-red-500" />
                    </div>
                    <p className="text-gray-900 font-medium mb-2">
                        Delete {selectedLead?.firstName} {selectedLead?.lastName}?
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        This action cannot be undone. All data associated with this lead will be permanently removed.
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleDeleteLead}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Delete Lead
                        </motion.button>
                    </div>
                </div>
            </Modal>

            {/* Convert Lead Modal */}
            <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} title="Convert to Contact">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-50 flex items-center justify-center">
                        <ArrowRight size={24} className="text-purple-500" />
                    </div>
                    <p className="text-gray-900 font-medium mb-2">
                        Convert {selectedLead?.firstName} {selectedLead?.lastName} to Contact?
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        This will create a new contact and mark the lead as converted.
                    </p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => setShowConvertModal(false)}
                            className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleConvertLead}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-purple-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Convert to Contact
                        </motion.button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

// Form component (moved outside to prevent re-renders)
const LeadForm = ({
    formData,
    setFormData,
    onSubmit,
    isEdit = false,
    isSubmitting,
    onCancel
}: {
    formData: any;
    setFormData: (data: any) => void;
    onSubmit: (e: React.FormEvent) => void;
    isEdit?: boolean;
    isSubmitting: boolean;
    onCancel: () => void;
}) => (
    <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    required
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
            <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                required
            />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Source</label>
                <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                >
                    {sourceOptions.map((source) => (
                        <option key={source} value={source}>{source.replace('_', ' ')}</option>
                    ))}
                </select>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Company</label>
                <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Title</label>
                <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax ID</label>
                <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    placeholder="เลขประจำตัวผู้เสียภาษี"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    placeholder="ที่อยู่บริษัท"
                />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-24 px-3 py-2 rounded-xl spotlight-input text-sm resize-none"
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
                {isEdit ? 'Save Changes' : 'Add Lead'}
            </motion.button>
        </div>
    </form>
);
