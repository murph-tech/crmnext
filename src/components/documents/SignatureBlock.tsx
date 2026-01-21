import React, { ReactNode } from 'react';
import { CompanyInfo } from '@/lib/document-utils';

interface SignatureBlockProps {
    companyInfo: CompanyInfo;
    themeColor: string;
    leftLabel?: string;
    leftSubLabel?: string;
    leftDateLabel?: string;
    rightLabel?: string;
    rightSubLabel?: string;
    rightDate?: string; // formatted date string
    renderCenter?: () => ReactNode;
}

export const SignatureBlock: React.FC<SignatureBlockProps> = ({
    companyInfo,
    themeColor,
    leftLabel = 'ผู้อนุมัติสั่งซื้อ / Customer Signature',
    leftDateLabel = 'วันที่ / Date ________________',
    rightLabel = 'ผู้มีอำนาจลงนาม / Authorized Signature',
    rightDate,
    renderCenter
}) => {
    return (
        <div className="flex justify-between items-end px-4 mb-2">
            <div className="text-center w-[150px]">
                <div className="border-b-2 border-dashed border-gray-400 h-12 mb-1"></div>
                <div className="font-bold text-[8pt]">{leftLabel}</div>
                <div className="text-[7pt] text-gray-500 mt-1">{leftDateLabel}</div>
            </div>

            <div className="flex flex-col items-center justify-center">
                {renderCenter ? renderCenter() : (
                    <>
                        {companyInfo.companyLogo ? (
                            <img src={companyInfo.companyLogo} alt="Logo" className="h-10 object-contain mb-1" />
                        ) : (
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-[6pt] text-white font-bold" style={{ backgroundColor: themeColor }}>LOGO</div>
                        )}
                        <div className="text-[7pt] font-bold text-gray-600 uppercase">MURPH TECHNOLOGY CO.,LTD.</div>
                        <div className="text-[6pt] text-gray-400">(ประทับตราบริษัท / Seal)</div>
                    </>
                )}
            </div>

            <div className="text-center w-[150px]">
                <div className="border-b-2 border-dashed border-gray-400 h-12 mb-1 relative">
                </div>
                <div className="font-bold text-[8pt]">{rightLabel}</div>
                <div className="text-[7pt] text-gray-500 mt-1">
                    วันที่ / Date {rightDate ? <span className="underline decoration-dashed decoration-gray-400">{rightDate}</span> : '_______/_______/_______'}
                </div>
            </div>
        </div>
    );
};
