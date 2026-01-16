'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface DealsCountChartProps {
    timeframe: string;
}

export default function DealsCountChart({ timeframe }: DealsCountChartProps) {
    const { token } = useAuth();
    const [data, setData] = useState<{ name: string; new: number; won: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!token) return;
            try {
                setIsLoading(true);
                const result = await api.getDealsCount(token, timeframe);
                setData(result);
            } catch (error) {
                console.error('Failed to load chart data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [token, timeframe]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
                    <div className="space-y-1">
                        <p className="text-xs text-gray-500 flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                New Deals
                            </span>
                            <span className="font-semibold text-gray-900">{payload[0].value}</span>
                        </p>
                        <p className="text-xs text-gray-500 flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Won Deals
                            </span>
                            <span className="font-semibold text-gray-900">{payload[1]?.value || 0}</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm h-full flex flex-col">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">Deals Volume</h3>
                <p className="text-sm text-gray-500">New Deals vs Won Deals</p>
            </div>

            <div className="flex-1 min-h-[300px] w-full">
                {isLoading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 0,
                            }}
                        >
                            <defs>
                                <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
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
                                tickCount={5}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9ca3af', strokeDasharray: '3 3' }} />
                            <Legend
                                iconType="circle"
                                wrapperStyle={{ paddingTop: '20px' }}
                            />
                            <Area
                                type="monotone"
                                name="New Deals"
                                dataKey="new"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorNew)"
                            />
                            <Area
                                type="monotone"
                                name="Won Deals"
                                dataKey="won"
                                stroke="#10B981"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorWon)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
