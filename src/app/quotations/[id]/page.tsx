'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Deal } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { bahttext } from '@/lib/bahttext';
import { Loader2, Printer, ArrowLeft, Edit3, Save, X, Palette, Package, Globe } from 'lucide-react';

interface EditableFields {
    quotationCustomerName: string;
    quotationCustomerAddress: string;
    quotationCustomerTaxId: string;
    quotationCustomerPhone: string;
    quotationCustomerEmail: string;
    quotationDiscount: number;
    quotationVatRate: number;
    quotationWhtRate: number;
    quotationThemeColor: string;
    quotationTerms: string;
    creditTerm: number;
}

interface EditableItem {
    id: string;
    name: string;
    description: string;
    quantity: number;
    price: number;
    discount: number;
}

const THEME_COLORS = [
    { name: 'เขียว (Default)', value: '#006B5A' },
    { name: 'น้ำเงิน', value: '#1E40AF' },
    { name: 'ม่วง', value: '#7C3AED' },
    { name: 'แดง', value: '#DC2626' },
    { name: 'ส้ม', value: '#EA580C' },
    { name: 'ดำ', value: '#1F2937' },
];

type Language = 'th' | 'en';

const TRANSLATIONS: Record<Language, Record<string, string>> = {
    th: {
        quotation: 'ใบเสนอราคา',
        quotationTitle: 'Quotation',
        customerName: 'ชื่อลูกค้า',
        taxId: 'เลขผู้เสียภาษี',
        address: 'ที่อยู่',
        phone: 'โทร',
        date: 'วันที่',
        salesperson: 'พนักงาน',
        payment: 'ชำระเงิน',
        days: 'วัน',
        contactPerson: 'ผู้ติดต่อ',
        contactPhone: 'เบอร์ติดต่อ',
        email: 'อีเมล',
        project: 'โปรเจกต์',
        no: 'ลำดับ',
        description: 'รายการ',
        qty: 'จำนวน',
        unitPrice: 'ราคาหน่วย',
        discount: 'ส่วนลด',
        amount: 'จำนวนเงิน',
        subtotal: 'รวมเป็นเงิน',
        totalDiscount: 'หักส่วนลด',
        afterDiscount: 'ยอดหลังหักส่วนลด',
        vat: 'ภาษีมูลค่าเพิ่ม',
        grandTotal: 'ยอดรวม',
        wht: 'หัก ณ ที่จ่าย',
        netTotal: 'ยอดสุทธิ์',
        amountInWords: 'จำนวนเงิน',
        termsTitle: 'หมายเหตุและเงื่อนไข (Terms & Conditions):',
        paymentInfo: 'ข้อมูลการชำระเงิน:',
        bank: 'ธนาคาร',
        accountNo: 'เลขบัญชี',
        branch: 'สาขา',
        accountName: 'ชื่อบัญชี',
        customerSignature: 'ผู้อนุมัติลิขสิทธิ์ / Customer Signature',
        companyStamp: 'ตราประทับบริษัท',
        authorizedSignature: 'ผู้มีอำนาจลงนาม / Authorized Signature',
        dateLabel: 'วันที่ / Date',
        edit: 'แก้ไข',
        save: 'บันทึก',
        cancel: 'ยกเลิก',
        print: 'พิมพ์ / PDF',
        back: 'กลับ',
    },
    en: {
        quotation: 'Quotation',
        quotationTitle: 'Quotation',
        customerName: 'Customer',
        taxId: 'Tax ID',
        address: 'Address',
        phone: 'Tel',
        date: 'Date',
        salesperson: 'Sales Rep',
        payment: 'Payment',
        days: 'Days',
        contactPerson: 'Contact',
        contactPhone: 'Phone',
        email: 'Email',
        project: 'Project',
        no: 'No.',
        description: 'Description',
        qty: 'Qty',
        unitPrice: 'Unit Price',
        discount: 'Discount',
        amount: 'Amount',
        subtotal: 'Subtotal',
        totalDiscount: 'Discount',
        afterDiscount: 'After Discount',
        vat: 'VAT',
        grandTotal: 'Grand Total',
        wht: 'WHT',
        netTotal: 'Net Total',
        amountInWords: 'Amount',
        termsTitle: 'Terms & Conditions:',
        paymentInfo: 'Payment Information:',
        bank: 'Bank',
        accountNo: 'Account No',
        branch: 'Branch',
        accountName: 'Account Name',
        customerSignature: 'Customer Signature',
        companyStamp: 'Company Stamp',
        authorizedSignature: 'Authorized Signature',
        dateLabel: 'Date',
        edit: 'Edit',
        save: 'Save',
        cancel: 'Cancel',
        print: 'Print / PDF',
        back: 'Back',
    }
};

