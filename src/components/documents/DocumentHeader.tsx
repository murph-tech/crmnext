import React from 'react';
import { CompanyInfo } from '@/lib/document-utils';

interface DocumentHeaderProps {
    companyInfo: CompanyInfo;
    titleEn: string;
    titleTh: string;
    docNumber: string;
    themeColor: string;
    showOriginal?: boolean;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
    companyInfo,
    titleEn,
    titleTh,
    docNumber,
    themeColor,
    showOriginal = true
}) => {
    return (
        <div className="flex justify-between items-start mb-2">
            <div className="flex gap-3 items-start">
                {companyInfo.companyLogo ? (
                    <img src={companyInfo.companyLogo} alt="Logo" className="w-[50px] h-[50px] object-contain" />
                ) : (
                    <div className="w-[50px] h-[50px] rounded flex items-center justify-center text-white text-[7pt] font-bold leading-tight text-center" style={{ backgroundColor: themeColor }}>
                        MURPH<br />TECHNOLOGY
                    </div>
                )}
                <div className="text-[9pt]">
                    <h1 className="text-[14pt] font-bold" style={{ color: themeColor }}>{companyInfo.companyName}</h1>
                    <p className="text-gray-700 leading-tight text-[8pt]">
                        {companyInfo.companyAddress}<br />
                        เลขที่ผู้เสียภาษี {companyInfo.companyTaxId} | (สำนักงานใหญ่)<br />
                        โทร: {companyInfo.companyPhone} | {companyInfo.companyEmail}
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-end">
                {showOriginal && <div className="text-[7pt] text-gray-500 mb-1">ต้นฉบับ / Original</div>}
                <div className="flex border-2 overflow-hidden" style={{ borderColor: themeColor }}>
                    <div className="px-4 py-3 text-white text-center min-w-[90px]" style={{ backgroundColor: themeColor }}>
                        <div className="text-[14pt] font-bold leading-none">{titleEn}</div>
                        <div className="text-[8pt]">{titleTh}</div>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center bg-white min-w-[100px]">
                        <span className="text-[12pt] font-bold" style={{ color: themeColor }}>{docNumber}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
