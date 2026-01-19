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
    // Customer override
    quotationCustomerName?: string;
    quotationCustomerAddress?: string;
    quotationCustomerTaxId?: string;
    quotationCustomerPhone?: string;
    quotationCustomerEmail?: string;
    // Timestamps
    createdAt: string;
    updatedAt: string;
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