export default function QuotationPage() {
    const { id } = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const [deal, setDeal] = useState<Deal | null>(null);
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editFields, setEditFields] = useState<EditableFields>({
        quotationCustomerName: '',
        quotationCustomerAddress: '',
        quotationCustomerTaxId: '',
        quotationCustomerPhone: '',
        quotationCustomerEmail: '',
        quotationDiscount: 0,
        quotationVatRate: 7,
        quotationWhtRate: 0,
        quotationThemeColor: '#006B5A',
        quotationTerms: '',
        creditTerm: 30,
    });
    const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
    const [language, setLanguage] = useState<Language>('th');

    // Translation helper
    const t = (key: string) => TRANSLATIONS[language][key] || key;

    const loadData = useCallback(async () => {
        if (!token) return;
        try {
            const [dealData, settingsData] = await Promise.all([
                api.getDeal(token, id as string),
                api.getSettings(token)
            ]);

            if (!dealData.quotationNumber) {
                const updatedDeal = await api.generateQuotation(token, id as string);
                setDeal(updatedDeal);
                initEditFields(updatedDeal);
            } else {
                setDeal(dealData);
                initEditFields(dealData);
            }

            setSettings(settingsData as Record<string, any>);
        } catch (error) {
            console.error('Failed to load quotation data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [token, id]);

    const initEditFields = (d: Deal) => {
        setEditFields({
            quotationCustomerName: d.quotationCustomerName || d.contact?.company || `${d.contact?.firstName || ''} ${d.contact?.lastName || ''}`.trim(),
            quotationCustomerAddress: d.quotationCustomerAddress || d.contact?.address || '',
            quotationCustomerTaxId: d.quotationCustomerTaxId || d.contact?.taxId || '',
            quotationCustomerPhone: d.quotationCustomerPhone || d.contact?.phone || '',
            quotationCustomerEmail: d.quotationCustomerEmail || d.contact?.email || '',
            quotationDiscount: d.quotationDiscount || 0,
            quotationVatRate: d.quotationVatRate ?? 7,
            quotationWhtRate: d.quotationWhtRate ?? 0,
            quotationThemeColor: d.quotationThemeColor || '#006B5A',
            quotationTerms: d.quotationTerms || '',
            creditTerm: d.creditTerm || 30,
        });
        // Initialize editable items
        if (d.items && d.items.length > 0) {
            setEditableItems(d.items.map(item => ({
                id: item.id,
                name: item.product?.name || item.description || '',
                description: item.product?.description || '',
                quantity: item.quantity,
                price: item.price,
                discount: item.discount || 0,
            })));
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    const updateEditableItem = (id: string, field: keyof EditableItem, value: any) => {
        setEditableItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleSave = async () => {
        if (!token || !deal) return;
        setIsSaving(true);
        try {
            // Save deal fields
            await api.updateDeal(token, deal.id, editFields);

            // Save item changes
            for (const item of editableItems) {
                await api.updateDealItem(token, deal.id, item.id, {
                    price: item.price,
                    quantity: item.quantity,
                    discount: item.discount,
                });
            }

            // Reload to get fresh data
            await loadData();
            setIsEditMode(false);
        } catch (error) {
            console.error('Failed to save:', error);
            alert('บันทึกไม่สำเร็จ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (deal) initEditFields(deal);
        setIsEditMode(false);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!deal) return <div className="p-8">Deal not found</div>;

    // Use edit fields for display
    const customerName = isEditMode ? editFields.quotationCustomerName : (deal.quotationCustomerName || deal.contact?.company || `${deal.contact?.firstName || ''} ${deal.contact?.lastName || ''}`.trim() || '-');
    const customerAddress = isEditMode ? editFields.quotationCustomerAddress : (deal.quotationCustomerAddress || deal.contact?.address || '-');
    const customerTaxId = isEditMode ? editFields.quotationCustomerTaxId : (deal.quotationCustomerTaxId || deal.contact?.taxId || '-');
    const customerPhone = isEditMode ? editFields.quotationCustomerPhone : (deal.quotationCustomerPhone || deal.contact?.phone || '-');
    const customerEmail = isEditMode ? editFields.quotationCustomerEmail : (deal.quotationCustomerEmail || deal.contact?.email || '-');
    const themeColor = isEditMode ? editFields.quotationThemeColor : (deal.quotationThemeColor || '#006B5A');
    const vatRate = isEditMode ? editFields.quotationVatRate : (deal.quotationVatRate ?? 7);
    const whtRate = isEditMode ? editFields.quotationWhtRate : (deal.quotationWhtRate ?? 0);
    const specialDiscount = isEditMode ? editFields.quotationDiscount : (deal.quotationDiscount || 0);
    const creditTermVal = isEditMode ? editFields.creditTerm : (deal.creditTerm || 30);

    // Calculations - use editableItems when in edit mode
    const itemsForCalc = isEditMode && editableItems.length > 0
        ? editableItems.map(ei => ({ price: ei.price, quantity: ei.quantity, discount: ei.discount }))
        : deal.items || [];

    const subtotal = itemsForCalc.reduce((sum, item) => sum + (item.price * item.quantity), 0) || deal.value || 0;
    const itemDiscount = itemsForCalc.reduce((sum, item) => sum + (item.discount || 0), 0) || 0;
    const totalDiscount = itemDiscount + specialDiscount;
    const afterDiscount = subtotal - totalDiscount;
    const vatAmount = afterDiscount * (vatRate / 100);
    const grandTotal = afterDiscount + vatAmount;
    const whtAmount = afterDiscount * (whtRate / 100);
    const netTotal = grandTotal - whtAmount;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const companyInfo = settings.company_info || {};
    const companyName = language === 'th'
        ? (companyInfo.company_name_th || settings.company_name_th || 'บริษัท ตัวอย่าง จำกัด')
        : (companyInfo.company_name_en || companyInfo.company_name_th || 'Example Company Ltd.');
    const companyAddress = language === 'th'
        ? (companyInfo.company_address_th || settings.company_address_th || '69/43 หมู่ที่ 3 ตำบลบางเทา อำเภอถลาง จ.ภูเก็ต 11140')
        : (companyInfo.company_address_en || companyInfo.company_address_th || '69/43 Moo 3, Bang Tao, Thalang, Phuket 11140');
    const companyTaxId = companyInfo.company_tax_id || settings.company_tax_id || '0-1055-67026-44-6';
    const companyPhone = companyInfo.company_phone || settings.company_phone || '086-588-9024';
    const companyEmail = companyInfo.company_email || settings.company_email || 'info@company.com';
    const companyStamp = companyInfo.company_stamp || '';
    const bankAccount = companyInfo.bank_account || '';
    const bankName = companyInfo.bank_name || '';
    const bankBranch = companyInfo.bank_branch || '';

    return (
        <>
            <style jsx global>{`
                @page { 
                    size: A4; 
                    margin: 0; 
                }
                @media print {
                    /* Hide everything first */
                    body * {
                        visibility: hidden;
                    }
                    /* Reset body */
                    html, body {
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        overflow: visible !important;
                    }
                    /* Hide sidebar and layout wrapper */
                    aside, nav, header, .sidebar, [class*="Sidebar"], [class*="sidebar"] {
                        display: none !important;
                    }
                    /* Show only quotation paper and its children */
                    .quotation-paper, .quotation-paper * {
                        visibility: visible !important;
                    }
                    .quotation-paper {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 210mm !important;
                        min-height: 297mm !important;
                        max-height: 297mm !important;
                        margin: 0 !important;
                        padding: 8mm !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        font-size: 10px !important;
                        overflow: hidden !important;
                    }
                    /* Hide no-print elements */
                    .no-print, .no-print * {
                        display: none !important;
                        visibility: hidden !important;
                    }
                }
                .quotation-paper { font-family: 'Sarabun', 'Segoe UI', sans-serif; }
            `}</style>

            <div className="min-h-screen bg-gray-300 p-4 print:p-0 print:bg-white">
                {/* Toolbar */}
                <div className="max-w-[210mm] mx-auto mb-4 flex justify-between items-center no-print">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg shadow">
                        <ArrowLeft size={18} /> {t('back')}
                    </button>
                    <div className="flex gap-2">
                        {/* Language Toggle */}
                        <button
                            onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
                            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition border"
                        >
                            <Globe size={18} />
                            {language === 'th' ? 'EN' : 'TH'}
                        </button>

                        {isEditMode ? (
                            <>
                                <button onClick={handleCancel} className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition shadow">
                                    <X size={18} /> {t('cancel')}
                                </button>
                                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow disabled:opacity-50">
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {t('save')}
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setIsEditMode(true)} className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition shadow">
                                    <Edit3 size={18} /> {t('edit')}
                                </button>
                                <button onClick={() => window.print()} className="flex items-center gap-2 text-white px-6 py-2 rounded-lg transition shadow" style={{ backgroundColor: themeColor }}>
                                    <Printer size={18} /> {t('print')}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Edit Panel */}
                {isEditMode && (
                    <div className="max-w-[210mm] mx-auto mb-4 bg-white rounded-xl shadow-lg p-6 no-print">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Edit3 size={20} /> แก้ไขใบเสนอราคา</h3>

                        {/* Theme Color */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><Palette size={16} /> ธีมสี</label>
                            <div className="flex gap-2 flex-wrap">
                                {THEME_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setEditFields({ ...editFields, quotationThemeColor: c.value })}
                                        className={`w-10 h-10 rounded-lg border-2 transition ${editFields.quotationThemeColor === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c.value }}
                                        title={c.name}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={editFields.quotationThemeColor}
                                    onChange={e => setEditFields({ ...editFields, quotationThemeColor: e.target.value })}
                                    className="w-10 h-10 rounded-lg cursor-pointer"
                                    title="เลือกสีเอง"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Customer Info */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-800">ข้อมูลลูกค้า</h4>
                                <input type="text" placeholder="ชื่อลูกค้า/บริษัท" value={editFields.quotationCustomerName} onChange={e => setEditFields({ ...editFields, quotationCustomerName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                <textarea placeholder="ที่อยู่" value={editFields.quotationCustomerAddress} onChange={e => setEditFields({ ...editFields, quotationCustomerAddress: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" placeholder="เลขผู้เสียภาษี" value={editFields.quotationCustomerTaxId} onChange={e => setEditFields({ ...editFields, quotationCustomerTaxId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                    <input type="text" placeholder="โทรศัพท์" value={editFields.quotationCustomerPhone} onChange={e => setEditFields({ ...editFields, quotationCustomerPhone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                </div>
                                <input type="email" placeholder="อีเมล" value={editFields.quotationCustomerEmail} onChange={e => setEditFields({ ...editFields, quotationCustomerEmail: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                            </div>

                            {/* Financial */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-800">การเงิน</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500">ส่วนลดพิเศษ (บาท)</label>
                                        <input type="number" value={editFields.quotationDiscount} onChange={e => setEditFields({ ...editFields, quotationDiscount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">เครดิต (วัน)</label>
                                        <input type="number" value={editFields.creditTerm} onChange={e => setEditFields({ ...editFields, creditTerm: parseInt(e.target.value) || 30 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-gray-500">VAT (%)</label>
                                        <input type="number" step="0.01" value={editFields.quotationVatRate} onChange={e => setEditFields({ ...editFields, quotationVatRate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500">หัก ณ ที่จ่าย (%)</label>
                                        <input type="number" step="0.01" value={editFields.quotationWhtRate} onChange={e => setEditFields({ ...editFields, quotationWhtRate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">เงื่อนไขเพิ่มเติม</label>
                                    <textarea placeholder="หมายเหตุและเงื่อนไขพิเศษ..." value={editFields.quotationTerms} onChange={e => setEditFields({ ...editFields, quotationTerms: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
                                </div>
                            </div>
                        </div>

                        {/* Editable Items */}
                        {editableItems.length > 0 && (
                            <div className="mt-6 border-t pt-4">
                                <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                    <Package size={16} /> แก้ไขรายการสินค้า
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="px-3 py-2 text-left">สินค้า/บริการ</th>
                                                <th className="px-3 py-2 text-center w-24">จำนวน</th>
                                                <th className="px-3 py-2 text-center w-32">ราคา/หน่วย</th>
                                                <th className="px-3 py-2 text-center w-28">ส่วนลด</th>
                                                <th className="px-3 py-2 text-right w-32">รวม</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {editableItems.map((item, idx) => (
                                                <tr key={item.id} className="border-b">
                                                    <td className="px-3 py-2">
                                                        <div className="font-medium">{item.name}</div>
                                                        {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={e => updateEditableItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                            className="w-full px-2 py-1 border rounded text-center"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.price}
                                                            onChange={e => updateEditableItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 border rounded text-right"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.discount}
                                                            onChange={e => updateEditableItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                                                            className="w-full px-2 py-1 border rounded text-right"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-medium">
                                                        {formatCurrency((item.price * item.quantity) - item.discount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-50 font-bold">
                                                <td colSpan={4} className="px-3 py-2 text-right">รวมทั้งหมด:</td>
                                                <td className="px-3 py-2 text-right">
                                                    {formatCurrency(editableItems.reduce((sum, item) => sum + (item.price * item.quantity) - item.discount, 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* A4 Paper */}
                <div className="quotation-paper max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl rounded-sm p-10 text-[11px] text-gray-900 relative">

                    {/* ===== HEADER ===== */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex gap-3">
                            {(companyInfo.company_logo || settings.branding?.logo) ? (
                                <img src={companyInfo.company_logo || settings.branding?.logo} alt="Logo" className="w-12 h-12 object-contain" />
                            ) : (
                                <div className="w-12 h-12 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: themeColor }}>LOGO</div>
                            )}
                            <div className="text-[10px]">
                                <h1 className="text-sm font-bold" style={{ color: themeColor }}>{companyName}</h1>
                                <p className="text-gray-600 leading-snug max-w-[240px]">
                                    {companyAddress}<br />
                                    เลขที่ผู้เสียภาษี {companyTaxId} (สำนักงานใหญ่)<br />
                                    โทร: {companyPhone} | {companyEmail}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] text-gray-400 mb-1">Ready / Original</div>
                            <div className="text-white px-8 py-3 text-center" style={{ backgroundColor: themeColor }}>
                                <div className="text-xl font-bold">{t('quotationTitle')}</div>
                                <div className="text-xs -mt-0.5">{t('quotation')}</div>
                            </div>
                            <div className="mt-1 py-2 px-4 text-center border-2" style={{ borderColor: themeColor }}>
                                <span className="text-base font-bold" style={{ color: themeColor }}>{deal.quotationNumber}</span>
                            </div>
                        </div>
                    </div>

                    {/* ===== INFO GRID ===== */}
                    <table className="w-full border border-gray-400 mb-5 text-[9px]">
                        <tbody>
                            <tr>
                                <td className="border border-gray-300 p-2 w-[45%] align-top">
                                    <div className="grid grid-cols-[60px_1fr] gap-y-0.5">
                                        <span className="font-bold">{t('customerName')}</span>
                                        <span className="truncate">{customerName}</span>
                                        <span className="font-bold">{t('taxId')}</span>
                                        <span>{customerTaxId}</span>
                                        <span className="font-bold">{t('address')}</span>
                                        <span className="line-clamp-2 text-[8px]">{customerAddress}</span>
                                        <span className="font-bold">{t('phone')}</span>
                                        <span>{customerPhone}</span>
                                    </div>
                                </td>
                                <td className="border border-gray-300 p-2 w-[55%] align-top">
                                    <div className="grid grid-cols-[55px_1fr_55px_1fr] gap-y-0.5 gap-x-1 text-[9px]">
                                        <span className="font-bold">{t('date')}</span>
                                        <span>{formatDate(deal.quotationDate)}</span>
                                        <span className="font-bold">{t('salesperson')}</span>
                                        <span className="truncate">{deal.owner?.name || '-'}</span>
                                        <span className="font-bold">{t('payment')}</span>
                                        <span>{creditTermVal} {t('days')}</span>
                                        <span className="font-bold">{t('contactPhone')}</span>
                                        <span className="truncate">{customerPhone}</span>
                                        <span className="font-bold">{t('contactPerson')}</span>
                                        <span className="truncate">{deal.contact?.firstName} {deal.contact?.lastName}</span>
                                        <span className="font-bold">{t('email')}</span>
                                        <span className="truncate text-[8px]">{customerEmail}</span>
                                    </div>
                                    <div className="border-t border-gray-300 mt-1 pt-1 grid grid-cols-[55px_1fr]">
                                        <span className="font-bold">{t('project')}</span>
                                        <span className="font-medium truncate" style={{ color: themeColor }}>{deal.title}</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ===== ITEMS TABLE ===== */}
                    <table className="w-full border-collapse mb-5 text-[10px]">
                        <thead>
                            <tr style={{ backgroundColor: themeColor }} className="text-white">
                                <th className="border py-2 px-1 w-10 text-center" style={{ borderColor: themeColor }}>{t('no')}</th>
                                <th className="border py-2 px-2 text-left" style={{ borderColor: themeColor }}>{t('description')}</th>
                                <th className="border py-2 px-1 w-14 text-center" style={{ borderColor: themeColor }}>{t('qty')}</th>
                                <th className="border py-2 px-1 w-20 text-center" style={{ borderColor: themeColor }}>{t('unitPrice')}</th>
                                <th className="border py-2 px-1 w-16 text-center" style={{ borderColor: themeColor }}>{t('discount')}</th>
                                <th className="border py-2 px-1 w-20 text-center" style={{ borderColor: themeColor }}>{t('amount')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deal.items && deal.items.length > 0 ? (
                                deal.items.map((item, idx) => {
                                    // Get editable values if in edit mode
                                    const editItem = isEditMode && editableItems.length > 0
                                        ? editableItems.find(ei => ei.id === item.id)
                                        : null;
                                    const displayQty = editItem ? editItem.quantity : item.quantity;
                                    const displayPrice = editItem ? editItem.price : item.price;
                                    const displayDiscount = editItem ? editItem.discount : (item.discount || 0);

                                    return (
                                        <tr key={idx} className="border-b border-gray-200">
                                            <td className="border-x border-gray-200 py-2 px-1 text-center align-top">{idx + 1}</td>
                                            <td className="border-x border-gray-200 py-2 px-2 align-top">
                                                <div className="font-medium">{item.product?.name || item.description}</div>
                                                {item.product?.sku && (
                                                    <div className="text-gray-400 text-[8px]">SKU: {item.product.sku}</div>
                                                )}
                                                {item.product?.description && (
                                                    <div className="text-gray-500 text-[9px] mt-0.5">{item.product.description}</div>
                                                )}
                                            </td>
                                            <td className="border-x border-gray-200 py-2 px-1 text-center align-top">{displayQty}</td>
                                            <td className="border-x border-gray-200 py-2 px-1 text-right align-top">{formatCurrency(displayPrice)}</td>
                                            <td className="border-x border-gray-200 py-2 px-1 text-right align-top">{displayDiscount > 0 ? formatCurrency(displayDiscount) : '-'}</td>
                                            <td className="border-x border-gray-200 py-2 px-1 text-right align-top">{formatCurrency((displayPrice * displayQty) - displayDiscount)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr className="border-b border-gray-200">
                                    <td className="border-x border-gray-200 py-2 px-1 text-center">1</td>
                                    <td className="border-x border-gray-200 py-2 px-2 font-medium">{deal.title}</td>
                                    <td className="border-x border-gray-200 py-2 px-1 text-center">1</td>
                                    <td className="border-x border-gray-200 py-2 px-1 text-right">{formatCurrency(deal.value)}</td>
                                    <td className="border-x border-gray-200 py-2 px-1 text-right">-</td>
                                    <td className="border-x border-gray-200 py-2 px-1 text-right">{formatCurrency(deal.value)}</td>
                                </tr>
                            )}
                            {Array.from({ length: Math.max(0, 3 - (deal.items?.length || 1)) }).map((_, i) => (
                                <tr key={`e-${i}`} className="border-b border-gray-100 h-7">
                                    <td className="border-x border-gray-200" colSpan={6}></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* ===== BOTTOM SECTION ===== */}
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <div className="border border-gray-400 p-3 mb-3">
                                <div className="text-[9px] text-gray-500">{t('amountInWords')}</div>
                                <div className="font-bold text-sm mt-1">{language === 'th' ? bahttext(netTotal) : `${formatCurrency(netTotal)} Baht`}</div>
                            </div>
                            <div className="text-[9px] text-gray-600 space-y-0.5">
                                <div className="font-bold text-gray-800 mb-1">{t('termsTitle')}</div>
                                {editFields.quotationTerms || deal.quotationTerms ? (
                                    <p className="whitespace-pre-wrap">{editFields.quotationTerms || deal.quotationTerms}</p>
                                ) : (
                                    <>
                                        <p>{language === 'th' ? '1.ระยะเวลาดำเนินงาน 2-4 สัปดาห์ นับจากวันที่แจ้งยืนยันฯ' : '1. Delivery within 2-4 weeks from confirmation date'}</p>
                                        <p>{language === 'th' ? `2.ราคาดังกล่าว${vatRate > 0 ? 'ยังไม่รวม' : 'รวม'}ภาษีมูลค่าเพิ่ม ${vatRate}%` : `2. Prices ${vatRate > 0 ? 'exclude' : 'include'} ${vatRate}% VAT`}</p>
                                        <p className="mt-2">{language === 'th' ? 'ใบเสนอราคา ยืนราคา 30 วัน' : 'Quotation valid for 30 days'}</p>
                                    </>
                                )}
                                {(bankName || bankAccount) && (
                                    <div className="mt-3 pt-2 border-t border-gray-200">
                                        <p className="font-medium">{t('paymentInfo')}</p>
                                        {bankName && <p>{t('bank')}: {bankName}</p>}
                                        {bankAccount && <p>{t('accountNo')}: {bankAccount}</p>}
                                        {bankBranch && <p>{t('branch')}: {bankBranch}</p>}
                                        <p>{t('accountName')}: {companyName}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-[200px] border border-gray-300 text-[10px]">
                            <div className="flex justify-between p-2 border-b border-gray-200">
                                <span>{t('subtotal')}</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between p-2 border-b border-gray-200">
                                <div>{t('totalDiscount')}</div>
                                <span className="text-red-600">{formatCurrency(totalDiscount)}</span>
                            </div>
                            <div className="flex justify-between p-2 border-b border-gray-200 bg-gray-50">
                                <div>{t('afterDiscount')}</div>
                                <span className="font-bold">{formatCurrency(afterDiscount)}</span>
                            </div>
                            <div className="flex justify-between p-2 border-b border-gray-200">
                                <div>{t('vat')} {vatRate}%</div>
                                <span>{formatCurrency(vatAmount)}</span>
                            </div>
                            <div className="flex justify-between p-2 text-white" style={{ backgroundColor: themeColor }}>
                                <div className="font-bold">{t('grandTotal')}</div>
                                <span className="font-bold text-lg">{formatCurrency(grandTotal)}</span>
                            </div>
                            {whtRate > 0 && (
                                <div className="flex justify-between p-2 border-b border-gray-200">
                                    <div>{t('wht')} {whtRate}%</div>
                                    <span className="text-red-600">-{formatCurrency(whtAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between p-2 border-b-2 border-gray-400">
                                <div className="font-bold">{t('netTotal')}</div>
                                <span className="font-bold">{formatCurrency(netTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ===== SIGNATURES ===== */}
                    <div className="mt-16 pt-6 border-t border-gray-200">
                        <div className="flex justify-between items-end px-4">
                            <div className="text-center w-48">
                                <div className="border-b border-black h-16 mb-1"></div>
                                <div className="text-[10px]">{t('customerSignature')}</div>
                                <div className="text-[9px] text-gray-500 mt-2">{t('dateLabel')} &nbsp;&nbsp; ____/____/____</div>
                            </div>
                            <div className="text-center w-48">
                                <div className="border-2 border-dashed border-gray-300 h-28 rounded-lg flex items-center justify-center overflow-hidden">
                                    {companyStamp ? (
                                        <img src={companyStamp} alt="Company Stamp" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <span className="text-[10px] text-gray-400">{t('companyStamp')}</span>
                                    )}
                                </div>
                            </div>
                            <div className="text-center w-48">
                                <div className="border-b border-black h-16 mb-1"></div>
                                <div className="text-[10px]">{t('authorizedSignature')}</div>
                                <div className="text-[9px] text-gray-500 mt-2">{t('dateLabel')} &nbsp;&nbsp; {formatDate(deal.quotationDate)}</div>
                            </div>
                        </div>
                    </div>

                    {/* ===== FOOTER ===== */}
                    <div className="absolute bottom-0 left-0 right-0 text-white text-[8px] py-2 px-6 flex flex-col justify-center items-center text-center" style={{ backgroundColor: themeColor }}>
                        <span className="font-medium">{companyName}</span>
                        <span>{companyAddress} | {t('phone')}: {companyPhone}</span>
                    </div>
                </div>
            </div>
        </>
    );
}
