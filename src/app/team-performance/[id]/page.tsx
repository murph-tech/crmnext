'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
    User, Mail, Phone, Calendar, ArrowLeft, Loader2,
    Briefcase, Users, Contact
} from 'lucide-react';

import { User as UserType } from '@/types';

interface UserDetail extends UserType {
    _count?: {
        deals: number;
        leads: number;
        contacts: number;
    };
}

export default function UserPerformancePage() {
    const { token, user: currentUser } = useAuth();
    const router = useRouter();
    const params = useParams();
    const userId = params.id as string;

    const [user, setUser] = useState<UserDetail | null>(null);
    const [activeTab, setActiveTab] = useState<'deals' | 'leads' | 'contacts'>('deals');
    const [isLoading, setIsLoading] = useState(true);

    // Data states
    const [deals, setDeals] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    useEffect(() => {
        if (token && userId) {
            loadUserAndData();
        }
    }, [token, userId]);

    // Fetch filtered data when tab changes
    useEffect(() => {
        if (token && userId && !isLoading) {
            loadTabData();
        }
    }, [activeTab, token, userId]);

    const loadUserAndData = async () => {
        try {
            // First get user details (using getUser from existing API if available, else we might need to add it or use filtered lists)
            // Assuming api.getUser exists based on previous file review
            const userData = await api.getUser(token!, userId);
            setUser(userData);

            // Initiate filtering for the default tab
            await loadTabData();
        } catch (error) {
            console.error('Failed to load user:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTabData = async () => {
        setIsLoadingData(true);
        try {
            if (activeTab === 'deals') {
                const data = await api.getDeals(token!, { ownerId: userId });
                setDeals(data);
            } else if (activeTab === 'leads') {
                const data = await api.getLeads(token!, { ownerId: userId });
                setLeads(data);
            } else if (activeTab === 'contacts') {
                const data = await api.getContacts(token!, { ownerId: userId });
                setContacts(data);
            }
        } catch (error) {
            console.error(`Failed to load ${activeTab}:`, error);
        } finally {
            setIsLoadingData(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <h2 className="text-xl font-semibold text-gray-900">ไม่พบข้อมูลผู้ใช้งาน</h2>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-[#007AFF] hover:underline"
                >
                    <ArrowLeft size={16} /> กลับ
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>กลับไปหน้าภาพรวม</span>
                </button>

                <div className="glass-card rounded-3xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-3xl font-bold text-indigo-600 border-4 border-white shadow-lg">
                        {user.name?.charAt(0) || 'U'}
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.name}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-gray-500 mb-6">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm">
                                <Mail size={14} /> {user.email}
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm">
                                <User size={14} /> {user.role}
                            </span>
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm">
                                <Calendar size={14} /> เข้าร่วมเมื่อ {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto md:mx-0">
                            <div className="bg-blue-50 rounded-2xl p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600 mb-1">{user._count?.deals || 0}</div>
                                <div className="text-xs font-medium text-blue-600/60 uppercase tracking-wide">Deals</div>
                            </div>
                            <div className="bg-green-50 rounded-2xl p-4 text-center">
                                <div className="text-2xl font-bold text-green-600 mb-1">{user._count?.leads || 0}</div>
                                <div className="text-xs font-medium text-green-600/60 uppercase tracking-wide">Leads</div>
                            </div>
                            <div className="bg-purple-50 rounded-2xl p-4 text-center">
                                <div className="text-2xl font-bold text-purple-600 mb-1">{user._count?.contacts || 0}</div>
                                <div className="text-xs font-medium text-purple-600/60 uppercase tracking-wide">Contacts</div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {[
                    { id: 'deals', label: 'ดีลการขาย', icon: Briefcase },
                    { id: 'leads', label: 'ลูกค้าเป้าหมาย', icon: Users },
                    { id: 'contacts', label: 'รายชื่อติดต่อ', icon: Contact },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`
                            flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                            }
                        `}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm"
            >
                {isLoadingData ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* DEALS TABLE */}
                        {activeTab === 'deals' && (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Deal Name</th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Stage</th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Value</th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Probability</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deals.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-gray-500">ไม่พบดีล</td>
                                        </tr>
                                    ) : (
                                        deals.map((deal) => (
                                            <tr key={deal.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="py-4 px-6 font-medium text-gray-900">{deal.title}</td>
                                                <td className="py-4 px-6">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                        {deal.stage}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 font-medium">
                                                    {formatCurrency(deal.value, deal.currency || 'THB')}
                                                </td>
                                                <td className="py-4 px-6 text-gray-600">{deal.probability}%</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* LEADS TABLE */}
                        {activeTab === 'leads' && (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Company</th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-gray-500">ไม่พบ Lead</td>
                                        </tr>
                                    ) : (
                                        leads.map((lead) => (
                                            <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                                                    <div className="text-xs text-gray-500">{lead.email}</div>
                                                </td>
                                                <td className="py-4 px-6 text-gray-600">{lead.company || '-'}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium 
                                                        ${lead.status === 'NEW' ? 'bg-blue-50 text-blue-700' :
                                                            lead.status === 'QUALIFIED' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-gray-600">{lead.source?.replace('_', ' ')}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* CONTACTS TABLE */}
                        {activeTab === 'contacts' && (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Company</th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                                        <th className="py-4 px-6 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contacts.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-gray-500">ไม่พบรายชื่อติดต่อ</td>
                                        </tr>
                                    ) : (
                                        contacts.map((contact) => (
                                            <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="font-medium text-gray-900">{contact.firstName} {contact.lastName}</div>
                                                    <div className="text-xs text-gray-500">{contact.email}</div>
                                                </td>
                                                <td className="py-4 px-6 text-gray-600">{contact.company || '-'}</td>
                                                <td className="py-4 px-6 text-gray-600">{contact.phone || '-'}</td>
                                                <td className="py-4 px-6 text-gray-600">{[contact.city, contact.country].filter(Boolean).join(', ') || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
