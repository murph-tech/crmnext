'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Rectangle,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { RefreshCcw, BarChart2, Zap, Info } from 'lucide-react';

interface SalesPerfData {
    id: string;
    name: string;
    deals: number;
}

interface SalesPerformanceChartProps {
    data: SalesPerfData[];
    trendData: any[];
}

// Custom specialized bar to make it look like a premium capsule
const CustomBar = (props: any) => {
    const { fill, x, y, width, height, barSize } = props;
    if (height <= 0) return null;

    return (
        <Rectangle
            {...props}
            radius={[width / 2, width / 2, width / 2, width / 2]}
            className="drop-shadow-sm transition-all duration-500"
        />
    );
};

const THAI_MONTHS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const COLORS = [
    '#007AFF', // Blue
    '#34C759', // Green
    '#FF9500', // Orange
    '#AF52DE', // Purple
    '#FF3B30', // Red
    '#5856D6', // Indigo
    '#FFCC00', // Yellow
    '#FF2D55', // Pink
];

export default function SalesPerformanceChart({ data, trendData }: SalesPerformanceChartProps) {
    const [viewMode, setViewMode] = useState<'bar' | 'radar'>('bar');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get all unique salesperson names who have at least one deal or are in the performance list
    const salespeopleNames = Array.from(new Set([
        ...data.map(d => d.name),
        ...trendData.flatMap(item => Object.keys(item).filter(k => !['name', 'won', 'lost'].includes(k)))
    ])).slice(0, 8); // Limit to top 8 for visual clarity

    // Format trend data for Grouped Bar Chart
    const chartData = (trendData || []).map(item => {
        const [year, month] = item.name.split('-');
        return {
            ...item,
            monthName: month ? THAI_MONTHS[parseInt(month) - 1] : item.name,
            totalWon: item.won || 0
        };
    });

    const maxDealsIndividual = Math.max(...data.map(d => d.deals), 1);

    // Data for Radar - needs individual salesperson data
    const radarData = data.map(item => ({
        subject: item.name,
        A: item.deals,
        B: item.deals * 0.8,
        fullMark: maxDealsIndividual + 2
    }));

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 800);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const items = payload.filter((p: any) => !['won', 'lost', 'totalWon'].includes(p.dataKey));

            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="bg-white/90 backdrop-blur-2xl p-6 border border-white/50 shadow-2xl rounded-[32px] ring-1 ring-black/5 min-w-[240px]"
                >
                    <div className="mb-4">
                        <p className="font-black text-gray-900 text-lg leading-tight">{label}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse" />
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.1em]">Monthly Performance</p>
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        {items.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-gray-50/50 border border-gray-100/50 transition-all hover:bg-white hover:shadow-sm">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.color }} />
                                    <span className="text-[11px] font-bold text-gray-600 truncate">{entry.name}</span>
                                </div>
                                <span className="text-sm font-black text-gray-900 shrink-0">
                                    {entry.value.toLocaleString()}
                                </span>
                            </div>
                        ))}

                        {items.length === 0 && (
                            <div className="py-4 text-center">
                                <p className="text-xs font-bold text-gray-300">ไม่มีข้อมูลการขายในเดือนนี้</p>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between px-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">ยอดรวมรายเดือน</span>
                            <span className="text-lg font-black text-[#007AFF]">
                                {payload.find((p: any) => p.dataKey === 'totalWon')?.value?.toLocaleString() || 0}
                            </span>
                        </div>
                    </div>
                </motion.div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white border border-gray-100 rounded-[40px] p-8 shadow-sm h-full flex flex-col relative overflow-hidden group">
            {/* Background Aesthetic */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-50/50 rounded-full blur-[100px] transition-all group-hover:bg-indigo-50/50" />

            <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 relative z-10 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">สรุปผลงานระดับทีม</h2>
                    <p className="text-sm font-bold text-gray-400 mt-1 max-w-[280px]">เปรียบเทียบขีดความสามารถการปิดการขายรายเดือนของทีม</p>
                </div>

                <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-[22px] border border-gray-200/50">
                    <button
                        onClick={() => setViewMode('bar')}
                        className={`px-5 py-2 flex items-center gap-2 text-[10px] font-black rounded-xl transition-all ${viewMode === 'bar'
                            ? 'bg-white text-[#007AFF] shadow-sm border border-gray-100'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <BarChart2 size={12} strokeWidth={3} />
                        TIMELINE
                    </button>
                    <button
                        onClick={handleRefresh}
                        className={`px-5 py-2 flex items-center gap-2 text-[10px] font-black rounded-xl transition-all text-gray-400 hover:text-gray-600 active:scale-95`}
                    >
                        <Zap size={12} strokeWidth={3} className={isRefreshing ? 'animate-pulse text-yellow-500' : ''} />
                        {isRefreshing ? 'FETCHING...' : 'SYNC'}
                    </button>
                    <button
                        onClick={() => setViewMode('radar')}
                        className={`px-5 py-2 flex items-center gap-2 text-[10px] font-black rounded-xl transition-all ${viewMode === 'radar'
                            ? 'bg-white text-[#007AFF] shadow-sm border border-gray-100'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <RefreshCcw size={12} strokeWidth={3} />
                        SKILLS
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[350px] relative z-10 mt-2">
                <AnimatePresence mode="wait">
                    {viewMode === 'bar' ? (
                        <motion.div
                            key="bar-chart"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full h-full"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                                    barGap={6}
                                >
                                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#f1f5f9" />

                                    <XAxis
                                        dataKey="monthName"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 400 }}
                                        dy={15}
                                    />

                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 300 }}
                                    />

                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ fill: 'rgba(0,0,0,0.015)', radius: [24, 24, 24, 24] }}
                                        wrapperStyle={{ outline: 'none' }}
                                    />

                                    {/* Legend for salespeople */}
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        iconType="circle"
                                        wrapperStyle={{ paddingBottom: 20, fontSize: 10, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                    />

                                    {/* Invisible bar just to pass total won to tooltip */}
                                    <Bar dataKey="totalWon" fill="transparent" isAnimationActive={false} />

                                    {salespeopleNames.map((name, index) => (
                                        <Bar
                                            key={name}
                                            dataKey={name}
                                            name={name}
                                            radius={[6, 6, 6, 6]}
                                            barSize={8}
                                            fill={COLORS[index % COLORS.length]}
                                            animationDuration={1500}
                                            animationBegin={index * 150}
                                            minPointSize={2}
                                            shape={<CustomBar />}
                                        />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="radar-chart"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="w-full h-full"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="#f1f5f9" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 400 }} />
                                    <PolarRadiusAxis
                                        angle={30}
                                        domain={[0, maxDealsIndividual + 2]}
                                        tick={false}
                                        axisLine={false}
                                    />
                                    <Radar
                                        name="สมาชิกทีม"
                                        dataKey="A"
                                        stroke="#007AFF"
                                        fill="#007AFF"
                                        fillOpacity={0.15}
                                        strokeWidth={4}
                                        animationDuration={1500}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-50 relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl text-[#007AFF] shadow-inner">
                        <Info size={14} />
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 tracking-tight leading-4">
                        แสดงข้อมูลประสิทธิภาพการขายแยกตามรายบุคคล<br />
                        ในช่วงเวลา 12 เดือนที่ผ่านมา
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100/50">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Connect</span>
                </div>
            </div>
        </div>
    );
}
