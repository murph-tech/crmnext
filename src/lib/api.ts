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
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    // Auth
    async login(email: string, password: string) {
        return this.request<{ user: any; token: string }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async register(email: string, password: string, name: string) {
        return this.request<{ user: any; token: string }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name }),
        });
    }

    async getMe(token: string) {
        return this.request<any>('/api/auth/me', { token });
    }

    async updateProfile(token: string, data: { name?: string; email?: string }) {
        return this.request<any>('/api/auth/me', {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async changePassword(token: string, data: any) {
        return this.request<any>('/api/auth/password', {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    // Dashboard
    async getDashboardStats(token: string) {
        return this.request<any>('/api/dashboard/stats', { token });
    }

    async getRecentActivity(token: string) {
        return this.request<any[]>('/api/dashboard/recent-activity', { token });
    }

    async getPipelineOverview(token: string) {
        return this.request<any[]>('/api/dashboard/pipeline-overview', { token });
    }

    async getReminders(token: string) {
        return this.request<any[]>('/api/dashboard/reminders', { token });
    }

    // Leads
    async getLeads(token: string, params?: { status?: string; search?: string }) {
        const filteredParams = params
            ? Object.fromEntries(
                Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
            )
            : {};
        const query = Object.keys(filteredParams).length
            ? `?${new URLSearchParams(filteredParams as any)}`
            : '';
        return this.request<any[]>(`/api/leads${query}`, { token });
    }

    async getLead(token: string, id: string) {
        return this.request<any>(`/api/leads/${id}`, { token });
    }

    async createLead(token: string, data: any) {
        return this.request<any>('/api/leads', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async updateLead(token: string, id: string, data: any) {
        return this.request<any>(`/api/leads/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteLead(token: string, id: string) {
        return this.request<any>(`/api/leads/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    async convertLead(token: string, id: string) {
        return this.request<any>(`/api/leads/${id}/convert`, {
            method: 'POST',
            token,
        });
    }

    // Contacts
    async getContacts(token: string, search?: string) {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return this.request<any[]>(`/api/contacts${query}`, { token });
    }

    async createContact(token: string, data: any) {
        return this.request<any>('/api/contacts', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async updateContact(token: string, id: string, data: any) {
        return this.request<any>(`/api/contacts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteContact(token: string, id: string) {
        return this.request<any>(`/api/contacts/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    // Deals
    async getDeals(token: string, stage?: string) {
        const query = stage ? `?stage=${stage}` : '';
        return this.request<any[]>(`/api/deals${query}`, { token });
    }

    async getPipeline(token: string, search?: string) {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return this.request<any[]>(`/api/deals/pipeline${query}`, { token });
    }

    async getDeal(token: string, id: string) {
        return this.request<any>(`/api/deals/${id}`, { token });
    }

    async addDealItem(token: string, dealId: string, data: any) {
        return this.request<any>(`/api/deals/${dealId}/items`, {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async removeDealItem(token: string, dealId: string, itemId: string) {
        return this.request<any>(`/api/deals/${dealId}/items/${itemId}`, {
            method: 'DELETE',
            token,
        });
    }

    async createDeal(token: string, data: any) {
        return this.request<any>('/api/deals', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async updateDeal(token: string, id: string, data: any) {
        return this.request<any>(`/api/deals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteDeal(token: string, id: string) {
        return this.request<any>(`/api/deals/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    async updateDealStage(token: string, id: string, stage: string) {
        return this.request<any>(`/api/deals/${id}/stage`, {
            method: 'PATCH',
            body: JSON.stringify({ stage }),
            token,
        });
    }

    // Activities
    async getActivities(token: string) {
        return this.request<any[]>('/api/activities', { token });
    }

    async getUpcomingActivities(token: string) {
        return this.request<any[]>('/api/activities/upcoming', { token });
    }

    async createActivity(token: string, data: any) {
        return this.request<any>('/api/activities', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async completeActivity(token: string, id: string) {
        return this.request<any>(`/api/activities/${id}/complete`, {
            method: 'PATCH',
            token,
        });
    }

    async updateActivity(token: string, id: string, data: any) {
        return this.request<any>(`/api/activities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteActivity(token: string, id: string) {
        return this.request<any>(`/api/activities/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    // Products
    async getProducts(token: string) {
        return this.request<any[]>('/api/products', { token });
    }

    async createProduct(token: string, data: any) {
        return this.request<any>('/api/products', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async updateProduct(token: string, id: string, data: any) {
        return this.request<any>(`/api/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteProduct(token: string, id: string) {
        return this.request<any>(`/api/products/${id}`, {
            method: 'DELETE',
            token,
        });
    }

    // Settings
    async getSettings(token: string) {
        return this.request<any>('/api/settings', { token });
    }

    async saveSetting(token: string, key: string, value: any) {
        return this.request<any>('/api/settings', {
            method: 'POST',
            body: JSON.stringify({ key, value }),
            token,
        });
    }

    async testEmail(token: string, config: any) {
        return this.request<any>('/api/settings/email/test', {
            method: 'POST',
            body: JSON.stringify(config),
            token,
        });
    }

    // Users (Admin only)
    async getUsers(token: string) {
        return this.request<any[]>('/api/users', { token });
    }

    async getUser(token: string, id: string) {
        return this.request<any>(`/api/users/${id}`, { token });
    }

    async createUser(token: string, data: { email: string; password: string; name: string; role?: string }) {
        return this.request<any>('/api/users', {
            method: 'POST',
            body: JSON.stringify(data),
            token,
        });
    }

    async updateUser(token: string, id: string, data: { email?: string; name?: string; role?: string; password?: string }) {
        return this.request<any>(`/api/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token,
        });
    }

    async deleteUser(token: string, id: string) {
        return this.request<any>(`/api/users/${id}`, {
            method: 'DELETE',
            token,
        });
    }
}

export const api = new ApiClient(API_URL);
export default api;
