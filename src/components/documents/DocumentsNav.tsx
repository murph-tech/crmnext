'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, CheckCircle, File } from 'lucide-react';

interface DocumentsNavProps {
    dealId?: string;
    invoiceId?: string;
    receiptId?: string;
}

export function DocumentsNav({ dealId, invoiceId, receiptId }: DocumentsNavProps) {
    const pathname = usePathname();

    const isActive = (path: string) => pathname.includes(path);

    // If we only have dealId, we might not know invoiceId/receiptId unless passed.
    // The parent page is responsible for passing these IDs if they exist.

    return (
        <div className="flex border-b mb-6 no-print overflow-x-auto">
            {dealId && (
                <Link
                    href={`/quotations/${dealId}`}
                    prefetch={false}
                    className={`flex items-center gap-2 px-6 py-3 border-b-2 transition whitespace-nowrap ${isActive('/quotations')
                        ? 'border-indigo-600 text-indigo-600 font-medium bg-indigo-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <FileText size={18} />
                    ใบเสนอราคา (Quotation)
                </Link>
            )}

            <Link
                href={invoiceId ? `/invoices/${invoiceId}` : '#'}
                onClick={(e) => !invoiceId && e.preventDefault()}
                prefetch={false}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition whitespace-nowrap ${isActive('/invoices')
                    ? 'border-indigo-600 text-indigo-600 font-medium bg-indigo-50'
                    : invoiceId
                        ? 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        : 'border-transparent text-gray-300 cursor-not-allowed'
                    }`}
            >
                <File size={18} />
                ใบกำกับ/ใบวางบิล (Invoice)
                {!invoiceId && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 ml-1">Not Created</span>}
            </Link>

            <Link
                href={receiptId ? `/receipts/${receiptId}` : '#'}
                onClick={(e) => !receiptId && e.preventDefault()}
                prefetch={false}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition whitespace-nowrap ${isActive('/receipts')
                    ? 'border-indigo-600 text-indigo-600 font-medium bg-indigo-50'
                    : receiptId
                        ? 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        : 'border-transparent text-gray-300 cursor-not-allowed'
                    }`}
            >
                <CheckCircle size={18} />
                ใบเสร็จรับเงิน (Receipt)
                {!receiptId && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 ml-1">Not Created</span>}
            </Link>
        </div>
    );
}
