'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Calendar, FileText, Package, Plus, Clock, X,
    CheckCircle2, DollarSign, User, Building, Phone, Mail, Star,
    MoreVertical, Trash2, Filter, Sparkles, MessageSquare, Video,
    PhoneCall, FileCheck, Users, ChevronDown, Search, Edit3, Bell,
    Calendar as CalendarIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
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
    quotationNumber?: string;
    expectedCloseDate?: string;
    closedAt?: string;
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
    salesTeam?: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    }[];
    activities: Activity[];
    items: any[];
    quotationApproved?: boolean;
    quotationStatus?: string;
    createdAt: string;
    updatedAt: string;
}

interface Activity {
    id: string;
    title: string;
    description?: string;
    type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK' | 'FOLLOW_UP' | 'QUOTATION';
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
    { key: 'QUALIFIED', label: 'New', color: 'bg-blue-500', textColor: 'text-white' },
    { key: 'DISCOVERY', label: 'Discovery', color: 'bg-indigo-500', textColor: 'text-white' },
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
    QUOTATION: { icon: FileText, color: 'text-teal-600', bgColor: 'bg-teal-100', label: 'Quotation' },
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

    const [showOwnerModal, setShowOwnerModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        if (token && id) {
            loadDeal();
            loadUsers();
        }
    }, [token, id]);

    const loadUsers = async () => {
        try {
            const data = await api.getUsers(token!);
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const handleSyncToCalendar = async () => {
        if (!deal) return;

        try {
            const eventData = {
                title: `นัดหมาย: ${deal.title}`,
                description: `นัดหมายกับ ${deal.contact?.company || deal.contact?.firstName} ${deal.contact?.lastName}`,
                startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
                endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
                location: '',
                attendees: deal.contact?.email ? [deal.contact.email] : []
            };

            await api.syncDealToCalendar(token!, deal.id, eventData);
            alert('Sync ไปยัง Calendar สำเร็จ!');
        } catch (error) {
            console.error('Failed to sync to calendar:', error);
            alert('เกิดข้อผิดพลาดในการ sync');
        }
    };

    const handleUpdateOwner = async (newOwnerId: string) => {
        if (!deal) return;
        try {
            await api.updateDeal(token!, deal.id, { ownerId: newOwnerId });
            await loadDeal();
            setShowOwnerModal(false);
        } catch (error) {
            console.error('Failed to update owner:', error);
        }
    };

    const handleUpdateTeam = async (salesTeamIds: string[]) => {
        if (!deal) return;
        try {
            await api.updateDeal(token!, deal.id, { salesTeamIds } as any);
            await loadDeal();
            setShowTeamModal(false);
        } catch (error) {
            console.error('Failed to update sales team:', error);
            // alert('Failed to update sales team');
        }
    };

    const loadDeal = async () => {
        try {
            const data = await api.getDeal(token!, id as string);
            // Ensure data types match DealDetail
            setDeal({
                ...data,
                activities: data.activities || [],
                items: data.items || []
            } as DealDetail);
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
                return a.type && a.type.toUpperCase() === filterType;
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

    const updateStage = async (newStage: string) => {
        if (!deal) return;
        try {
            // Optimistic update
            setDeal(prev => prev ? { ...prev, stage: newStage } : null);
            await api.updateDealStage(token!, deal.id, newStage);
            await loadDeal(); // Reload to get side effects like closedAt date
        } catch (error) {
            console.error('Failed to update stage:', error);
            await loadDeal(); // Revert on error
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
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Stage Pipeline Progress Bar */}
            <div className="mb-8">
                {/* Header Actions (Won/Lost) */}
                <div className="flex justify-end gap-2 mb-3">
                    <button
                        onClick={() => updateStage('CLOSED_WON')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${deal.stage === 'CLOSED_WON'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                    >
                        Won
                    </button>
                    <button
                        onClick={() => updateStage('CLOSED_LOST')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${deal.stage === 'CLOSED_LOST'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                    >
                        Lost
                    </button>
                </div>

                <div className="flex w-full bg-white border border-gray-100 shadow-sm p-1 rounded-lg">
                    {/* Map stages visually: QUALIFIED -> New, DISCOVERY -> Discovery, etc. */}
                    {[
                        { key: 'QUALIFIED', label: 'New', color: 'bg-blue-600' },
                        { key: 'DISCOVERY', label: 'Discovery', color: 'bg-indigo-600' },
                        { key: 'PROPOSAL', label: 'Proposal', color: 'bg-violet-600' },
                        { key: 'NEGOTIATION', label: 'Negotiation', color: 'bg-orange-500' },
                        // For 'Closed', we check if it's WON or LOST
                        { key: 'CLOSED', label: 'Closed', color: 'bg-emerald-600' }
                    ].map((step, index, array) => {
                        // Determine if specific step is active or passed
                        let status = 'upcoming'; // upcoming, current, completed

                        const currentStageIndex = ['QUALIFIED', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'].indexOf(deal.stage);

                        // Map visual steps to actual stages logic
                        // Visual: 0(New/Qual), 1(Disc), 2(Prop), 3(Nego), 4(Closed)
                        // Actual: QUALIFIED, DISCOVERY, PROPOSAL, NEGOTIATION, [CLOSED_WON/LOST]

                        // Handle 'Closed' generic step
                        if (step.key === 'CLOSED') {
                            if (deal.stage === 'CLOSED_WON' || deal.stage === 'CLOSED_LOST') status = 'current';
                            else status = 'upcoming';
                        } else {
                            const stepIndex = ['QUALIFIED', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION'].indexOf(step.key);
                            // If deal is closed, all previous steps are completed
                            if (deal.stage === 'CLOSED_WON' || deal.stage === 'CLOSED_LOST') {
                                status = 'completed';
                            } else {
                                // Active deal
                                const dealStageIndex = ['QUALIFIED', 'DISCOVERY', 'PROPOSAL', 'NEGOTIATION'].indexOf(deal.stage);
                                if (stepIndex < dealStageIndex) status = 'completed';
                                else if (stepIndex === dealStageIndex) status = 'current';
                                else status = 'upcoming';
                            }
                        }

                        // Determine active color
                        let activeColor = step.color;
                        if (step.key === 'CLOSED' && deal.stage === 'CLOSED_LOST') {
                            activeColor = 'bg-red-600';
                        }

                        return (
                            <button
                                key={step.key}
                                onClick={() => {
                                    if (step.key !== 'CLOSED') updateStage(step.key);
                                }}
                                className={`flex-1 relative h-10 flex items-center justify-center text-sm font-medium transition-all
                                    ${status === 'current' ? `${activeColor} text-white z-10 shadow-md` :
                                        status === 'completed' ? 'bg-slate-400 text-white hover:bg-slate-500' :
                                            'bg-gray-100 text-gray-400 hover:bg-gray-200'}
                                    ${index !== 0 ? '-ml-4 pl-6' : ''} 
                                    clip-path-chevron
                                `}
                                style={{
                                    clipPath: index === 0
                                        ? 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%)'
                                        : index === array.length - 1
                                            ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 5% 50%)'
                                            : 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%, 5% 50%)'
                                }}
                            >
                                {step.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
                {[
                    { key: 'OVERVIEW', label: 'Overview', icon: FileText },
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
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Main Content - Activity Log */}
                <div className="col-span-8">
                    {/* Action Toolbar */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <button
                            onClick={() => router.push(`/quotations/${deal.id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <FileText size={16} />
                            {deal.quotationNumber ? 'View Quotation' : 'Create Quotation'}
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
                                            {['ALL', 'COMPLETED', 'INCOMPLETE', 'CALL', 'EMAIL', 'MEETING', 'TASK', 'QUOTATION'].map((type) => (
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
                                                        <div className="ml-11 bg-gray-50 rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow group">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    {/* User Avatar */}
                                                                    <div
                                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-xs border-2 border-white shadow-sm"
                                                                        style={{ backgroundColor: activity.user?.name ? `hsl(${activity.user.name.charCodeAt(0) * 7 % 360}, 60%, 50%)` : '#94a3b8' }}
                                                                        title={activity.user?.name || 'System'}
                                                                    >
                                                                        {activity.user?.name?.substring(0, 2).toUpperCase() || 'SY'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <p className="font-medium text-gray-900">
                                                                                {deal.contact?.company || 'Unknown Company'}
                                                                            </p>
                                                                            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                                by {activity.user?.name || 'System'}
                                                                            </span>
                                                                        </div>

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
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{deal.title}</h3>
                                {deal.contact?.company && (
                                    <p className="text-sm text-gray-500 mt-1">{deal.contact.company}</p>
                                )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${deal.stage === 'QUALIFIED' ? 'bg-emerald-100 text-emerald-700' :
                                deal.stage === 'PROPOSAL' ? 'bg-sky-100 text-sky-700' :
                                    deal.stage === 'NEGOTIATION' ? 'bg-violet-100 text-violet-700' :
                                        deal.stage === 'CLOSED_WON' ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-700'
                                }`}>
                                {deal.stage.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="space-y-6">
                            {/* Financials Section */}
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    <DollarSign size={14} />
                                    Financials
                                </h4>
                                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Value</label>
                                        <p className="text-base font-semibold text-gray-900">
                                            {formatCurrency(deal.value, deal.currency)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Forecast</label>
                                        <p className="text-base font-semibold text-gray-900">
                                            {formatCurrency((deal.value * deal.probability) / 100, deal.currency)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Probability</label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${deal.probability}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-gray-700">{deal.probability}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Close Date</label>
                                        <p className="text-sm font-medium text-gray-900">
                                            {(deal.stage === 'CLOSED_WON' || deal.stage === 'CLOSED_LOST') && deal.closedAt
                                                ? new Date(deal.closedAt).toLocaleDateString('th-TH', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })
                                                : deal.expectedCloseDate
                                                    ? new Date(deal.expectedCloseDate).toLocaleDateString('th-TH', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })
                                                    : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100" />

                            {/* People Section */}
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    <Users size={14} />
                                    People
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Contact</label>
                                            {deal.contact ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                        {deal.contact.firstName.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{deal.contact.firstName} {deal.contact.lastName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">No contact</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Owner</label>
                                            <button
                                                onClick={() => {
                                                    if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
                                                        setShowOwnerModal(true);
                                                    }
                                                }}
                                                disabled={!(user?.role === 'ADMIN' || user?.role === 'MANAGER')}
                                                className={`flex items-center gap-2 group ${user?.role === 'ADMIN' || user?.role === 'MANAGER'
                                                    ? 'cursor-pointer'
                                                    : 'cursor-not-allowed opacity-80'
                                                    }`}
                                            >
                                                <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                                                    {deal.owner?.name?.substring(0, 2) || 'UN'}
                                                </div>
                                                <span className={`text-sm font-medium transition-colors ${user?.role === 'ADMIN' || user?.role === 'MANAGER'
                                                    ? 'text-gray-900 group-hover:text-purple-600'
                                                    : 'text-gray-700'
                                                    }`}>
                                                    {deal.owner?.name || 'Unassigned'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs text-gray-400">Sales Team</label>
                                            {(user?.role === 'ADMIN' || deal.owner?.id === user?.id) && (
                                                <button
                                                    onClick={() => setShowTeamModal(true)}
                                                    className="text-xs text-blue-600 font-medium hover:underline"
                                                >
                                                    + Add
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(deal.salesTeam || []).map(member => (
                                                <div key={member.id} className="relative group/member">
                                                    <div
                                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm cursor-help"
                                                        style={{ backgroundColor: `hsl(${member.name.charCodeAt(0) * 7 % 360}, 60%, 50%)` }}
                                                        title={member.name}
                                                    >
                                                        {member.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    {(user?.role === 'ADMIN' || deal.owner?.id === user?.id) && (
                                                        <button
                                                            onClick={() => handleUpdateTeam((deal.salesTeam || []).filter(m => m.id !== member.id).map(m => m.id))}
                                                            className="absolute -top-1 -right-1 bg-white rounded-full text-red-500 shadow-sm opacity-0 group-hover/member:opacity-100 transition-opacity hover:bg-red-50 p-0.5 border border-gray-100"
                                                        >
                                                            <X size={8} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {(deal.salesTeam || []).length === 0 && (
                                                <span className="text-xs text-gray-400 italic py-1">No additional members</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100" />

                            {/* Other Info */}
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    <Clock size={14} />
                                    Activity
                                </h4>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Last Interaction</label>
                                    <p className="text-sm font-medium text-gray-900">
                                        {deal.activities?.[0]
                                            ? new Date(deal.activities[0].createdAt).toLocaleDateString('th-TH', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })
                                            : 'No activity yet'}
                                    </p>
                                </div>
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
                                disabled={deal.quotationApproved}
                                className={`text-xs font-medium hover:underline ${deal.quotationApproved ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600'}`}
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
                                        {!deal.quotationApproved && (
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
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

            {/* Change Owner Modal */}
            <Modal isOpen={showOwnerModal} onClose={() => setShowOwnerModal(false)} title="Change Deal Owner" size="sm">
                <div className="space-y-4">
                    <div className="grid gap-2">
                        {users.map((u) => (
                            <button
                                key={u.id}
                                onClick={() => handleUpdateOwner(u.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${deal?.owner?.id === u.id
                                    ? 'bg-blue-50 border border-blue-200 shadow-sm'
                                    : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-medium">
                                    {u.name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="text-left">
                                    <p className={`text-sm font-medium ${deal?.owner?.id === u.id ? 'text-blue-700' : 'text-gray-900'}`}>
                                        {u.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{u.email}</p>
                                </div>
                                {deal?.owner?.id === u.id && (
                                    <CheckCircle2 size={16} className="ml-auto text-blue-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* Sales Team Modal */}
            <Modal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} title="Add Sales Team Member" size="sm">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    <p className="text-sm text-gray-500">Select a user to add to the sales team for this deal.</p>
                    <div className="grid gap-2">
                        {users.filter(u => u.id !== deal.owner?.id && !(deal.salesTeam || []).some(m => m.id === u.id)).map((u) => (
                            <button
                                key={u.id}
                                onClick={() => handleUpdateTeam([...(deal.salesTeam || []).map(m => m.id), u.id])}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent transition-all text-left w-full group"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-medium">
                                    {u.name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-medium text-gray-900">{u.name}</p>
                                    <p className="text-xs text-gray-500">{u.email}</p>
                                </div>
                                <Plus size={16} className="ml-auto text-gray-300 group-hover:text-blue-600 transition-colors" />
                            </button>
                        ))}
                        {users.filter(u => u.id !== deal.owner?.id && !(deal.salesTeam || []).some(m => m.id === u.id)).length === 0 && (
                            <div className="text-center py-6 text-gray-400 text-sm">
                                All available users are already assigned.
                            </div>
                        )}
                    </div>
                </div>
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
