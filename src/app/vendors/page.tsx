'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Contact } from '@/types';
import { motion } from 'framer-motion';
import { Building2, Users, DollarSign, TrendingUp, Search, Eye, Truck, Plus } from 'lucide-react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal'; // Assuming we'll use this later for add/edit

// Mock CompanySummary for Vendors
interface VendorSummary {
    name: string;
    contactCount: number;
    activeDealsCount: number; // Placeholder
    totalDealsValue: number;  // Placeholder
    type: string;
    contacts: Contact[];
}

export default function VendorsPage() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [vendorGroups, setVendorGroups] = useState<VendorSummary[]>([]);

    // Future implementation: Add/Edit Modal states
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        if (token) {
            loadData();
        }
    }, [token, search]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch all contacts
            const contacts = await api.getContacts(token!);

            // Filter only VENDOR or PARTNER
            const relevantContacts = contacts.filter(c =>
                (c.type === 'VENDOR' || c.type === 'PARTNER') &&
                (
                    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
                    (c.firstName || '').toLowerCase().includes(search.toLowerCase())
                )
            );

            // Group by Company
            const grouped: Record<string, VendorSummary> = {};

            relevantContacts.forEach(c => {
                const companyName = c.company || 'Unknown Vendor'; // Fallback grouping
                if (!grouped[companyName]) {
                    grouped[companyName] = {
                        name: companyName,
                        contactCount: 0,
                        activeDealsCount: 0,
                        totalDealsValue: 0,
                        type: c.type || 'VENDOR',
                        contacts: []
                    };
                }
                grouped[companyName].contactCount += 1;
                grouped[companyName].contacts.push(c);
            });

            setVendorGroups(Object.values(grouped));
        } catch (error) {
            console.error('Failed to load vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-[#FF9500] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Truck className="w-8 h-8 text-[#FF9500]" />
                        คู่ค้าและพันธมิตร
                    </h1>
                    <p className="text-gray-600 mt-1">จัดการรายชื่อ Supplier, Vendor และ Partner ทั้งหมด</p>
                </div>
                <button
                    onClick={() => {/* To be implemented: Open Add Vendor Modal */ }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FF9500] text-white font-medium rounded-xl hover:bg-orange-600 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    <span>เพิ่มคู่ค้าใหม่</span>
                </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อบริษัท, ชื่อผู้ติดต่อ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border-none rounded-lg focus:ring-0 text-gray-700 bg-transparent placeholder-gray-400"
                    />
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-100 rounded-xl">
                            <Building2 className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">บริษัทคู่ค้าทั้งหมด</p>
                            <p className="text-3xl font-black text-gray-900">{vendorGroups.length}</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">ผู้ติดต่อรวม</p>
                            <p className="text-3xl font-black text-gray-900">
                                {vendorGroups.reduce((sum, v) => sum + v.contactCount, 0)}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <DollarSign className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">ยอดสั่งซื้อ (YTD)</p>
                            <p className="text-3xl font-black text-gray-900">
                                ฿0
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Vendors List (Card View) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-500" />
                        รายชื่อบริษัท (Vendors List)
                    </h2>
                    <span className="text-xs text-gray-500 font-medium bg-gray-200 px-2 py-1 rounded-md">
                        {vendorGroups.length} รายการ
                    </span>
                </div>

                {vendorGroups.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                            <Truck className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">ยังไม่มีข้อมูลคู่ค้า</h3>
                        <p className="text-gray-500 max-w-sm mb-6">
                            เริ่มเพิ่มข้อมูล Vendor หรือ Partner ของคุณเพื่อติดตามยอดการสั่งซื้อและข้อมูลการติดต่อได้ที่นี่
                        </p>
                        <button className="px-6 py-3 bg-[#FF9500] text-white font-medium rounded-xl hover:bg-orange-600 shadow-md hover:shadow-lg transition-all">
                            เพิ่มคู่ค้าคนแรก
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {vendorGroups.map((vendor, index) => (
                            <motion.div
                                key={vendor.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="p-6 hover:bg-orange-50/20 transition-all group"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    {/* Company Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4">
                                            {/* Avatar/Logo */}
                                            <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-white font-bold text-xl shadow-sm bg-gradient-to-br ${vendor.type === 'PARTNER' ? 'from-blue-500 to-indigo-600' : 'from-[#FF9500] to-red-500'}`}>
                                                {vendor.name.charAt(0).toUpperCase()}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#FF9500] transition-colors">
                                                        {vendor.name}
                                                    </h3>
                                                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide border ${vendor.type === 'PARTNER' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                        {vendor.type}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mt-2">
                                                    {/* Contact Person */}
                                                    <div className="flex items-center gap-2 min-w-[150px]">
                                                        <Users className="w-4 h-4 text-gray-400" />
                                                        <span className="truncate">{vendor.contacts[0]?.firstName} {vendor.contacts[0]?.lastName}</span>
                                                    </div>
                                                    {/* Email */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                                        <span className="truncate text-gray-500">{vendor.contacts[0]?.email || 'ไม่มีอีเมล'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats & Actions */}
                                    <div className="flex items-center gap-8 pl-18 md:pl-0 border-t md:border-t-0 pt-4 md:pt-0">
                                        <div className="text-right hidden md:block min-w-[100px]">
                                            <p className="text-xs text-gray-400 mb-1">ผู้ติดต่อในองค์กร</p>
                                            <p className="font-semibold text-gray-700">{vendor.contactCount} คน</p>
                                        </div>

                                        <div className="text-right hidden md:block min-w-[120px]">
                                            <p className="text-xs text-gray-400 mb-1">ยอดสั่งซื้อรวม</p>
                                            <p className="font-bold text-gray-900">-</p>
                                        </div>

                                        <Link
                                            href={`/vendors/${encodeURIComponent(vendor.name)}`}
                                            className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:border-[#FF9500] hover:bg-[#FF9500] hover:text-white transition-all flex items-center gap-2 text-sm font-medium whitespace-nowrap shadow-sm"
                                        >
                                            <Eye className="w-4 h-4" />
                                            ดูข้อมูล
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
