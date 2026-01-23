'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { CompanyDetail, Contact, Deal } from '@/types';
import { motion } from 'framer-motion';
import {
  Building,
  Users,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

const stageColors = {
  QUALIFIED: 'bg-blue-100 text-blue-800',
  PROPOSAL: 'bg-yellow-100 text-yellow-800',
  NEGOTIATION: 'bg-orange-100 text-orange-800',
  CLOSED_WON: 'bg-green-100 text-green-800',
  CLOSED_LOST: 'bg-red-100 text-red-800',
};

const stageLabels = {
  QUALIFIED: 'ผ่านการตรวจสอบ',
  PROPOSAL: 'เสนอราคา',
  NEGOTIATION: 'เจรจา',
  CLOSED_WON: 'ปิดการขายสำเร็จ',
  CLOSED_LOST: 'ปิดการขายไม่สำเร็จ',
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contacts' | 'deals'>('contacts');

  const companyName = decodeURIComponent(params.companyName as string);

  useEffect(() => {
    if (token && companyName) {
      loadCompany();
    }
  }, [token, companyName]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const data = await api.getCompany(token!, companyName);
      setCompany(data);
    } catch (error) {
      console.error('Failed to load company:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">ไม่พบข้อมูลบริษัท</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Building className="w-6 h-6 text-gray-400" />
            {company.name}
          </h1>
          <p className="text-gray-600 mt-1">รายละเอียดบริษัทและข้อมูลการติดต่อ</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-xl border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">ผู้ติดต่อ</p>
              <p className="text-2xl font-bold text-gray-900">{company.summary.contactCount}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-xl border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">ดีลที่กำลังดำเนินการ</p>
              <p className="text-2xl font-bold text-gray-900">{company.summary.activeDealsCount}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-xl border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">ดีลที่เสร็จสิ้น</p>
              <p className="text-2xl font-bold text-gray-900">{company.summary.wonDealsCount}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-xl border border-gray-200"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">มูลค่ารวม</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(company.summary.totalDealsValue)}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'contacts'
                  ? 'text-[#007AFF] border-b-2 border-[#007AFF]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ผู้ติดต่อ ({company.contacts.length})
            </button>
            <button
              onClick={() => setActiveTab('deals')}
              className={`px-6 py-4 font-medium transition-colors ${
                activeTab === 'deals'
                  ? 'text-[#007AFF] border-b-2 border-[#007AFF]'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ดีลและใบเสนอราคา ({company.deals.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              {company.contacts.map((contact) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-semibold">
                      {contact.firstName[0]}{contact.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {contact.firstName} {contact.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{contact.jobTitle}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        {contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{contact._count?.deals || 0} ดีล</div>
                    <div>{contact._count?.activities || 0} กิจกรรม</div>
                  </div>
                </motion.div>
              ))}

              {company.contacts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>ไม่มีผู้ติดต่อสำหรับบริษัทนี้</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'deals' && (
            <div className="space-y-4">
              {company.deals.map((deal) => (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{deal.title}</h3>
                      <p className="text-sm text-gray-600">
                        ผู้ติดต่อ: {deal.contact?.firstName} {deal.contact?.lastName}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(deal.value)}
                      </div>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${stageColors[deal.stage as keyof typeof stageColors]}`}>
                        {stageLabels[deal.stage as keyof typeof stageLabels]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      สร้างเมื่อ {formatDate(deal.createdAt)}
                    </div>
                    {deal.probability && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        โอกาส {deal.probability}%
                      </div>
                    )}
                  </div>

                  {deal.items && deal.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-2">สินค้าในใบเสนอราคา:</p>
                      <div className="space-y-1">
                        {deal.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="text-sm text-gray-600 flex justify-between">
                            <span>{item.product?.name || item.name || 'สินค้า'}</span>
                            <span>{item.quantity} x {formatCurrency(item.price)}</span>
                          </div>
                        ))}
                        {deal.items.length > 3 && (
                          <div className="text-sm text-gray-500">
                            และอีก {deal.items.length - 3} รายการ
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {company.deals.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>ไม่มีดีลสำหรับบริษัทนี้</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
