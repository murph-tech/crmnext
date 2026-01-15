'use client';

import { motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';

interface Activity {
    id: string;
    type: string;
    title: string;
    description?: string;
    createdAt: string;
    lead?: { firstName: string; lastName: string };
    contact?: { firstName: string; lastName: string; company?: string };
    deal?: { title: string; value: number };
}

interface ActivityTableProps {
    activities?: Activity[];
}

const typeColors: Record<string, string> = {
    CALL: '#007AFF',
    EMAIL: '#34C759',
    MEETING: '#AF52DE',
    TASK: '#FF9500',
    NOTE: '#FF3B30',
};

function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function getInitials(activity: Activity): string {
    if (activity.contact) {
        return `${activity.contact.firstName[0]}${activity.contact.lastName[0]}`;
    }
    if (activity.lead) {
        return `${activity.lead.firstName[0]}${activity.lead.lastName[0]}`;
    }
    if (activity.deal) {
        return activity.deal.title.substring(0, 2).toUpperCase();
    }
    return activity.type.substring(0, 2);
}

function getDescription(activity: Activity): string {
    if (activity.description) return activity.description;
    if (activity.contact) {
        return `${activity.contact.firstName} ${activity.contact.lastName}${activity.contact.company ? ` - ${activity.contact.company}` : ''}`;
    }
    if (activity.lead) {
        return `${activity.lead.firstName} ${activity.lead.lastName}`;
    }
    if (activity.deal) {
        return activity.deal.title;
    }
    return '';
}

export default function ActivityTable({ activities = [] }: ActivityTableProps) {
    // Show placeholder if no activities
    const displayActivities = activities.length > 0 ? activities : [
        { id: '1', type: 'NOTE', title: 'No recent activity', createdAt: new Date().toISOString() },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="glass-card rounded-3xl overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.04]">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Latest updates from your team</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-xl hover:bg-black/[0.04] transition-colors duration-200"
                >
                    <MoreHorizontal size={18} className="text-gray-500" />
                </motion.button>
            </div>

            {/* Activity List */}
            <div className="divide-y divide-black/[0.04]">
                {displayActivities.map((activity, index) => {
                    const color = typeColors[activity.type] || '#6B7280';

                    return (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                                duration: 0.3,
                                delay: 0.4 + index * 0.08,
                            }}
                            whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                            className="flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors duration-200"
                        >
                            {/* Avatar */}
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${color}15` }}
                            >
                                <span
                                    className="text-sm font-medium"
                                    style={{ color }}
                                >
                                    {getInitials(activity)}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {activity.title}
                                </p>
                                <p className="text-sm text-gray-500 truncate mt-0.5">
                                    {getDescription(activity)}
                                </p>
                            </div>

                            {/* Timestamp */}
                            <div className="flex-shrink-0">
                                <span className="text-xs text-gray-400">
                                    {getTimeAgo(activity.createdAt)}
                                </span>
                            </div>

                            {/* Type indicator */}
                            <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                            />
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-black/[0.04] bg-black/[0.01]">
                <motion.a
                    href="/activities"
                    whileHover={{ x: 4 }}
                    className="text-sm font-medium text-[#007AFF] hover:underline"
                >
                    View all activity →
                </motion.a>
            </div>
        </motion.div>
    );
}
