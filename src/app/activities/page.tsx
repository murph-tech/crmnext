'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Plus,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    Phone,
    Mail,
    Users,
    FileText,
    Trash2,
    Edit2,
    Loader2,
    ChevronDown,
    ChevronRight,
    CornerDownRight,
    Layers,
    GripVertical,
    X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import ActivityForm from '@/components/activities/ActivityForm';
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

import { Activity } from '@/types';

const typeIcons: Record<string, any> = {
    CALL: Phone,
    EMAIL: Mail,
    MEETING: Users,
    TASK: CheckCircle2,
    DEADLINE: Clock,
};

const typeColors: Record<string, string> = {
    CALL: '#007AFF',
    EMAIL: '#5856D6',
    MEETING: '#AF52DE',
    TASK: '#34C759',
    DEADLINE: '#FF3B30',
};

const DEFAULT_COLUMNS: ColumnDef[] = [
    { id: 'type', label: 'Type', width: 60, minWidth: 50, visible: true, filterValue: '' },
    { id: 'activity', label: 'Activity', width: '2fr', minWidth: 200, visible: true, filterValue: '' },
    { id: 'dueDate', label: 'Due Date', width: '1fr', minWidth: 120, visible: true, filterValue: '' },
    { id: 'relatedTo', label: 'Related To', width: '1.5fr', minWidth: 150, visible: true, filterValue: '' },
    { id: 'company', label: 'Company', width: '1.5fr', minWidth: 150, visible: true, filterValue: '' },
    { id: 'status', label: 'Status', width: 80, minWidth: 70, visible: true, filterValue: '' },
    { id: 'owner', label: 'Owner', width: 80, minWidth: 70, visible: true, filterValue: '' },
];

