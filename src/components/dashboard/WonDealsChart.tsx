'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface WonDealsChartProps {
    timeframe: string;
    startDate?: string;
    endDate?: string;
}

export default function WonDealsChart({ timeframe, startDate, endDate }: WonDealsChartProps) {
    const { token } = useAuth();
    const [data, setData] = useState<{ name: string; won: number; lost: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!token) return;
            try {
                setIsLoading(true);
                const result = await api.getWonDeals(token, { timeframe, startDate, endDate });
                setData(result);
            } catch (error) {
                // In development mode, mock data is returned automatically
                // In production, this error would indicate backend issues
                if (process.env.NODE_ENV !== 'development') {
                    console.error('Failed to load chart data:', error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [token, timeframe, startDate, endDate]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500 flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                                Won
                            </span>
                            <span className="font-semibold text-gray-900">{formatCurrency(payload[0].value)}</span>
                        </p>
                        <p className="text-xs text-gray-500 flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                                Lost
                            </span>
                            <span className="font-semibold text-gray-900">{formatCurrency(payload[1]?.value || 0)}</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Deals Outcome</h3>
                    <p className="text-sm text-gray-500">Revenue Won vs Lost</p>
                </div>
            </div>

            <div className="flex-1 min-h-[300px] w-full">
                {isLoading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 0,
                            }}
                            barGap={4}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickFormatter={(value) => {
                                    if (value >= 1000000) return `฿${+(value / 1000000).toFixed(1)}m`;
                                    if (value >= 1000) return `฿${+(value / 1000).toFixed(0)}k`;
                                    return `฿${value}`;
                                }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ paddingTop: '20px' }}
                            />
                            <Bar
                                name="Won"
                                dataKey="won"
                                fill="#10B981" // Green
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                            <Bar
                                name="Lost"
                                dataKey="lost"
                                fill="#EF4444" // Red
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
