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

export type Language = 'th' | 'en';

export const documentTranslations = {
    // Quotation
    quotation: { th: 'ใบเสนอราคา', en: 'Quotation' },
    quotationNumber: { th: 'เลขที่ใบเสนอราคา', en: 'Quotation No.' },
    issueDate: { th: 'วันที่', en: 'Issue Date' },
    customerName: { th: 'ชื่อลูกค้า', en: 'Customer Name' },
    taxId: { th: 'เลขที่ผู้เสียภาษี', en: 'Tax ID' },
    address: { th: 'ที่อยู่', en: 'Address' },
    phone: { th: 'โทร', en: 'Phone' },
    salesman: { th: 'พนักงานขาย', en: 'Salesman' },
    creditTerm: { th: 'การชำระเงิน', en: 'Credit Term' },
    contactNo: { th: 'เบอร์ติดต่อ', en: 'Contact No.' },
    contactName: { th: 'ผู้ติดต่อ', en: 'Contact Name' },
    email: { th: 'อีเมล', en: 'E-mail' },
    projectName: { th: 'ชื่อโปรเจกต์', en: 'Project Name' },
    no: { th: 'เลขที่', en: 'No.' },
    description: { th: 'รายการ', en: 'Description' },
    quantity: { th: 'จำนวน', en: 'Quantity' },
    unitPrice: { th: 'ราคา/หน่วย', en: 'Unit Price' },
    discount: { th: 'ส่วนลด', en: 'Discount' },
    amount: { th: 'จำนวนเงิน (THB)', en: 'Amount' },
    subtotal: { th: 'ยอดรวม', en: 'Subtotal' },
    specialDiscount: { th: 'ส่วนลดพิเศษ', en: 'Special Discount' },
    vat: { th: 'ภาษีมูลค่าเพิ่ม', en: 'VAT' },
    withholdingTax: { th: 'หัก ณ ที่จ่าย', en: 'Withholding Tax' },
    netTotal: { th: 'ยอดรวมสุทธิ', en: 'Net Total' },
    amountInWords: { th: 'จำนวนเงินเป็นตัวอักษร', en: 'Amount in Words' },
    authorizedSignature: { th: 'ผู้มีอำนาจลงนาม', en: 'Authorized Signature' },
    original: { th: 'ต้นฉบับ', en: 'Original' },

    // Invoice
    invoice: { th: 'ใบกำกับภาษี/ใบวางบิล/ใบส่งของ', en: 'Tax Invoice/Invoice/Dn' },
    invoiceNumber: { th: 'เลขที่ใบวางบิล', en: 'Invoice No.' },

    // Receipt
    receipt: { th: 'ใบเสร็จรับเงิน', en: 'Receipt' },
    receiptNumber: { th: 'เลขที่ใบเสร็จ', en: 'Receipt No.' },
    paymentMethod: { th: 'วิธีการชำระเงิน', en: 'Payment Method' },
    paymentDate: { th: 'วันที่ชำระเงิน', en: 'Payment Date' },
};

export const getTranslation = (key: keyof typeof documentTranslations, language: Language): string => {
    return documentTranslations[key][language] || documentTranslations[key].th;
};

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
