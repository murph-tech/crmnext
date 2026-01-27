'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { CompanyDetail } from '@/types';
import { motion } from 'framer-motion';
import {
    Building2,
    Users,
    DollarSign,
    TrendingUp,
    Phone,
    Mail,
    MapPin,
    Calendar,
    ArrowLeft,
    Truck,
    Package
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function VendorDetailPage() {
    const { token } = useAuth();
    const params = useParams();
    const router = useRouter();
    const [company, setCompany] = useState<CompanyDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Note: We use company name as ID for now
    const companyName = decodeURIComponent(params.id as string);

    useEffect(() => {
        if (token && companyName) {
            loadCompanyDetails();
        }
    }, [token, companyName]);

    const loadCompanyDetails = async () => {
        try {
            setLoading(true);
            // We use getCompany API. 
            // NOTE: If backend strict filter prevents finding VENDOR via this API, 
            // we might need to adjust backend logic or use a different endpoint.
            // Currently assuming getCompany/:name is generic enough.
            const data = await api.getCompany(token!, companyName);
            setCompany(data);
        } catch (error) {
            console.error('Failed to load vendor details:', error);
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-10 h-10 border-4 border-[#FF9500] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!company) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <Truck className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">ไม่พบข้อมูล Vendor</h2>
                <p className="text-gray-500 mb-6">ไม่พบข้อมูลบริษัท "{companyName}" ในระบบ</p>
                <Link href="/vendors" className="text-[#FF9500] hover:underline font-medium">
                    กลับหน้ารายชื่อ Vendor
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4">
            {/* Context Header */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Link href="/vendors" className="hover:text-[#FF9500] flex items-center gap-1 transition-colors">
                    <ArrowLeft size={14} />
                    กลับไปหน้ารายชื่อ
                </Link>
                <span>/</span>
                <span className="text-gray-900 font-medium truncate max-w-[200px]">{company.name}</span>
            </div>

            {/* Profile Header Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
            >
                <div className="h-32 bg-gradient-to-r from-[#FF9500] to-[#FF5E3A] relative">
                    <div className="absolute -bottom-10 left-8">
                        <div className="w-24 h-24 bg-white rounded-2xl p-1 shadow-lg">
                            <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-3xl font-bold text-gray-400">
                                {company.name.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-14 pb-8 px-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                                {company.name}
                                <span className="text-xs px-2 py-1 bg-orange-100 text-[#FF9500] rounded-full uppercase tracking-wide font-bold">
                                    Vendor
                                </span>
                            </h1>
                            <div className="flex flex-wrap gap-4 text-gray-600 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <MapPin size={16} />
                                    <span>{company.contacts[0]?.address || 'กรุงเทพมหานคร, ประเทศไทย'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={16} />
                                    <span>เป็นคู่ค้าตั้งแต่ {new Date(company.contacts[0]?.createdAt).toLocaleDateString('th-TH')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">
                                แก้ไขข้อมูล
                            </button>
                            <button
                                onClick={() => router.push(`/documents/purchase-orders/new?vendorName=${encodeURIComponent(company.name)}`)}
                                className="px-4 py-2 bg-[#FF9500] text-white font-medium rounded-xl hover:bg-orange-600 shadow-sm transition-colors flex items-center gap-2"
                            >
                                <Package size={18} />
                                เปิดใบสั่งซื้อ (PO)
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Stats & Info */}
                <div className="space-y-6">
                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"
                    >
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <TrendingUp size={20} className="text-[#FF9500]" />
                            ภาพรวมการสั่งซื้อ
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <span className="text-sm text-gray-600">ยอดซื้อสะสม (Total Val)</span>
                                <span className="font-bold text-gray-900">{formatCurrency(company.summary.totalDealsValue)}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <span className="text-sm text-gray-600">PO ที่เปิดอยู่</span>
                                <span className="font-bold text-[#FF9500]">{company.summary.activeDealsCount}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <span className="text-sm text-gray-600">PO ที่เสร็จสิ้น</span>
                                <span className="font-bold text-green-600">{company.summary.wonDealsCount}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Contact List */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"
                    >
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Users size={20} className="text-[#FF9500]" />
                            ผู้ติดต่อ ({company.contacts.length})
                        </h3>
                        <div className="space-y-4">
                            {company.contacts.map((contact) => (
                                <div key={contact.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group border border-transparent hover:border-gray-100">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-medium group-hover:from-orange-100 group-hover:to-red-100 group-hover:text-orange-600 transition-all">
                                        {contact.firstName.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">
                                            {contact.firstName} {contact.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{contact.jobTitle || 'No Job Title'}</p>
                                        <div className="flex gap-3 mt-1.5">
                                            {contact.phone && (
                                                <a href={`tel:${contact.phone}`} className="text-xs text-gray-400 hover:text-[#FF9500] flex items-center gap-1">
                                                    <Phone size={12} /> {contact.phone}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Activities / History */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm min-h-[400px]"
                    >
                        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">ประวัติกิจกรรม & ใบสั่งซื้อ</h3>
                            <div className="flex gap-2">
                                <button className="text-xs font-medium text-[#FF9500] bg-orange-50 px-3 py-1.5 rounded-lg">ทั้งหมด</button>
                                <button className="text-xs font-medium text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-lg">PO</button>
                                <button className="text-xs font-medium text-gray-500 hover:bg-gray-50 px-3 py-1.5 rounded-lg">Notes</button>
                            </div>
                        </div>

                        <div className="p-8 text-center text-gray-500">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package size={24} className="text-gray-300" />
                            </div>
                            <p>ยังไม่มีประวัติกิจกรรมหรือใบสั่งซื้อในขณะนี้</p>
                        </div>

                    </motion.div>
                </div>

            </div>
        </div>
    );
}
