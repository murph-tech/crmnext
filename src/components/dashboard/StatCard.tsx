'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    change?: {
        value: string;
        positive: boolean;
    };
    icon: LucideIcon;
    iconColor?: string;
    delay?: number;
}

export default function StatCard({
    title,
    value,
    change,
    icon: Icon,
    iconColor = '#007AFF',
    delay = 0,
}: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
                duration: 0.4,
                delay,
                ease: [0.4, 0, 0.2, 1],
            }}
            whileHover={{
                y: -2,
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.08)',
            }}
            className="glass-card rounded-3xl p-6 cursor-pointer transition-shadow duration-300"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div
                    className="p-3 rounded-2xl"
                    style={{ backgroundColor: `${iconColor}12` }}
                >
                    <Icon size={22} style={{ color: iconColor }} />
                </div>

                {change && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: delay + 0.2 }}
                        className={`
              flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
              ${change.positive
                                ? 'bg-green-50 text-green-600'
                                : 'bg-red-50 text-red-600'
                            }
            `}
                    >
                        <span>{change.positive ? '↑' : '↓'}</span>
                        <span>{change.value}</span>
                    </motion.div>
                )}
            </div>

            {/* Value */}
            <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.15 }}
            >
                <h3 className="text-3xl font-semibold text-gray-900 tracking-tight mb-1">
                    {value}
                </h3>
                <p className="text-sm text-gray-500">{title}</p>
            </motion.div>

            {/* Decorative gradient line */}
            <div className="mt-4 h-1 w-12 rounded-full opacity-60" style={{ backgroundColor: iconColor }} />
        </motion.div>
    );
}
