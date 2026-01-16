'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
    Loader2, Search, Trophy, ChevronRight,
    TrendingUp, Users, Target
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SalesPerfData {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    deals: number;
    contacts: number;
    leads: number;
}

export default function TeamPerformancePage() {
    const { token, user } = useAuth();
    const router = useRouter();
    const [salesPerformance, setSalesPerformance] = useState<SalesPerfData[]>([]);
    const [filteredData, setFilteredData] = useState<SalesPerfData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadData = async () => {
            if (!token || !user) return;

            if (user.role !== 'ADMIN') {
                router.push('/');
                return;
            }

            try {
                const data = await api.getSalesPerformance(token);
                setSalesPerformance(data);
                setFilteredData(data);
            } catch (error) {
                console.error('Failed to load sales performance:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [token, user, router]);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredData(salesPerformance);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = salesPerformance.filter(item =>
                item.name.toLowerCase().includes(lowerQuery) ||
                item.email.toLowerCase().includes(lowerQuery)
            );
            setFilteredData(filtered);
        }
    }, [searchQuery, salesPerformance]);

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
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
                        <TrendingUp size={24} />
                        Sales Team Performance
                    </h1>
                </div>

                <div className="flex gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search salesperson..."
                            className="h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 w-64"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Performance List */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_40px] gap-4 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider items-center">
                    <div>Salesperson</div>
                    <div className="text-center">Deals Won</div>
                    <div className="text-center">Active Leads</div>
                    <div className="text-center">Contacts</div>
                    <div></div>
                </div>

                {/* List Body */}
                <div className="overflow-y-auto flex-1">
                    {filteredData.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Users size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium text-gray-500">No team members found</p>
                        </div>
                    ) : (
                        filteredData.map((item, index) => (
                            <div
                                key={item.id}
                                onClick={() => router.push(`/team-performance/${item.id}`)}
                                className="group border-b border-gray-100 items-center hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                {/* Desktop Row */}
                                <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_40px] gap-4 px-4 py-3 items-center text-sm">
                                    {/* Salesperson Info */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                            {item.name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-gray-900 group-hover:text-[#007AFF] transition-colors flex items-center gap-2">
                                                {item.name}
                                                {index === 0 && !searchQuery && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full">
                                                        <Trophy size={10} /> Rank 1
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">{item.email}</div>
                                        </div>
                                    </div>

                                    {/* Deals */}
                                    <div className="text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            {item.deals} Deals
                                        </span>
                                    </div>

                                    {/* Leads */}
                                    <div className="text-center text-gray-600">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Target size={14} className="text-gray-400" />
                                            <span>{item.leads}</span>
                                        </div>
                                    </div>

                                    {/* Contacts */}
                                    <div className="text-center text-gray-600">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Users size={14} className="text-gray-400" />
                                            <span>{item.contacts}</span>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className="text-right">
                                        <ChevronRight size={16} className="text-gray-400 group-hover:text-[#007AFF] transition-colors ml-auto" />
                                    </div>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                                            {item.name?.charAt(0) || 'U'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-gray-900 group-hover:text-[#007AFF] transition-colors flex items-center gap-2">
                                                {item.name}
                                                {index === 0 && !searchQuery && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full">
                                                        <Trophy size={10} /> #1
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">{item.email}</div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-400" />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                                        <div className="text-center p-2 bg-blue-50/50 rounded-lg">
                                            <div className="text-lg font-bold text-blue-600">{item.deals}</div>
                                            <div className="text-[10px] text-gray-500">Deals</div>
                                        </div>
                                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                                            <div className="text-lg font-bold text-gray-700">{item.leads}</div>
                                            <div className="text-[10px] text-gray-500">Leads</div>
                                        </div>
                                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                                            <div className="text-lg font-bold text-gray-700">{item.contacts}</div>
                                            <div className="text-[10px] text-gray-500">Contacts</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
