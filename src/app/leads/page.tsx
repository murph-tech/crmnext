'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    ArrowRight,
    Loader2,
    Download,
    GripVertical,
    X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { Lead } from '@/types';
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

const sourceOptions = ['WEBSITE', 'REFERRAL', 'LINKEDIN', 'COLD_CALL', 'ADVERTISEMENT', 'OTHER'];
const statusOptions = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'];

const statusColors: Record<string, string> = {
    NEW: '#007AFF',
    CONTACTED: '#FF9500',
    QUALIFIED: '#34C759',
    UNQUALIFIED: '#FF3B30',
    CONVERTED: '#AF52DE',
};

const DEFAULT_COLUMNS: ColumnDef[] = [
    { id: 'name', label: 'Name', width: '1.5fr', minWidth: 200, visible: true, filterValue: '' },
    { id: 'status', label: 'Status', width: 120, minWidth: 100, visible: true, filterValue: '' },
    { id: 'contact', label: 'Contact', width: '1.5fr', minWidth: 150, visible: true, filterValue: '' },
    { id: 'company', label: 'Company', width: '1.2fr', minWidth: 150, visible: true, filterValue: '' },
    { id: 'source', label: 'Source', width: 120, minWidth: 100, visible: true, filterValue: '' },
    { id: 'owner', label: 'Owner', width: 100, minWidth: 80, visible: true, filterValue: '' },
];

