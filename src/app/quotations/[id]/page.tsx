'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { api } from '@/lib/api';
import { Deal } from '@/types';
import { formatMoney, formatDateTh, getCompanyInfo } from '@/lib/document-utils';
import { bahttext } from '@/lib/bahttext';
import { DocumentsNav } from '@/components/documents/DocumentsNav';
import { DocumentHeader } from '@/components/documents/DocumentHeader';
import { SignatureBlock } from '@/components/documents/SignatureBlock';
import { DocumentLayout } from '@/components/documents/DocumentLayout';
import { Loader2, Printer, Save, Edit as Edit3, ArrowLeft, Globe, FileText, X, Palette, Package, CheckCircle } from 'lucide-react';

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

export default function QuotationPage() {
    const { id } = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const { settings } = useSettings();
    const [deal, setDeal] = useState<Deal | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isChangingStatus, setIsChangingStatus] = useState(false);
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


    const loadData = useCallback(async () => {
        if (!token) return;
        try {
            const dealData = await api.getDeal(token, id as string);
            if (!dealData.quotationNumber) {
                const updatedDeal = await api.generateQuotation(token, id as string);
                setDeal(updatedDeal);
                initEditFields(updatedDeal);
            } else {
                setDeal(dealData);
                initEditFields(dealData);
            }
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

    useEffect(() => { loadData(); }, [loadData]);

    const updateEditableItem = (id: string, field: keyof EditableItem, value: any) => {
        setEditableItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleSave = async () => {
        if (!token || !deal) return;
        const previousDeal = deal;
        const previousItems = editableItems;
        setDeal({ ...deal, ...editFields, items: editableItems.map(item => ({ ...deal.items?.find((i: any) => i.id === item.id), ...item })) as any });
        setIsEditMode(false);
        setIsSaving(true);
        try {
            const itemUpdatePromises = editableItems.map(item => api.updateDealItem(token, deal.id, item.id, {
                price: item.price,
                quantity: item.quantity,
                discount: item.discount,
                name: item.name,
                description: item.description
            }));
            await Promise.all([api.updateDeal(token, deal.id, editFields), ...itemUpdatePromises]);
            await loadData();
        } catch (error) {
            console.error('Failed to save:', error);
            setDeal(previousDeal);
            setEditableItems(previousItems);
            setIsEditMode(true);
            alert('บันทึกไม่สำเร็จ');
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmPurchase = async () => {
        if (!token || !deal) return;
        const confirmMsg = 'ยืนยันการสั่งซื้อ? ระบบจะยืนยันเอกสารและสร้างใบวางบิลให้อัตโนมัติ';

        const confirm = window.confirm(confirmMsg);
        if (!confirm) return;

        setIsApproving(true);
        try {
            // 1. Approve Quotation
            const updatedDeal = await api.approveQuotation(token, deal.id);
            console.log('Approval success:', updatedDeal);

            // Update local state immediately before attempting invoice
            setDeal(updatedDeal);

            // 2. Auto-create Invoice
            try {
                const invoice = await api.createInvoice(token, deal.id);
                router.push(`/invoices/${invoice.id}`);
            } catch (invError: any) {
                console.error('Auto-invoice failed:', invError);
                if (invError.invoiceId) {
                    router.push(`/invoices/${invError.invoiceId}`);
                } else {
                    alert('อนุมัติการสั่งซื้อสำเร็จ! แต่ไม่สามารถสร้างใบวางบิลอัตโนมัติได้ (ข้อมูลอาจยังไม่สมบูรณ์) กรุณากดปุ่ม "สร้างใบวางบิล" ด้วยตนเองด้านล่าง');
                    await loadData();
                }
            }

        } catch (error: any) {
            console.error('Approve failed:', error);
            alert(error.message || 'ไม่สามารถยืนยันคำสั่งซื้อได้');
            await loadData();
        } finally {
            setIsApproving(false);
        }
    };

    const handleConvertToInvoice = async () => {
        if (!token || !deal) return;
        setIsConverting(true);
        try {
            const invoice = await api.createInvoice(token, deal.id);
            router.push(`/invoices/${invoice.id}`);
        } catch (error: any) {
            console.error('Manual invoice conversion failed:', error);
            if (error.invoiceId) {
                router.push(`/invoices/${error.invoiceId}`);
            } else {
                alert(error.message || 'สร้างใบวางบิลไม่สำเร็จ กรุณาตรวจสอบข้อมูลรายการสินค้าหรือราคารวม');
            }
        } finally {
            setIsConverting(false);
        }
    };

    const handleConfirmQuotation = async () => {
        if (!token || !deal) return;
        setIsChangingStatus(true);
        try {
            const updatedDeal = await api.updateDeal(token, deal.id, { quotationStatus: 'SENT' });
            setDeal(updatedDeal);
            alert('ยืนยันใบเสนอราคาเรียบร้อย!');
        } catch (error: any) {
            alert(error.message || 'ยืนยันไม่สำเร็จ');
        } finally {
            setIsChangingStatus(false);
        }
    };

    const handleRevertToDraft = async () => {
        if (!token || !deal) return;
        setIsChangingStatus(true);
        try {
            const updatedDeal = await api.updateDeal(token, deal.id, { quotationStatus: 'DRAFT' });
            setDeal(updatedDeal);
            alert('เปลี่ยนเป็นฉบับร่างเรียบร้อย!');
        } catch (error: any) {
            alert(error.message || 'เปลี่ยนสถานะไม่สำเร็จ');
        } finally {
            setIsChangingStatus(false);
        }
    };

    const handleCancel = () => { if (deal) initEditFields(deal); setIsEditMode(false); };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    if (!deal) return <div className="p-8">Deal not found</div>;

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

    const itemsForCalc = isEditMode && editableItems.length > 0 ? editableItems.map(ei => ({ price: ei.price, quantity: ei.quantity, discount: ei.discount })) : deal.items || [];
    const subtotal = itemsForCalc.reduce((sum, item) => sum + (item.price * item.quantity), 0) || deal.value || 0;
    const itemDiscount = itemsForCalc.reduce((sum, item) => sum + (item.discount || 0), 0) || 0;
    const totalDiscount = itemDiscount + specialDiscount;
    const afterDiscount = subtotal - totalDiscount;
    const vatAmount = afterDiscount * (vatRate / 100);
    const grandTotal = afterDiscount + vatAmount;
    const whtAmount = afterDiscount * (whtRate / 100);
    const netTotal = grandTotal - whtAmount;

    const companyInfo = getCompanyInfo(settings, {}); // Placeholder for future doc usage
    const companyName = companyInfo.companyName;
    const companyAddress = companyInfo.companyAddress;
    const companyTaxId = companyInfo.companyTaxId;
    const companyPhone = companyInfo.companyPhone;
    const companyEmail = companyInfo.companyEmail;
    const bankAccount = companyInfo.bankAccount;
    const bankName = companyInfo.bankName;

    const contactFullName = `${deal.contact?.firstName || ''} ${deal.contact?.lastName || ''}`.trim() || '-';

    return (
        <>
            <style jsx global>{`
                @page { size: A4; margin: 0; }
                @media print {
                    body * { visibility: hidden; }
                    html, body { width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .quotation-paper, .quotation-paper * { visibility: visible !important; }
                    .quotation-paper { position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; min-height: 297mm !important; margin: 0 !important; padding: 6mm 8mm !important; box-shadow: none !important; font-size: 9pt !important; }
                    .no-print { display: none !important; }
                }
                .quotation-paper { font-family: 'Sarabun', 'Segoe UI', sans-serif; }
            `}</style>

            <div className="min-h-screen bg-gray-300 p-4 print:p-0 print:bg-white flex flex-col md:flex-row justify-center gap-6">
                <div className="flex flex-col gap-4 max-w-[210mm] w-full print:max-w-none">
                    <div className="no-print"><DocumentsNav dealId={deal.id} invoiceId={deal.invoice?.id} receiptId={deal.invoice?.receipt?.id} /></div>

                    {isEditMode && (
                        <div className="max-w-[210mm] mx-auto mb-4 bg-white rounded-xl shadow-lg p-6 no-print">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Edit3 size={20} /> แก้ไขใบเสนอราคา</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><Palette size={16} /> ธีมสี</label>
                                <div className="flex gap-2 flex-wrap">
                                    {THEME_COLORS.map(c => (<button key={c.value} onClick={() => setEditFields({ ...editFields, quotationThemeColor: c.value })} className={`w-10 h-10 rounded-lg border-2 transition ${editFields.quotationThemeColor === c.value ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c.value }} title={c.name} />))}
                                    <input type="color" value={editFields.quotationThemeColor} onChange={e => setEditFields({ ...editFields, quotationThemeColor: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
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
                                <div className="space-y-3">
                                    <h4 className="font-medium text-gray-800">การเงิน</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="text-xs text-gray-500">ส่วนลดพิเศษ (บาท)</label><input type="number" value={editFields.quotationDiscount} onChange={e => setEditFields({ ...editFields, quotationDiscount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                                        <div><label className="text-xs text-gray-500">เครดิต (วัน)</label><input type="number" value={editFields.creditTerm} onChange={e => setEditFields({ ...editFields, creditTerm: parseInt(e.target.value) || 30 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="text-xs text-gray-500">VAT (%)</label><input type="number" step="0.01" value={editFields.quotationVatRate} onChange={e => setEditFields({ ...editFields, quotationVatRate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                                        <div><label className="text-xs text-gray-500">หัก ณ ที่จ่าย (%)</label><input type="number" step="0.01" value={editFields.quotationWhtRate} onChange={e => setEditFields({ ...editFields, quotationWhtRate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                                    </div>
                                    <div><label className="text-xs text-gray-500">เงื่อนไขเพิ่มเติม</label><textarea placeholder="หมายเหตุและเงื่อนไขพิเศษ..." value={editFields.quotationTerms} onChange={e => setEditFields({ ...editFields, quotationTerms: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} /></div>
                                </div>
                            </div>
                            {editableItems.length > 0 && (
                                <div className="mt-6 border-t pt-4">
                                    <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2"><Package size={16} /> แก้ไขรายการสินค้า</h4>
                                    <table className="w-full text-sm">
                                        <thead><tr className="bg-gray-100"><th className="px-3 py-2 text-left">สินค้า/บริการ</th><th className="px-3 py-2 text-center w-24">จำนวน</th><th className="px-3 py-2 text-center w-32">ราคา/หน่วย</th><th className="px-3 py-2 text-center w-28">ส่วนลด</th><th className="px-3 py-2 text-right w-32">รวม</th></tr></thead>
                                        <tbody>{editableItems.map((item) => (<tr key={item.id} className="border-b"><td className="px-3 py-2"><div className="font-medium">{item.name}</div></td><td className="px-3 py-2"><input type="number" min="1" value={item.quantity} onChange={e => updateEditableItem(item.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-2 py-1 border rounded text-center" /></td><td className="px-3 py-2"><input type="number" min="0" value={item.price} onChange={e => updateEditableItem(item.id, 'price', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-right" /></td><td className="px-3 py-2"><input type="number" min="0" value={item.discount} onChange={e => updateEditableItem(item.id, 'discount', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-right" /></td><td className="px-3 py-2 text-right font-medium">{formatMoney((item.price * item.quantity) - item.discount)}</td></tr>))}</tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* A4 Paper - Exact Template Match */}
                    <DocumentLayout
                        companyInfo={companyInfo}
                        themeColor={themeColor}
                        paperClass="quotation-paper"
                    >

                        {/* HEADER */}
                        <DocumentHeader
                            companyInfo={companyInfo}
                            titleEn="Quotation"
                            titleTh="ใบเสนอราคา"
                            docNumber={deal.quotationNumber || '-'}
                            themeColor={themeColor || '#006B5A'}
                            showOriginal={true}
                        />

                        {/* INFO GRID */}
                        <div className="border mb-3" style={{ borderColor: themeColor }}>
                            <div className="grid grid-cols-2">
                                {/* Left Column - Customer Info */}
                                <div className="p-2 border-r text-[8pt]" style={{ borderColor: themeColor }}>
                                    <table className="w-full">
                                        <tbody>
                                            <tr><td className="font-bold py-0.5 w-[85px] align-top">ชื่อลูกค้า<br /><span className="font-normal text-gray-500 text-[7pt]">Customer Name</span></td><td className="py-0.5 font-medium">{customerName}</td></tr>
                                            <tr><td className="font-bold py-0.5 align-top">เลขที่ผู้เสียภาษี<br /><span className="font-normal text-gray-500 text-[7pt]">Tax ID</span></td><td className="py-0.5">{customerTaxId} (สำนักงานใหญ่)</td></tr>
                                            <tr><td className="font-bold py-0.5 align-top">ที่อยู่<br /><span className="font-normal text-gray-500 text-[7pt]">Address</span></td><td className="py-0.5 leading-tight">{customerAddress}<br /><span className="text-gray-600">โทร: {customerPhone}</span></td></tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Right Column - Document Info */}
                                <div className="p-2 text-[7.5pt]">
                                    <table className="w-full">
                                        <tbody>
                                            <tr>
                                                <td className="font-bold py-0.5 w-[65px] align-top whitespace-nowrap">วันที่<br /><span className="font-normal text-gray-500 text-[6pt]">Issue Date</span></td>
                                                <td className="py-0.5 w-[75px]">: {formatDateTh(deal.quotationDate)}</td>
                                                <td className="font-bold py-0.5 w-[60px] align-top whitespace-nowrap">พนักงานขาย<br /><span className="font-normal text-gray-500 text-[6pt]">Salesman</span></td>
                                                <td className="py-0.5 truncate max-w-[70px]">: {deal.owner?.name || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="font-bold py-0.5 align-top whitespace-nowrap">การชำระเงิน<br /><span className="font-normal text-gray-500 text-[6pt]">Credit Term</span></td>
                                                <td className="py-0.5">: {creditTermVal} วัน</td>
                                                <td className="font-bold py-0.5 align-top whitespace-nowrap">เบอร์ติดต่อ<br /><span className="font-normal text-gray-500 text-[6pt]">Contact No.</span></td>
                                                <td className="py-0.5 text-[7pt]">: {companyPhone}</td>
                                            </tr>
                                            <tr>
                                                <td className="font-bold py-0.5 align-top whitespace-nowrap">ผู้ติดต่อ<br /><span className="font-normal text-gray-500 text-[6pt]">Contact Name</span></td>
                                                <td className="py-0.5">: {contactFullName}</td>
                                                <td className="font-bold py-0.5 align-top whitespace-nowrap">อีเมล<br /><span className="font-normal text-gray-500 text-[6pt]">E-mail</span></td>
                                                <td className="py-0.5 text-[6.5pt] truncate max-w-[80px]">: {customerEmail}</td>
                                            </tr>
                                            <tr>
                                                <td className="font-bold py-0.5 align-top whitespace-nowrap">ชื่อโปรเจกต์<br /><span className="font-normal text-gray-500 text-[6pt]">Project Name</span></td>
                                                <td colSpan={3} className="py-0.5 font-bold">: {deal.title}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* ITEMS TABLE */}
                        <div className="flex-1 mb-1">
                            <table className="w-full border-collapse text-[8pt]">
                                <thead>
                                    <tr style={{ backgroundColor: themeColor }} className="text-white">
                                        <th className="py-2 px-2 w-[40px] text-center font-bold border-r border-white/30">เลขที่<br /><span className="font-normal text-[7pt]">No.</span></th>
                                        <th className="py-2 px-2 text-left font-bold border-r border-white/30">รายการ<br /><span className="font-normal text-[7pt]">Description</span></th>
                                        <th className="py-2 px-2 w-[55px] text-center font-bold border-r border-white/30">จำนวน<br /><span className="font-normal text-[7pt]">Quantity</span></th>
                                        <th className="py-2 px-2 w-[75px] text-right font-bold border-r border-white/30">ราคา/หน่วย<br /><span className="font-normal text-[7pt]">Unit Price</span></th>
                                        <th className="py-2 px-2 w-[65px] text-right font-bold border-r border-white/30">ส่วนลด<br /><span className="font-normal text-[7pt]">Discount</span></th>
                                        <th className="py-2 px-2 w-[85px] text-right font-bold">จำนวนเงิน (THB)<br /><span className="font-normal text-[7pt]">Amount</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deal.items && deal.items.length > 0 ? deal.items.map((item, idx) => {
                                        const editItem = isEditMode && editableItems.length > 0 ? editableItems.find(ei => ei.id === item.id) : null;
                                        const displayQty = editItem ? editItem.quantity : item.quantity;
                                        const displayPrice = editItem ? editItem.price : item.price;
                                        const displayDiscount = editItem ? editItem.discount : (item.discount || 0);
                                        return (
                                            <tr key={idx} className="border-b border-gray-300">
                                                <td className="py-2 px-2 text-center align-top border-r border-gray-200">{idx + 1}</td>
                                                <td className="py-2 px-2 align-top border-r border-gray-200">
                                                    <div className="font-medium">{item.product?.name || item.description}</div>
                                                    {item.product?.description && <div className="text-gray-500 text-[7pt] mt-0.5">{item.product.description}</div>}
                                                </td>
                                                <td className="py-2 px-2 text-center align-top border-r border-gray-200">{displayQty}</td>
                                                <td className="py-2 px-2 text-right align-top border-r border-gray-200">{formatMoney(displayPrice)}</td>
                                                <td className="py-2 px-2 text-right align-top border-r border-gray-200">{formatMoney(displayDiscount)}</td>
                                                <td className="py-2 px-2 text-right align-top font-medium">{formatMoney((displayPrice * displayQty) - displayDiscount)}</td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr className="border-b border-gray-300">
                                            <td className="py-2 px-2 text-center border-r border-gray-200">1</td>
                                            <td className="py-2 px-2 font-medium border-r border-gray-200">{deal.title}</td>
                                            <td className="py-2 px-2 text-center border-r border-gray-200">1</td>
                                            <td className="py-2 px-2 text-right border-r border-gray-200">{formatMoney(deal.value)}</td>
                                            <td className="py-2 px-2 text-right border-r border-gray-200">0.00</td>
                                            <td className="py-2 px-2 text-right">{formatMoney(deal.value)}</td>
                                        </tr>
                                    )}
                                    {Array.from({ length: Math.max(0, 5 - (deal.items?.length || 1)) }).map((_, i) => (
                                        <tr key={`e-${i}`} className="h-6 border-b border-gray-200"><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* BOTTOM SECTION */}
                        <div className="flex gap-3 mb-2">
                            {/* Left Side */}
                            <div className="flex-1 text-[8pt]">
                                {/* Amount in Words */}
                                <div className="flex border border-gray-300 mb-2">
                                    <div className="bg-gray-200 px-2 py-1 font-bold w-[70px]">จำนวนเงิน<br /><span className="font-normal text-gray-600 text-[7pt]">Amount</span></div>
                                    <div className="bg-gray-100 px-2 py-1 flex-1 font-medium">{bahttext(netTotal)}</div>
                                </div>

                                {/* Terms */}
                                <div className="mb-2">
                                    <div className="font-bold border-b border-gray-300 pb-0.5 mb-1">หมายเหตุและเงื่อนไข (Terms & Conditions)</div>
                                    <div className="text-[7pt] text-gray-700 leading-relaxed">
                                        {editFields.quotationTerms || deal.quotationTerms ? (
                                            <p className="whitespace-pre-wrap">{editFields.quotationTerms || deal.quotationTerms}</p>
                                        ) : (
                                            <>
                                                หากมีการเปลี่ยนแปลงรายละเอียดของสินค้า/บริการ อาจมีผลต่อราคาที่เสนอ<br />
                                                บริษัท ขอสงวนสิทธิ์ในการเปลี่ยนแปลงและแก้ไขโดยไม่ต้องแจ้งให้ทราบล่วงหน้า<br />
                                                หากยกเลิกคำสั่งซื้อหลังจากยืนยันแล้ว จะมีค่าอำเนียมการยกเลิก 10% ของราคารวม<br />
                                                การเปลี่ยนแปลงคำสั่งซื้อต้องแจ้งให้บริษัทฯ ทราบล่วงหน้าอย่างน้อย 7 วัน<br />
                                                หากชำระเงินล่าช้ากว่ากำหนด จะมีค่าปรับ 1.25 % ต่อเดือน หรือไม่เกิน 15% ต่อปี ของจ<br />
                                                ใบเสนอราคานี้ มีราคา 14 วัน
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Payment Info */}
                                <div className="text-[7pt]">
                                    <div className="font-bold mb-0.5">ช่องทางการชำระเงิน</div>
                                    <div className="text-gray-700">
                                        ธนาคาร : {bankName}<br />
                                        เลขบัญชี : {bankAccount}<br />
                                        ประเภทบัญชี (สะสมทรัพย์)<br />
                                        สามารถสแกนจ่าย(พร้อมเพย์เบอร์นี้เลย)
                                    </div>
                                </div>
                            </div>

                            {/* Right Side - Financial Summary */}
                            <div className="w-[220px]">
                                <table className="w-full text-[7.5pt] border-collapse">
                                    <tbody>
                                        <tr>
                                            <td className="bg-gray-100 p-1.5 font-bold border border-gray-300 whitespace-nowrap">รวมเป็นเงิน<br /><span className="font-normal text-gray-500 text-[6pt]">Total</span></td>
                                            <td className="p-1.5 text-right border border-gray-300 font-medium w-[85px]">{formatMoney(subtotal)}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 p-1.5 font-bold border border-gray-300 whitespace-nowrap">หักส่วนลดพิเศษ<br /><span className="font-normal text-gray-500 text-[6pt]">Special Discount</span></td>
                                            <td className="p-1.5 text-right border border-gray-300 text-red-600">{formatMoney(totalDiscount)}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 p-1.5 font-bold border border-gray-300 whitespace-nowrap">ยอดหลังหักส่วนลด<br /><span className="font-normal text-gray-500 text-[6pt]">After Discount</span></td>
                                            <td className="p-1.5 text-right border border-gray-300 font-medium">{formatMoney(afterDiscount)}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 p-1.5 font-bold border border-gray-300 whitespace-nowrap">ภาษี {vatRate}%<br /><span className="font-normal text-gray-500 text-[6pt]">VAT</span></td>
                                            <td className="p-1.5 text-right border border-gray-300">{formatMoney(vatAmount)}</td>
                                        </tr>
                                        <tr style={{ backgroundColor: themeColor }} className="text-white">
                                            <td className="p-2 font-bold text-[9pt] whitespace-nowrap">รวมทั้งสิ้น<br /><span className="font-normal text-[6pt]">Grand Total</span></td>
                                            <td className="p-2 text-right font-bold text-[10pt]">{formatMoney(grandTotal)}</td>
                                        </tr>
                                        {whtRate > 0 && (
                                            <tr>
                                                <td className="bg-white p-1.5 font-bold border border-gray-300 whitespace-nowrap">หัก ณ ที่จ่าย {whtRate}%<br /><span className="font-normal text-gray-500 text-[6pt]">Wht</span></td>
                                                <td className="p-1.5 text-right border border-gray-300 text-red-600">{formatMoney(whtAmount)}</td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td className="bg-white p-1.5 font-bold border border-gray-300 whitespace-nowrap">ยอดชำระ<br /><span className="font-normal text-gray-500 text-[6pt]">Total</span></td>
                                            <td className="p-1.5 text-right border border-gray-300 font-bold">{formatMoney(netTotal)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* GREEN SEPARATOR */}
                        {/* SIGNATURES */}
                        <SignatureBlock
                            companyInfo={companyInfo}
                            themeColor={themeColor}
                            leftLabel="ผู้อนุมัติสั่งซื้อ / Customer Signature"
                            leftDateLabel="วันที่ / Date ________________"
                            rightLabel="ผู้มีอำนาจลงนาม / Authorized Signature"
                            rightDate={deal.quotationStatus !== 'DRAFT' && deal.updatedAt ? formatDateTh(deal.updatedAt) : undefined}
                        />

                    </DocumentLayout>
                </div>

                {/* Right Toolbar */}
                <div className="no-print w-64 flex flex-col gap-4 sticky top-4 self-start">
                    <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-2">
                        <button onClick={() => router.back()} className="h-10 w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg shadow border border-gray-200"><ArrowLeft size={18} /> กลับ</button>
                        <button onClick={() => setLanguage(language === 'th' ? 'en' : 'th')} className="h-10 w-full flex items-center justify-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-50 transition border border-gray-200"><Globe size={18} /> {language === 'th' ? 'EN' : 'TH'}</button>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-2">
                        {/* Status Badge */}
                        {deal.quotationStatus === 'DRAFT' ? (
                            <div className="h-10 w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-lg border border-amber-200 shadow-sm font-medium">
                                📝 ฉบับร่าง (Draft)
                            </div>
                        ) : deal.quotationStatus === 'APPROVED' ? (
                            <div className="h-10 w-full flex items-center justify-center gap-2 bg-green-50 text-green-800 px-4 py-2 rounded-lg border border-green-200 shadow-sm font-medium">
                                <CheckCircle size={16} /> อนุมัติการสั่งซื้อแล้ว
                            </div>
                        ) : (
                            <div className="h-10 w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-lg border border-blue-200 shadow-sm font-medium">
                                <CheckCircle size={16} /> ยืนยันเอกสารแล้ว
                            </div>
                        )}

                        {isEditMode ? (
                            <>
                                <button onClick={handleCancel} className="h-10 w-full flex items-center justify-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition shadow"><X size={18} /> ยกเลิก</button>
                                <button onClick={handleSave} disabled={isSaving} className="h-10 w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow disabled:opacity-50">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} บันทึก</button>
                            </>
                        ) : (
                            <>
                                {/* Allow Edit only if DRAFT */}
                                {deal.quotationStatus === 'DRAFT' && (
                                    <button onClick={() => setIsEditMode(true)} className="h-10 w-full flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition shadow"><Edit3 size={18} /> แก้ไข</button>
                                )}

                                {/* Confirm/Revert Draft Buttons - Only if not yet customer approved (locked) */}
                                {!deal.quotationApproved && (
                                    <>
                                        {deal.quotationStatus === 'DRAFT' ? (
                                            <button onClick={handleConfirmQuotation} disabled={isChangingStatus} className="h-10 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow disabled:opacity-50">
                                                {isChangingStatus ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} ยืนยันเอกสาร
                                            </button>
                                        ) : (
                                            <button onClick={handleRevertToDraft} disabled={isChangingStatus} className="h-10 w-full flex items-center justify-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition shadow disabled:opacity-50">
                                                {isChangingStatus ? <Loader2 size={18} className="animate-spin" /> : '📝'} กลับเป็นฉบับร่าง
                                            </button>
                                        )}
                                    </>
                                )}

                                {/* Customer Approval / Purchase Confirmation Flow */}
                                {deal.invoice ? (
                                    <button onClick={() => router.push(`/invoices/${deal.invoice?.id}`)} className="h-10 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow"><FileText size={18} /> ดูใบวางบิล</button>
                                ) : (
                                    <>
                                        {(deal.quotationApproved || deal.quotationStatus === 'APPROVED') ? (
                                            <div className="h-10 w-full flex items-center justify-center gap-2 bg-green-50 text-green-800 px-4 py-2 rounded-lg border border-green-200 shadow-sm font-medium">✓ ยืนยันคำสั่งซื้อแล้ว</div>
                                        ) : (
                                            <button
                                                onClick={handleConfirmPurchase}
                                                disabled={isApproving}
                                                className={`h-10 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition shadow disabled:opacity-50 bg-emerald-600 text-white hover:bg-emerald-700`}
                                            >
                                                {isApproving ? <Loader2 size={18} className="animate-spin" /> : '✓'} ยืนยันคำสั่งซื้อ
                                            </button>
                                        )}

                                        {/* To Invoice Enabler */}
                                        <button
                                            onClick={handleConvertToInvoice}
                                            disabled={isConverting}
                                            className={`h-10 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition shadow disabled:opacity-50 ${(deal.quotationApproved || deal.quotationStatus === 'APPROVED') ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700 opacity-90'}`}
                                        >
                                            {isConverting ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} สร้างใบวางบิล
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                        <button onClick={() => window.print()} className="h-10 w-full flex items-center justify-center gap-2 text-white px-6 py-2 rounded-lg transition shadow bg-[#15803d] hover:bg-[#166534]"><Printer size={18} /> พิมพ์ / PDF</button>
                    </div>
                </div>
            </div>
        </>
    );
}
