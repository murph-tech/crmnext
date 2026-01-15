'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Calendar, FileText, Package, Plus, Clock, X,
    CheckCircle2, DollarSign, User, Building, Phone, Mail, Star,
    MoreVertical, Trash2, Filter, Sparkles, MessageSquare, Video,
    PhoneCall, FileCheck, Users, ChevronDown, Search, Edit3, Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import ActivityForm from '@/components/activities/ActivityForm';
import Modal from '@/components/ui/Modal';

interface DealDetail {
    id: string;
    title: string;
    value: number;
    currency: string;
    stage: string;
    probability: number;
    notes?: string;
    expectedCloseDate?: string;
    contact?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        company?: string;
    };
    owner?: {
        id: string;
        name: string;
        email: string;
    };
    activities: Activity[];
    items: any[];
    createdAt: string;
    updatedAt: string;
}

interface Activity {
    id: string;
    title: string;
    description?: string;
    type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK' | 'FOLLOW_UP';
    completed: boolean;
    duration?: number;
    scheduledAt?: string;
    dueDate?: string;
    reminderAt?: string;
    createdAt: string;
    user?: {
        name: string;
        email: string;
    };
}

// Stage configuration with colors
const DEAL_STAGES = [
    { key: 'QUALIFIED', label: 'Qualified', color: 'bg-blue-500', textColor: 'text-white' },
    { key: 'PROPOSAL', label: 'Proposal', color: 'bg-violet-500', textColor: 'text-white' },
    { key: 'NEGOTIATION', label: 'Negotiation', color: 'bg-purple-500', textColor: 'text-white' },
    { key: 'CLOSED_WON', label: 'Closed Won', color: 'bg-emerald-500', textColor: 'text-white' },
    { key: 'CLOSED_LOST', label: 'Closed Lost', color: 'bg-gray-400', textColor: 'text-white' },
] as const;

