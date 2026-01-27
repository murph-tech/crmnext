'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Contact,
    Plus,
    Search,
    Edit2,
    Trash2,
    Loader2,
    GripVertical,
    X,
    Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { ColumnDef } from '@/types/table';
import { ColumnHeader } from '@/components/ui/ColumnHeader';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

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
    type?: 'CUSTOMER' | 'VENDOR' | 'PARTNER' | 'OTHER';
    createdAt: string;
    _count?: { deals: number; activities: number };
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { id: 'name', label: 'Name', width: '1.5fr', minWidth: 200, visible: true, filterValue: '' },
    { id: 'type', label: 'Role', width: 100, minWidth: 100, visible: true, filterValue: '' },
    { id: 'email', label: 'Email', width: '1.5fr', minWidth: 150, visible: true, filterValue: '' },
    { id: 'phone', label: 'Phone', width: '1fr', minWidth: 120, visible: true, filterValue: '' },
    { id: 'company', label: 'Company', width: '1.2fr', minWidth: 150, visible: true, filterValue: '' },
    { id: 'location', label: 'Location', width: '1fr', minWidth: 120, visible: true, filterValue: '' },
    { id: 'stats', label: 'Stats', width: 100, minWidth: 80, visible: true, filterValue: '' },
    { id: 'owner', label: 'Owner', width: 100, minWidth: 80, visible: true, filterValue: '' },
];

