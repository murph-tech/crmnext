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

import SalesPerformanceChart from '@/components/performance/SalesPerformanceChart';

export default function TeamPerformancePage() {
    const { token, user } = useAuth();
    const router = useRouter();
    const [salesPerformance, setSalesPerformance] = useState<SalesPerfData[]>([]);
    const [yearTrend, setYearTrend] = useState<any[]>([]);
    const [filteredData, setFilteredData] = useState<SalesPerfData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [timeframe, setTimeframe] = useState('year');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        if (!token || !user) return;

        if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
            router.push('/');
            return;
        }

        const loadData = async () => {
            try {
                let options: any = { timeframe };

                if (timeframe === 'year') {
                    // Start from Jan 1st of selected year to Dec 31st of selected year
                    const startDate = `${selectedYear}-01-01`;
                    const endDate = `${selectedYear}-12-31`;
                    options = { timeframe: 'year', startDate, endDate };
                }

                // When timeframe changes, we might want to show loading state or just update silently?
                // Let's keep it smooth.
                const [perfData, trendData] = await Promise.all([
                    api.getSalesPerformance(token, options),
                    api.getWonDeals(token, { ...options, mode: 'count' })
                ]);
                setSalesPerformance(perfData);
                setFilteredData(perfData);
                setYearTrend(trendData);
            } catch (error) {
                console.error('Failed to load sales performance:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [token, user, router, timeframe, selectedYear]);

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
        <div className="max-w-[1600px] mx-auto py-8 px-6 h-screen flex flex-col">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-8 flex-shrink-0"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#007AFF]">
                            <TrendingUp size={28} />
                        </div>
                        ประสิทธิถาพของทีมขาย
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium ml-1">ติดตามและวิเคราะห์ผลงานของสมาชิกในทีมทุกคน</p>
                </div>

                <div className="flex gap-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ค้นหารายชื่อเซล..."
                            className="h-12 pl-12 pr-6 rounded-2xl border border-gray-100 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 w-80 transition-all font-medium"
                        />
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden min-h-0">
                {/* Performance List Column */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex flex-col"
                >
                    {/* Desktop Table Header */}
                    <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_40px] gap-4 px-6 py-4 border-b border-gray-50 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest items-center">
                        <div>Salesperson</div>
                        <div className="text-center">Deals Won</div>
                        <div className="text-center">Active Leads</div>
                        <div className="text-center">Contacts</div>
                        <div></div>
                    </div>

                    {/* List Body */}
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {filteredData.length === 0 ? (
                            <div className="text-center py-24 text-gray-400">
                                <Users size={64} className="mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-bold text-gray-300">ไม่พบสมาชิกในทีม</p>
                            </div>
                        ) : (
                            filteredData.map((item, index) => (
                                <div
                                    key={item.id}
                                    onClick={() => router.push(`/team-performance/${item.id}`)}
                                    className="group border-b border-gray-50 items-center hover:bg-gray-50 transition-all cursor-pointer"
                                >
                                    {/* Desktop Row */}
                                    <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_40px] gap-4 px-6 py-4 items-center text-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-sm font-bold text-[#007AFF] border border-blue-100/50">
                                                {item.name?.charAt(0) || 'U'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-gray-900 group-hover:text-[#007AFF] transition-colors flex items-center gap-2">
                                                    {item.name}
                                                    {index === 0 && !searchQuery && (
                                                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-black rounded-lg">
                                                            <Trophy size={10} /> Rank 1
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400 font-medium truncate">{item.email}</div>
                                            </div>
                                        </div>

                                        <div className="text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 text-[#007AFF] border border-blue-100/30">
                                                {item.deals} Deals
                                            </span>
                                        </div>

                                        <div className="text-center text-gray-600">
                                            <div className="flex items-center justify-center gap-1.5 font-bold">
                                                <Target size={14} className="text-emerald-500" />
                                                <span>{item.leads}</span>
                                            </div>
                                        </div>

                                        <div className="text-center text-gray-600">
                                            <div className="flex items-center justify-center gap-1.5 font-bold">
                                                <Users size={14} className="text-purple-500" />
                                                <span>{item.contacts}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <ChevronRight size={18} className="text-gray-300 group-hover:text-[#007AFF] group-hover:translate-x-1 transition-all ml-auto" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* Performance Chart Column */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="h-full min-h-[400px]"
                >
                    <SalesPerformanceChart
                        data={salesPerformance}
                        trendData={yearTrend}
                        timeframe={timeframe}
                        onTimeframeChange={setTimeframe}
                        currentYear={selectedYear}
                        onYearChange={setSelectedYear}
                    />
                </motion.div>
            </div>
        </div>
    );
}
