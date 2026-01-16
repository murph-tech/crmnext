'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Contact, Plus, Search, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Modal from '@/components/ui/Modal';

interface ContactType {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    taxId?: string;
    address?: string;
    city?: string;
    country?: string;
    notes?: string;
    createdAt: string;
    _count?: { deals: number; activities: number };
}

export default function ContactsPage() {
    const { token } = useAuth();
    const [contacts, setContacts] = useState<ContactType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState<ContactType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        jobTitle: '',
        taxId: '',
        address: '',
        city: '',
        country: '',
        notes: '',
    });

    const loadContacts = useCallback(async () => {
        try {
            const data = await api.getContacts(token!, { search: searchQuery || undefined });
            setContacts(data);
        } catch (error) {
            console.error('Failed to load contacts:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token, searchQuery]);

    useEffect(() => {
        if (token) loadContacts();
    }, [token, loadContacts]);

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
            city: '',
            country: '',
            notes: '',
        });
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.createContact(token!, formData);
            await loadContacts();
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Failed to create contact:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContact) return;
        setIsSubmitting(true);
        try {
            await api.updateContact(token!, selectedContact.id, formData);
            await loadContacts();
            setShowEditModal(false);
            setSelectedContact(null);
            resetForm();
        } catch (error) {
            console.error('Failed to update contact:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteContact = async () => {
        if (!selectedContact) return;
        setIsSubmitting(true);
        try {
            await api.deleteContact(token!, selectedContact.id);
            await loadContacts();
            setShowDeleteModal(false);
            setSelectedContact(null);
        } catch (error) {
            console.error('Failed to delete contact:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (contact: ContactType) => {
        setSelectedContact(contact);
        setFormData({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone || '',
            company: contact.company || '',
            jobTitle: contact.jobTitle || '',
            taxId: contact.taxId || '',
            address: contact.address || '',
            city: contact.city || '',
            country: contact.country || '',
            notes: contact.notes || '',
        });
        setShowEditModal(true);
    };



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
                    <h1 className="text-xl font-bold tracking-tight text-[#AF52DE] flex items-center gap-2">
                        <Contact size={24} />
                        Contacts <span className="text-gray-400 font-normal text-sm ml-2">({contacts.length})</span>
                    </h1>
                </div>

                <div className="flex gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
                        <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 cursor-pointer rounded-md hover:bg-white transition-all">
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    setIsLoading(true);
                                    try {
                                        const { parseCsv } = await import('@/lib/csvHelper');
                                        const data = await parseCsv(file);

                                        let successCount = 0;
                                        for (const item of data) {
                                            try {
                                                const contactData = {
                                                    firstName: item.firstName || item.FirstName || 'Unknown',
                                                    lastName: item.lastName || item.LastName || 'Unknown',
                                                    email: item.email || item.Email,
                                                    phone: item.phone || item.Phone,
                                                    company: item.company || item.Company,
                                                    jobTitle: item.jobTitle || item.JobTitle,
                                                    address: item.address || item.Address,
                                                    city: item.city || item.City,
                                                    country: item.country || item.Country,
                                                    notes: item.notes || item.Notes
                                                };

                                                if (contactData.email) {
                                                    await api.createContact(token!, contactData);
                                                    successCount++;
                                                }
                                            } catch (err) {
                                                console.warn('Failed to import row:', item, err);
                                            }
                                        }

                                        alert(`Successfully imported ${successCount} contacts.`);
                                        loadContacts();
                                    } catch (error) {
                                        console.error('Import failed:', error);
                                        alert('Failed to import file.');
                                    } finally {
                                        setIsLoading(false);
                                        e.target.value = '';
                                    }
                                }}
                            />
                            <span>Import</span>
                        </label>
                        <button
                            onClick={async () => {
                                try {
                                    const { exportToCsv } = await import('@/lib/csvHelper');
                                    const exportData = contacts.map(c => ({
                                        firstName: c.firstName,
                                        lastName: c.lastName,
                                        email: c.email,
                                        phone: c.phone,
                                        company: c.company,
                                        jobTitle: c.jobTitle,
                                        address: c.address,
                                        city: c.city,
                                        country: c.country,
                                        notes: c.notes,
                                        createdAt: c.createdAt
                                    }));
                                    exportToCsv(exportData, `contacts-export-${new Date().toISOString().split('T')[0]}.csv`);
                                } catch (error) {
                                    console.error('Export failed:', error);
                                }
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-md hover:bg-white transition-all"
                        >
                            Export
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadContacts()}
                            placeholder="Search contacts..."
                            className="h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AF52DE]/20 w-64"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Contacts List */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-[40px_1.5fr_1.5fr_1fr_1.2fr_1fr_100px_100px] gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider items-center">
                    <div className="flex justify-center">
                        <input type="checkbox" className="rounded border-gray-300 text-[#AF52DE] focus:ring-[#AF52DE]" />
                    </div>
                    <div>Name</div>
                    <div>Email</div>
                    <div>Phone</div>
                    <div>Company</div>
                    <div>Location</div>
                    <div className="text-center">Stats</div>
                    <div className="text-center">Owner</div>
                </div>

                {/* List Body */}
                <div className="overflow-y-auto flex-1">
                    {contacts.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Contact size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium text-gray-500">No contacts found</p>
                            <p className="text-sm mt-1">Start by adding your first contact</p>
                        </div>
                    ) : (
                        contacts.map((contact, index) => (
                            <div key={contact.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                {/* Desktop Row */}
                                <div className="hidden md:grid group grid-cols-[40px_1.5fr_1.5fr_1fr_1.2fr_1fr_100px_100px] gap-4 px-4 py-3 items-center text-sm">
                                    <div className="flex justify-center">
                                        <input type="checkbox" className="rounded border-gray-300 text-[#AF52DE] focus:ring-[#AF52DE]" />
                                    </div>

                                    {/* Name & Avatar */}
                                    <div className="flex items-center gap-3 min-w-0 pr-4">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#AF52DE] to-[#5856D6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {contact.firstName[0]}{contact.lastName[0]}
                                        </div>
                                        <div className="truncate">
                                            <span className="font-medium text-gray-900 block truncate">{contact.firstName} {contact.lastName}</span>
                                            {/* Row Actions - Visible on Hover */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(contact); }}
                                                    className="p-0.5 hover:bg-gray-200 rounded text-gray-500"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedContact(contact); setShowDeleteModal(true); }}
                                                    className="p-0.5 hover:bg-red-50 rounded text-red-500"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="truncate text-gray-600">
                                        {contact.email}
                                    </div>

                                    {/* Phone */}
                                    <div className="truncate text-gray-600">
                                        {contact.phone || '-'}
                                    </div>

                                    {/* Company */}
                                    <div className="truncate">
                                        <div className="text-gray-900 truncate">{contact.company || '-'}</div>
                                        <div className="text-xs text-gray-500 truncate">{contact.jobTitle || '-'}</div>
                                    </div>

                                    {/* Location */}
                                    <div className="truncate text-gray-500">
                                        {[contact.city, contact.country].filter(Boolean).join(', ') || '-'}
                                    </div>

                                    {/* Stats */}
                                    <div className="text-center text-xs text-gray-400">
                                        {contact._count ? (
                                            <div className="flex flex-col gap-0.5">
                                                <span>{contact._count.deals} deals</span>
                                                <span>{contact._count.activities} acts</span>
                                            </div>
                                        ) : (
                                            '-'
                                        )}
                                    </div>

                                    {/* Owner */}
                                    <div className="flex justify-center">
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                            style={{
                                                backgroundColor: (contact as any).owner?.name
                                                    ? `hsl(${(contact as any).owner.name.charCodeAt(0) * 7 % 360}, 60%, 50%)`
                                                    : '#6B7280'
                                            }}
                                            title={(contact as any).owner?.name || 'Unknown'}
                                        >
                                            {(contact as any).owner?.name
                                                ? (contact as any).owner.name.substring(0, 2).toUpperCase()
                                                : 'NA'}
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#AF52DE] to-[#5856D6] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                {contact.firstName[0]}{contact.lastName[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-gray-900">{contact.firstName} {contact.lastName}</h3>
                                                <p className="text-xs text-gray-500">{contact.company || 'No Company'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1 text-sm text-gray-600">
                                        <div className="truncate">📧 {contact.email}</div>
                                        {contact.phone && <div className="truncate">📞 {contact.phone}</div>}
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                                        <div>
                                            {[contact.city, contact.country].filter(Boolean).join(', ') || 'No Location'}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(contact)}
                                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => { setSelectedContact(contact); setShowDeleteModal(true); }}
                                                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Add Contact Row */}
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 hover:text-[#AF52DE] transition-colors border-b border-gray-100 text-left"
                    >
                        <div className="w-10 flex justify-center">
                            <div className="w-4 h-4 rounded border border-gray-300 bg-white" />
                        </div>
                        <Plus size={16} />
                        <span className="font-medium">Add new contact</span>
                    </button>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Contact" size="lg">
                <ContactForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleAddContact}
                    isSubmitting={isSubmitting}
                    onCancel={() => { setShowAddModal(false); resetForm(); }}
                />
            </Modal>

            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Contact" size="lg">
                <ContactForm
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleEditContact}
                    isEdit
                    isSubmitting={isSubmitting}
                    onCancel={() => { setShowEditModal(false); resetForm(); }}
                />
            </Modal>

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Contact">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <Trash2 size={24} className="text-red-500" />
                    </div>
                    <p className="text-gray-900 font-medium mb-2">
                        Delete {selectedContact?.firstName} {selectedContact?.lastName}?
                    </p>
                    <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
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
                            onClick={handleDeleteContact}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Delete Contact
                        </motion.button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

const ContactForm = ({
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

        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
            />
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
                    placeholder="ที่อยู่"
                />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
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
                {isEdit ? 'Save Changes' : 'Add Contact'}
            </motion.button>
        </div>
    </form>
);
