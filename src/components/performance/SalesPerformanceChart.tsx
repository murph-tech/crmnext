'use client';

import { useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, Calendar, Trophy, ChevronDown } from 'lucide-react';

interface SalesPerfData {
    id: string;
    name: string;
    deals: number;
}

interface SalesPerformanceChartProps {
    data: SalesPerfData[];
    trendData: any[];
    timeframe: string;
    onTimeframeChange: (value: string) => void;
    currentYear: number;
    onYearChange: (year: number) => void;
}

const THAI_MONTHS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export default function SalesPerformanceChart({ data, trendData, timeframe, onTimeframeChange, currentYear, onYearChange }: SalesPerformanceChartProps) {
    const [activeTab, setActiveTab] = useState<'trend' | 'ranking'>('trend');
    const [showYearSelect, setShowYearSelect] = useState(false);

    // Process Trend Data - Focus on TOTAL WON deals for accurate team trend
    const processedTrendData = trendData.map(item => {
        const [year, month, day] = item.name.split('-');
        let name = item.name;

        if (timeframe === 'year') {
            name = month ? THAI_MONTHS[parseInt(month) - 1] : item.name;
        } else if (timeframe === 'month') {
            name = day ? `${day}/${month}` : item.name;
        }

        return {
            ...item,
            name,
            value: item.won || 0
        };
    });

    // Process Ranking Data (Top 10)
    const sortedData = [...data]
        .sort((a, b) => b.deals - a.deals)
        .slice(0, 8);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 min-w-[160px]">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1 opacity-70">{label}</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
                        <span className="text-2xl font-black text-gray-900 tracking-tight">
                            {payload[0].value.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-gray-400 mt-2">Deals</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const handleYearSelect = (year: number) => {
        onYearChange(year);
        setShowYearSelect(false);
    };

    return (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm h-full flex flex-col relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50/50 to-transparent rounded-bl-[100px] -z-0 pointer-events-none opacity-50" />

            {/* Header & Tabs */}
            <div className="relative z-10 flex flex-col xl:flex-row xl:items-start justify-between mb-8 gap-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#007AFF]">
                            <TrendingUp size={18} />
                        </div>
                        ประสิทธิภาพทีมขาย
                    </h2>
                    <p className="text-sm text-gray-500 mt-2 font-medium ml-1">
                        {activeTab === 'trend'
                            ? 'ภาพรวมการเติบโตยอดขายตามช่วงเวลา'
                            : 'จัดอันดับผลงานสมาชิกในทีม'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Timeframe Selector */}
                    <div className="bg-gray-50 p-1 rounded-xl border border-gray-100 flex items-center shrink-0 self-start">
                        <button
                            onClick={() => onTimeframeChange('week')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${timeframe === 'week'
                                    ? 'bg-white text-[#007AFF] shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Last Week
                        </button>
                        <button
                            onClick={() => onTimeframeChange('month')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${timeframe === 'month'
                                    ? 'bg-white text-[#007AFF] shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Last Month
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => {
                                    onTimeframeChange('year');
                                    setShowYearSelect(!showYearSelect);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 ${timeframe === 'year'
                                        ? 'bg-white text-[#007AFF] shadow-sm ring-1 ring-black/5'
                                        : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Year {currentYear} <ChevronDown size={12} />
                            </button>

                            <AnimatePresence>
                                {showYearSelect && timeframe === 'year' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20 w-32 py-1"
                                    >
                                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                                            <button
                                                key={year}
                                                onClick={() => handleYearSelect(year)}
                                                className={`w-full px-4 py-2 text-left text-xs font-bold hover:bg-gray-50 transition-colors ${currentYear === year ? 'text-[#007AFF] bg-blue-50' : 'text-gray-600'
                                                    }`}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* View Toggle */}
                    <div className="bg-gray-50 p-1 rounded-xl border border-gray-100 flex shrink-0 self-start">
                        <button
                            onClick={() => setActiveTab('trend')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === 'trend'
                                    ? 'bg-white text-[#007AFF] shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <Calendar size={12} />
                            Trend
                        </button>
                        <button
                            onClick={() => setActiveTab('ranking')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${activeTab === 'ranking'
                                    ? 'bg-white text-[#007AFF] shadow-sm ring-1 ring-black/5'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <Trophy size={12} />
                            Rank
                        </button>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 w-full min-h-[300px] relative z-10">
                <AnimatePresence mode="wait">
                    {activeTab === 'trend' ? (
                        <motion.div
                            key="trend"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={processedTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                        dy={15}
                                        padding={{ left: 10, right: 10 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                                    />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ stroke: '#007AFF', strokeWidth: 2, strokeDasharray: '4 4', opacity: 0.5 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#007AFF"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorWon)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="ranking"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={sortedData}
                                    layout="vertical"
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                    barSize={24}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={120}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc', radius: 8 }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100">
                                                        <p className="font-bold text-sm text-gray-900 mb-1">{label}</p>
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-[#007AFF]">
                                                            {payload[0].value} Won Deals
                                                        </span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="deals" radius={[0, 6, 6, 0]} background={{ fill: '#f8fafc', radius: 6 }}>
                                        {sortedData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={index === 0 ? '#007AFF' : index === 1 ? '#34C759' : index === 2 ? '#FF9500' : '#cbd5e1'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
