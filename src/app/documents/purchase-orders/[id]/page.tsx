'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { api } from '@/lib/api';
import { formatMoney, formatDateTh, getCompanyInfo, getTranslation, Language } from '@/lib/document-utils';
import { bahttext } from '@/lib/bahttext';
import { SignatureBlock } from '@/components/documents/SignatureBlock';
import { DocumentLayout } from '@/components/documents/DocumentLayout';
import { DocumentHeader } from '@/components/documents/DocumentHeader'; // Reuse header
import { Loader2, Printer, Save, Edit as Edit3, ArrowLeft, Globe, FileText, X, Palette, Package, CheckCircle, Trash2, Plus } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

// Interfaces similar to Quotation but for PO
interface EditableFields {
    vendorName: string;
    vendorAddress: string;
    vendorTaxId: string;
    vendorPhone: string;
    vendorEmail: string;

    // Financials
    discount: number;
    vatRate: number;
    // whtRate: number; // Optional

    // Meta
    themeColor: string;
    terms: string;
    notes: string;
    date: string; // ISO Date
    expectedDate: string;
}

interface EditableItem {
    id: string; // temp id or real id
    name: string;
    description: string;
    quantity: number;
    price: number; // unitPrice
    discount: number;
}

const THEME_COLORS = [
    { name: 'ส้ม (Default)', value: '#FF9500' },
    { name: 'เขียว', value: '#006B5A' },
    { name: 'น้ำเงิน', value: '#1E40AF' },
    { name: 'แดง', value: '#DC2626' },
    { name: 'ดำ', value: '#1F2937' },
];

