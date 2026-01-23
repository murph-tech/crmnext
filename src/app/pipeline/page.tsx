'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Plus, Loader2, Edit2, Trash2, GripVertical, Users, Download, Search, Filter, ArrowUpDown, ChevronDown, MoreHorizontal, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import DealForm from '@/components/pipeline/DealForm';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    DropAnimation,
    UniqueIdentifier,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ColumnDef } from '@/types/table';
import { ColumnHeader } from '@/components/ui/ColumnHeader';

// --- Types ---

interface Deal {
    id: string;
    title: string;
    value: number;
    currency: string;
    stage: string;
    probability: number;
    contact?: { id: string; firstName: string; lastName: string; company?: string };
    contactId?: string;
    notes?: string;
    owner?: { id: string; name: string; email: string };
    activities?: any[];
    createdAt: string;
    expectedCloseDate?: string;
    quotationNumber?: string;
}

interface Stage {
    stage: string;
    deals: Deal[];
    count: number;
    totalValue: number;
}

const stageConfig: Record<string, { label: string; color: string }> = {
    QUALIFIED: { label: 'New', color: '#2563EB' }, // Blue-600
    DISCOVERY: { label: 'Discovery', color: '#4F46E5' }, // Indigo-600
    PROPOSAL: { label: 'Proposal', color: '#7C3AED' }, // Violet-600
    NEGOTIATION: { label: 'Negotiation', color: '#F97316' }, // Orange-500
    CLOSED_WON: { label: 'Closed Won', color: '#10B981' }, // Emerald-600
    CLOSED_LOST: { label: 'Closed Lost', color: '#DC2626' }, // Red-600
};

// --- Helper Components ---



