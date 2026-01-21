import React, { ReactNode } from 'react';
import { CompanyInfo } from '@/lib/document-utils';

interface DocumentLayoutProps {
    children: ReactNode;
    companyInfo: CompanyInfo;
    themeColor: string;
    footerText?: string;
}

export const DocumentLayout: React.FC<DocumentLayoutProps & { paperClass?: string }> = ({
    children,
    companyInfo,
    themeColor,
    paperClass = 'quotation-paper'
}) => {
    return (
        <div className={`${paperClass} max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[8mm] text-[9pt] text-gray-900 relative flex flex-col`}>
            {children}

            {/* FOOTER */}
            <div className="mt-auto">
                <div className="w-full text-white text-[7pt] py-1.5 px-3 flex justify-between items-center" style={{ backgroundColor: themeColor }}>
                    <span className="font-medium">{companyInfo.companyName}</span>
                    <span>{companyInfo.companyAddress} เลขที่ผู้เสียภาษี {companyInfo.companyTaxId} (สำนักงานใหญ่) โทร. {companyInfo.companyPhone}</span>
                </div>
                <div className="text-[7pt] text-gray-500 mt-1">หน้า 1 / 1</div>
            </div>
        </div>
    );
};