export default function PurchaseOrderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token, user } = useAuth();
    const { settings } = useSettings();
    const { addToast } = useToast();

    // Data State
    const [po, setPo] = useState<any>(null); // Purchase Order Object
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [language, setLanguage] = useState<Language>('th');

    // Dialogs
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Form State
    const [formData, setFormData] = useState<EditableFields>({
        vendorName: '',
        vendorAddress: '',
        vendorTaxId: '',
        vendorPhone: '',
        vendorEmail: '',
        discount: 0,
        vatRate: 7,
        themeColor: '#FF9500',
        terms: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        expectedDate: '',
    });
    const [items, setItems] = useState<EditableItem[]>([]);

    // Load Data
    const loadData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            if (id === 'new') {
                // Initialize for new PO
                // Check queries for pre-fill (e.g. from vendor page)
                const vendorName = searchParams.get('vendorName');
                if (vendorName) {
                    try {
                        const vendor = await api.getCompany(token, vendorName);
                        // Pre-fill vendor info
                        const contact = vendor.contacts?.[0];
                        setFormData(prev => ({
                            ...prev,
                            vendorName: vendor.name,
                            vendorAddress: contact?.address || '',
                            vendorTaxId: contact?.taxId || '',
                            vendorPhone: contact?.phone || '',
                            vendorEmail: contact?.email || '',
                        }));
                    } catch (e) { console.warn('Vendor fetch failed', e); }
                }
                setEditMode(true);
                setItems([{ id: 'temp-1', name: '', description: '', quantity: 1, price: 0, discount: 0 }]);
            } else {
                // Load existing PO
                const data = await api.getPurchaseOrder(token, id as string);
                setPo(data);
                initForm(data);
            }
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'ไม่สามารถโหลดข้อมูลได้' });
        } finally {
            setLoading(false);
        }
    }, [token, id, searchParams]);

    useEffect(() => { loadData(); }, [loadData]);

    const initForm = (data: any) => {
        setFormData({
            vendorName: data.vendorName || '',
            vendorAddress: data.vendorAddress || '',
            vendorTaxId: data.vendorTaxId || '',
            vendorPhone: data.vendorPhone || '',
            vendorEmail: data.vendorEmail || '',
            discount: data.discount || 0,
            vatRate: data.vatRate ?? 7,
            themeColor: data.themeColor || '#FF9500',
            terms: data.terms || '',
            notes: data.notes || '',
            date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            expectedDate: data.expectedDate ? new Date(data.expectedDate).toISOString().split('T')[0] : '',
        });

        if (data.items && data.items.length > 0) {
            setItems(data.items.map((i: any) => ({
                id: i.id,
                name: i.description, // Mapping description to name for UI consistency
                description: '',
                quantity: i.quantity,
                price: i.unitPrice,
                discount: i.discount
            })));
        } else {
            setItems([{ id: 'temp-1', name: '', description: '', quantity: 1, price: 0, discount: 0 }]);
        }
    };

    // Handlers
    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        try {
            // Calculate totals
            const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const itemDiscounts = items.reduce((sum, item) => sum + item.discount, 0);
            const totalDiscount = itemDiscounts + formData.discount;
            const afterDiscount = subtotal - totalDiscount;
            const vatAmount = afterDiscount * (formData.vatRate / 100);
            const grandTotal = afterDiscount + vatAmount;

            const payload = {
                ...formData,
                items: items.map(i => ({
                    description: i.name, // Use name as primary description
                    quantity: i.quantity,
                    unitPrice: i.price,
                    discount: i.discount
                })),
                subtotal,
                discount: formData.discount, // Special discount
                vatAmount,
                grandTotal
            };

            let savedPo;
            if (id === 'new') {
                savedPo = await api.createPurchaseOrder(token, payload);
                addToast({ type: 'success', message: 'สร้างใบสั่งซื้อสำเร็จ' });
                router.replace(`/documents/purchase-orders/${savedPo.id}`);
            } else {
                savedPo = await api.updatePurchaseOrder(token, id as string, payload);
                addToast({ type: 'success', message: 'บันทึกข้อมูลสำเร็จ' });
                // Reload to sync
                setPo(savedPo);
                initForm(savedPo);
                setEditMode(false);
            }

        } catch (error: any) {
            console.error(error);
            addToast({ type: 'error', message: 'บันทึกไม่สำเร็จ', description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!token || !po) return;
        try {
            await api.deletePurchaseOrder(token, po.id);
            addToast({ type: 'success', message: 'ลบเอกสารสำเร็จ' });
            router.push('/documents/purchase-orders');
        } catch (error) {
            addToast({ type: 'error', message: 'ลบเอกสารไม่สำเร็จ' });
        }
    };

    // Item Management
    const addItem = () => {
        setItems([...items, { id: `temp-${Date.now()}`, name: '', description: '', quantity: 1, price: 0, discount: 0 }]);
    };
    const updateItem = (idx: number, field: keyof EditableItem, val: any) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: val };
        setItems(newItems);
    };
    const removeItem = (idx: number) => {
        const newItems = items.filter((_, i) => i !== idx);
        setItems(newItems);
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="w-8 h-8 animate-spin text-[#FF9500]" /></div>;
    if (!po && id !== 'new') return <div className="p-8">Document not found</div>;

    // Derived values for display
    const currentItems = editMode ? items : (po?.items?.map((i: any) => ({
        id: i.id, name: i.description, quantity: i.quantity, price: i.unitPrice, discount: i.discount
    })) || []);

    // Recalculate Logic (Same as Quotation)
    const subtotal = currentItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const itemDiscount = currentItems.reduce((sum: number, item: any) => sum + (item.discount || 0), 0);
    const specialDiscount = editMode ? formData.discount : (po?.discount || 0);
    const totalDiscount = itemDiscount + specialDiscount;
    const afterDiscount = subtotal - totalDiscount;
    const vatRate = editMode ? formData.vatRate : (po?.vatRate || 7);
    const vatAmount = afterDiscount * (vatRate / 100);
    const grandTotal = afterDiscount + vatAmount;

    // Company Info
    const companyInfo = getCompanyInfo(settings, {});

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

            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDelete}
                title="ยืนยันการลบเอกสาร"
                description="คุณต้องการลบใบสั่งซื้อนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"
                confirmText="ลบเอกสาร"
                type="danger"
            />

            <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white flex flex-col md:flex-row justify-center gap-6">

                {/* Main Paper Content */}
                <div className="flex flex-col gap-4 max-w-[210mm] w-full print:max-w-none">

                    {/* Toolbar (Mobile/Top) */}
                    <div className="no-print flex items-center gap-4 mb-2">
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900"><ArrowLeft size={20} /> กลับ</button>
                        <h1 className="text-xl font-bold flex-1">{id === 'new' ? 'สร้างใบสั่งซื้อใหม่' : `ใบสั่งซื้อ #${po?.poNumber}`}</h1>
                    </div>

                    {/* Edit Form */}
                    {editMode && (
                        <div className="bg-white rounded-xl shadow-lg p-6 no-print border border-orange-100">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-600"><Edit3 size={20} /> แก้ไขข้อมูลใบสั่งซื้อ</h3>

                            {/* Theme & Meta */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">วันที่เอกสาร</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ธีมสี</label>
                                    <div className="flex gap-2">
                                        {THEME_COLORS.map(c => (
                                            <button
                                                key={c.value}
                                                onClick={() => setFormData({ ...formData, themeColor: c.value })}
                                                className={`w-8 h-8 rounded-full border-2 ${formData.themeColor === c.value ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: c.value }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Vendor Info */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-gray-800 border-b pb-1">ข้อมูลผู้ขาย (Vendor)</h4>
                                    <input placeholder="ชื่อบริษัทผู้ขาย" value={formData.vendorName} onChange={e => setFormData({ ...formData, vendorName: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" />
                                    <textarea placeholder="ที่อยู่" value={formData.vendorAddress} onChange={e => setFormData({ ...formData, vendorAddress: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" rows={2} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input placeholder="เลขผู้เสียภาษี" value={formData.vendorTaxId} onChange={e => setFormData({ ...formData, vendorTaxId: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" />
                                        <input placeholder="เบอร์โทรศัพท์" value={formData.vendorPhone} onChange={e => setFormData({ ...formData, vendorPhone: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" />
                                    </div>
                                    <input placeholder="อีเมล" value={formData.vendorEmail} onChange={e => setFormData({ ...formData, vendorEmail: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" />
                                </div>

                                {/* Terms & Financials */}
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-gray-800 border-b pb-1">เงื่อนไข & การเงิน</h4>
                                    <textarea placeholder="หมายเหตุ / เงื่อนไขการชำระเงิน..." value={formData.terms} onChange={e => setFormData({ ...formData, terms: e.target.value })} className="w-full px-3 py-2 border rounded text-sm" rows={3} />

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-gray-500">ส่วนลดท้ายบิล</label>
                                            <input type="number" value={formData.discount} onChange={e => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">VAT (%)</label>
                                            <input type="number" value={formData.vatRate} onChange={e => setFormData({ ...formData, vatRate: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Edit */}
                            <div className="mt-6 border-t pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-gray-800">รายการสินค้า</h4>
                                    <button onClick={addItem} className="text-sm text-blue-600 hover:underline flex items-center gap-1"><Plus size={16} /> เพิ่มรายการ</button>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-600">
                                            <th className="px-2 py-1 text-left">รายการ</th>
                                            <th className="px-2 py-1 w-20 text-center">จำนวน</th>
                                            <th className="px-2 py-1 w-24 text-right">ราคา/หน่วย</th>
                                            <th className="px-2 py-1 w-24 text-right">ส่วนลด</th>
                                            <th className="px-2 py-1 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {items.map((item, idx) => (
                                            <tr key={item.id}>
                                                <td className="px-2 py-2"><input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="w-full px-2 py-1 border rounded" placeholder="ชื่อสินค้า..." /></td>
                                                <td className="px-2 py-2"><input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-center" /></td>
                                                <td className="px-2 py-2"><input type="number" value={item.price} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-right" /></td>
                                                <td className="px-2 py-2"><input type="number" value={item.discount} onChange={e => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1 border rounded text-right" /></td>
                                                <td className="px-2 py-2 text-center text-red-500 cursor-pointer" onClick={() => removeItem(idx)}><Trash2 size={16} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Paper Preview */}
                    <DocumentLayout
                        companyInfo={companyInfo}
                        themeColor={editMode ? formData.themeColor : po?.themeColor}
                        paperClass="quotation-paper" // reuse same css class
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-4">
                                {companyInfo.companyLogo ? (
                                    <img src={companyInfo.companyLogo} alt="Logo" className="h-16 w-auto object-contain" />
                                ) : (
                                    <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">NO LOGO</div>
                                )}
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">{companyInfo.companyName}</h2>
                                    <p className="text-[8pt] text-gray-600 whitespace-pre-line leading-tight">
                                        {companyInfo.companyAddress}<br />
                                        เลขประจำตัวผู้เสียภาษี: {companyInfo.companyTaxId} <br />
                                        โทร: {companyInfo.companyPhone} {companyInfo.companyEmail && `อีเมล: ${companyInfo.companyEmail}`}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h1 className="text-2xl font-bold uppercase tracking-wide" style={{ color: editMode ? formData.themeColor : (po?.themeColor || '#FF9500') }}>
                                    ใบสั่งซื้อ<br />
                                    <span className="text-sm font-normal opacity-75">PURCHASE ORDER</span>
                                </h1>
                                <div className="mt-2 text-[9pt]">
                                    <div className="flex justify-end gap-2">
                                        <span className="font-bold text-gray-600">เลขที่เอกสาร:</span>
                                        <span className="font-medium text-gray-900">{po?.poNumber || 'DRAFT'}</span>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <span className="font-bold text-gray-600">วันที่:</span>
                                        <span className="font-medium text-gray-900">{formatDateTh(editMode ? formData.date : po?.date)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Vendor & Info Block */}
                        <div className="border border-gray-300 mb-4 flex text-[9pt]">
                            <div className="w-[60%] border-r border-gray-300 p-3">
                                <h3 className="font-bold bg-gray-100 px-2 py-0.5 mb-2 -mx-3 -mt-3 border-b border-gray-300 w-[calc(100%+24px)]">ถึง (Vendor)</h3>
                                <div className="pl-1">
                                    <div className="font-bold text-[10pt] mb-1">{editMode ? formData.vendorName : po?.vendorName}</div>
                                    <div className="text-gray-600 whitespace-pre-line leading-tight">
                                        {editMode ? formData.vendorAddress : po?.vendorAddress || '-'}
                                    </div>
                                    <div className="mt-2 flex gap-4">
                                        <div><span className="font-bold">โทร:</span> {editMode ? formData.vendorPhone : po?.vendorPhone || '-'}</div>
                                        <div><span className="font-bold">Tax ID:</span> {editMode ? formData.vendorTaxId : po?.vendorTaxId || '-'}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="w-[40%] p-3">
                                <h3 className="font-bold bg-gray-100 px-2 py-0.5 mb-2 -mx-3 -mt-3 border-b border-gray-300 w-[calc(100%+24px)]">รายละเอียด</h3>
                                <table className="w-full">
                                    <tbody>
                                        <tr>
                                            <td className="font-bold py-1 w-[80px]">วันที่ส่งของ:</td>
                                            <td>{editMode ? formData.expectedDate : (po?.expectedDate ? formatDateTh(po.expectedDate) : '-')}</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold py-1">เงื่อนไข:</td>
                                            <td>{editMode ? formData.terms : po?.terms || '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold py-1">ผู้ติดต่อ:</td>
                                            <td>{po?.contact?.firstName ? `${po.contact.firstName} ${po.contact.lastName || ''}` : '-'}</td>
                                        </tr>
                                        <tr>
                                            <td className="font-bold py-1">ผู้ออกเอกสาร:</td>
                                            <td>{user?.name || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="flex-1">
                            <table className="w-full text-[9pt] border-collapse relative z-10">
                                <thead>
                                    <tr style={{ backgroundColor: editMode ? formData.themeColor : (po?.themeColor || '#FF9500'), color: 'white' }}>
                                        <th className="py-2 px-2 text-center w-[50px] font-bold border-r border-white/20">ลำดับ</th>
                                        <th className="py-2 px-2 text-left font-bold border-r border-white/20">รายการสินค้า / รายละเอียด</th>
                                        <th className="py-2 px-2 text-center w-[60px] font-bold border-r border-white/20">จำนวน</th>
                                        <th className="py-2 px-2 text-right w-[90px] font-bold border-r border-white/20">ราคา/หน่วย</th>
                                        <th className="py-2 px-2 text-right w-[90px] font-bold">จำนวนเงิน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((item: any, idx: number) => (
                                        <tr key={idx} className="border-b border-gray-200">
                                            <td className="py-2 px-2 text-center align-top border-r border-gray-200">{idx + 1}</td>
                                            <td className="py-2 px-2 text-left align-top border-r border-gray-200">
                                                <div className="font-medium">{item.name}</div>
                                                {item.description && <div className="text-gray-500 text-[8pt]">{item.description}</div>}
                                            </td>
                                            <td className="py-2 px-2 text-center align-top border-r border-gray-200">{item.quantity}</td>
                                            <td className="py-2 px-2 text-right align-top border-r border-gray-200">{formatMoney(item.price)}</td>
                                            <td className="py-2 px-2 text-right align-top">{formatMoney((item.price * item.quantity) - (item.discount || 0))}</td>
                                        </tr>
                                    ))}
                                    {/* Empty Rows Filler */}
                                    {Array.from({ length: Math.max(0, 8 - currentItems.length) }).map((_, i) => (
                                        <tr key={`empty-${i}`} className="border-b border-gray-200 h-[30px]">
                                            <td className="border-r border-gray-200"></td>
                                            <td className="border-r border-gray-200"></td>
                                            <td className="border-r border-gray-200"></td>
                                            <td className="border-r border-gray-200"></td>
                                            <td></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Totals */}
                        <div className="flex gap-4 mt-4 relative z-20 break-inside-avoid">
                            {/* Left Text */}
                            <div className="flex-1 text-[9pt]">
                                <div className="font-bold mb-1">จำนวนเงินตัวอักษร:</div>
                                <div className="bg-gray-100 p-2 rounded mb-3 font-medium text-center">
                                    {bahttext(grandTotal)}
                                </div>
                                <div className="font-bold mb-1">หมายเหตุ:</div>
                                <div className="text-gray-600 whitespace-pre-wrap border border-gray-200 p-2 rounded min-h-[60px]">
                                    {editMode ? formData.notes : po?.notes || '-'}
                                </div>
                            </div>

                            {/* Right Totals */}
                            <div className="w-[250px]">
                                <table className="w-full text-[9pt]">
                                    <tbody>
                                        <tr>
                                            <td className="py-1 px-2 font-bold text-gray-600 text-right">รวมเป็นเงิน</td>
                                            <td className="py-1 px-2 text-right font-medium">{formatMoney(subtotal)}</td>
                                        </tr>
                                        {totalDiscount > 0 && (
                                            <tr>
                                                <td className="py-1 px-2 font-bold text-gray-600 text-right">หักส่วนลด</td>
                                                <td className="py-1 px-2 text-right text-red-600">-{formatMoney(totalDiscount)}</td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td className="py-1 px-2 font-bold text-gray-600 text-right">จำนวนเงินหลังหักส่วนลด</td>
                                            <td className="py-1 px-2 text-right font-medium">{formatMoney(afterDiscount)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-1 px-2 font-bold text-gray-600 text-right">ภาษีมูลค่าเพิ่ม 7%</td>
                                            <td className="py-1 px-2 text-right">{formatMoney(vatAmount)}</td>
                                        </tr>
                                        <tr className="bg-gray-100 border-t border-gray-300">
                                            <td className="py-2 px-2 font-bold text-black text-right text-[10pt]">จำนวนเงินทั้งสิ้น</td>
                                            <td className="py-2 px-2 text-right font-bold text-black text-[10pt]">{formatMoney(grandTotal)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="mt-8 grid grid-cols-2 gap-8 break-inside-avoid">
                            <div className="text-center">
                                <div className="border-b border-black mb-2 h-20"></div>
                                <div className="font-bold">ผู้สั่งซื้อสินค้า</div>
                                <div className="text-xs mt-1">วันที่ .............................................</div>
                            </div>
                            <div className="text-center">
                                <div className="border-b border-black mb-2 h-20"></div>
                                <div className="font-bold">ผู้อนุมัติ (Authorized Signature)</div>
                                <div className="text-xs mt-1">วันที่ .............................................</div>
                            </div>
                        </div>

                    </DocumentLayout>
                </div>

                {/* Right Action Bar */}
                <div className="no-print w-64 flex flex-col gap-4 sticky top-4 self-start">
                    <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col gap-3 border border-gray-200">
                        {editMode ? (
                            <>
                                <button onClick={() => { if (id === 'new') router.back(); else setEditMode(false); }} className="w-full py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2">
                                    <X size={18} /> ยกเลิก
                                </button>
                                <button onClick={handleSave} disabled={saving} className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} บันทึก
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setEditMode(true)} className="w-full py-2 bg-[#FF9500] text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 font-medium">
                                    <Edit3 size={18} /> แก้ไข
                                </button>
                                <button onClick={() => window.print()} className="w-full py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 flex items-center justify-center gap-2 font-medium">
                                    <Printer size={18} /> พิมพ์
                                </button>
                                <div className="pt-2 border-t">
                                    <button onClick={() => setShowDeleteDialog(true)} className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2 text-sm">
                                        <Trash2 size={16} /> ลบเอกสาร
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </>
    );
}
