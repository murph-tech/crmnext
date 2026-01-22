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
                        {companyInfo.companyStamp ? (
                            <img src={companyInfo.companyStamp} alt="Company Stamp" className="h-20 object-contain mb-[-10px] z-10 relative" />
                        ) : companyInfo.companyLogo ? (
                            <img src={companyInfo.companyLogo} alt="Logo" className="h-10 object-contain mb-1 opacity-50 grayscale" />
                        ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-[6pt] text-gray-300 font-bold">Seal</div>
                        )}
                        <div className="text-[6pt] text-gray-400 mt-2">(ประทับตราบริษัท / Seal)</div>
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