export default function LeadsPage() {
    const { token } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
    const [isInitialized, setIsInitialized] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // --- Persistence ---
    useEffect(() => {
        const saved = localStorage.getItem('crm_leads_columns_v1');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Merge with default to ensure new columns show up
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
            localStorage.setItem('crm_leads_columns_v1', JSON.stringify(columns.map(({ id, width, visible }) => ({ id, width, visible }))));
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

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            return columns.every(col => {
                if (!col.filterValue) return true;
                const val = col.filterValue.toLowerCase();

                switch (col.id) {
                    case 'name':
                        return `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(val);
                    case 'status':
                        return lead.status.toLowerCase().includes(val);
                    case 'contact':
                        return `${lead.email} ${lead.phone || ''}`.toLowerCase().includes(val);
                    case 'company':
                        return `${lead.company || ''} ${lead.jobTitle || ''}`.toLowerCase().includes(val);
                    case 'source':
                        return lead.source?.toLowerCase().includes(val);
                    case 'owner':
                        return (lead as any).owner?.name?.toLowerCase().includes(val);
                    default:
                        return true;
                }
            });
        });
    }, [leads, columns]);

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
            const data = await api.getLeads(token!);
            setLeads(data);
        } catch (error) {
            if (process.env.NODE_ENV !== 'development') {
                console.error('Failed to load leads:', error);
            }
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
            source: lead.source || 'OTHER',
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

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const { exportToCsv } = await import('@/lib/csvHelper');
            const exportData = leads.map(lead => ({
                Name: `${lead.firstName} ${lead.lastName}`,
                Status: lead.status,
                Email: lead.email,
                Phone: lead.phone || '-',
                Company: lead.company || '-',
                JobTitle: lead.jobTitle || '-',
                Source: lead.source || '-',
                Owner: (lead as any).owner?.name || 'Unassigned'
            }));
            exportToCsv(exportData, `leads-export-${new Date().toISOString().split('T')[0]}.csv`);
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
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
                        Leads <span className="text-gray-400 font-normal text-sm ml-2">({filteredLeads.length})</span>
                    </h1>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleExportCsv}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007AFF] disabled:opacity-50 transition-colors"
                    >
                        {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#007AFF] text-white text-sm font-medium rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007AFF] transition-colors"
                    >
                        <Plus size={16} />
                        <span>New Lead</span>
                    </button>
                </div>
            </motion.div>

            {/* Leads List */}
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
                                        <input type="checkbox" className="rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]" />
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
                            {filteredLeads.length > 0 ? filteredLeads.map((lead) => (
                                <div key={lead.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                    {/* Desktop Row */}
                                    <div
                                        className="hidden md:grid group gap-0 items-center text-sm"
                                        style={{ gridTemplateColumns }}
                                    >
                                        <div className="flex justify-center border-r border-gray-100/50 h-full items-center">
                                            <input type="checkbox" className="rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]" />
                                        </div>

                                        {columns.filter(c => c.visible).map(col => {
                                            switch (col.id) {
                                                case 'name':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 flex items-center gap-3 min-w-0 border-r border-gray-100/50 h-full">
                                                            <div
                                                                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                                                                style={{ backgroundColor: `${statusColors[lead.status]}15`, color: statusColors[lead.status] }}
                                                            >
                                                                {lead.firstName[0]}{lead.lastName[0]}
                                                            </div>
                                                            <div className="truncate">
                                                                <span className="font-medium text-gray-900 block truncate">{lead.firstName} {lead.lastName}</span>
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
                                                    );
                                                case 'status':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center">
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
                                                    );
                                                case 'contact':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex flex-col justify-center truncate">
                                                            <div className="text-gray-900 truncate">{lead.email}</div>
                                                            <div className="text-xs text-gray-500 truncate">{lead.phone || '-'}</div>
                                                        </div>
                                                    );
                                                case 'company':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex flex-col justify-center truncate">
                                                            <div className="text-gray-900 truncate">{lead.company || '-'}</div>
                                                            <div className="text-xs text-gray-500 truncate">{lead.jobTitle || '-'}</div>
                                                        </div>
                                                    );
                                                case 'source':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center">
                                                            <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded text-gray-600 bg-gray-100">
                                                                {lead.source?.replace('_', ' ') || 'OTHER'}
                                                            </span>
                                                        </div>
                                                    );
                                                case 'owner':
                                                    return (
                                                        <div key={col.id} className="px-4 py-3 h-full flex items-center justify-center">
                                                            <div
                                                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                                                style={{
                                                                    backgroundColor: (lead as any).owner?.name
                                                                        ? `hsl(${(lead as any).owner.name.charCodeAt(0) * 7 % 360}, 60%, 50%)`
                                                                        : '#6B7280'
                                                                }}
                                                                title={(lead as any).owner?.name || 'Unknown'}
                                                            >
                                                                {(lead as any).owner?.name
                                                                    ? (lead as any).owner.name.substring(0, 2).toUpperCase()
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
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                                                    style={{ backgroundColor: `${statusColors[lead.status]}15`, color: statusColors[lead.status] }}
                                                >
                                                    {lead.firstName[0]}{lead.lastName[0]}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</h3>
                                                    <p className="text-xs text-gray-500">{lead.company || 'No Company'}</p>
                                                </div>
                                            </div>
                                            <span
                                                className="inline-flex px-2 py-1 text-[10px] font-medium rounded-full"
                                                style={{
                                                    backgroundColor: `${statusColors[lead.status]}15`,
                                                    color: statusColors[lead.status],
                                                }}
                                            >
                                                {lead.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                            <div className="truncate">📧 {lead.email}</div>
                                            <div className="truncate">📞 {lead.phone || '-'}</div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                                            {lead.status !== 'CONVERTED' && (
                                                <button
                                                    onClick={() => openConvertModal(lead)}
                                                    className="px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg"
                                                >
                                                    Convert
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEditModal(lead)}
                                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(lead)}
                                                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-16 text-gray-400">
                                    <Search size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium text-gray-500">No leads found matching your criteria</p>
                                    <button
                                        onClick={() => setColumns(prev => prev.map(c => ({ ...c, filterValue: '' })))}
                                        className="mt-4 text-[#007AFF] text-sm font-black hover:underline"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}

                            {/* Add Lead Row */}
                            <button
                                onClick={() => { resetForm(); setShowAddModal(true); }}
                                className="w-full flex items-center gap-3 px-4 py-4 text-sm text-gray-500 hover:bg-gray-50 hover:text-[#007AFF] transition-colors border-b border-gray-100 text-left"
                            >
                                <div className="w-10 flex justify-center">
                                    <Plus size={18} strokeWidth={3} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-[11px]">Add new lead</span>
                            </button>
                        </div>
                    </div>
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
