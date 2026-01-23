'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { api } from '@/lib/api';
import { formatMoney, formatDateTh, getCompanyInfo, formatDateTimeTh, getTranslation } from '@/lib/document-utils';
import { bahttext } from '@/lib/bahttext';
import { Loader2, Printer, ArrowLeft, Globe, FileText, CheckCircle, Edit3, Save, X, RefreshCw } from 'lucide-react';
import { DocumentsNav } from '@/components/documents/DocumentsNav';
import { DocumentHeader } from '@/components/documents/DocumentHeader';
import { SignatureBlock } from '@/components/documents/SignatureBlock';
import { DocumentLayout } from '@/components/documents/DocumentLayout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

type Language = 'th' | 'en';

export default function InvoicePage() {
    const { id } = useParams();
    const router = useRouter();
    const { token, user } = useAuth();
    const { settings } = useSettings();
    const { addToast } = useToast();
    const [invoice, setInvoice] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConverting, setIsConverting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [language, setLanguage] = useState<Language>('th');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showRevertDialog, setShowRevertDialog] = useState(false);
    const [showSyncDialog, setShowSyncDialog] = useState(false);

    const [editFields, setEditFields] = useState({
        customerName: '',
        customerAddress: '',
        customerTaxId: '',
        customerPhone: '',
        customerEmail: '',
        notes: '',
    });

    const initEditFields = (inv: any) => {
        setEditFields({
            customerName: inv.customerName || '',
            customerAddress: inv.customerAddress || '',
            customerTaxId: inv.customerTaxId || '',
            customerPhone: inv.customerPhone || '',
            customerEmail: inv.customerEmail || '',
            notes: inv.notes || '',
        });
    };

    const loadData = useCallback(async () => {
        if (!token) return;
        try {
            const invoiceData = await api.getInvoice(token, id as string);
            setInvoice(invoiceData);
            initEditFields(invoiceData);
        } catch (error) {
            console.error('Failed to load invoice data:', error);
            addToast({ type: 'error', message: 'โหลดข้อมูลไม่สำเร็จ' });
        } finally {
            setIsLoading(false);
        }
    }, [token, id, addToast]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async () => {
        if (!token || !invoice) return;
        setIsSaving(true);
        try {
            const updatedInvoice = await api.updateInvoice(token, invoice.id, editFields);
            setInvoice(updatedInvoice);
            setIsEditMode(false);
            addToast({ type: 'success', message: 'บันทึกข้อมูลสำเร็จ' });
        } catch (error: any) {
            addToast({ type: 'error', message: 'บันทึกไม่สำเร็จ', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => { if (invoice) initEditFields(invoice); setIsEditMode(false); };

    // Trigger Dialog
    const requestConfirmInvoice = () => {
        setShowConfirmDialog(true);
    };

    const handleConfirmInvoice = async () => {
        if (!token || !invoice) return;

        setIsConfirming(true);
        try {
            console.log('Confirming invoice:', invoice.id);
            const updatedInvoice = await api.confirmInvoice(token, invoice.id);
            console.log('Invoice confirmed:', updatedInvoice);

            if (updatedInvoice) {
                setInvoice(updatedInvoice);
                setShowConfirmDialog(false);
                addToast({
                    type: 'success',
                    message: 'ยืนยันเอกสารเรียบร้อย',
                    description: 'สถานะเปลี่ยนเป็นส่งแล้ว (Sent) และลงเวลาเรียบร้อย'
                });
            } else {
                console.warn('Confirmed invoice returned empty, reloading...');
                await loadData();
            }
        } catch (error: any) {
            console.error('Confirm invoice failed:', error);
            addToast({
                type: 'error',
                message: 'ยืนยันไม่สำเร็จ',
                description: error.message || 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
            });
        } finally {
            setIsConfirming(false);
        }
    };

    const handleRevertToDraftClick = () => setShowRevertDialog(true);

    const processRevertToDraft = async () => {
        if (!token || !invoice) return;

        try {
            const updatedInvoice = await api.updateInvoice(token, invoice.id, { status: 'DRAFT' });
            setInvoice(updatedInvoice);
            addToast({ type: 'info', message: 'เปลี่ยนสถานะเป็นฉบับร่างเรียบร้อย' });
            setShowRevertDialog(false);
        } catch (error: any) {
            addToast({ type: 'error', message: 'เปลี่ยนสถานะไม่สำเร็จ', description: error.message });
        }
    };

    const handleConvertToReceipt = async () => {
        if (!token || !invoice) return;

        setIsConverting(true);
        try {
            console.log('Converting invoice to receipt...');
            const receipt = await api.createReceipt(token, invoice.id);
            addToast({ type: 'success', message: 'ออกใบเสร็จรับเงินสำเร็จ', description: 'กำลังนำท่านไป...' });
            router.push(`/receipts/${receipt.id}`);
        } catch (error: any) {
            console.error('Convert to receipt failed:', error);
            if (error.receiptId) {
                addToast({ type: 'info', message: 'มีใบเสร็จรับเงินอยู่แล้ว', description: 'กำลังนำท่านไป...' });
                router.push(`/receipts/${error.receiptId}`);
            } else {
                addToast({
                    type: 'error',
                    message: 'ออกใบเสร็จรับเงินไม่สำเร็จ',
                    description: error.message
                });
            }
        } finally { setIsConverting(false); }
    };

    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncItemsClick = () => setShowSyncDialog(true);

    const processSyncItems = async () => {
        if (!token || !invoice) return;

        setIsSyncing(true);
        try {
            const updatedInvoice = await api.syncInvoiceItems(token, invoice.id);
            setInvoice(updatedInvoice);
            addToast({ type: 'success', message: 'อัปเดตรายการสินค้าสำเร็จ' });
            setShowSyncDialog(false);
        } catch (error: any) {
            addToast({ type: 'error', message: 'อัปเดตไม่สำเร็จ', description: error.message });
        } finally {
            setIsSyncing(false);
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    if (!invoice) return <div className="p-8">Invoice not found</div>;

    const companyInfo = getCompanyInfo(settings, invoice ? {
        companyName: invoice.companyName,
        companyAddress: invoice.companyAddress,
        companyTaxId: invoice.companyTaxId,
        companyPhone: invoice.companyPhone
    } : {});
    const companyName = companyInfo.companyName;
    const companyAddress = companyInfo.companyAddress;
    const companyTaxId = companyInfo.companyTaxId;
    const companyPhone = companyInfo.companyPhone;
    const companyEmail = companyInfo.companyEmail;
    const bankAccount = companyInfo.bankAccount;
    const bankName = companyInfo.bankName;

    const themeColor = invoice.deal?.quotationThemeColor || '#006B5A';
    const subtotal = invoice.subtotal || 0;
    const discount = invoice.discount || 0;
    const afterDiscount = subtotal - discount;
    const vatRate = invoice.vatRate || 7;
    const vatAmount = invoice.vatAmount || 0;
    const grandTotal = invoice.grandTotal || 0;
    const whtRate = invoice.whtRate || 0;
    const whtAmount = invoice.whtAmount || 0;
    const netTotal = invoice.netTotal || 0;

    return (
        <>
            <style jsx global>{`
                @page { size: A4; margin: 0; }
                @media print {
                    body * { visibility: hidden; }
                    html, body { width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; }
                    .invoice-paper, .invoice-paper * { visibility: visible !important; }
                    .invoice-paper { position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; min-height: 297mm !important; margin: 0 !important; padding: 6mm 8mm !important; box-shadow: none !important; font-size: 9pt !important; }
                    .no-print { display: none !important; }
                }
                .invoice-paper { font-family: 'Sarabun', 'Segoe UI', sans-serif; }
            `}</style>

            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={handleConfirmInvoice}
                isLoading={isConfirming}
                title="ยืนยันเอกสาร (Confirm Invoice)"
                description={`เมื่อยืนยันแล้ว:\n1. สถานะจะเปลี่ยนเป็น "ส่งแล้ว" (Sent)\n2. ระบบจะล็อกการแก้ไขข้อมูล\n3. ลงลายมือชื่อและเวลาอัตโนมัติ`}
                confirmText="ยืนยันเอกสาร"
                type="info"
            />

            <ConfirmDialog
                isOpen={showRevertDialog}
                onClose={() => setShowRevertDialog(false)}
                onConfirm={processRevertToDraft}
                title="ยืนยันการกลับเป็นฉบับร่าง"
                description="การกลับเป็นฉบับร่างจะปลดล็อกการแก้ไขข้อมูล\nยืนยันที่จะดำเนินการต่อหรือไม่?"
                confirmText="ยืนยัน"
                type="warning"
            />

            <ConfirmDialog
                isOpen={showSyncDialog}
                onClose={() => setShowSyncDialog(false)}
                onConfirm={processSyncItems}
                isLoading={isSyncing}
                title="ยืนยันการทำรายการ"
                description={`โปรดอ่าน: ระบบจะล้างรายการสินค้าเดิมใน Invoice นี้\nและดึงรายการล่าสุดจาก Deal/Quotation มาใส่แทน\n\nยืนยันที่จะทำรายการหรือไม่?`}
                confirmText="ยืนยันการอัปเดต"
                type="danger"
            />

            <div className="min-h-screen bg-gray-300 p-4 print:p-0 print:bg-white flex flex-col md:flex-row justify-center gap-6">
                <div className="flex flex-col gap-4 max-w-[210mm] w-full print:max-w-none">
                    <div className="no-print"><DocumentsNav dealId={invoice.dealId} invoiceId={invoice.id} receiptId={invoice.receipt?.id} /></div>

                    {isEditMode && (
                        <div className="bg-white rounded-xl shadow-lg p-6 no-print">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Edit3 size={20} /> แก้ไขข้อมูลลูกค้า</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">ชื่อลูกค้า</label><input type="text" value={editFields.customerName} onChange={(e) => setEditFields({ ...editFields, customerName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">เลขผู้เสียภาษี</label><input type="text" value={editFields.customerTaxId} onChange={(e) => setEditFields({ ...editFields, customerTaxId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label><textarea value={editFields.customerAddress} onChange={(e) => setEditFields({ ...editFields, customerAddress: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">โทรศัพท์</label><input type="text" value={editFields.customerPhone} onChange={(e) => setEditFields({ ...editFields, customerPhone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label><input type="email" value={editFields.customerEmail} onChange={(e) => setEditFields({ ...editFields, customerEmail: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label><textarea value={editFields.notes} onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" /></div>
                            </div>
                        </div>
                    )}

                    {/* A4 Paper */}
                    <DocumentLayout
                        companyInfo={companyInfo}
                        themeColor={themeColor}
                        paperClass="invoice-paper"
                    >

                        {/* HEADER */}
                        <DocumentHeader
                            companyInfo={companyInfo}
                            documentType="invoice"
                            docNumber={invoice.invoiceNumber}
                            themeColor={themeColor}
                            showOriginal={true}
                        />

                        {/* INFO GRID */}
                        <div className="border mb-4" style={{ borderColor: themeColor }}>
                            <div className="grid grid-cols-2 gap-0">
                                {/* Left Column - Customer Info */}
                                <div className="p-3 border-r text-[8pt]" style={{ borderColor: themeColor }}>
                                    <table className="w-full">
                                        <tbody>
                                            <tr>
                                                <td className="font-bold py-1 w-[85px] align-top text-left pl-1 whitespace-nowrap">ชื่อลูกค้า<br /><span className="font-normal text-gray-500 text-[7pt]">Customer Name</span></td>
                                                <td className="py-1 pl-2 font-medium break-words">{invoice.customerName}</td>
                                            </tr>
                                            <tr>
                                                <td className="font-bold py-1 align-top text-left pl-1 whitespace-nowrap">เลขที่ผู้เสียภาษี<br /><span className="font-normal text-gray-500 text-[7pt]">Tax ID</span></td>
                                                <td className="py-1 pl-2">{invoice.customerTaxId ? `${invoice.customerTaxId} (สำนักงานใหญ่)` : '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="font-bold py-1 align-top text-left pl-1 whitespace-nowrap">ที่อยู่<br /><span className="font-normal text-gray-500 text-[7pt]">Address</span></td>
                                                <td className="py-1 pl-2 leading-tight break-words">
                                                    <div className="mb-1">{invoice.customerAddress || '-'}</div>
                                                    <div className="text-gray-600 text-[7pt]">โทร: {invoice.customerPhone || '-'}</div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Right Column - Document Info */}
                                <div className="p-3 text-[8pt]">
                                    <table className="w-full">
                                        <tbody>
                                            <tr>
                                                <td className="font-bold py-1 w-[70px] align-top whitespace-nowrap">วันที่<br /><span className="font-normal text-gray-500 text-[7pt]">Issue Date</span></td>
                                                <td className="py-1 pl-2">: {formatDateTh(invoice.date)}</td>
                                                <td className="font-bold py-1 w-[65px] align-top whitespace-nowrap">พนักงานขาย<br /><span className="font-normal text-gray-500 text-[7pt]">Salesman</span></td>
                                                <td className="py-1 pl-2 truncate">: {invoice.deal?.owner?.name || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="font-bold py-1 align-top whitespace-nowrap">ครบกำหนด<br /><span className="font-normal text-gray-500 text-[7pt]">Due Date</span></td>
                                                <td className="py-1 pl-2">: {formatDateTh(invoice.dueDate)}</td>
                                                <td className="font-bold py-1 align-top whitespace-nowrap">เบอร์ติดต่อ<br /><span className="font-normal text-gray-500 text-[7pt]">Contact No.</span></td>
                                                <td className="py-1 pl-2">: {companyPhone}</td>
                                            </tr>
                                            <tr>
                                                <td className="font-bold py-1 align-top whitespace-nowrap">อ้างอิง<br /><span className="font-normal text-gray-500 text-[7pt]">Reference</span></td>
                                                <td colSpan={3} className="py-1 pl-2 font-bold break-words">: {invoice.deal?.quotationNumber || invoice.deal?.title || '-'}</td>
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
                                        <th className="py-2 px-2 w-[40px] text-center font-bold border-r border-white/30">
                                            {language === 'th' ? getTranslation('no', 'th') : getTranslation('no', 'en')}<br />
                                            <span className="font-normal text-[7pt]">{language === 'th' ? getTranslation('no', 'en') : getTranslation('no', 'th')}</span>
                                        </th>
                                        <th className="py-2 px-2 text-left font-bold border-r border-white/30">
                                            {language === 'th' ? getTranslation('description', 'th') : getTranslation('description', 'en')}<br />
                                            <span className="font-normal text-[7pt]">{language === 'th' ? getTranslation('description', 'en') : getTranslation('description', 'th')}</span>
                                        </th>
                                        <th className="py-2 px-2 w-[55px] text-center font-bold border-r border-white/30">
                                            {language === 'th' ? getTranslation('quantity', 'th') : getTranslation('quantity', 'en')}<br />
                                            <span className="font-normal text-[7pt]">{language === 'th' ? getTranslation('quantity', 'en') : getTranslation('quantity', 'th')}</span>
                                        </th>
                                        <th className="py-2 px-2 w-[75px] text-right font-bold border-r border-white/30">
                                            {language === 'th' ? getTranslation('unitPrice', 'th') : getTranslation('unitPrice', 'en')}<br />
                                            <span className="font-normal text-[7pt]">{language === 'th' ? getTranslation('unitPrice', 'en') : getTranslation('unitPrice', 'th')}</span>
                                        </th>
                                        <th className="py-2 px-2 w-[65px] text-right font-bold border-r border-white/30">
                                            {language === 'th' ? getTranslation('discount', 'th') : getTranslation('discount', 'en')}<br />
                                            <span className="font-normal text-[7pt]">{language === 'th' ? getTranslation('discount', 'en') : getTranslation('discount', 'th')}</span>
                                        </th>
                                        <th className="py-2 px-2 w-[85px] text-right font-bold">
                                            {language === 'th' ? getTranslation('amount', 'th') : getTranslation('amount', 'en')}<br />
                                            <span className="font-normal text-[7pt]">{language === 'th' ? getTranslation('amount', 'en') : getTranslation('amount', 'th')}</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items && invoice.items.length > 0 ? invoice.items.map((item: any, idx: number) => {
                                        let itemInfo = { sku: null, name: item.description, productDescription: null };
                                        try {
                                            const parsed = JSON.parse(item.description);
                                            if (parsed && parsed.name) itemInfo = parsed;
                                        } catch (e) { }
                                        return (
                                            <tr key={idx} className="border-b border-gray-300">
                                                <td className="py-2 px-2 text-center align-top border-r border-gray-200 text-gray-500">{idx + 1}</td>
                                                <td className="py-2 px-2 align-top border-r border-gray-200">
                                                    <div className="flex flex-col">
                                                        <div className="font-bold text-gray-900">{itemInfo.name || 'ไม่มีชื่อสินค้า'}</div>
                                                        {itemInfo.productDescription && (
                                                            <div className="text-gray-500 text-[7.5pt] mt-1 italic whitespace-pre-wrap leading-tight">{itemInfo.productDescription}</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2 text-center align-top border-r border-gray-200">{item.quantity}</td>
                                                <td className="py-2 px-2 text-right align-top border-r border-gray-200">{formatMoney(item.unitPrice)}</td>
                                                <td className="py-2 px-2 text-right align-top border-r border-gray-200">{formatMoney(item.discount || 0)}</td>
                                                <td className="py-2 px-2 text-right align-top font-bold text-gray-900">{formatMoney(item.amount)}</td>
                                            </tr>
                                        );
                                    }) : null}
                                    {Array.from({ length: Math.max(0, 5 - (invoice.items?.length || 0)) }).map((_, i) => (
                                        <tr key={`e-${i}`} className="h-6 border-b border-gray-200"><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* BOTTOM SECTION */}
                        <div className="flex gap-3 mb-2">
                            {/* Left Side */}
                            <div className="flex-1 text-[8pt]">
                                <div className="flex border border-gray-300 mb-2">
                                    <div className="bg-gray-200 px-2 py-1 font-bold w-[70px]">จำนวนเงิน<br /><span className="font-normal text-gray-600 text-[7pt]">Amount</span></div>
                                    <div className="bg-gray-100 px-2 py-1 flex-1 font-medium">{bahttext(netTotal)}</div>
                                </div>
                                <div className="mb-2">
                                    <div className="font-bold border-b border-gray-300 pb-0.5 mb-1">หมายเหตุ (Notes)</div>
                                    <div className="text-[7pt] text-gray-700">{invoice.notes || `ชำระเงินภายในวันที่ ${formatDateTh(invoice.dueDate)}`}</div>
                                </div>
                                {bankName && (
                                    <div className="text-[7pt]">
                                        <div className="font-bold mb-0.5">ช่องทางการชำระเงิน</div>
                                        <div className="text-gray-700">ธนาคาร : {bankName}<br />เลขบัญชี : {bankAccount}<br />ประเภทบัญชี (สะสมทรัพย์)</div>
                                    </div>
                                )}
                            </div>
                            <div className="w-[220px]">
                                <table className="w-full text-[8pt] border-collapse">
                                    <tbody>
                                        <tr>
                                            <td className="bg-gray-100 p-2 font-bold border border-gray-300 whitespace-nowrap">รวมเป็นเงิน<br /><span className="font-normal text-gray-500 text-[7pt]">Total</span></td>
                                            <td className="p-2 text-right border border-gray-300 font-medium w-[85px]">{formatMoney(subtotal)}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 p-2 font-bold border border-gray-300 whitespace-nowrap">หักส่วนลด<br /><span className="font-normal text-gray-500 text-[7pt]">Discount</span></td>
                                            <td className="p-2 text-right border border-gray-300 text-red-600">{formatMoney(discount)}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 p-2 font-bold border border-gray-300 whitespace-nowrap">ยอดหลังหักส่วนลด<br /><span className="font-normal text-gray-500 text-[7pt]">After Discount</span></td>
                                            <td className="p-2 text-right border border-gray-300 font-medium">{formatMoney(afterDiscount)}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 p-2 font-bold border border-gray-300 whitespace-nowrap">ภาษี {vatRate}%<br /><span className="font-normal text-gray-500 text-[7pt]">VAT</span></td>
                                            <td className="p-2 text-right border border-gray-300">{formatMoney(vatAmount)}</td>
                                        </tr>
                                        <tr style={{ backgroundColor: themeColor }} className="text-white">
                                            <td className="p-2 font-bold text-[9pt] whitespace-nowrap">รวมทั้งสิ้น<br /><span className="font-normal text-[7pt]">Grand Total</span></td>
                                            <td className="p-2 text-right font-bold text-[10pt]">{formatMoney(grandTotal)}</td>
                                        </tr>
                                        {whtRate > 0 && (
                                            <tr>
                                                <td className="bg-white p-2 font-bold border border-gray-300 whitespace-nowrap">หัก ณ ที่จ่าย {whtRate}%<br /><span className="font-normal text-gray-500 text-[7pt]">Wht</span></td>
                                                <td className="p-2 text-right border border-gray-300 text-red-600">{formatMoney(whtAmount)}</td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td className="bg-white p-2 font-bold border border-gray-300 whitespace-nowrap">ยอดชำระ<br /><span className="font-normal text-gray-500 text-[7pt]">Total</span></td>
                                            <td className="p-2 text-right border border-gray-300 font-bold">{formatMoney(netTotal)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* SIGNATURES */}
                        <SignatureBlock
                            companyInfo={companyInfo}
                            themeColor={themeColor}
                            leftLabel="ผู้รับเอกสาร / Receiver"
                            leftDateLabel="วันที่ / Date ________________"
                            rightLabel="ผู้มีอำนาจลงนาม / Authorized Signature"
                            rightDate={(invoice.status !== 'DRAFT' && invoice.confirmedAt) ? formatDateTh(invoice.confirmedAt) : undefined}
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
                        {isEditMode ? (
                            <>
                                <button onClick={handleCancel} className="h-10 w-full flex items-center justify-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition shadow"><X size={18} /> ยกเลิก</button>
                                <button onClick={handleSave} disabled={isSaving} className="h-10 w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow disabled:opacity-50">{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} บันทึก</button>
                            </>
                        ) : (
                            <>
                                {(() => {
                                    const isOwner = user?.id === invoice.deal?.owner?.id;
                                    const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
                                    const canEdit = isOwner || isAdmin;

                                    if (!canEdit) {
                                        return (
                                            <div className="text-center text-xs text-gray-400 mb-2">
                                                Sales Team View Only
                                            </div>
                                        );
                                    }

                                    return (
                                        <>
                                            <div className="flex justify-center mb-2">
                                                {invoice.status === 'DRAFT' && <div className="h-10 w-full flex items-center justify-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg border border-yellow-200 shadow-sm font-medium">ฉบับร่าง (Draft)</div>}
                                                {invoice.status === 'SENT' && <div className="h-10 w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-800 px-4 py-2 rounded-lg border border-blue-200 shadow-sm font-medium">ยืนยันแล้ว (Sent)</div>}
                                                {invoice.status === 'PAID' && <div className="h-10 w-full flex items-center justify-center gap-2 bg-green-50 text-green-800 px-4 py-2 rounded-lg border border-green-200 shadow-sm font-medium">ชำระแล้ว (Paid)</div>}
                                            </div>

                                            {invoice.status === 'DRAFT' && (
                                                <>
                                                    <button onClick={() => setIsEditMode(true)} className="h-10 w-full flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition shadow"><Edit3 size={18} /> แก้ไข</button>
                                                    <button
                                                        onClick={handleSyncItemsClick}
                                                        disabled={isSyncing}
                                                        className="h-10 w-full flex items-center justify-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50 transition shadow-sm font-medium"
                                                    >
                                                        {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} อัปเดตรายการสินค้า
                                                    </button>
                                                </>
                                            )}

                                            {(invoice.status === 'SENT' || invoice.status === 'PAID') && !invoice.receipt && (
                                                <button
                                                    onClick={handleConvertToReceipt}
                                                    disabled={isConverting}
                                                    className="h-10 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow disabled:opacity-50"
                                                >
                                                    {isConverting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} ออกใบเสร็จรับเงิน
                                                </button>
                                            )}

                                            {invoice.status === 'DRAFT' && (
                                                <button
                                                    onClick={requestConfirmInvoice}
                                                    disabled={isConfirming}
                                                    className="h-10 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow disabled:opacity-50"
                                                >
                                                    {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} ยืนยันเอกสาร (Confirm)
                                                </button>
                                            )}

                                            {(invoice.status === 'SENT' || invoice.status === 'PAID') && (
                                                <button onClick={handleRevertToDraftClick} className="h-10 w-full flex items-center justify-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition shadow">
                                                    กลับเป็นฉบับร่าง
                                                </button>
                                            )}

                                            {invoice.receipt && (
                                                <button onClick={() => router.push(`/receipts/${invoice.receipt?.id}`)} className="h-10 w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition shadow">
                                                    <FileText size={18} /> ดูใบเสร็จรับเงิน
                                                </button>
                                            )}

                                            <button onClick={() => loadData()} className="h-10 w-full flex items-center justify-center gap-2 bg-white text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm text-[10px] mt-2">
                                                <RefreshCw size={14} /> รีเฟรช (Status: {invoice.status})
                                            </button>
                                        </>
                                    );
                                })()}
                            </>
                        )}
                        <button onClick={() => window.print()} className="h-10 w-full flex items-center justify-center gap-2 text-white px-6 py-2 rounded-lg transition shadow bg-[#15803d] hover:bg-[#166534]"><Printer size={18} /> พิมพ์ / PDF</button>
                    </div>
                </div>
            </div>
        </>
    );
}