// Sortable Deal Card Component
function SortableDealCard({ deal, onClickEdit, onClickDelete }: { deal: Deal, onClickEdit: () => void, onClickDelete: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: deal.id,
        data: {
            type: 'Deal',
            deal,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-40 bg-gray-100 rounded-xl h-[120px] border-2 border-dashed border-gray-300"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="glass-card rounded-xl p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group relative touch-none"
        >
            {/* Quick Actions (Hover) */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-sm z-10">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClickEdit();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                >
                    <Edit2 size={12} className="text-gray-500" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClickDelete();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                >
                    <Trash2 size={12} className="text-red-500" />
                </button>
            </div>

            <div className="flex items-start justify-between mb-3 pr-8">
                <a href={`/pipeline/${deal.id}`} className="font-medium text-gray-900 text-sm hover:text-[#007AFF] transition-colors">{deal.title}</a>
                <span className="text-xs text-gray-500">{deal.probability}%</span>
            </div>

            <p className="text-lg font-semibold text-gray-900 mb-2">
                {formatCurrency(deal.value, deal.currency)}
            </p>

            {deal.contact && (
                <p className="text-xs text-gray-500 mb-0">
                    {deal.contact.firstName} {deal.contact.lastName}
                </p>
            )}
        </div>
    );
}

// Sortable Deal Card Component (... kept for reference if needed, though we use table now ...)
// We can actually repurpose this or keep it.
// ...

// Stage Selector Component
function StageSelector({ currentStage, onStageChange }: { currentStage: string, onStageChange: (stage: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    // Close on click outside (simulated with fixed overlay for simplicity)
    useEffect(() => {
        if (isOpen) {
            const handleClick = () => setIsOpen(false);
            window.addEventListener('click', handleClick);
            return () => window.removeEventListener('click', handleClick);
        }
    }, [isOpen]);

    const currentConfig = stageConfig[currentStage] || { label: currentStage, color: '#6B7280' };

    return (
        <>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium text-white shadow-sm transition-transform active:scale-95"
                style={{ backgroundColor: currentConfig.color }}
            >
                <span className="truncate flex-1 text-center">{currentConfig.label}</span>
            </button>

            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    {Object.entries(stageConfig).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => {
                                onStageChange(key);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                            <span className={key === currentStage ? 'text-gray-900 font-bold' : 'text-gray-600'}>
                                {config.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}

// OwnerSelector Component
function OwnerSelector({ currentOwner, users, onOwnerChange, currentUserRole }: { currentOwner?: { id: string, name: string; email: string }, users: any[], onOwnerChange: (userId: string) => void, currentUserRole?: string }) {
    const [isOpen, setIsOpen] = useState(false);

    // Auth check
    const canChangeOwner = currentUserRole === 'ADMIN' || currentUserRole === 'MANAGER';

    // Close on click outside
    useEffect(() => {
        if (isOpen) {
            const handleClick = () => setIsOpen(false);
            window.addEventListener('click', handleClick);
            return () => window.removeEventListener('click', handleClick);
        }
    }, [isOpen]);

    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (canChangeOwner) {
                        setIsOpen(!isOpen);
                    }
                }}
                disabled={!canChangeOwner}
                title={!canChangeOwner ? "Only Admin and Manager can change owner" : "Change Owner"}
                className={`flex items-center gap-2 p-1.5 -ml-1.5 rounded-lg transition-colors group ${canChangeOwner ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-not-allowed opacity-60'
                    }`}
            >
                <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: currentOwner?.name ? `hsl(${currentOwner.name.charCodeAt(0) * 7 % 360}, 60%, 50%)` : '#6B7280' }}
                >
                    {currentOwner?.name?.substring(0, 2).toUpperCase() || 'NA'}
                </div>
                <span className="text-sm text-gray-700 truncate max-w-[80px]" title={currentOwner?.name}>
                    {currentOwner?.name || 'Unassigned'}
                </span>
            </button>

            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden py-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    {users.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => {
                                onOwnerChange(user.id);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
                        >
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                style={{ backgroundColor: user.name ? `hsl(${user.name.charCodeAt(0) * 7 % 360}, 60%, 50%)` : '#6B7280' }}
                            >
                                {user.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <span className={user.id === currentOwner?.id ? 'text-gray-900 font-bold' : 'text-gray-600'}>
                                {user.name}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Deal Card Overlay (what you see while dragging)
function DealCardOverlay({ deal }: { deal: Deal }) {
    return (
        <div className="glass-card rounded-xl p-4 shadow-xl cursor-grabbing scale-105 rotate-2">
            <div className="flex items-start justify-between mb-3 pr-8">
                <h4 className="font-medium text-gray-900 text-sm">{deal.title}</h4>
                <span className="text-xs text-gray-500">{deal.probability}%</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-2">
                {formatCurrency(deal.value, deal.currency)}
            </p>
            {deal.contact && (
                <p className="text-xs text-gray-500 mb-0">
                    {deal.contact.firstName} {deal.contact.lastName}
                </p>
            )}
        </div>
    )
}

// --- Main Page Component ---

export default function PipelinePage() {
    const { token, user } = useAuth();
    const [pipeline, setPipeline] = useState<Stage[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const DEFAULT_COLUMNS: ColumnDef[] = [
        { id: 'title', label: 'Deal / Contact', width: '2fr', minWidth: 200, visible: true, filterValue: '' },
        { id: 'company', label: 'Company', width: 150, minWidth: 100, visible: true, filterValue: '' },
        { id: 'value', label: 'Value / Quote', width: 140, minWidth: 100, visible: true, filterValue: '' },
        { id: 'stage', label: 'Stage', width: 120, minWidth: 100, visible: true, filterValue: '' },
        { id: 'progress', label: 'Progress', width: 100, minWidth: 80, visible: true, filterValue: '' },
        { id: 'activity', label: 'Recent Activity', width: 220, minWidth: 150, visible: true, filterValue: '' },
        { id: 'timeline', label: 'Timeline', width: 140, minWidth: 120, visible: true, filterValue: '' },
        { id: 'owner', label: 'Owner', width: 100, minWidth: 80, visible: true, filterValue: '' },
    ];

    const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
    const [isInitialized, setIsInitialized] = useState(false);

    // Persistence Effect: Load
    useEffect(() => {
        const saved = localStorage.getItem('crm_deal_columns_v1');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                // Merge saved config with defaults (to handle new columns added in code)
                const merged = config.map((savedCol: any) => {
                    const original = DEFAULT_COLUMNS.find(c => c.id === savedCol.id);
                    if (!original) return null;
                    return { ...original, ...savedCol, filterValue: '' }; // Don't persist filters
                }).filter(Boolean);

                // Add any columns that are in DEFAULT but not in saved config
                DEFAULT_COLUMNS.forEach(defCol => {
                    if (!merged.find((m: any) => m.id === defCol.id)) {
                        merged.push(defCol);
                    }
                });

                setColumns(merged);
            } catch (e) {
                console.warn('Failed to parse saved columns', e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Persistence Effect: Save
    useEffect(() => {
        if (!isInitialized) return;

        // Only save structural layout, not values
        const configToSave = columns.map(({ id, width, visible }) => ({ id, width, visible }));
        localStorage.setItem('crm_deal_columns_v1', JSON.stringify(configToSave));
    }, [columns, isInitialized]);

    const handleResize = (id: string, width: number) => {
        setColumns(prev => prev.map(col => col.id === id ? { ...col, width } : col));
    };

    const handleFilterChange = (id: string, value: string) => {
        setColumns(prev => prev.map(col => col.id === id ? { ...col, filterValue: value } : col));
    };

    const handleColumnMove = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setColumns((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const [search, setSearch] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    const handleExportCsv = async () => {
        setIsExporting(true);
        try {
            const blob = await api.exportDeals(token!, { search } as any);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `deals-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to export deals:', error);
            alert('Failed to export deals');
        } finally {
            setIsExporting(false);
        }
    };

    // Drag & Drop State
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px movement required to start drag
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (token) {
            loadPipeline();
            loadContacts();
            loadUsers();
        }
    }, [token, search]);

    const loadUsers = async () => {
        try {
            const data = await api.getUsers(token!);
            setUsers(data);
        } catch (error) {
            // In development mode, mock data is returned automatically
            // In production, this error would indicate backend issues
            if (process.env.NODE_ENV !== 'development') {
                console.error('Failed to load users:', error);
            }
        }
    };

    const loadPipeline = async () => {
        try {
            const data = await api.getPipeline(token!, search);
            setPipeline(data as any);
        } catch (error) {
            // In development mode, mock data is returned automatically
            // In production, this error would indicate backend issues
            if (process.env.NODE_ENV !== 'development') {
                console.error('Failed to load pipeline:', error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const loadContacts = async () => {
        try {
            const data = await api.getContacts(token!);
            setContacts(data);
        } catch (error) {
            // In development mode, mock data is returned automatically
            // In production, this error would indicate backend issues
            if (process.env.NODE_ENV !== 'development') {
                console.error('Failed to load contacts:', error);
            }
        }
    };

    const handleAddDeal = async (e: React.FormEvent, data: any) => {
        try {
            await api.createDeal(token!, data);
            await loadPipeline();
            setShowAddModal(false);
        } catch (error) {
            console.error('Failed to create deal:', error);
        }
    };

    const handleEditDeal = async (e: React.FormEvent, data: any) => {
        if (!selectedDeal) return;
        try {
            await api.updateDeal(token!, selectedDeal.id, data);
            await loadPipeline();
            setShowEditModal(false);
            setSelectedDeal(null);
        } catch (error) {
            console.error('Failed to update deal:', error);
        }
    };

    const handleDeleteDeal = async () => {
        if (!selectedDeal) return;
        setIsSubmitting(true);
        try {
            await api.deleteDeal(token!, selectedDeal.id);
            await loadPipeline();
            setShowDeleteModal(false);
            setSelectedDeal(null);
        } catch (error) {
            console.error('Failed to delete deal:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Drag & Drop Handlers ---

    const findContainer = (id: UniqueIdentifier) => {
        if (pipeline.find(s => s.stage === id)) {
            return id as string;
        }
        return pipeline.find(stage => stage.deals.some(deal => deal.id === id))?.stage;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const deal = active.data.current?.deal;
        if (deal) {
            setActiveId(active.id);
            setActiveDeal(deal);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;

        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        // Optimistic update for moving between columns
        setPipeline((prev) => {
            const activeStageIndex = prev.findIndex(s => s.stage === activeContainer);
            const overStageIndex = prev.findIndex(s => s.stage === overContainer);

            if (activeStageIndex === -1 || overStageIndex === -1) return prev;

            const newPipeline = [...prev];
            const activeStage = { ...newPipeline[activeStageIndex] };
            const overStage = { ...newPipeline[overStageIndex] };

            const activeItems = [...activeStage.deals];
            const overItems = [...overStage.deals];

            const activeIndex = activeItems.findIndex(d => d.id === active.id);
            const overIndex = overItems.findIndex(d => d.id === overId);

            let newIndex;
            if (overId in stageConfig) {
                // If dropped on a column (empty space), add to end
                newIndex = overItems.length + 1;
            } else {
                // If dropped on an item
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top > over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            // Move item
            const [movedItem] = activeItems.splice(activeIndex, 1);
            // Update stage property of moved item
            movedItem.stage = overContainer;

            overItems.splice(newIndex, 0, movedItem);

            activeStage.deals = activeItems;
            overStage.deals = overItems;

            activeStage.count = activeItems.length;
            overStage.count = overItems.length;

            activeStage.totalValue = activeItems.reduce((acc, d) => acc + d.value, 0);
            overStage.totalValue = overItems.reduce((acc, d) => acc + d.value, 0);

            newPipeline[activeStageIndex] = activeStage;
            newPipeline[overStageIndex] = overStage;

            return newPipeline;
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        const activeContainer = findContainer(active.id);
        const overContainer = over ? findContainer(over.id) : null;

        if (activeContainer && overContainer && activeContainer !== overContainer) {
            // API Update
            const dealId = active.id as string;
            // Optimistic UI has already run in DragOver, so we just need to sync with backend
            try {
                // We just need to update the stage
                await api.updateDealStage(token!, dealId, overContainer);

                // In a real app we might re-fetch here effectively confirming the state, 
                // but if we trust optimistic update we can skip or do it lazily.
                // For safety vs glitchiness:
                // await loadPipeline(); // Optional
            } catch (error) {
                console.error('Failed to update stage:', error);
                // Revert would happen here in a robust app
                await loadPipeline();
            }
        }

        // If sorting within same container - we don't have an order field yet, so we don't need API call for reorder
        // But we should persist the local reorder if we implemented it (DragOver handles moving between columns)
        // Since we don't support custom sort order in backend yet, we won't persist reordering within same column to DB.

        setActiveId(null);
        setActiveDeal(null);
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    const filteredDeals = useMemo(() => {
        const allDeals = pipeline.flatMap(stage => stage.deals);
        return allDeals.filter(deal => {
            return columns.every(col => {
                if (!col.filterValue) return true;
                const searchLower = col.filterValue.toLowerCase();

                switch (col.id) {
                    case 'title':
                        return deal.title.toLowerCase().includes(searchLower) ||
                            (deal.contact && (deal.contact.firstName + ' ' + deal.contact.lastName).toLowerCase().includes(searchLower));
                    case 'company':
                        return (deal.contact?.company || '').toLowerCase().includes(searchLower);
                    case 'value':
                        return deal.value.toString().includes(searchLower) || (deal.quotationNumber || '').toLowerCase().includes(searchLower);
                    case 'stage':
                        return deal.stage.toLowerCase().includes(searchLower);
                    case 'owner':
                        return (deal.owner?.name || '').toLowerCase().includes(searchLower);
                    case 'timeline':
                        return new Date(deal.createdAt).toLocaleDateString().includes(searchLower) ||
                            (deal.expectedCloseDate && new Date(deal.expectedCloseDate).toLocaleDateString().includes(searchLower));
                    case 'activity':
                        return deal.activities?.some(a => (a.title + ' ' + a.type).toLowerCase().includes(searchLower));
                    default:
                        return true;
                }
            });
        });
    }, [pipeline, columns]);

    const gridTemplateColumns = useMemo(() => {
        return `40px ${columns.filter(c => c.visible).map(c => typeof c.width === 'number' ? `${c.width}px` : c.width).join(' ')}`;
    }, [columns]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-[#007AFF]" />
            </div>
        );
    }

    return (
        <div className="max-w-full mx-auto h-[calc(100vh-140px)] flex flex-col">
            {/* Active Deals Header */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-4 flex-shrink-0"
            >
                <div className="flex items-center gap-2 text-[#007AFF] cursor-pointer">
                    <h1 className="text-xl font-bold tracking-tight">
                        Active Deals
                    </h1>
                </div>
                <button
                    onClick={handleExportCsv}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#007AFF] disabled:opacity-50 transition-colors"
                >
                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    <span className="hidden sm:inline">Export CSV</span>
                </button>
            </motion.div>

            {/* Deals List */}
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
                            {filteredDeals.length > 0 ? filteredDeals.map((deal) => {
                                const stageInfo = stageConfig[deal.stage] || { label: deal.stage, color: '#6B7280' };

                                return (
                                    <div key={deal.id} className="group border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                        <div
                                            className="hidden md:grid gap-0 items-center text-sm"
                                            style={{ gridTemplateColumns }}
                                        >
                                            <div className="flex justify-center border-r border-gray-100/50 h-full items-center">
                                                <input type="checkbox" className="rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]" />
                                            </div>

                                            {/* Render Cells dynamically based on column order */}
                                            {columns.filter(c => c.visible).map(col => {
                                                switch (col.id) {
                                                    case 'title':
                                                        return (
                                                            <div key={col.id} className="flex items-center justify-between px-4 py-3 min-w-0 border-r border-gray-100/50 h-full">
                                                                <div className="flex flex-col min-w-0">
                                                                    <a href={`/pipeline/${deal.id}`} className="font-bold text-gray-900 truncate hover:text-[#007AFF] transition-colors cursor-pointer block">
                                                                        {deal.title}
                                                                    </a>
                                                                    {deal.contact && (
                                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">
                                                                            <Users size={10} />
                                                                            {deal.contact.firstName} {deal.contact.lastName}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                                                    <button onClick={() => { setSelectedDeal(deal); setShowEditModal(true); }} className="p-1 hover:bg-gray-200 rounded text-gray-500">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button onClick={() => { setSelectedDeal(deal); setShowDeleteModal(true); }} className="p-1 hover:bg-red-50 rounded text-red-500">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    case 'company':
                                                        return (
                                                            <div key={col.id} className="text-gray-700 font-bold italic truncate px-4 py-3 border-r border-gray-100/50 h-full flex items-center">
                                                                {deal.contact?.company || <span className="text-gray-300 font-normal">-</span>}
                                                            </div>
                                                        );
                                                    case 'value':
                                                        return (
                                                            <div key={col.id} className="flex flex-col px-4 py-3 border-r border-gray-100/50 h-full justify-center">
                                                                <div className="text-sm font-black text-gray-900">
                                                                    {formatCurrency(deal.value, deal.currency)}
                                                                </div>
                                                                <div className="text-[10px] font-black text-[#007AFF] uppercase tracking-tighter">
                                                                    #{deal.quotationNumber || 'NO-QUOTE'}
                                                                </div>
                                                            </div>
                                                        );
                                                    case 'stage':
                                                        return (
                                                            <div key={col.id} className="relative px-4 py-3 border-r border-gray-100/50 h-full flex items-center">
                                                                <StageSelector
                                                                    currentStage={deal.stage}
                                                                    onStageChange={async (newStage) => {
                                                                        try {
                                                                            await api.updateDealStage(token!, deal.id, newStage);
                                                                            await loadPipeline();
                                                                        } catch (error) {
                                                                            console.error('Failed to change stage', error);
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        );
                                                    case 'progress':
                                                        return (
                                                            <div key={col.id} className="flex gap-0.5 items-center justify-start h-full px-4 border-r border-gray-100/50">
                                                                {(() => {
                                                                    const stagesArr = ['QUALIFIED', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];
                                                                    const currentIdx = stagesArr.indexOf(deal.stage);
                                                                    const isLost = deal.stage === 'CLOSED_LOST';
                                                                    return stagesArr.map((s, i) => (
                                                                        <div
                                                                            key={s}
                                                                            className={`w-2.5 h-1 rounded-full transition-all ${i === currentIdx ? 'ring-1 ring-offset-1 ring-[#007AFF]/30' : ''}`}
                                                                            style={{ backgroundColor: !isLost && (currentIdx >= i) ? (stageConfig[s]?.color || '#2563EB') : '#f3f4f6' }}
                                                                        />
                                                                    ));
                                                                })()}
                                                            </div>
                                                        );
                                                    case 'activity':
                                                        return (
                                                            <div key={col.id} className="truncate px-4 border-r border-gray-100/50 h-full flex items-center">
                                                                {deal.activities && deal.activities.length > 0 ? (
                                                                    <div className="flex flex-col gap-0.5 bg-gray-50/40 p-2 rounded-xl border border-gray-100/50 w-full">
                                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${deal.activities[0].completed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                                            <span className="text-[10px] font-black text-gray-700 truncate uppercase tracking-tighter">
                                                                                {deal.activities[0].type}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[11px] font-bold text-gray-400 truncate pl-3">
                                                                            {deal.activities[0].title}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-300 text-[10px] italic font-normal pl-2">No active history</span>
                                                                )}
                                                            </div>
                                                        );
                                                    case 'timeline':
                                                        return (
                                                            <div key={col.id} className="flex flex-col gap-1 px-4 border-r border-gray-100/50 h-full justify-center">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9px] font-black text-gray-300 uppercase">START</span>
                                                                    <span className="text-[10px] font-black text-gray-600">{new Date(deal.createdAt).toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[9px] font-black text-gray-300 uppercase">EXPECT</span>
                                                                    <span className="text-[10px] font-black text-blue-500">
                                                                        {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : '-'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    case 'owner':
                                                        return (
                                                            <div key={col.id} className="flex justify-center px-4 h-full items-center">
                                                                <OwnerSelector
                                                                    currentOwner={deal.owner}
                                                                    users={users}
                                                                    currentUserRole={user?.role}
                                                                    onOwnerChange={async (userId) => {
                                                                        try {
                                                                            await api.updateDeal(token!, deal.id, { ownerId: userId });
                                                                            await loadPipeline();
                                                                        } catch (error) {
                                                                            console.error('Failed to change owner', error);
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        );
                                                    default: return null;
                                                }
                                            })}
                                        </div>

                                        {/* Mobile Card View */}
                                        <div className="md:hidden p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <a href={`/pipeline/${deal.id}`} className="font-medium text-gray-900 hover:text-[#007AFF]">
                                                        {deal.title}
                                                    </a>
                                                    <p className="text-xs text-gray-500 mt-0.5">{deal.contact?.company || 'No Company'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium text-gray-900">{formatCurrency(deal.value, deal.currency)}</div>
                                                    <div className="text-xs text-gray-400">{deal.probability}%</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100">
                                                <div className="w-1/2">
                                                    <StageSelector
                                                        currentStage={deal.stage}
                                                        onStageChange={async (newStage) => {
                                                            try {
                                                                await api.updateDealStage(token!, deal.id, newStage);
                                                                await loadPipeline();
                                                            } catch (error) {
                                                                console.error('Failed to change stage', error);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => { setSelectedDeal(deal); setShowEditModal(true); }}
                                                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => { setSelectedDeal(deal); setShowDeleteModal(true); }}
                                                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Search size={48} className="mb-4 opacity-20" />
                                    <p className="font-bold">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>
                                    <button
                                        onClick={() => setColumns(prev => prev.map(c => ({ ...c, filterValue: '' })))}
                                        className="mt-4 text-[#007AFF] text-sm font-black hover:underline"
                                    >
                                        ล้างตัวกรองทั้งหมด
                                    </button>
                                </div>
                            )}

                            {/* Add Deal Row */}
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="w-full flex items-center gap-3 px-4 py-4 text-sm text-gray-500 hover:bg-gray-50 hover:text-[#007AFF] transition-colors border-b border-gray-100 text-left"
                            >
                                <div className="w-10 flex justify-center">
                                    <Plus size={18} strokeWidth={3} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-[11px]">Add new deal</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Deal Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Deal" size="md">
                <DealForm
                    onSubmit={handleAddDeal}
                    onCancel={() => setShowAddModal(false)}
                    contacts={contacts}
                />
            </Modal>

            {/* Edit Deal Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Deal" size="md">
                <DealForm
                    key={selectedDeal?.id}
                    onSubmit={handleEditDeal}
                    initialData={selectedDeal}
                    isEdit
                    onCancel={() => setShowEditModal(false)}
                    contacts={contacts}
                />
            </Modal>

            {/* Delete Deal Modal */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Deal">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <Trash2 size={24} className="text-red-500" />
                    </div>
                    <p className="text-gray-900 font-medium mb-2">
                        Delete deal "{selectedDeal?.title}"?
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        This action cannot be undone.
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
                            onClick={handleDeleteDeal}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Delete Deal
                        </motion.button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
