
// using native fetch

const BASE_URL = 'http://localhost:4000';
let TOKEN = '';

async function request(method: string, path: string, body?: any) {
    const headers: any = { 'Content-Type': 'application/json' };
    if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`request failed: ${res.status} ${text}`);
    }

    return res.json();
}

async function main() {
    try {
        console.log('1. Registering/Logging in user...');
        const email = `test_${Date.now()}@example.com`;
        const password = 'password123';

        try {
            const auth = await request('POST', '/api/auth/register', { email, password, name: 'Test User' });
            TOKEN = auth.token;
        } catch (e) {
            // IF register fails, maybe try login (though email is unique per run)
            console.log('Register failed, trying login...');
            const auth = await request('POST', '/api/auth/login', { email, password });
            TOKEN = auth.token;
        }
        console.log('Logged in.');

        console.log('2. Creating a Product...');
        const product = await request('POST', '/api/products', {
            name: 'Test Service',
            description: 'A test service',
            price: 1000,
            type: 'SERVICE'
        });
        console.log('Product created:', product.id);

        console.log('3. Creating a Deal...');
        const deal = await request('POST', '/api/deals', {
            title: 'Test Deal',
            value: 0, // Initial value
            stage: 'QUALIFIED'
        });
        console.log('Deal created:', deal.id);

        console.log('4. Adding Activity...');
        const activity = await request('POST', '/api/activities', {
            title: 'Initial Call',
            type: 'CALL',
            description: 'Discussed requirements',
            dealId: deal.id
        });
        console.log('Activity added:', activity.id);

        console.log('5. Verifying Deal Activities...');
        let dealDetails = await request('GET', `/api/deals/${deal.id}`);
        if (dealDetails.activities.length !== 1) {
            throw new Error(`Expected 1 activity, found ${dealDetails.activities.length}`);
        }
        console.log('Activities verified.');

        console.log('6. Adding Product to Deal...');
        // Add 2 items of product (price 1000 each)
        await request('POST', `/api/deals/${deal.id}/items`, {
            productId: product.id,
            quantity: 2,
            price: 1000,
            discount: 0
        });
        console.log('Product added.');

        console.log('7. Verifying Deal Total Value...');
        dealDetails = await request('GET', `/api/deals/${deal.id}`);
        // Value should be 2000
        if (dealDetails.value !== 2000) {
            throw new Error(`Expected deal value 2000, found ${dealDetails.value}`);
        }
        console.log('Deal value verified:', dealDetails.value);

        console.log('8. Removing Product...');
        const itemId = dealDetails.items[0].id;
        await request('DELETE', `/api/deals/${deal.id}/items/${itemId}`);
        console.log('Product removed.');

        console.log('9. Verifying Deal Value Reset...');
        dealDetails = await request('GET', `/api/deals/${deal.id}`);
        // Value should be 0
        if (dealDetails.value !== 0) {
            throw new Error(`Expected deal value 0, found ${dealDetails.value}`);
        }
        console.log('Deal value verified reset:', dealDetails.value);

        console.log('SUCCESS! All checks passed.');

    } catch (error) {
        console.error('FAILED:', error);
        process.exit(1);
    }
}

main();
