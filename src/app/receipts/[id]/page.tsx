'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { api } from '@/lib/api';
import { formatMoney, formatDateTh, formatDateForInput, formatDateTimeTh, getCompanyInfo } from '@/lib/document-utils';
import { bahttext } from '@/lib/bahttext';
import { Loader2, Printer, ArrowLeft, Globe, Edit3, Save, X, CheckCircle } from 'lucide-react';
import { DocumentsNav } from '@/components/documents/DocumentsNav';
import { DocumentHeader } from '@/components/documents/DocumentHeader';
import { SignatureBlock } from '@/components/documents/SignatureBlock';
import { DocumentLayout } from '@/components/documents/DocumentLayout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

type Language = 'th' | 'en';

export default function ReceiptPage() {
    const { id } = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const { settings } = useSettings();
    const { addToast } = useToast();
    const [receipt, setReceipt] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [language, setLanguage] = useState<Language>('th');
    const [isConfirming, setIsConfirming] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showRevertDialog, setShowRevertDialog] = useState(false);

    const [editFields, setEditFields] = useState({
        customerName: '',
        customerAddress: '',
        customerTaxId: '',
        date: '',
        paymentDate: '',
        customerPhone: '',
        customerEmail: '',
        notes: '',
    });

    const initEditFields = (rec: any) => {
        setEditFields({
            customerName: rec.customerName || '',
            customerAddress: rec.customerAddress || '',
            customerTaxId: rec.customerTaxId || '',
            customerPhone: rec.customerPhone || '',
            customerEmail: rec.customerEmail || '',
            date: formatDateForInput(rec.date),
            paymentDate: formatDateForInput(rec.paymentDate),
            notes: rec.notes || '',
        });
    };

    const loadData = useCallback(async () => {
        if (!token) return;
        try {
            const receiptData = await api.getReceipt(token, id as string);
            setReceipt(receiptData);
            initEditFields(receiptData);
        } catch (error) {
            console.error('Failed to load receipt data:', error);
            addToast({ type: 'error', message: 'โหลดข้อมูลไม่สำเร็จ' });
        } finally { setIsLoading(false); }
    }, [token, id, addToast]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async () => {
        if (!token || !receipt) return;
        setIsSaving(true);
        try {
            const updatedReceipt = await api.updateReceipt(token, receipt.id, editFields);
            setReceipt(updatedReceipt);
            setIsEditMode(false);
            addToast({ type: 'success', message: 'บันทึกข้อมูลสำเร็จ' });
        } catch (error: any) {
            addToast({ type: 'error', message: 'บันทึกไม่สำเร็จ', description: error.message });
        } finally { setIsSaving(false); }
    };

    const handleCancel = () => { if (receipt) initEditFields(receipt); setIsEditMode(false); };

    // Trigger Dialog
    const requestConfirmReceipt = () => {
        setShowConfirmDialog(true);
    };

    const handleConfirmReceipt = async () => {
        if (!token || !receipt) return;

        setIsConfirming(true);
        try {
            const updatedReceipt = await api.confirmReceipt(token, receipt.id);
            console.log('Receipt confirmed successfully:', updatedReceipt);

            // Proactively check if we got relations back, if not, reload
            if (!updatedReceipt.invoice || !updatedReceipt.invoice.deal) {
                console.warn('Confirmed receipt response missing relations, reloading...');
                await loadData();
            } else {
                setReceipt(updatedReceipt);
            }
            setShowConfirmDialog(false);
            addToast({
                type: 'success',
                message: 'ยืนยันเอกสารเรียบร้อย',
                description: 'สถานะเปลี่ยนเป็นออกแล้ว (Issued) และลงเวลาเรียบร้อย'
            });
        } catch (error: any) {
            console.error('Confirm receipt failed:', error);
            addToast({
                type: 'error',
                message: 'ยืนยันไม่สำเร็จ',
                description: error.message
            });
        } finally {
            setIsConfirming(false);
        }
    };

    const handleRevertToDraftClick = () => setShowRevertDialog(true);

    const processRevertToDraft = async () => {
        if (!token || !receipt) return;

        try {
            const updatedReceipt = await api.updateReceipt(token, receipt.id, { status: 'DRAFT' });
            setReceipt(updatedReceipt);
            addToast({ type: 'info', message: 'เปลี่ยนสถานะเป็นฉบับร่างเรียบร้อย' });
            setShowRevertDialog(false);
        } catch (error: any) {
            addToast({ type: 'error', message: 'เปลี่ยนสถานะไม่สำเร็จ', description: error.message });
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-gray-100"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    if (!receipt) return <div className="p-8">Receipt not found</div>;

    const companyInfo = getCompanyInfo(settings, receipt ? {
        // Only pass document-specific company info if it's explicitly stored
        companyName: receipt.companyName,
        companyAddress: receipt.companyAddress,
        companyTaxId: receipt.companyTaxId,
        companyPhone: receipt.companyPhone
    } : {});
    const companyName = companyInfo.companyName;
    const companyAddress = companyInfo.companyAddress;
    const companyTaxId = companyInfo.companyTaxId;
    const companyPhone = companyInfo.companyPhone;
    const companyEmail = companyInfo.companyEmail;

    const customerName = receipt.customerName || receipt.invoice?.customerName || '-';
    const customerAddress = receipt.customerAddress || receipt.invoice?.customerAddress || '-';
    const customerTaxId = receipt.customerTaxId || receipt.invoice?.customerTaxId || '-';
    const customerPhone = receipt.customerPhone || receipt.invoice?.customerPhone || '-';
    const customerEmail = receipt.customerEmail || receipt.invoice?.customerEmail || '-';

    const items = receipt.invoice?.items || [];
    const invoiceNumber = receipt.invoice?.invoiceNumber || '-';
    const themeColor = receipt.invoice?.deal?.quotationThemeColor || '#006B5A';

    const calcSubtotal = receipt.invoice?.subtotal || 0;
    const calcDiscount = receipt.invoice?.discount || 0;
    const calcAfterDiscount = calcSubtotal - calcDiscount;
    const vatRate = receipt.invoice?.vatRate || 7;
    const calcVat = receipt.invoice?.vatAmount || 0;
    const calcGrandTotal = receipt.invoice?.grandTotal || 0;
    const whtRate = receipt.invoice?.whtRate || 0;
    const calcWht = receipt.invoice?.whtAmount || receipt.whtAmount || 0;
    const calcNetTotal = receipt.invoice?.netTotal || 0;

    return (
        <>
            <style jsx global>{`
                @page { size: A4; margin: 0; }
                @media print {
                    body * { visibility: hidden; }
                    html, body { width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact !important; }
                    .receipt-paper, .receipt-paper * { visibility: visible !important; }
                    .receipt-paper { position: absolute !important; left: 0 !important; top: 0 !important; width: 210mm !important; min-height: 297mm !important; margin: 0 !important; padding: 6mm 8mm !important; box-shadow: none !important; font-size: 9pt !important; }
                    .no-print { display: none !important; }
                }
                .receipt-paper { font-family: 'Sarabun', 'Segoe UI', sans-serif; }
            `}</style>

            <ConfirmDialog
                isOpen={showConfirmDialog}
                onClose={() => setShowConfirmDialog(false)}
                onConfirm={handleConfirmReceipt}
                isLoading={isConfirming}
                title="ยืนยันเอกสาร (Confirm Receipt)"
                description={`เมื่อยืนยันแล้ว:\n1. สถานะจะเปลี่ยนเป็น "ออกแล้ว" (Issued)\n2. ระบบจะล็อกการแก้ไขข้อมูล\n3. ลงลายมือชื่อและเวลาอัตโนมัติ`}
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

            <div className="min-h-screen bg-gray-300 p-4 print:p-0 print:bg-white flex flex-col md:flex-row justify-center gap-6">
                <div className="flex flex-col gap-4 max-w-[210mm] w-full print:max-w-none">
                    <div className="no-print"><DocumentsNav dealId={receipt.invoice?.dealId} invoiceId={receipt.invoiceId} receiptId={receipt.id} /></div>

                    {isEditMode && (
                        <div className="bg-white rounded-xl shadow-lg p-6 no-print">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Edit3 size={20} /> แก้ไขข้อมูลใบเสร็จ</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">วันที่ใบเสร็จ</label><input type="date" value={editFields.date} onChange={(e) => setEditFields({ ...editFields, date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">วันที่ชำระเงิน</label><input type="date" value={editFields.paymentDate} onChange={(e) => setEditFields({ ...editFields, paymentDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">ชื่อลูกค้า</label><input type="text" value={editFields.customerName} onChange={(e) => setEditFields({ ...editFields, customerName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">เลขผู้เสียภาษี</label><input type="text" value={editFields.customerTaxId} onChange={(e) => setEditFields({ ...editFields, customerTaxId: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label><textarea value={editFields.customerAddress} onChange={(e) => setEditFields({ ...editFields, customerAddress: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">โทรศัพท์</label><input type="text" value={editFields.customerPhone} onChange={(e) => setEditFields({ ...editFields, customerPhone: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div><label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label><input type="email" value={editFields.customerEmail} onChange={(e) => setEditFields({ ...editFields, customerEmail: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label><input type="text" value={editFields.notes} onChange={(e) => setEditFields({ ...editFields, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                            </div>
                        </div>
                    )}

                    {/* A4 Paper */}
                    <DocumentLayout
                        companyInfo={companyInfo}
                        themeColor={themeColor}
                        paperClass="receipt-paper"
                    >

                        {/* HEADER */}
                        <DocumentHeader
                            companyInfo={companyInfo}
                            titleEn="Receipt"
                            titleTh="ใบเสร็จรับเงิน"
                            docNumber={receipt.receiptNumber}
                            themeColor={themeColor}
                            showOriginal={true}
                        />

                        {/* INFO GRID */}
                        <div className="border mb-3" style={{ borderColor: themeColor }}>
                            <div className="grid grid-cols-2">
                                <div className="p-2 border-r text-[8pt]" style={{ borderColor: themeColor }}>
                                    <table className="w-full">
                                        <tbody>
                                            <tr><td className="font-bold py-0.5 w-[85px] align-top">ชื่อลูกค้า<br /><span className="font-normal text-gray-500 text-[7pt]">Customer Name</span></td><td className="py-0.5 font-medium">{customerName}</td></tr>
                                            <tr><td className="font-bold py-0.5 align-top">เลขที่ผู้เสียภาษี<br /><span className="font-normal text-gray-500 text-[7pt]">Tax ID</span></td><td className="py-0.5">{customerTaxId} (สำนักงานใหญ่)</td></tr>
                                            <tr><td className="font-bold py-0.5 align-top">ที่อยู่<br /><span className="font-normal text-gray-500 text-[7pt]">Address</span></td><td className="py-0.5 leading-tight">{customerAddress}<br /><span className="text-gray-600">โทร: {customerPhone}</span></td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-2 text-[7.5pt]">
                                    <table className="w-full">
                                        <tbody>
                                            <tr>
                                                <td className="font-bold py-0.5 w-[65px] align-top whitespace-nowrap">วันที่<br /><span className="font-normal text-gray-500 text-[6pt]">Issue Date</span></td>
                                                <td className="py-0.5 w-[75px]">: {formatDateTh(receipt.date)}</td>
                                                <td className="font-bold py-0.5 w-[60px] align-top whitespace-nowrap">พนักงานขาย<br /><span className="font-normal text-gray-500 text-[6pt]">Salesman</span></td>
                                                <td className="py-0.5 truncate max-w-[70px]">: {receipt.invoice?.deal?.owner?.name || '-'}</td>
                                            </tr>
                                            <tr>
                                                <td className="font-bold py-0.5 align-top whitespace-nowrap">วันที่ชำระ<br /><span className="font-normal text-gray-500 text-[6pt]">Payment Date</span></td>
                                                <td className="py-0.5">: {formatDateTh(receipt.paymentDate)}</td>
                                                <td className="font-bold py-0.5 align-top whitespace-nowrap">เบอร์ติดต่อ<br /><span className="font-normal text-gray-500 text-[6pt]">Contact No.</span></td>
                                                <td className="py-0.5 text-[7pt]">: {companyPhone}</td>
                                            </tr>
                                            <tr>
                                                <td className="font-bold py-0.5 align-top whitespace-nowrap">อ้างอิง<br /><span className="font-normal text-gray-500 text-[6pt]">Ref Invoice</span></td>
                                                <td colSpan={3} className="py-0.5 font-bold" style={{ color: themeColor }}>: {invoiceNumber}</td>
                                            </tr>
                                            <tr>
                                                <td className="font-bold py-0.5 align-top whitespace-nowrap">อีเมล<br /><span className="font-normal text-gray-500 text-[6pt]">E-mail</span></td>
                                                <td colSpan={3} className="py-0.5 text-[6.5pt] truncate">: {customerEmail}</td>
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
                                    {items && items.length > 0 ? items.map((item: any, idx: number) => {
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
                                    {Array.from({ length: Math.max(0, 5 - (items?.length || 0)) }).map((_, i) => (
                                        <tr key={`e-${i}`} className="h-6 border-b border-gray-200"><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td className="border-r border-gray-200"></td><td></td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* BOTTOM SECTION */}
                        <div className="flex gap-3 mb-2">
                            <div className="flex-1 text-[8pt]">
                                <div className="flex border border-gray-300 mb-2">
                                    <div className="bg-gray-200 px-2 py-1 font-bold w-[70px]">จำนวนเงิน<br /><span className="font-normal text-gray-600 text-[7pt]">Amount</span></div>
                                    <div className="bg-gray-100 px-2 py-1 flex-1 font-medium">{bahttext(calcNetTotal)}</div>
                                </div>
                                <div className="mb-2">
                                    <div className="font-bold border-b border-gray-300 pb-0.5 mb-1">การชำระเงิน (Payment)</div>
                                    <div className="text-[7pt] text-gray-700">
                                        วิธีการชำระ : {receipt.paymentMethod || 'โอนเงิน / Transfer'}<br />
                                        วันที่ชำระ : {formatDateTh(receipt.paymentDate || receipt.date)}<br />
                                        {invoiceNumber !== '-' && <>อ้างอิงใบกำกับ : {invoiceNumber}</>}
                                    </div>
                                </div>
                                {(editFields.notes || receipt.notes) && (
                                    <div className="text-[7pt]">
                                        <div className="font-bold mb-0.5">หมายเหตุ</div>
                                        <div className="text-gray-700">{editFields.notes || receipt.notes}</div>
                                    </div>
                                )}
                            </div>
                            <div className="w-[220px]">
                                <table className="w-full text-[7.5pt] border-collapse">
                                    <tbody>
                                        <tr>
                                            <td className="bg-gray-100 p-1.5 font-bold border border-gray-300 whitespace-nowrap">รวมเป็นเงิน<br /><span className="font-normal text-gray-500 text-[6pt]">Total</span></td>
                                            <td className="p-1.5 text-right border border-gray-300 font-medium w-[85px]">{formatMoney(calcSubtotal)}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 p-1.5 font-bold border border-gray-300 whitespace-nowrap">หักส่วนลด<br /><span className="font-normal text-gray-500 text-[6pt]">Discount</span></td>
                                            <td className="p-1.5 text-right border border-gray-300 text-red-600">{formatMoney(calcDiscount)}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 p-1.5 font-bold border border-gray-300 whitespace-nowrap">ยอดหลังหักส่วนลด<br /><span className="font-normal text-gray-500 text-[6pt]">After Discount</span></td>
                                            <td className="p-1.5 text-right border border-gray-300 font-medium">{formatMoney(calcAfterDiscount)}</td>
                                        </tr>
                                        <tr>
                                            <td className="bg-gray-100 p-1.5 font-bold border border-gray-300 whitespace-nowrap">ภาษี {vatRate}%<br /><span className="font-normal text-gray-500 text-[6pt]">VAT</span></td>
                                            <td className="p-1.5 text-right border border-gray-300">{formatMoney(calcVat)}</td>
                                        </tr>
                                        <tr style={{ backgroundColor: themeColor }} className="text-white">
                                            <td className="p-2 font-bold text-[9pt] whitespace-nowrap">รวมทั้งสิ้น<br /><span className="font-normal text-[6pt]">Grand Total</span></td>
                                            <td className="p-2 text-right font-bold text-[10pt]">{formatMoney(calcGrandTotal)}</td>
                                        </tr>
                                        {(whtRate > 0 || calcWht > 0) && (
                                            <tr>
                                                <td className="bg-white p-1.5 font-bold border border-gray-300 whitespace-nowrap">หัก ณ ที่จ่าย {whtRate > 0 ? `${whtRate}%` : ''}<br /><span className="font-normal text-gray-500 text-[6pt]">Wht</span></td>
                                                <td className="p-1.5 text-right border border-gray-300 text-red-600">{formatMoney(calcWht)}</td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td className="bg-white p-1.5 font-bold border border-gray-300 whitespace-nowrap">ยอดรับชำระสุทธิ<br /><span className="font-normal text-gray-500 text-[6pt]">Net Total</span></td>
                                            <td className="p-1.5 text-right border border-gray-300 font-bold">{formatMoney(calcNetTotal)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* SIGNATURES */}
                        <SignatureBlock
                            companyInfo={companyInfo}
                            themeColor={themeColor}
                            leftLabel="ผู้ชำระเงิน / Payer"
                            leftDateLabel="วันที่ / Date ________________"
                            rightLabel="ผู้รับเงิน / Collector"
                            rightDate={(receipt.status === 'ISSUED' && receipt.confirmedAt) ? formatDateTh(receipt.confirmedAt) : undefined}
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
                                <div className="flex justify-center mb-2">
                                    {receipt.status === 'DRAFT' && <div className="h-10 w-full flex items-center justify-center gap-2 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg border border-yellow-200 shadow-sm font-medium">ฉบับร่าง (Draft)</div>}
                                    {receipt.status === 'ISSUED' && <div className="h-10 w-full flex items-center justify-center gap-2 bg-green-50 text-green-800 px-4 py-2 rounded-lg border border-green-200 shadow-sm font-medium">ออกแล้ว (Issued)</div>}
                                </div>

                                {receipt.status === 'DRAFT' && (
                                    <button onClick={() => setIsEditMode(true)} className="h-10 w-full flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition shadow"><Edit3 size={18} /> แก้ไข</button>
                                )}

                                {receipt.status === 'ISSUED' && <button onClick={handleRevertToDraftClick} className="h-10 w-full flex items-center justify-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition shadow">กลับเป็นฉบับร่าง</button>}

                                {receipt.status === 'DRAFT' && (
                                    <button
                                        onClick={requestConfirmReceipt}
                                        disabled={isConfirming}
                                        className="h-10 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow disabled:opacity-50"
                                    >
                                        {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} ยืนยันเอกสาร
                                    </button>
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