export default function ActivitiesPage() {
    const { token } = useAuth();
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
    const [isInitialized, setIsInitialized] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED'>('ALL');

    // Grouping State
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Persistence ---
    useEffect(() => {
        const saved = localStorage.getItem('crm_activities_columns_v1');
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
            localStorage.setItem('crm_activities_columns_v1', JSON.stringify(columns.map(({ id, width, visible }) => ({ id, width, visible }))));
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

    useEffect(() => {
        if (token) loadActivities();
    }, [token, filter]);

    const loadActivities = async () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/activities/page.tsx:57', message: 'loadActivities called', data: { token: token ? 'present' : 'missing', filter: filter }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'initial', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion

        setIsLoading(true);
        try {
            let data;
            if (filter === 'UPCOMING') {
                data = await api.getUpcomingActivities(token!);
            } else {
                data = await api.getActivities(token!);
                if (filter === 'COMPLETED') {
                    data = data.filter((a: any) => a.completed);
                }
            }
            setActivities(data);
        } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/app/activities/page.tsx:80', message: 'loadActivities error', data: { error: error?.message || 'unknown', filter: filter }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'initial', hypothesisId: 'A' }) }).catch(() => { });
            // #endregion

            console.error('Failed to load activities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Grouping Logic
    const groupedActivities = useMemo(() => {
        const filtered = activities.filter(activity => {
            return columns.every(col => {
                if (!col.filterValue) return true;
                const val = col.filterValue.toLowerCase();

                switch (col.id) {
                    case 'type':
                        return activity.type.toLowerCase().includes(val);
                    case 'activity':
                        return activity.title.toLowerCase().includes(val) || (activity.description || '').toLowerCase().includes(val);
                    case 'dueDate':
                        return activity.dueDate ? formatDate(activity.dueDate).toLowerCase().includes(val) : false;
                    case 'relatedTo':
                        const leadName = activity.lead ? `${activity.lead.firstName} ${activity.lead.lastName}` : '';
                        const dealTitle = activity.deal ? activity.deal.title : '';
                        return (leadName + dealTitle).toLowerCase().includes(val);
                    case 'company':
                        const co = activity.lead?.company || activity.contact?.company || activity.deal?.contact?.company || '';
                        return co.toLowerCase().includes(val);
                    case 'status':
                        const status = activity.completed ? 'completed' : 'pending';
                        return status.includes(val);
                    case 'owner':
                        return (activity as any).user?.name?.toLowerCase().includes(val);
                    default:
                        return true;
                }
            });
        });

        const groups: Record<string, Activity[]> = {};
        const singles: Activity[] = [];

        filtered.forEach(a => {
            if (a.deal?.id) {
                if (!groups[a.deal.id]) groups[a.deal.id] = [];
                groups[a.deal.id].push(a);
            } else {
                singles.push(a);
            }
        });

        const finalDisplay: { id: string, main: Activity, sub: Activity[], isGroup: boolean }[] = [];

        singles.forEach(a => finalDisplay.push({ id: a.id, main: a, sub: [], isGroup: false }));

        Object.entries(groups).forEach(([dealId, groupList]) => {
            groupList.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0).getTime();
                const dateB = new Date(b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            finalDisplay.push({
                id: dealId,
                main: groupList[0],
                sub: groupList.slice(1),
                isGroup: true
            });
        });

        finalDisplay.sort((a, b) => {
            const dateA = new Date(a.main.createdAt || 0).getTime();
            const dateB = new Date(b.main.createdAt || 0).getTime();
            return dateB - dateA;
        });

        return finalDisplay;
    }, [activities, columns]);

    const toggleGroup = (id: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedGroups(newSet);
    };

    const handleAddActivity = async (e: React.FormEvent, data: any) => {
        try {
            await api.createActivity(token!, data);
            await loadActivities();
            setShowAddModal(false);
        } catch (error) {
            console.error('Failed to create activity:', error);
        }
    };

    const handleEditActivity = async (e: React.FormEvent, data: any) => {
        if (!selectedActivity) return;
        try {
            await api.updateActivity(token!, selectedActivity.id, data);
            await loadActivities();
            setShowEditModal(false);
            setSelectedActivity(null);
        } catch (error) {
            console.error('Failed to update activity:', error);
        }
    };

    const handleDeleteActivity = async () => {
        if (!selectedActivity) return;
        setIsSubmitting(true);
        try {
            await api.deleteActivity(token!, selectedActivity.id);
            await loadActivities();
            setShowDeleteModal(false);
            setSelectedActivity(null);
        } catch (error) {
            console.error('Failed to delete activity:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleComplete = async (activity: Activity) => {
        try {
            if (activity.completed) {
                await api.updateActivity(token!, activity.id, { completed: false, completedAt: null });
            } else {
                await api.completeActivity(token!, activity.id);
            }
            await loadActivities();
        } catch (error) {
            console.error('Failed to toggle activity status:', error);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const renderActivityRow = (activity: Activity, isSubItem = false) => {
        const Icon = typeIcons[activity.type] || FileText;
        const color = typeColors[activity.type] || '#6B7280';
        const isOverdue = !activity.completed && activity.dueDate && new Date(activity.dueDate) < new Date();
        const companyName = activity.lead?.company || activity.contact?.company || activity.deal?.contact?.company;

        return (
            <div key={activity.id} className={`group border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${activity.completed ? 'bg-gray-50/50' : ''} ${isSubItem ? 'bg-gray-50/30' : ''}`}>
                {/* Desktop Row */}
                <div
                    className="hidden md:grid gap-0 items-center text-sm"
                    style={{ gridTemplateColumns }}
                >
                    <div className="flex justify-center border-r border-gray-100/50 h-full items-center">
                        {isSubItem ? (
                            <CornerDownRight size={14} className="text-gray-300 ml-auto mr-2" />
                        ) : (
                            <input type="checkbox" className="rounded border-gray-300 text-[#AF52DE] focus:ring-[#AF52DE]" />
                        )}
                    </div>

                    {columns.filter(c => c.visible).map(col => {
                        switch (col.id) {
                            case 'type':
                                return (
                                    <div key={col.id} className="px-4 py-3 flex justify-center border-r border-gray-100/50 h-full items-center">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105" style={{ backgroundColor: `${color}15` }}>
                                            <Icon size={16} style={{ color }} />
                                        </div>
                                    </div>
                                );
                            case 'activity':
                                return (
                                    <div key={col.id} className="px-4 py-3 flex items-center justify-between border-r border-gray-100/50 h-full min-w-0">
                                        <div className="truncate">
                                            <span className={`font-medium text-gray-900 block truncate ${activity.completed ? 'line-through text-gray-500' : ''}`}>{activity.title}</span>
                                            {activity.description && <span className="text-xs text-gray-500 truncate block">{activity.description}</span>}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedActivity(activity); setShowEditModal(true); }}
                                                className="p-1 hover:bg-gray-200 rounded text-gray-500"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedActivity(activity); setShowDeleteModal(true); }}
                                                className="p-1 hover:bg-red-50 rounded text-red-500"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            case 'dueDate':
                                return (
                                    <div key={col.id} className={`px-4 py-3 border-r border-gray-100/50 h-full flex items-center ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                                        {formatDate(activity.dueDate)}
                                    </div>
                                );
                            case 'relatedTo':
                                return (
                                    <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center truncate">
                                        {activity.lead && (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100 max-w-full truncate">
                                                <Users size={10} />
                                                <span className="truncate">{activity.lead.firstName} {activity.lead.lastName}</span>
                                            </div>
                                        )}
                                        {activity.deal && (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs border border-green-100 max-w-full truncate">
                                                <FileText size={10} />
                                                <span className="truncate">{activity.deal.title}</span>
                                            </div>
                                        )}
                                        {!activity.lead && !activity.deal && !activity.contact && (
                                            <span className="text-gray-400 text-xs italic">-</span>
                                        )}
                                    </div>
                                );
                            case 'company':
                                return (
                                    <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center truncate text-gray-600">
                                        {companyName ? (
                                            <div className="flex items-center gap-1.5 truncate">
                                                <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-gray-500 text-[10px] font-bold flex-shrink-0">
                                                    {companyName.substring(0, 1)}
                                                </div>
                                                <span className="truncate">{companyName}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">-</span>
                                        )}
                                    </div>
                                );
                            case 'status':
                                return (
                                    <div key={col.id} className="px-4 py-3 border-r border-gray-100/50 h-full flex items-center justify-center">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleToggleComplete(activity); }}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${activity.completed
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'border-gray-300 hover:border-[#AF52DE] text-transparent'
                                                }`}
                                        >
                                            <CheckCircle2 size={14} />
                                        </button>
                                    </div>
                                );
                            case 'owner':
                                return (
                                    <div key={col.id} className="px-4 py-3 h-full flex items-center justify-center">
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                            style={{
                                                backgroundColor: (activity as any).user?.name
                                                    ? `hsl(${(activity as any).user.name.charCodeAt(0) * 7 % 360}, 60%, 50%)`
                                                    : '#6B7280'
                                            }}
                                            title={(activity as any).user?.name || 'Unknown'}
                                        >
                                            {(activity as any).user?.name
                                                ? (activity as any).user.name.substring(0, 2).toUpperCase()
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
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                            <Icon size={18} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className={`font-medium text-gray-900 truncate ${activity.completed ? 'line-through text-gray-500' : ''}`}>{activity.title}</h3>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleComplete(activity); }}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${activity.completed
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : 'border-gray-300 hover:border-[#AF52DE] text-transparent'
                                        }`}
                                >
                                    <CheckCircle2 size={12} />
                                </button>
                            </div>
                            <p className={`${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'} text-xs mt-0.5`}>
                                {formatDate(activity.dueDate)}
                            </p>
                        </div>
                    </div>

                    {(activity.lead || activity.deal || companyName) && (
                        <div className="flex flex-wrap gap-2 text-xs">
                            {activity.lead && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                    <Users size={10} />
                                    <span>{activity.lead.firstName} {activity.lead.lastName}</span>
                                </div>
                            )}
                            {activity.deal && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 rounded border border-green-100">
                                    <FileText size={10} />
                                    <span>{activity.deal.title}</span>
                                </div>
                            )}
                            {companyName && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                    <span>{companyName}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedActivity(activity); setShowEditModal(true); }}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg"
                        >
                            Edit
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedActivity(activity); setShowDeleteModal(true); }}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading && activities.length === 0) {
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
                        <Calendar size={24} />
                        Activities
                    </h1>
                </div>

                <div className="flex gap-2">
                    {['ALL', 'UPCOMING', 'COMPLETED'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f
                                ? 'bg-gray-900 text-white'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Activities List */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 flex flex-col relative overflow-hidden">
                <div className="overflow-x-auto flex-1 flex flex-col min-w-full">
                    <div className="min-w-[1100px] flex flex-col flex-1">
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
                            {groupedActivities.length > 0 ? groupedActivities.map((group) => (
                                <div key={group.id} className="border-b border-gray-100 last:border-0 relative">
                                    {group.isGroup && group.sub.length > 0 ? (
                                        <>
                                            <div className="relative">
                                                {renderActivityRow(group.main)}
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500/0 hover:bg-green-500/20 transition-colors cursor-pointer" onClick={() => toggleGroup(group.id)}></div>
                                                <div
                                                    className="absolute left-1 top-3.5 bg-white border border-gray-200 rounded-md shadow-sm p-0.5 cursor-pointer hover:bg-gray-50 z-10"
                                                    onClick={(e) => { e.stopPropagation(); toggleGroup(group.id); }}
                                                    title={`${group.sub.length} more activities in this deal`}
                                                >
                                                    <div className="flex items-center gap-1 px-1">
                                                        <Layers size={10} className="text-green-600" />
                                                        <span className="text-[10px] font-bold text-gray-600">+{group.sub.length}</span>
                                                        {expandedGroups.has(group.id) ? (
                                                            <ChevronDown size={10} className="text-gray-400" />
                                                        ) : (
                                                            <ChevronRight size={10} className="text-gray-400" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <AnimatePresence>
                                                {expandedGroups.has(group.id) && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden bg-gray-50/20"
                                                    >
                                                        {group.sub.map(subActivity => renderActivityRow(subActivity, true))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    ) : (
                                        renderActivityRow(group.main)
                                    )}
                                </div>
                            )) : (
                                <div className="text-center py-16 text-gray-400">
                                    <Search size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium text-gray-500">No activities found matching your criteria</p>
                                    <button
                                        onClick={() => setColumns(prev => prev.map(c => ({ ...c, filterValue: '' })))}
                                        className="mt-4 text-[#AF52DE] text-sm font-black hover:underline"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}

                            {/* Add Activity Row */}
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="w-full flex items-center gap-3 px-4 py-4 text-sm text-gray-500 hover:bg-gray-50 hover:text-[#AF52DE] transition-colors border-b border-gray-100 text-left"
                            >
                                <div className="w-10 flex justify-center">
                                    <Plus size={18} strokeWidth={3} />
                                </div>
                                <span className="font-black uppercase tracking-widest text-[11px]">Add activity</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Schedule New Activity" size="md">
                <ActivityForm
                    onSubmit={handleAddActivity}
                    onCancel={() => setShowAddModal(false)}
                />
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Activity" size="md">
                <ActivityForm
                    key={selectedActivity?.id}
                    onSubmit={handleEditActivity}
                    onCancel={() => setShowEditModal(false)}
                    initialData={selectedActivity}
                    isEdit
                />
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Activity">
                <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                        <Trash2 size={24} className="text-red-500" />
                    </div>
                    <p className="text-gray-900 font-medium mb-2">
                        Delete this activity?
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
                            onClick={handleDeleteActivity}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Delete
                        </motion.button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
