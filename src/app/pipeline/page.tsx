'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Plus, Loader2, Edit2, Trash2, GripVertical, Users, Download } from 'lucide-react';
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
}

interface Stage {
    stage: string;
    deals: Deal[];
    count: number;
    totalValue: number;
}

const stageConfig: Record<string, { label: string; color: string }> = {
    QUALIFIED: { label: 'Qualified', color: '#007AFF' },
    PROPOSAL: { label: 'Proposal', color: '#5856D6' },
    NEGOTIATION: { label: 'Negotiation', color: '#AF52DE' },
    CLOSED_WON: { label: 'Closed Won', color: '#34C759' },
    CLOSED_LOST: { label: 'Closed Lost', color: '#FF3B30' },
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
            console.error('Failed to load users:', error);
        }
    };

    const loadPipeline = async () => {
        try {
            const data = await api.getPipeline(token!, search);
            setPipeline(data as any);
        } catch (error) {
            console.error('Failed to load pipeline:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadContacts = async () => {
        try {
            const data = await api.getContacts(token!);
            setContacts(data);
        } catch (error) {
            console.error('Failed to load contacts:', error);
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
                // console.log(`Moved deal ${dealId} to ${overContainer}`);
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
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-[40px_minmax(200px,3fr)_100px_100px_140px_160px_120px_minmax(150px,2fr)] gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider items-center">
                    <div className="flex justify-center">
                        <input type="checkbox" className="rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]" />
                    </div>
                    <div>Deal</div>
                    <div>Progress</div>
                    <div>Activities Timeline</div>
                    <div>Stage</div>
                    <div>Owner</div>
                    <div>Deal Value</div>
                    <div>Contacts</div>
                </div>

                {/* List Body */}
                <div className="overflow-y-auto flex-1">
                    {pipeline.flatMap(stage => stage.deals).map((deal) => {
                        const stageInfo = stageConfig[deal.stage] || { label: deal.stage, color: '#6B7280' };

                        return (
                            <div key={deal.id} className="group border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                {/* Desktop Row */}
                                <div className="hidden md:grid grid-cols-[40px_minmax(200px,3fr)_100px_100px_140px_160px_120px_minmax(150px,2fr)] gap-4 px-4 py-3 items-center text-sm">
                                    <div className="flex justify-center">
                                        <input type="checkbox" className="rounded border-gray-300 text-[#007AFF] focus:ring-[#007AFF]" />
                                    </div>

                                    {/* Deal Name & Actions */}
                                    <div className="flex items-center justify-between pr-4 min-w-0">
                                        <a href={`/pipeline/${deal.id}`} className="font-medium text-gray-900 truncate hover:text-[#007AFF] transition-colors cursor-pointer block">
                                            {deal.title}
                                        </a>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                            <button
                                                onClick={() => { setSelectedDeal(deal); setShowEditModal(true); }}
                                                className="p-1 hover:bg-gray-200 rounded text-gray-500"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedDeal(deal); setShowDeleteModal(true); }}
                                                className="p-1 hover:bg-red-50 rounded text-red-500"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stage Progress */}
                                    <div className="flex gap-0.5 items-center justify-start h-full">
                                        {(() => {
                                            const stages = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON'];
                                            const currentStageIndex = stages.indexOf(deal.stage);
                                            const isLost = deal.stage === 'CLOSED_LOST';

                                            return stages.map((stage, i) => {
                                                const isActive = i === currentStageIndex;
                                                const isCompleted = !isLost && (currentStageIndex > i || deal.stage === 'CLOSED_WON');
                                                const stageColor = stageConfig[stage]?.color || '#007AFF';

                                                let style: React.CSSProperties = { backgroundColor: '#f3f4f6' };

                                                if (isLost) {
                                                    // Keep gray
                                                } else if (isCompleted) {
                                                    style = { backgroundColor: stageColor };
                                                } else if (isActive) {
                                                    style = { backgroundColor: stageColor };
                                                }

                                                return (
                                                    <div
                                                        key={stage}
                                                        className={`w-5 h-1 rounded-full transition-all ${isActive ? 'ring-1 ring-offset-1 ring-opacity-50' : ''}`}
                                                        style={style}
                                                        title={stageConfig[stage]?.label || stage}
                                                    />
                                                );
                                            });
                                        })()}
                                    </div>

                                    {/* Activities Timeline */}
                                    <div className="flex gap-0.5 items-center justify-start h-full">
                                        {(deal.activities && deal.activities.length > 0) ? (
                                            <>
                                                {deal.activities
                                                    .sort((a, b) => {
                                                        const dateA = new Date(a.dueDate || a.createdAt).getTime();
                                                        const dateB = new Date(b.dueDate || b.createdAt).getTime();
                                                        return dateA - dateB;
                                                    })
                                                    .slice(-5)
                                                    .map((activity, i) => {
                                                        let colorClass = 'bg-gray-200';
                                                        const isCompleted = activity.completed;

                                                        // Handle invalid date safely
                                                        const dueDate = activity.dueDate ? new Date(activity.dueDate) : null;
                                                        const now = new Date();

                                                        const isOverdue = !isCompleted && dueDate && dueDate < now;
                                                        // If not completed and not overdue (or no due date), consider it upcoming/future
                                                        const isFuture = !isCompleted && (!dueDate || dueDate >= now);

                                                        if (isCompleted) colorClass = 'bg-emerald-400'; // Green for completed to be clearer
                                                        else if (isOverdue) colorClass = 'bg-red-400';
                                                        else if (isFuture) colorClass = 'bg-blue-400';

                                                        return (
                                                            <div
                                                                key={activity.id}
                                                                className={`w-1 h-2.5 rounded-[1px] ${colorClass}`}
                                                                title={`${activity.title} (${activity.type}) - ${isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Upcoming'}`}
                                                            />
                                                        );
                                                    })}
                                            </>
                                        ) : (
                                            <span className="text-[10px] text-gray-300">-</span>
                                        )}
                                    </div>

                                    {/* Stage Dropdown */}
                                    <div className="relative">
                                        <StageSelector
                                            currentStage={deal.stage}
                                            onStageChange={async (newStage) => {
                                                try {
                                                    await api.updateDealStage(token!, deal.id, newStage);
                                                    // Optimistic update or reload
                                                    await loadPipeline();
                                                } catch (error) {
                                                    console.error('Failed to change stage', error);
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Owner */}
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

                                    {/* Value */}
                                    <div className="text-gray-900 font-medium">
                                        {formatCurrency(deal.value, deal.currency)}
                                    </div>

                                    {/* Contacts */}
                                    <div>
                                        {deal.contact ? (
                                            <div className="flex flex-col">
                                                <div className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900">
                                                    <Users size={12} className="text-[#007AFF]" />
                                                    {deal.contact.firstName} {deal.contact.lastName}
                                                </div>
                                                {deal.contact.company && (
                                                    <div className="text-[11px] text-gray-500 pl-4 truncate max-w-[120px]">
                                                        {deal.contact.company}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">No contact</span>
                                        )}
                                    </div>
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
                    })}

                    {/* Add Deal Row */}
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 hover:text-[#007AFF] transition-colors border-b border-gray-100 text-left"
                    >
                        <div className="w-10 flex justify-center">
                            <div className="w-4 h-4 rounded border border-gray-300 bg-white" />
                        </div>
                        <Plus size={16} />
                        <span className="font-medium">Add deal</span>
                    </button>
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
