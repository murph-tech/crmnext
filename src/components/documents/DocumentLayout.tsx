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
                <div className="w-full text-white text-[7pt] py-3 px-3" style={{ backgroundColor: themeColor }}>
                    <div className="text-center leading-tight">
                        <div className="font-medium text-[8pt] mb-1">Murph Technology Co.,Ltd</div>
                        <div className="text-[6pt]">69/43 Village No. 3, Bang Yai Subdistrict, Bang Yai District, Nonthaburi 11140</div>
                        <div className="text-[6pt] mt-0.5 opacity-90">เลขที่ผู้เสียภาษี 0105567026446 | โทร: 0941843614</div>
                    </div>
                </div>
                <div className="text-[7pt] text-gray-500 mt-2 text-center">หน้า 1 / 1</div>
            </div>
        </div>
    );
};