// Activity type icons and colors
const ACTIVITY_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
    CALL: { icon: PhoneCall, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Call' },
    EMAIL: { icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Email' },
    MEETING: { icon: Video, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Meeting' },
    NOTE: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Note' },
    TASK: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Task' },
};

export default function DealDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { token, user } = useAuth();
    const [deal, setDeal] = useState<DealDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'UPDATES' | 'QUOTES' | 'MORE'>('OVERVIEW');

    // Modals
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [quickActivityType, setQuickActivityType] = useState<string | null>(null);

    // Filters & Edit States
    const [filterType, setFilterType] = useState<string>('ALL');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    useEffect(() => {
        if (token && id) loadDeal();
    }, [token, id]);

    const loadDeal = async () => {
        try {
            const data = await api.getDeal(token!, id as string);
            setDeal(data);
        } catch (error) {
            console.error('Failed to load deal:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Group activities by date
    const groupedActivities = useMemo(() => {
        if (!deal?.activities) return {};

        const groups: Record<string, Activity[]> = {};

        // Filter first
        let filtered = deal.activities;
        if (filterType !== 'ALL') {
            filtered = deal.activities.filter(a => {
                if (filterType === 'COMPLETED') return a.completed;
                if (filterType === 'INCOMPLETE') return !a.completed;
                return a.type === filterType;
            });
        }

        // Sort by date descending (newest first)
        const sorted = [...filtered].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        sorted.forEach(activity => {
            const date = new Date(activity.createdAt);
            const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

            if (!groups[monthYear]) {
                groups[monthYear] = [];
            }
            groups[monthYear].push(activity);
        });

        return groups;
    }, [deal?.activities, filterType]);

    const handleAddActivity = async (e: React.FormEvent, data: any) => {
        try {
            // Only send fields that exist in the Activity schema
            const activityData = {
                title: data.title,
                type: data.type,
                description: data.description || null,
                dueDate: data.dueDate || null,
                reminderAt: data.reminderAt || null,
                duration: data.duration ? Number(data.duration) : null,
                dealId: deal?.id,
            };
            await api.createActivity(token!, activityData);
            await loadDeal();
            setShowActivityModal(false);
            setQuickActivityType(null);
        } catch (error) {
            console.error('Failed to add activity:', error);
        }
    };

    const handleEditActivity = async (e: React.FormEvent, data: any) => {
        if (!selectedActivity) return;
        try {
            await api.updateActivity(token!, selectedActivity.id, {
                ...data,
                // Ensure duration is sent as number
                duration: data.duration ? Number(data.duration) : null,
            });
            await loadDeal();
            setShowEditModal(false);
            setSelectedActivity(null);
        } catch (error) {
            console.error('Failed to update activity:', error);
        }
    };

    const handleDeleteActivity = async (activityId: string) => {
        if (!confirm('Are you sure you want to delete this activity?')) return;
        try {
            await api.deleteActivity(token!, activityId);
            await loadDeal();
        } catch (error) {
            console.error('Failed to delete activity:', error);
        }
    };

    const handleAddItem = async (data: any) => {
        if (!deal) return;
        try {
            await api.addDealItem(token!, deal.id, data);
            await loadDeal();
            setShowProductModal(false);
        } catch (error) {
            console.error('Failed to add item:', error);
        }
    };

    const handleRemoveItem = async (itemId: string) => {
        if (!deal) return;
        try {
            await api.removeDealItem(token!, deal.id, itemId);
            await loadDeal();
        } catch (error) {
            console.error('Failed to remove item:', error);
        }
    };

    const getCurrentStageIndex = () => {
        return DEAL_STAGES.findIndex(s => s.key === deal?.stage) || 0;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!deal) return null;

    return (
        <div className="max-w-7xl mx-auto pb-10">
            {/* Header with Title and Close */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {deal.contact?.company && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                    {deal.contact.company}
                                </span>
                            )}
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                N/A
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                N/A
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Stage Pipeline Progress Bar */}
            <div className="mb-6">
                <div className="flex rounded-xl overflow-hidden">
                    {DEAL_STAGES.map((stage, index) => {
                        const isActive = stage.key === deal.stage;
                        const isPast = index < getCurrentStageIndex();

                        return (
                            <div
                                key={stage.key}
                                className={`flex-1 relative py-3 px-4 text-center text-sm font-medium transition-all cursor-pointer
                                    ${isActive || isPast ? stage.color + ' ' + stage.textColor : 'bg-gray-200 text-gray-500'}
                                    ${index === 0 ? 'rounded-l-xl' : ''}
                                    ${index === DEAL_STAGES.length - 1 ? 'rounded-r-xl' : ''}
                                `}
                            >
                                {stage.label}
                                {/* Arrow connector */}
                                {index < DEAL_STAGES.length - 1 && (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                                        <div className={`w-4 h-4 rotate-45 ${isActive || isPast ? stage.color : 'bg-gray-200'}`}></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
                {[
                    { key: 'OVERVIEW', label: 'Overview', icon: FileText },
                    { key: 'UPDATES', label: 'Updates', icon: MessageSquare },
                    { key: 'MORE', label: 'More', icon: ChevronDown },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
                <button className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Plus size={16} className="text-gray-400" />
                </button>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Main Content - Activity Log */}
                <div className="col-span-8">
                    {/* Action Toolbar */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <button
                            onClick={() => setQuickActivityType('EMAIL')}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                        >
                            <Mail size={16} />
                            New email
                        </button>
                        <button
                            onClick={() => setShowActivityModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <Plus size={16} />
                            Add activity
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${filterType !== 'ALL'
                                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                <Filter size={16} />
                                {filterType === 'ALL' ? 'Filters' : filterType.charAt(0) + filterType.slice(1).toLowerCase()}
                                <ChevronDown size={14} className={`ml-1 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {showFilterMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20"
                                    >
                                        <div className="py-1">
                                            {['ALL', 'COMPLETED', 'INCOMPLETE', 'CALL', 'EMAIL', 'MEETING', 'TASK'].map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        setFilterType(type);
                                                        setShowFilterMenu(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${filterType === type ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'
                                                        }`}
                                                >
                                                    {type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}
                                                    {filterType === type && <CheckCircle2 size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <Search size={18} className="text-gray-400" />
                            </button>
                            <span className="text-sm text-gray-500">Integrate / 1</span>
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="glass-card rounded-2xl p-6">
                        {Object.keys(groupedActivities).length > 0 ? (
                            <div className="space-y-6">
                                {Object.entries(groupedActivities).map(([monthYear, activities]) => (
                                    <div key={monthYear}>
                                        {/* Month Header */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="h-px flex-1 bg-gray-200"></div>
                                            <span className="text-sm font-medium text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                                                {monthYear}
                                            </span>
                                            <div className="h-px flex-1 bg-gray-200"></div>
                                        </div>

                                        {/* Activities */}
                                        <div className="space-y-4">
                                            {activities.map((activity, index) => {
                                                const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.NOTE;
                                                const IconComponent = config.icon;

                                                return (
                                                    <motion.div
                                                        key={activity.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className="relative"
                                                    >
                                                        {/* Activity Header */}
                                                        <div className="flex items-start gap-3 mb-2">
                                                            <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                                                                <IconComponent size={16} className={config.color} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm text-gray-600">
                                                                        {activity.title || `${config.label} logged`}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">
                                                                        {new Date(activity.createdAt).toLocaleDateString('en-US', {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric',
                                                                            hour: 'numeric',
                                                                            minute: '2-digit',
                                                                            hour12: true
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Activity Card */}
                                                        <div className="ml-11 bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow group">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    {/* User Avatar */}
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-medium text-sm">
                                                                        {deal.contact?.company?.substring(0, 2) || 'UN'}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-medium text-gray-900">
                                                                            {deal.contact?.company || 'Unknown Company'}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                                                                            {activity.duration && (
                                                                                <>
                                                                                    <Clock size={12} />
                                                                                    <span>{activity.duration} min</span>
                                                                                </>
                                                                            )}
                                                                            {deal.contact && (
                                                                                <>
                                                                                    <Users size={12} />
                                                                                    <span>Contacts ›</span>
                                                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                                                                                        {deal.contact.firstName}
                                                                                    </span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="relative">
                                                                    <button
                                                                        onClick={() => setActiveMenuId(activeMenuId === activity.id ? null : activity.id)}
                                                                        className={`p-1.5 hover:bg-gray-100 rounded-lg transition-colors ${activeMenuId === activity.id ? 'opacity-100 bg-gray-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                                    >
                                                                        <MoreVertical size={16} className="text-gray-400" />
                                                                    </button>
                                                                    <AnimatePresence>
                                                                        {activeMenuId === activity.id && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                                animate={{ opacity: 1, scale: 1 }}
                                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                                className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10"
                                                                            >
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setSelectedActivity(activity);
                                                                                        setShowEditModal(true);
                                                                                        setActiveMenuId(null);
                                                                                    }}
                                                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                                                >
                                                                                    <Edit3 size={14} />
                                                                                    Edit
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        handleDeleteActivity(activity.id);
                                                                                        setActiveMenuId(null);
                                                                                    }}
                                                                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                    Delete
                                                                                </button>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            </div>

                                                            {/* Activity Description/Notes */}
                                                            {activity.description && (
                                                                <div className="mt-3 pt-3 border-t border-gray-100">
                                                                    <p className="text-sm text-gray-600">{activity.description}</p>
                                                                </div>
                                                            )}

                                                            {/* Tags/Status */}
                                                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                                                                {activity.reminderAt && !activity.completed && (
                                                                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${new Date(activity.reminderAt) <= new Date()
                                                                        ? 'bg-amber-100 text-amber-700 animate-pulse'
                                                                        : 'bg-amber-50 text-amber-600'
                                                                        }`}>
                                                                        <Bell size={12} />
                                                                        {new Date(activity.reminderAt) <= new Date()
                                                                            ? 'ถึงเวลาแจ้งเตือน!'
                                                                            : `เตือน ${new Date(activity.reminderAt).toLocaleDateString('th-TH', {
                                                                                day: 'numeric',
                                                                                month: 'short',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}`
                                                                        }
                                                                    </span>
                                                                )}
                                                                {activity.completed && (
                                                                    <span className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">
                                                                        <CheckCircle2 size={12} />
                                                                        Completed
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Attachment indicator */}
                                                        <div className="ml-11 mt-2">
                                                            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                                                                <Plus size={12} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {/* Deal Created Event */}
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 size={16} className="text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Item created</span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(deal.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </span>
                                        </div>
                                        <div className="ml-0 mt-2 bg-white rounded-xl border border-gray-200 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-medium text-sm">
                                                    {deal.contact?.company?.substring(0, 2) || user?.name?.substring(0, 2) || 'AD'}
                                                </div>
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-medium">{deal.contact?.company || user?.name || 'Admin'}</span>
                                                    {' '}added{' '}
                                                    <span className="font-medium text-blue-600">{deal.title}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Deal Created Event - Show even when no activities */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                    <span className="text-sm font-medium text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                                        {new Date(deal.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </span>
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 size={16} className="text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Item created</span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(deal.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </span>
                                        </div>
                                        <div className="mt-2 bg-white rounded-xl border border-gray-200 p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-medium text-sm">
                                                    {user?.name?.substring(0, 2) || 'AD'}
                                                </div>
                                                <p className="text-sm text-gray-700">
                                                    <span className="font-medium">{user?.name || 'Admin'}</span>
                                                    {' '}added{' '}
                                                    <span className="font-medium text-blue-600">{deal.title}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center py-8 text-gray-500 text-sm">
                                    No more activities. Click "Add activity" to log your first interaction.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar - Deal Details */}
                <div className="col-span-4 space-y-4">
                    {/* Deal Info Card */}
                    <div className="glass-card rounded-2xl p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                <p className="text-sm font-medium text-gray-900">{deal.title}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Activities timeline</label>
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 20 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-2 w-1.5 rounded-sm ${i < (deal.activities?.length || 0) ? 'bg-purple-500' : 'bg-gray-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
                                <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${deal.stage === 'QUALIFIED' ? 'bg-emerald-500 text-white' :
                                    deal.stage === 'PROPOSAL' ? 'bg-sky-500 text-white' :
                                        deal.stage === 'NEGOTIATION' ? 'bg-violet-500 text-white' :
                                            deal.stage === 'CLOSED_WON' ? 'bg-green-500 text-white' :
                                                'bg-gray-500 text-white'
                                    }`}>
                                    {deal.stage.replace('_', ' ')}
                                </span>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Owner</label>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white text-xs font-medium">
                                        {deal.owner?.name?.substring(0, 2) || user?.name?.substring(0, 2) || 'AD'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Deal Value</label>
                                <p className="text-sm font-medium text-gray-900">
                                    {new Intl.NumberFormat('th-TH', { style: 'currency', currency: deal.currency }).format(deal.value)}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Contacts</label>
                                {deal.contact ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                                        <Users size={12} />
                                        {deal.contact.firstName}
                                    </span>
                                ) : (
                                    <span className="text-xs text-gray-400">No contact</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                                <p className="text-sm font-medium text-gray-900">{deal.contact?.company || '-'}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Expected Close Date</label>
                                <p className="text-sm text-gray-900">
                                    {deal.expectedCloseDate
                                        ? new Date(deal.expectedCloseDate).toLocaleDateString()
                                        : '-'
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Close Probability</label>
                                <p className="text-sm font-medium text-gray-900">{deal.probability}%</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Forecast Value</label>
                                <p className="text-sm font-medium text-gray-900">
                                    {new Intl.NumberFormat('th-TH', { style: 'currency', currency: deal.currency }).format(
                                        (deal.value * deal.probability) / 100
                                    )}
                                </p>
                            </div>
                        </div>

                        <div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Last Interaction</label>
                                <p className="text-sm text-gray-900">
                                    {deal.activities?.[0]
                                        ? new Date(deal.activities[0].createdAt).toLocaleDateString()
                                        : '-'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Products Section */}
                    <div className="glass-card rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                <Package size={18} className="text-gray-400" />
                                Products
                            </h3>
                            <button
                                onClick={() => setShowProductModal(true)}
                                className="text-xs text-blue-600 font-medium hover:underline"
                            >
                                + Add
                            </button>
                        </div>

                        {deal.items && deal.items.length > 0 ? (
                            <div className="space-y-2">
                                {deal.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                                                <Package size={14} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                                                <p className="text-xs text-gray-500">{item.quantity} x</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-4">No products added</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Activity Modal */}
            <Modal isOpen={showActivityModal || !!quickActivityType} onClose={() => { setShowActivityModal(false); setQuickActivityType(null); }} title="Log Activity" size="md">
                <ActivityForm
                    onSubmit={handleAddActivity}
                    onCancel={() => { setShowActivityModal(false); setQuickActivityType(null); }}
                    defaultType={quickActivityType || undefined}
                />
            </Modal>

            {/* Edit Activity Modal */}
            <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedActivity(null); }} title="Edit Activity" size="md">
                <ActivityForm
                    key={selectedActivity?.id}
                    onSubmit={handleEditActivity}
                    onCancel={() => { setShowEditModal(false); setSelectedActivity(null); }}
                    initialData={selectedActivity}
                    isEdit
                />
            </Modal>

            {/* Product Picker Modal */}
            <Modal isOpen={showProductModal} onClose={() => setShowProductModal(false)} title="Add Product to Deal" size="md">
                <ProductPicker
                    onSelect={handleAddItem}
                    onCancel={() => setShowProductModal(false)}
                />
            </Modal>
        </div>
    );
}

// Simple Product Picker Component
function ProductPicker({ onSelect, onCancel }: { onSelect: (data: any) => void; onCancel: () => void }) {
    const { token } = useAuth();
    const [products, setProducts] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [discount, setDiscount] = useState(0);

    useEffect(() => {
        if (token) {
            api.getProducts(token).then(setProducts).catch(console.error);
        }
    }, [token]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const product = products.find(p => p.id === selectedId);
        if (!product) return;

        onSelect({
            productId: selectedId,
            quantity: Number(quantity),
            price: Number(product.price),
            discount: Number(discount)
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Product</label>
                <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    required
                >
                    <option value="">Choose a product...</option>
                    {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(p.price)})</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount (THB)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl spotlight-input text-sm"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!selectedId}
                    className="px-4 py-2.5 bg-[#007AFF] text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                    Add to Deal
                </button>
            </div>
        </form>
    );
}
