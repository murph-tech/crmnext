import React from 'react';
import { CompanyInfo, getTranslation, Language } from '@/lib/document-utils';

type DocumentType = 'quotation' | 'invoice' | 'receipt';

interface DocumentHeaderProps {
    companyInfo: CompanyInfo;
    documentType: DocumentType;
    docNumber: string;
    themeColor: string;
    showOriginal?: boolean;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
    companyInfo,
    documentType,
    docNumber,
    themeColor,
    showOriginal = true,
    language = 'th'
}) => {
    const titleEn = getTranslation(documentType, 'en');
    const titleTh = getTranslation(documentType, 'th');
    return (
        <div className="mb-2">
            {/* Compact Header: Company Info + Stamp Space + Document Title */}
            <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center flex-1 max-w-[50%]">
                    {companyInfo.companyLogo ? (
                        <img src={companyInfo.companyLogo} alt="Logo" className="w-[35px] h-[35px] object-contain" />
                    ) : (
                        <div className="w-[35px] h-[35px] rounded flex items-center justify-center text-white text-[5pt] font-bold leading-tight text-center" style={{ backgroundColor: themeColor }}>
                            MURPH<br />TECH
                        </div>
                    )}
                    <div className="text-[6pt] leading-tight">
                        <div className="font-bold text-[10pt]" style={{ color: themeColor }}>Murph Technology Co.,Ltd</div>
                        <div className="text-gray-700 text-[5pt]">
                            69/43 Village No. 3, Bang Yai Subdistrict, Bang Yai District, Nonthaburi 11140
                        </div>
                        <div className="text-gray-700 text-[5pt]">
                            เลขที่ผู้เสียภาษี 0105567026446 | โทร: 0941843614
                        </div>
                    </div>
                </div>

                {/* Center space for stamp */}
                <div className="flex justify-center items-center min-h-[55px] min-w-[90px] flex-shrink-0">
                    {/* Stamp placeholder */}
                </div>

                <div className="flex flex-col items-end flex-1 max-w-[40%]">
                    {showOriginal && <div className="text-[6pt] text-gray-500 mb-0.5">ต้นฉบับ / Original</div>}
                    <div className="flex border-2 overflow-hidden" style={{ borderColor: themeColor }}>
                        <div className={`px-3 py-2 text-white text-center grid grid-rows-2 gap-0 ${documentType === 'invoice' ? 'min-w-[180px]' : 'min-w-[100px]'}`} style={{ backgroundColor: themeColor }}>
                            <div className="text-[11pt] font-bold flex items-center justify-center">
                                {titleEn}
                            </div>
                            <div className="text-[7pt] flex items-center justify-center border-t border-white/20 pt-0.5">
                                {titleTh}
                            </div>
                        </div>
                        <div className={`px-3 py-2 flex items-center justify-center bg-white ${documentType === 'invoice' ? 'min-w-[130px]' : 'min-w-[100px]'}`}>
                            <span className="text-[10pt] font-bold" style={{ color: themeColor }}>{docNumber}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
