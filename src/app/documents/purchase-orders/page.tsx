'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { formatDateTh, formatMoney } from '@/lib/document-utils';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, Loader2, Truck } from 'lucide-react';
import Link from 'next/link';

export default function PurchaseOrdersPage() {
    const { token } = useAuth();
    const router = useRouter();
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (token) {
            loadData();
        }
    }, [token, search]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await api.getPurchaseOrders(token!);
            // Filter locally if needed, or pass search param if API supports it
            // Assuming API supports, or filter here:
            const filtered = data.filter((po: any) =>
                !search ||
                (po.poNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                (po.vendorName || '').toLowerCase().includes(search.toLowerCase()) ||
                (po.title || '').toLowerCase().includes(search.toLowerCase())
            );
            setPurchaseOrders(filtered);
        } catch (error) {
            console.error('Failed to load POs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="w-8 h-8 text-[#FF9500]" />
                        ใบสั่งซื้อ (Purchase Orders)
                    </h1>
                    <p className="text-gray-500">จัดการรายการสั่งซื้อสินค้าจากคู่ค้า</p>
                </div>
                <button
                    onClick={() => router.push('/documents/purchase-orders/new')} // We need to handle 'new' logic
                    className="flex items-center gap-2 px-4 py-2 bg-[#FF9500] text-white rounded-lg hover:bg-orange-600 transition shadow-sm font-medium"
                >
                    <Plus size={20} />
                    สร้างใบสั่งซื้อใหม่
                </button>
            </div>

            {/* Search & Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="ค้นหาเลขที่ PO, ชื่อผู้ขาย..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-[#FF9500] focus:border-[#FF9500]"
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#FF9500]" />
                </div>
            ) : purchaseOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-orange-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">ยังไม่มีใบสั่งซื้อ</h3>
                    <p className="text-gray-500 mt-1">เริ่มสร้างใบสั่งซื้อใบแรกของคุณเลย</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-700">เลขที่เอกสาร</th>
                                <th className="px-6 py-3 font-semibold text-gray-700">วันที่</th>
                                <th className="px-6 py-3 font-semibold text-gray-700">ผู้ขาย (Vendor)</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-right">ยอดรวม</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-center">สถานะ</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {purchaseOrders.map((po) => (
                                <tr key={po.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/documents/purchase-orders/${po.id}`)}>
                                    <td className="px-6 py-4 font-medium text-[#FF9500]">{po.poNumber || '-'}</td>
                                    <td className="px-6 py-4 text-gray-600">{formatDateTh(po.date)}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{po.vendorName || po.contact?.firstName || '-'}</td>
                                    <td className="px-6 py-4 text-gray-900 font-bold text-right">{formatMoney(po.grandTotal)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${po.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                po.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                                                    po.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                            }`}>
                                            {po.status === 'DRAFT' ? 'ฉบับร่าง' : po.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-gray-400 hover:text-[#FF9500]">
                                            <FileText size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
