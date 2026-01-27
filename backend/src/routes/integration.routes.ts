import { Router } from 'express';
import { google } from 'googleapis';
import { prisma } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Helper to get config
const getGoogleConfig = async () => {
    // Try DB first
    const settings = await prisma.systemSetting.findMany({
        where: { key: { in: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'] } }
    });

    const dbConfig = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: JSON.parse(curr.value) }), {} as any);

    return {
        clientId: dbConfig.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
        clientSecret: dbConfig.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: dbConfig.GOOGLE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/settings/integrations/google/callback'
    };
};

router.use(authenticate);

// 0. Save Configuration
router.post('/google/config', async (req: AuthRequest, res) => {
    try {
        const { clientId, clientSecret } = req.body;

        // Save to SystemSettings
        await prisma.$transaction([
            prisma.systemSetting.upsert({
                where: { key: 'GOOGLE_CLIENT_ID' },
                update: { value: JSON.stringify(clientId) },
                create: { key: 'GOOGLE_CLIENT_ID', value: JSON.stringify(clientId) }
            }),
            prisma.systemSetting.upsert({
                where: { key: 'GOOGLE_CLIENT_SECRET' },
                update: { value: JSON.stringify(clientSecret) },
                create: { key: 'GOOGLE_CLIENT_SECRET', value: JSON.stringify(clientSecret) }
            })
        ]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// 1. Get Auth URL
router.get('/google/auth-url', async (req: AuthRequest, res) => {
    const config = await getGoogleConfig();

    if (!config.clientId || !config.clientSecret) {
        return res.status(400).json({
            error: 'Configuration Missing',
            code: 'MISSING_CONFIG'
        });
    }

    const oauth2Client = new google.auth.OAuth2(
        config.clientId,
        config.clientSecret,
        config.redirectUri
    );

    const scopes = [
        'https://www.googleapis.com/auth/contacts.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/calendar'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    });

    res.json({ url });
});

// 2. Callback & Token Exchange
router.post('/google/callback', async (req: AuthRequest, res) => {
    try {
        const { code } = req.body;
        const userId = req.user!.id;
        const config = await getGoogleConfig();

        const oauth2Client = new google.auth.OAuth2(
            config.clientId,
            config.clientSecret,
            config.redirectUri
        );

        const { tokens } = await oauth2Client.getToken(code);

        // Save tokens to user
        await prisma.user.update({
            where: { id: userId },
            data: {
                googleAccessToken: tokens.access_token,
                googleRefreshToken: tokens.refresh_token,
                googleTokenExpiry: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined
            }
        });

        res.json({ success: true, message: 'Connected to Google Workspace' });
    } catch (error: any) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
});

// 3. Sync Contacts
router.post('/google/contacts/sync', async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const config = await getGoogleConfig();

        if (!user?.googleAccessToken) {
            return res.status(401).json({ error: 'Not connected to Google' });
        }

        const oauth2Client = new google.auth.OAuth2(
            config.clientId,
            config.clientSecret,
            config.redirectUri
        );

        oauth2Client.setCredentials({
            access_token: user.googleAccessToken,
            refresh_token: user.googleRefreshToken || undefined
        });

        // Handle Auto Refresh of Tokens
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.refresh_token) {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        googleAccessToken: tokens.access_token,
                        googleRefreshToken: tokens.refresh_token,
                        googleTokenExpiry: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined
                    }
                });
            } else {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        googleAccessToken: tokens.access_token,
                        googleTokenExpiry: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined
                    }
                });
            }
        });


        const service = google.people({ version: 'v1', auth: oauth2Client });

        const response = await service.people.connections.list({
            resourceName: 'people/me',
            personFields: 'names,emailAddresses,phoneNumbers,organizations,addresses',
            pageSize: 1000,
        });

        const connections = response.data.connections || [];
        let count = 0;

        for (const person of connections) {
            const firstName = person.names?.[0]?.givenName || 'Google Contact';
            const lastName = person.names?.[0]?.familyName || '';
            const email = person.emailAddresses?.[0]?.value;
            const phone = person.phoneNumbers?.[0]?.value;
            const address = person.addresses?.[0]?.formattedValue;

            // Improved Organization Extraction
            const orgs = person.organizations || [];
            const primaryOrg = orgs.find(o => o.name) || orgs[0];

            let company = primaryOrg?.name;
            const jobTitle = primaryOrg?.title;

            // --- SMART ENRICHMENT: Guess Company from Email Domain ---
            if (!company && email) {
                try {
                    const domain = email.split('@')[1];
                    const genericDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com'];

                    if (domain && !genericDomains.includes(domain.toLowerCase())) {
                        // Remove TLDs like .com, .co.th for cleaner name
                        const namePart = domain.split('.')[0];
                        // Capitalize first letter
                        company = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }
            // ---------------------------------------------------------

            if (email) {
                // Check dupes
                const existing = await prisma.contact.findFirst({
                    where: { email: email }
                });

                if (!existing) {
                    await prisma.contact.create({
                        data: {
                            firstName: firstName,
                            lastName: lastName,
                            email: email,
                            phone: phone,
                            company: company,
                            jobTitle: jobTitle,
                            address: address,
                            type: 'CUSTOMER', // Default synced contacts to CUSTOMER
                            ownerId: userId // Assign to syncing user
                        }
                    });
                    count++;
                } else {
                    // Start of update logic for existing contacts
                    // If existing contact is missing company info but we found it in Google, update it.
                    if ((!existing.company && company) || (!existing.jobTitle && jobTitle)) {
                        await prisma.contact.update({
                            where: { id: existing.id },
                            data: {
                                company: company || existing.company,
                                jobTitle: jobTitle || existing.jobTitle
                            }
                        });
                        // We count this as an "update" or just silently improve data. 
                        // For now, let's just let it happen.
                    }
                }
            }
        }

        res.json({ success: true, imported: count, totalFound: connections.length });

    } catch (error: any) {
        console.error('Sync Error:', error);
        res.status(500).json({ error: 'Failed to sync contacts: ' + error.message });
    }
});

// 4. Status Check
router.get('/google/status', async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        res.json({
            connected: !!user?.googleAccessToken,
            lastSynced: null // TODO: Add lastSynced field to User model if needed
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get status' });
    }
});

export default router;
