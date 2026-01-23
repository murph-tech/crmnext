export interface User {
    id: string;
    username?: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'USER' | 'MANAGER';
    avatar?: string;
    preferences?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

export interface DashboardStats {
    totalRevenue: number;
    newLeads: number;
    activeDeals: number;
    conversionRate: number;
    totalLeads: number;
    totalContacts: number;
    totalDeals: number;
    closedWonCount: number;
    dealsProgress: number;
    taskCompletionRate: number;
}

export interface Lead {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    taxId?: string;
    address?: string;
    status: string; // e.g., 'NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED'
    source?: string;
    notes?: string;
    ownerId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    taxId?: string;
    address?: string;
    city?: string;
    country?: string;
    notes?: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        deals: number;
        activities: number;
    };
}



export interface Deal {
    id: string;
    title: string;
    value: number;
    currency: string;
    ownerId?: string;
    owner?: User;
    stage: string;
    probability: number;
    expectedCloseDate?: string;
    contactId?: string;
    contact?: Contact;
    items?: DealItem[];
    activities?: Activity[];
    notes?: string;
    // Quotation fields
    quotationNumber?: string;
    quotationDate?: string;
    validUntil?: string;
    creditTerm?: number;
    // Quotation customization
    quotationDiscount?: number;
    quotationVatRate?: number;
    quotationWhtRate?: number;
    quotationThemeColor?: string;
    quotationTerms?: string;
    quotationStatus?: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
    // Customer override
    quotationCustomerName?: string;
    quotationCustomerAddress?: string;
    quotationCustomerTaxId?: string;
    quotationCustomerPhone?: string;
    quotationCustomerEmail?: string;
    // Customer Approval
    quotationApproved?: boolean;
    quotationApprovedAt?: string;
    // Timestamps
    createdAt: string;
    updatedAt: string;
    // Relations
    invoice?: Invoice;
}

export interface DealItem {
    id: string;
    description: string;
    quantity: number;
    price: number;
    discount: number;
    dealId: string;
    product?: Product;
}

export interface Activity {
    id: string;
    type: 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'NOTE' | 'DEADLINE';
    title: string;
    description?: string;
    dueDate?: string;
    completed: boolean;
    completedAt?: string | null;
    leadId?: string;
    dealId?: string;
    contactId?: string;
    lead?: Lead;
    deal?: Deal;
    contact?: Contact;
    createdAt: string;
    updatedAt: string;
}

export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    sku?: string;
    category?: string;
    type: 'INVENTORY' | 'SERVICE';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface SalesPerformance {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    deals: number;
    contacts: number;
    leads: number;
}

export interface Reminder {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    type: string;
    lead?: Lead;
    deal?: Deal;
    createdAt: string;
    reminderAt: string;
}

export interface SystemSetting {
    id: string;
    key: string;
    value: any;
    updatedAt: string;
}

export interface PipelineOverview {
    stage: string;
    count: number;
    value: number;
}

export interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    amount: number;
    invoiceId: string;
}

export interface Invoice {
    id: string;
    invoiceNumber: string; // IV-YYYYMM-XXXX
    date: string;
    dueDate: string;

    companyName: string;
    companyAddress: string;
    companyTaxId: string;
    companyPhone?: string;

    customerName: string;
    customerAddress: string;
    customerTaxId?: string;
    customerPhone?: string;
    customerEmail?: string;

    subtotal: number;
    discount: number;
    vatRate: number;
    vatAmount: number;
    grandTotal: number;
    whtRate: number;
    whtAmount: number;
    netTotal: number;

    status: 'DRAFT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    notes?: string;

    items?: InvoiceItem[];

    dealId: string;
    deal?: Deal;
    receipt?: Receipt;
}

export interface Receipt {
    id: string;
    receiptNumber: string; // RE-YYYYMM-XXXX
    date: string;

    companyName: string;
    companyAddress: string;
    companyTaxId: string;
    companyPhone?: string;

    customerName: string;
    customerAddress: string;
    customerTaxId?: string;

    grandTotal: number;
    whtAmount: number;
    netTotal: number;
    paymentMethod?: string;
    paymentDate?: string;

    invoiceId: string;
    invoice?: Invoice;
}

export interface CompanySummary {
    name: string;
    contactCount: number;
    activeDealsCount: number;
    wonDealsCount: number;
    totalDealsValue: number;
}

export interface CompanyDetail {
    name: string;
    contacts: Contact[];
    deals: Deal[];
    summary: {
        contactCount: number;
        totalDealsValue: number;
        activeDealsCount: number;
        wonDealsCount: number;
    };
}
