export const formatMoney = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '0.00';
    return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

export const formatDateTh = (dateStr?: string | Date | null) => {
    if (!dateStr) return '-';
    // If it's already a Date object
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);

    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatDateForInput = (dateStr?: string | Date | null) => {
    if (!dateStr) return '';
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
};

export const formatDateTimeTh = (dateStr?: string | Date | null) => {
    if (!dateStr) return '-';
    const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export interface CompanyInfo {
    companyName: string;
    companyAddress: string;
    companyTaxId: string;
    companyPhone: string;
    companyEmail: string;
    companyLogo?: string;
    companyStamp?: string;
    bankAccount: string;
    bankName: string;
}

export const getCompanyInfo = (settings: any, documentContext?: any): CompanyInfo => {
    const companyInfoSetting = settings?.company_info || {};

    // Priority: document specific (if valid string) > settings > hardcoded fallback
    return {
        companyName: documentContext?.companyName || companyInfoSetting.company_name_th || '',
        companyAddress: documentContext?.companyAddress || companyInfoSetting.company_address_th || '',
        companyTaxId: documentContext?.companyTaxId || companyInfoSetting.company_tax_id || '',
        companyPhone: documentContext?.companyPhone || companyInfoSetting.company_phone || '',
        companyEmail: companyInfoSetting.company_email || '',
        companyLogo: companyInfoSetting.company_logo || settings?.branding?.logo || '',
        companyStamp: companyInfoSetting.company_stamp || '',
        bankAccount: companyInfoSetting.bank_account || '',
        bankName: companyInfoSetting.bank_name || ''
    };
};