export default function ContactsPage() {
    const { token } = useAuth();
    const [contacts, setContacts] = useState<ContactType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
    const [isInitialized, setIsInitialized] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedContact, setSelectedContact] = useState<ContactType | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Persistence ---
    useEffect(() => {
        const saved = localStorage.getItem('crm_contacts_columns_v2'); // Increment version
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const merged = DEFAULT_COLUMNS.map(col => {
                    const existing = parsed.find((p: any) => p.id === col.id);
                    return existing ? { ...col, ...existing, filterValue: '' } : col;
                });
                setColumns(merged);
            } catch (e) {
                console.error('Failed to parse columns', e);
            }
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('crm_contacts_columns_v2', JSON.stringify(columns.map(({ id, width, visible }) => ({ id, width, visible }))));
        }
    }, [columns, isInitialized]);

    // --- Sensors ---
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleColumnMove = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setColumns((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleResize = (id: string, width: number) => {
        setColumns(prev => prev.map(col => col.id === id ? { ...col, width } : col));
    };

    const handleFilterChange = (id: string, value: string) => {
        setColumns(prev => prev.map(col => col.id === id ? { ...col, filterValue: value } : col));
    };

    const gridTemplateColumns = useMemo(() => {
        const cols = columns.filter(c => c.visible).map(c =>
            typeof c.width === 'number' ? `${c.width}px` : c.width
        );
        return `40px ${cols.join(' ')}`;
    }, [columns]);

    const filteredContacts = useMemo(() => {
        return contacts.filter(contact => {
            return columns.every(col => {
                if (!col.filterValue) return true;
                const val = col.filterValue.toLowerCase();

                switch (col.id) {
                    case 'name':
                        return `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(val);
                    case 'type':
                        return (contact.type || '').toLowerCase().includes(val);
                    case 'email':
                        return contact.email.toLowerCase().includes(val);
                    case 'phone':
                        return (contact.phone || '').toLowerCase().includes(val);
                    case 'company':
                        return `${contact.company || ''} ${contact.jobTitle || ''}`.toLowerCase().includes(val);
                    case 'location':
                        return `${contact.city || ''} ${contact.country || ''}`.toLowerCase().includes(val);
                    case 'owner':
                        return (contact as any).owner?.name?.toLowerCase().includes(val);
                    default:
                        return true;
                }
            });
        });
    }, [contacts, columns]);

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
        type: 'CUSTOMER', // Default
    });

    const loadContacts = useCallback(async () => {
        try {
            const data = await api.getContacts(token!);
            setContacts(data);
        } catch (error) {
            console.error('Failed to load contacts:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

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
            type: 'CUSTOMER',
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
            type: contact.type || 'CUSTOMER',
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
                        Contacts <span className="text-gray-400 font-normal text-sm ml-2">({filteredContacts.length})</span>
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
                                    // ... import logic kept same ...
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
                                                    notes: item.notes || item.Notes,
                                                    type: 'CUSTOMER' // Default for import
                                                };
                                                if (contactData.email) {
                                                    await api.createContact(token!, contactData);
                                                    successCount++;
                                                }
                                            } catch (err) { console.warn('Failed to import row:', item, err); }
                                        }
                                        alert(`Successfully imported ${successCount} contacts.`);
                                        loadContacts();
                                    } catch (error) { console.error('Import failed:', error); alert('Failed to import file.'); } finally { setIsLoading(false); e.target.value = ''; }
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
                                        type: c.type || 'CUSTOMER',
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
                                } catch (error) { console.error('Export failed:', error); }
                            }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 rounded-md hover:bg-white transition-all"
                        >
                            Export
                        </button>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#AF52DE] text-white text-sm font-medium rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#AF52DE] transition-colors"
                    >
                        <Plus size={16} />
                        <span>New Contact</span>
                    </button>
                </div>
            </motion.div>

            {/* Contacts List */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 flex flex-col relative overflow-hidden">
                <div className="overflow-x-auto flex-1 flex flex-col min-w-full">
                    <div className="min-w-[1000px] flex flex-col flex-1">
                        {/* Desktop Table Header */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragEnd={handleColumnMove}
                        >
                            <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                <div
                                    className="hidden md:grid gap-0 border-b border-gray-200 bg-gray-50 items-center sticky top-0 z-20"
                                    style={{ gridTemplateColumns }}
                                >
                                    <div className="flex justify-center px-4 py-3 h-full items-center border-r border-gray-200 bg-gray-50">
                                        <input type="checkbox" className="rounded border-gray-300 text-[#AF52DE] focus:ring-[#AF52DE]" />
                                    </div>
                                    {columns.filter(c => c.visible).map((col, idx) => (
                                        <ColumnHeader
                                            key={col.id}
                                            column={col}
                                            onResize={handleResize}
                                            onFilterChange={handleFilterChange}
                                            index={idx}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                        {/* List Body */}
                        <div className="overflow-y-auto flex-1 bg-white">
                            {filteredContacts.length > 0 ? filteredContacts.map((contact) => (
                                <div key={contact.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                    {/* Desktop Row */}
                                    <div
                                        className="hidden md:grid group gap-0 items-center text-sm"
                                        style={{ gridTemplateColumns }}
                                    >
                                        <div className="flex justify-center border-r border-gray-100/50 h-full items-center">
                                            <input type="checkbox" className="rounded border-gray-300 text-[#AF52DE] focus:ring-[#AF52DE]" />
                                        </div>

                                        {columns.filter(c => c.visible).map(col => {
                                            switch (col.id) {
                                                case 'name':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 flex items-center gap-3 min-w-0 border-r border-gray-100/50 h-full">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#AF52DE] to-[#5856D6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                                {contact.firstName[0]}{contact.lastName[0]}
                                                            </div>
                                                            <div className="truncate">
                                                                <span className="font-medium text-gray-900 block truncate">{contact.firstName} {contact.lastName}</span>
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
                                                    );
                                                case 'type':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${contact.type === 'VENDOR' ? 'bg-orange-100 text-orange-700' :
                                                                    contact.type === 'PARTNER' ? 'bg-blue-100 text-blue-700' :
                                                                        contact.type === 'OTHER' ? 'bg-gray-100 text-gray-700' :
                                                                            'bg-green-100 text-green-700'
                                                                }`}>
                                                                {contact.type || 'CUSTOMER'}
                                                            </span>
                                                        </div>
                                                    );
                                                case 'email':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center truncate text-gray-600">
                                                            {contact.email}
                                                        </div>
                                                    );
                                                case 'phone':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center truncate text-gray-600">
                                                            {contact.phone || '-'}
                                                        </div>
                                                    );
                                                case 'company':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex flex-col justify-center truncate">
                                                            <div className="text-gray-900 truncate">{contact.company || '-'}</div>
                                                            <div className="text-xs text-gray-500 truncate">{contact.jobTitle || '-'}</div>
                                                        </div>
                                                    );
                                                case 'location':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center truncate text-gray-500">
                                                            {[contact.city, contact.country].filter(Boolean).join(', ') || '-'}
                                                        </div>
                                                    );
                                                case 'stats':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex flex-col justify-center text-center text-xs text-gray-400">
                                                            {contact._count ? (
                                                                <>
                                                                    <span>{contact._count.deals} deals</span>
                                                                    <span>{contact._count.activities} acts</span>
                                                                </>
                                                            ) : '-'}
                                                        </div>
                                                    );
                                                case 'owner':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 h-full flex items-center justify-center">
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
                                                    );
                                                default:
                                                    return null;
                                            }
                                        })}
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
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${contact.type === 'VENDOR' ? 'bg-orange-100 text-orange-700' :
                                                                contact.type === 'PARTNER' ? 'bg-blue-100 text-blue-700' :
                                                                    contact.type === 'OTHER' ? 'bg-gray-100 text-gray-700' :
                                                                        'bg-green-100 text-green-700'
                                                            }`}>
                                                            {contact.type || 'CUSTOMER'}
                                                        </span>
                                                        <span className="text-xs text-gray-500 truncate max-w-[120px]">{contact.company || 'No Company'}</span>
                                                    </div>
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
                            )) : (
                                <div className="text-center py-16 text-gray-400">
                                    <Search size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium text-gray-500">No contacts found matching your criteria</p>
                                    <button
                                        onClick={() => setColumns(prev => prev.map(c => ({ ...c, filterValue: '' })))}
                                        className="mt-4 text-[#AF52DE] text-sm font-black hover:underline"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}

                            {/* Add Contact Row */}
                            <button
                                onClick={() => { resetForm(); setShowAddModal(true); }}
                                className="w-full flex items-center gap-3 px-4 py-4 text-sm text-gray-500 hover:bg-gray-50 hover:text-[#AF52DE] transition-colors border-b border-gray-100 text-left"
                            >
                                <div className="w-10 flex justify-center">
                                    <Plus size={18} strokeWidth={3} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-[11px]">Add new contact</span>
                            </button>
                        </div>
                    </div>
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
                    isSubmitting={isSubmitting}
                    isEdit
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
    <form onSubmit={onSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Personal Information */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-[#AF52DE] mb-2">
                    <Search className="w-4 h-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Contact Details</h3>
                </div>

                <div className="space-y-4">
                    {/* Role Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Type *</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['CUSTOMER', 'VENDOR', 'PARTNER', 'OTHER'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type })}
                                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${formData.type === type
                                            ? type === 'VENDOR' ? 'bg-orange-100 border-orange-200 text-orange-700'
                                                : type === 'PARTNER' ? 'bg-blue-100 border-blue-200 text-blue-700'
                                                    : type === 'OTHER' ? 'bg-gray-100 border-gray-200 text-gray-700'
                                                        : 'bg-green-100 border-green-200 text-green-700'
                                            : 'bg-white border-gray-200 text-gray-500 hover:border-[#AF52DE]/30'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">First Name *</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#AF52DE] focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                                placeholder="ชื่อ"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Last Name *</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#AF52DE] focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                                placeholder="นามสกุล"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1 flex items-center gap-1 text-[#AF52DE]">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full h-11 px-4 bg-gray-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-[#AF52DE] focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                            placeholder="example@company.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Phone</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#AF52DE] focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                            placeholder="08x-xxx-xxxx"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#AF52DE] focus:bg-white focus:border-transparent transition-all text-sm outline-none resize-none"
                            placeholder="ข้อมูลเพิ่มเติม..."
                        />
                    </div>
                </div>
            </div>

            {/* Right Column: Work & Location */}
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-[#5856D6] mb-2">
                    <Filter className="w-4 h-4" />
                    <h3 className="text-sm font-semibold uppercase tracking-wider">Work & Location</h3>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Company</label>
                            <input
                                type="text"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5856D6] focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                                placeholder="ชื่อบริษัท"
                            />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Job Title</label>
                            <input
                                type="text"
                                value={formData.jobTitle}
                                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#5856D6] focus:bg-white focus:border-transparent transition-all text-sm outline-none"
                                placeholder="ตำแหน่งงาน"
                            />
                        </div>
                    </div>

                    <div className="bg-[#5856D6]/5 p-5 rounded-2xl border border-[#5856D6]/10">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#5856D6] uppercase mb-1.5 ml-1">Tax ID</label>
                                <input
                                    type="text"
                                    value={formData.taxId}
                                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                    className="w-full h-11 px-4 bg-white border border-[#5856D6]/20 rounded-xl focus:ring-2 focus:ring-[#5856D6] transition-all text-sm outline-none"
                                    placeholder="เลขประจำตัวผู้เสียภาษี"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[#5856D6] uppercase mb-1.5 ml-1">Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows={2}
                                    className="w-full px-4 py-3 bg-white border border-[#5856D6]/20 rounded-xl focus:ring-2 focus:ring-[#5856D6] transition-all text-sm outline-none resize-none"
                                    placeholder="ที่อยู่..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[#5856D6] uppercase mb-1.5 ml-1">City</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full h-11 px-4 bg-white border border-[#5856D6]/20 rounded-xl focus:ring-2 focus:ring-[#5856D6] transition-all text-sm outline-none"
                                        placeholder="จังหวัด"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[#5856D6] uppercase mb-1.5 ml-1">Country</label>
                                    <input
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full h-11 px-4 bg-white border border-[#5856D6]/20 rounded-xl focus:ring-2 focus:ring-[#5856D6] transition-all text-sm outline-none"
                                        placeholder="ประเทศ"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400">
                <span className="text-red-500">*</span> Required fields
            </p>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                >
                    Cancel
                </button>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-[#AF52DE] to-[#5856D6] text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 hover:from-[#9437C0] hover:to-[#AF52DE] transition-all active:scale-95 disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <>
                            <Plus size={18} />
                            <span>{isEdit ? 'Save Changes' : 'Add Contact'}</span>
                        </>
                    )}
                </motion.button>
            </div>
        </div>
    </form>
);
