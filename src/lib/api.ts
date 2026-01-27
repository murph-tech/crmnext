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
    PipelineOverview,
    CompanySummary,
    CompanyDetail
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

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

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/lib/api.ts:request:start', message: 'api.request start', data: { baseUrl: this.baseUrl, endpoint, method: (fetchOptions as any)?.method || 'GET', hasToken: !!token, hasBody: typeof (fetchOptions as any)?.body === 'string' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion

        let response: Response;
        const url = `${this.baseUrl}${endpoint}`;
        try {
            response = await fetch(url, {
                ...fetchOptions,
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (e: any) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/lib/api.ts:request:fetch_error', message: 'api.request fetch threw', data: { url, name: e?.name, message: e?.message }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'B' }) }).catch(() => { });
            // #endregion
            throw e;
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/lib/api.ts:request:response', message: 'api.request got response', data: { url, status: response.status, ok: response.ok, contentType: response.headers.get('content-type') }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'C' }) }).catch(() => { });
        // #endregion

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/lib/api.ts:request:non_ok', message: 'api.request non-ok', data: { url, status: response.status, errorKeys: errorData && typeof errorData === 'object' ? Object.keys(errorData).slice(0, 10) : [], hasErrorField: !!(errorData as any)?.error }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'D' }) }).catch(() => { });
            // #endregion
            // Throw the whole object but ensure message is set
            const error = {
                ...errorData,
                message: errorData.error || `HTTP error! status: ${response.status}`
            };
            throw error;
        }

        const data = await response.json();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/082deaa4-153a-4a98-a990-54ae31ef6246', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'src/lib/api.ts:request:ok', message: 'api.request ok json parsed', data: { url, topLevelType: Array.isArray(data) ? 'array' : typeof data, keys: (data && typeof data === 'object' && !Array.isArray(data)) ? Object.keys(data).slice(0, 10) : undefined }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'pre-fix', hypothesisId: 'C' }) }).catch(() => { });
        // #endregion
        return data;
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
    private buildQuery(params?: Record<string, string | undefined>) {
        if (!params) return '';
        const filteredParams = Object.fromEntries(
            Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
        ) as Record<string, string>;
        const query = Object.keys(filteredParams).length
            ? `?${new URLSearchParams(filteredParams)}`
            : '';
        return query;
    }

    async getDashboardStats(
        token: string,
        opts?: { timeframe?: string; startDate?: string; endDate?: string }
    ) {
        const query = this.buildQuery(opts);
        return this.request<DashboardStats>(`/api/dashboard/stats${query}`, { token });
    }

    async getRecentActivity(
        token: string,
        opts?: { timeframe?: string; startDate?: string; endDate?: string }
    ) {
        const query = this.buildQuery(opts);
        return this.request<Activity[]>(`/api/dashboard/recent-activity${query}`, { token });
    }

    async getPipelineOverview(token: string) {
        return this.request<PipelineOverview[]>('/api/dashboard/pipeline-overview', { token });
    }

    async getSalesPerformance(
        token: string,
        opts?: { timeframe?: string; startDate?: string; endDate?: string }
    ) {
        const query = this.buildQuery(opts);
        return this.request<SalesPerformance[]>(`/api/dashboard/sales-performance${query}`, { token });
    }

    async getReminders(token: string) {
        return this.request<Reminder[]>('/api/dashboard/reminders', { token });
    }

    async getWonDeals(
        token: string,
        opts: { timeframe?: string; startDate?: string; endDate?: string; mode?: 'value' | 'count' } = { timeframe: 'week' }
    ) {
        const query = this.buildQuery(opts);
        return this.request<{ name: string; won: number; lost: number;[key: string]: any }[]>(`/api/dashboard/won-deals${query}`, { token });
    }

    async getDealsCount(
        token: string,
        opts: { timeframe?: string; startDate?: string; endDate?: string } = { timeframe: 'week' }
    ) {
        const query = this.buildQuery(opts);
        return this.request<{ name: string; new: number; won: number; lost: number }[]>(`/api/dashboard/deals-count${query}`, { token });
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
        try {
            return await this.request<Lead>('/api/leads', {
                method: 'POST',
                body: JSON.stringify(data),
                token,
            });
        } catch (error) {
            if (IS_DEVELOPMENT) {
                // Return mock created lead for development
                return {
                    id: `mock-lead-${Date.now()}`,
                    firstName: data.firstName || 'New',
                    lastName: data.lastName || 'Lead',
                    email: data.email || 'newlead@example.com',
                    phone: data.phone || '081-234-5678',
                    company: data.company || 'New Company',
                    jobTitle: data.jobTitle || 'Manager',
                    source: data.source || 'WEBSITE',
                    status: data.status || 'NEW',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ownerId: data.ownerId || 'mock-user-1',
                    owner: { name: 'Admin User' }
                };
            }
            throw error;
        }
    }

    async updateLead(token: string, id: string, data: Partial<Lead>) {
        try {
            return await this.request<Lead>(`/api/leads/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
                token,
            });
        } catch (error) {
            if (IS_DEVELOPMENT) {
                // Return mock updated lead for development
                return {
                    id,
                    firstName: data.firstName || 'Updated',
                    lastName: data.lastName || 'Lead',
                    email: data.email || 'updated@example.com',
                    phone: data.phone || '081-234-5678',
                    company: data.company || 'Updated Company',
                    jobTitle: data.jobTitle || 'Manager',
                    source: data.source || 'WEBSITE',
                    status: data.status || 'CONTACTED',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ownerId: data.ownerId || 'mock-user-1',
                    owner: { name: 'Admin User' }
                };
            }
            throw error;
        }
    }

    async deleteLead(token: string, id: string) {
        try {
            return await this.request<{ message: string }>(`/api/leads/${id}`, {
                method: 'DELETE',
                token,
            });
        } catch (error) {
            if (IS_DEVELOPMENT) {
                // Return mock delete response for development
                return { message: 'Lead deleted successfully' };
            }
            throw error;
        }
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
        try {
            return await this.request<Contact>('/api/contacts', {
                method: 'POST',
                body: JSON.stringify(data),
                token,
            });
        } catch (error) {
            if (IS_DEVELOPMENT) {
                // Return mock created contact for development
                return {
                    id: `mock-contact-${Date.now()}`,
                    firstName: data.firstName || 'New',
                    lastName: data.lastName || 'Contact',
                    email: data.email || 'newcontact@example.com',
                    phone: data.phone || '081-234-5678',
                    company: data.company || 'New Company',
                    jobTitle: data.jobTitle || 'Manager',
                    createdAt: new Date().toISOString(),
                    ownerId: data.ownerId || 'mock-user-1',
                    owner: { name: 'Admin User' }
                };
            }
            throw error;
        }
    }

    async updateContact(token: string, id: string, data: Partial<Contact>) {
        try {
            return await this.request<Contact>(`/api/contacts/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
                token,
            });
        } catch (error) {
            if (IS_DEVELOPMENT) {
                // Return mock updated contact for development
                return {
                    id,
                    firstName: data.firstName || 'Updated',
                    lastName: data.lastName || 'Contact',
                    email: data.email || 'updated@example.com',
                    phone: data.phone || '081-234-5678',
                    company: data.company || 'Updated Company',
                    jobTitle: data.jobTitle || 'Manager',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ownerId: data.ownerId || 'mock-user-1',
                    owner: { name: 'Admin User' }
                };
            }
            throw error;
        }
    }

    async deleteContact(token: string, id: string) {
        try {
            return await this.request<{ message: string }>(`/api/contacts/${id}`, {
                method: 'DELETE',
                token,
            });
        } catch (error) {
            if (IS_DEVELOPMENT) {
                // Return mock delete response for development
                return { message: 'Contact deleted successfully' };
            }
            throw error;
        }
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

    async deleteQuotation(token: string, id: string) {
        return this.request<Deal>(`/api/deals/${id}/quotation`, {
            method: 'DELETE',
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
        try {
            return await this.request<Deal>('/api/deals', {
                method: 'POST',
                body: JSON.stringify(data),
                token,
            });
        } catch (error) {
            if (IS_DEVELOPMENT) {
                // Return mock created deal for development
                return {
                    id: `mock-deal-${Date.now()}`,
                    title: data.title || 'New Deal',
                    value: data.value || 0,
                    currency: data.currency || 'THB',
                    stage: data.stage || 'LEAD',
                    probability: data.probability || 0,
                    createdAt: new Date().toISOString(),
                    ownerId: data.ownerId || 'mock-user-1',
                    owner: { name: 'Admin User' },
                    contact: data.contact || {
                        id: 'mock-contact-1',
                        firstName: 'สมชาย',
                        lastName: 'ใจดี',
                        company: 'บริษัท ABC จำกัด'
                    }
                };
            }
            throw error;
        }
    }

    async updateDeal(token: string, id: string, data: Partial<Deal>) {
        try {
            return await this.request<Deal>(`/api/deals/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
                token,
            });
        } catch (error) {
            if (IS_DEVELOPMENT) {
                // Return mock updated deal for development
                return {
                    id,
                    title: data.title || 'Updated Deal',
                    value: data.value || 0,
                    currency: data.currency || 'THB',
                    stage: data.stage || 'LEAD',
                    probability: data.probability || 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ownerId: data.ownerId || 'mock-user-1',
                    owner: { name: 'Admin User' },
                    contact: data.contact || {
                        id: 'mock-contact-1',
                        firstName: 'สมชาย',
                        lastName: 'ใจดี',
                        company: 'บริษัท ABC จำกัด'
                    }
                };
            }
            throw error;
        }
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
        try {
            return await this.request<{ message: string }>(`/api/deals/${id}`, {
                method: 'DELETE',
                token,
            });
        } catch (error) {
            if (IS_DEVELOPMENT) {
                // Return mock delete response for development
                return { message: 'Deal deleted successfully' };
            }
            throw error;
        }
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

    // Calendar Integration
    async getCalendarAuthUrl(token: string) {
        return this.request<{ authUrl: string }>(`/api/calendar/auth/google`, {
            token,
        });
    }

    async getCalendarStatus(token: string) {
        return this.request<{
            connected: boolean;
            provider?: string;
            email?: string;
        }>(`/api/calendar/status`, {
            token,
        });
    }

    async disconnectCalendar(token: string) {
        return this.request<any>(`/api/calendar/disconnect`, {
            method: 'DELETE',
            token,
        });
    }

    async getCalendarEvents(token: string, start?: Date, end?: Date) {
        const params = new URLSearchParams();
        if (start) params.append('start', start.toISOString());
        if (end) params.append('end', end.toISOString());

        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request<any[]>(`/api/calendar/events${query}`, {
            token,
        });
    }

    async createCalendarEvent(token: string, eventData: any) {
        return this.request<any>(`/api/calendar/events`, {
            method: 'POST',
            body: JSON.stringify(eventData),
            token,
        });
    }

    async updateCalendarEvent(token: string, eventId: string, eventData: any) {
        return this.request<any>(`/api/calendar/events/${eventId}`, {
            method: 'PUT',
            body: JSON.stringify(eventData),
            token,
        });
    }

    async deleteCalendarEvent(token: string, eventId: string) {
        return this.request<any>(`/api/calendar/events/${eventId}`, {
            method: 'DELETE',
            token,
        });
    }

    async syncDealToCalendar(token: string, dealId: string, eventData: any) {
        return this.request<any>(`/api/calendar/sync/deal/${dealId}`, {
            method: 'POST',
            body: JSON.stringify(eventData),
            token,
        });
    }

    async getCalendarStats(token: string) {
        return this.request<{
            totalEvents: number;
            thisMonthEvents: number;
            upcomingEvents: number;
        }>(`/api/calendar/stats`, {
            token,
        });
    }

    // Integrations - Google Workspace
    async saveGoogleConfig(token: string, clientId: string, clientSecret: string) {
        return this.request<{ success: boolean }>('/api/integrations/google/config', {
            method: 'POST',
            body: JSON.stringify({ clientId, clientSecret }),
            token
        });
    }

    async getGoogleAuthUrl(token: string) {
        return this.request<{ url: string }>('/api/integrations/google/auth-url', { token });
    }

    async handleGoogleCallback(token: string, code: string) {
        return this.request<{ success: boolean; message: string }>('/api/integrations/google/callback', {
            method: 'POST',
            body: JSON.stringify({ code }),
            token
        });
    }

    async syncGoogleContacts(token: string) {
        return this.request<{ success: boolean; imported: number; totalFound: number }>('/api/integrations/google/contacts/sync', {
            method: 'POST',
            token
        });
    }

    async getGoogleIntegrationStatus(token: string) {
        return this.request<{ connected: boolean; lastSynced?: string }>('/api/integrations/google/status', { token });
    }

    // Companies
    async getCompanies(token: string, search?: string) {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        return this.request<CompanySummary[]>(`/api/companies${query}`, { token });
    }

    async getCompany(token: string, name: string) {
        return this.request<CompanyDetail>(`/api/companies/${encodeURIComponent(name)}`, { token });
    }

    // Purchase Orders
    async getPurchaseOrders(token: string) {
        return this.request<any[]>('/api/purchase-orders', { token });
    }

    async getPurchaseOrder(token: string, id: string) {
        return this.request<any>(`/api/purchase-orders/${id}`, { token });
    }

    async createPurchaseOrder(token: string, data: any) {
        return this.request<any>('/api/purchase-orders', {
            method: 'POST',
            body: JSON.stringify(data),
            token
        });
    }

    async updatePurchaseOrder(token: string, id: string, data: any) {
        return this.request<any>(`/api/purchase-orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
            token
        });
    }

    async deletePurchaseOrder(token: string, id: string) {
        return this.request<any>(`/api/purchase-orders/${id}`, {
            method: 'DELETE',
            token
        });
    }
}

export const api = new ApiClient(API_URL);
export default api;
