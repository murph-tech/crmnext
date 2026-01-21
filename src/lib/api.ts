import {
    AuthResponse,
    User,
    DashboardStats,
    Lead,
    Contact,
    Deal,
    Activity,
    Product,
    SalesPerformance,
    Reminder,
    SystemSetting,
    PipelineOverview
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FetchOptions extends RequestInit {
    token?: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: FetchOptions = {}
    ): Promise<T> {
        const { token, ...fetchOptions } = options;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...fetchOptions,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Throw the whole object but ensure message is set
            const error = {
                ...errorData,
                message: errorData.error || `HTTP error! status: ${response.status}`
            };
            throw error;
        }

        return response.json();
    }

    // Auth
    async login(username: string, password: string) {
        return this.request<AuthResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    }

    async register(email: string, password: string, name: string) {
        return this.request<AuthResponse>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
        });
    }

    async getMe(token: string) {
        return this.request<User>('/api/auth/me', { token });
    }

    async updateProfile(token: string, data: Partial<User>) {
        return this.request<User>('/api/auth/me', {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async changePassword(token: string, data: { currentPassword?: string; newPassword: string }) {
        return this.request<{ message: string }>('/api/auth/password', {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    // Dashboard
    async getDashboardStats(token: string, timeframe?: string) {
        const query = timeframe ? `?timeframe=${timeframe}` : '';
        return this.request<DashboardStats>(`/api/dashboard/stats${query}`, { token });
    }

    async getRecentActivity(token: string, timeframe?: string) {
        const query = timeframe ? `?timeframe=${timeframe}` : '';
        return this.request<Activity[]>(`/api/dashboard/recent-activity${query}`, { token });
    }

    async getPipelineOverview(token: string) {
        return this.request<PipelineOverview[]>('/api/dashboard/pipeline-overview', { token });
    }

    async getSalesPerformance(token: string) {
        return this.request<SalesPerformance[]>('/api/dashboard/sales-performance', { token });
    }

    async getReminders(token: string) {
        return this.request<Reminder[]>('/api/dashboard/reminders', { token });
    }

    async getWonDeals(token: string, timeframe: string = 'week') {
        return this.request<{ name: string; won: number; lost: number }[]>(`/api/dashboard/won-deals?timeframe=${timeframe}`, { token });
    }

    async getDealsCount(token: string, timeframe: string = 'week') {
        return this.request<{ name: string; new: number; won: number }[]>(`/api/dashboard/deals-count?timeframe=${timeframe}`, { token });
    }

    // Leads
    async getLeads(token: string, params?: { status?: string; search?: string; ownerId?: string }) {
        const filteredParams = params
            ? Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
            )
            : {};
        const query = Object.keys(filteredParams).length
            ? `?${new URLSearchParams(filteredParams as any)}`
            : '';
        return this.request<Lead[]>(`/api/leads${query}`, { token });
    }

    async getLead(token: string, id: string) {
        return this.request<Lead>(`/api/leads/${id}`, { token });
    }

    async createLead(token: string, data: Partial<Lead>) {
        return this.request<Lead>('/api/leads', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async updateLead(token: string, id: string, data: Partial<Lead>) {
        return this.request<Lead>(`/api/leads/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteLead(token: string, id: string) {
        return this.request<{ message: string }>(`/api/leads/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    async convertLead(token: string, id: string) {
        return this.request<{ message: string; contactId?: string; dealId?: string }>(`/api/leads/${id}/convert`, {
            method: 'POST',
            token,
        });
    }

    // Contacts
    async getContacts(token: string, params?: { search?: string; ownerId?: string }) {
        const filteredParams = params
            ? Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
            )
            : {};
        const query = Object.keys(filteredParams).length
            ? `?${new URLSearchParams(filteredParams as any)}`
            : '';
        return this.request<Contact[]>(`/api/contacts${query}`, { token });
    }

    async createContact(token: string, data: Partial<Contact>) {
        return this.request<Contact>('/api/contacts', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async updateContact(token: string, id: string, data: Partial<Contact>) {
        return this.request<Contact>(`/api/contacts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteContact(token: string, id: string) {
        return this.request<{ message: string }>(`/api/contacts/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    // Deals
    async getDeals(token: string, params?: { stage?: string; ownerId?: string }) {
        const filteredParams = params
            ? Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
            )
            : {};
        const query = Object.keys(filteredParams).length
            ? `?${new URLSearchParams(filteredParams as any)}`
            : '';
        return this.request<Deal[]>(`/api/deals${query}`, { token });
    }

    async getPipeline(token: string, search?: string) {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return this.request<Deal[]>(`/api/deals/pipeline${query}`, { token });
    }

    async getDeal(token: string, id: string) {
        return this.request<Deal>(`/api/deals/${id}`, { token });
    }

    async generateQuotation(token: string, id: string) {
        return this.request<Deal>(`/api/deals/${id}/quotation`, {
            method: 'POST',
            token
        });
    }

    async approveQuotation(token: string, id: string) {
        return this.request<Deal>(`/api/deals/${id}/approve`, {
            method: 'POST',
            token
        });
    }


    async addDealItem(token: string, dealId: string, data: any) {
        return this.request<Deal>(`/api/deals/${dealId}/items`, {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async removeDealItem(token: string, dealId: string, itemId: string) {
        return this.request<Deal>(`/api/deals/${dealId}/items/${itemId}`, {
            method: 'DELETE',
            token,
        });
    }

    async updateDealItem(token: string, dealId: string, itemId: string, data: { price?: number; quantity?: number; discount?: number; name?: string; description?: string }) {
        return this.request<Deal>(`/api/deals/${dealId}/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async createDeal(token: string, data: Partial<Deal>) {
        return this.request<Deal>('/api/deals', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async updateDeal(token: string, id: string, data: Partial<Deal>) {
        return this.request<Deal>(`/api/deals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async exportDeals(token: string, filters?: { stage?: string; ownerId?: string }) {
        const query = new URLSearchParams();
        if (filters?.stage) query.append('stage', filters.stage);
        if (filters?.ownerId) query.append('ownerId', filters.ownerId);

        const response = await fetch(`${this.baseUrl}/api/deals/export/csv?${query.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to export deals');
        }

        return response.blob();
    }

    async deleteDeal(token: string, id: string) {
        return this.request<{ message: string }>(`/api/deals/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    async updateDealStage(token: string, id: string, stage: string) {
        return this.request<Deal>(`/api/deals/${id}/stage`, {
            method: 'PATCH',
            body: JSON.stringify({ stage }),
            token,
        });
    }

    // Activities
    async getActivities(token: string) {
        return this.request<Activity[]>('/api/activities', { token });
    }

    async getUpcomingActivities(token: string) {
        return this.request<Activity[]>('/api/activities/upcoming', { token });
    }

    async createActivity(token: string, data: Partial<Activity>) {
        return this.request<Activity>('/api/activities', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async completeActivity(token: string, id: string) {
        return this.request<Activity>(`/api/activities/${id}/complete`, {
            method: 'PATCH',
            token,
        });
    }

    async updateActivity(token: string, id: string, data: Partial<Activity>) {
        return this.request<Activity>(`/api/activities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteActivity(token: string, id: string) {
        return this.request<{ message: string }>(`/api/activities/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    // Products
    async getProducts(token: string) {
        return this.request<Product[]>('/api/products', { token });
    }

    async createProduct(token: string, data: Partial<Product>) {
        return this.request<Product>('/api/products', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async updateProduct(token: string, id: string, data: Partial<Product>) {
        return this.request<Product>(`/api/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteProduct(token: string, id: string) {
        return this.request<{ message: string }>(`/api/products/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    // Settings
    async getSettings(token: string) {
        return this.request<Record<string, any>>('/api/settings', { token });
    }

    async saveSetting(token: string, key: string, value: any) {
        return this.request<any>('/api/settings', {
            method: 'POST',
            body: JSON.stringify({ key, value }),
            token,
        });
    }

    async testEmail(token: string, config: any) {
        return this.request<{ message: string }>('/api/settings/email/test', {
            method: 'POST',
            body: JSON.stringify(config),
            token,
        });
    }

    // Users (Admin only)
    async getUsers(token: string) {
        return this.request<User[]>('/api/users', { token });
    }

    async getUser(token: string, id: string) {
        return this.request<User>(`/api/users/${id}`, { token });
    }

    async createUser(token: string, data: { username: string; email: string; password: string; name: string; role?: string }) {
        return this.request<User>('/api/users', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async updateUser(token: string, id: string, data: { email?: string; name?: string; role?: string; password?: string }) {
        return this.request<User>(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteUser(token: string, id: string) {
        return this.request<{ message: string }>(`/api/users/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    // Documents
    async createInvoice(token: string, dealId: string) {
        return this.request<any>(`/api/deals/${dealId}/invoice`, {
            method: 'POST',
            token,
        });
    }

    async getInvoice(token: string, id: string) {
        return this.request<any>(`/api/invoices/${id}`, {
            token,
        });
    }

    async updateInvoice(token: string, id: string, data: any) {
        return this.request<any>(`/api/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async syncInvoiceItems(token: string, invoiceId: string) {
        return this.request<any>(`/api/invoices/${invoiceId}/sync-items`, {
            method: 'POST',
            token,
        });
    }

    async createReceipt(token: string, invoiceId: string) {
        return this.request<any>(`/api/invoices/${invoiceId}/receipt`, {
            method: 'POST',
            token,
        });
    }

    async getReceipt(token: string, id: string) {
        return this.request<any>(`/api/receipts/${id}`, {
            token,
        });
    }

    async updateReceipt(token: string, id: string, data: any) {
        return this.request<any>(`/api/receipts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async confirmInvoice(token: string, id: string) {
        return this.request<any>(`/api/invoices/${id}/confirm`, {
            method: 'POST',
            token,
        });
    }

    async confirmReceipt(token: string, id: string) {
        return this.request<any>(`/api/receipts/${id}/confirm`, {
            method: 'POST',
            token,
        });
    }
}

export const api = new ApiClient(API_URL);
export default api;
