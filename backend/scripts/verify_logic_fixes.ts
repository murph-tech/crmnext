
const BASE_URL = 'http://localhost:4000/api';
export { };
let TOKEN = '';

async function main() {
    try {
        console.log('Starting logic verification...');

        // 1. Auth/Login
        const email = `test.verifier.${Date.now()}@example.com`;
        const password = 'password123';
        const name = 'Verifier';

        console.log(`Registering user: ${email}`);
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        const regData = await regRes.json();

        if (!regRes.ok) {
            throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
        }
        TOKEN = regData.token;
        console.log('Logged in.');

        // 2. Test Lead Conversion w/ Existing Contact
        console.log('\n--- Test 1: Lead Conversion Check ---');
        const testEmail = `contact.${Date.now()}@example.com`;

        // Create Contact
        console.log(`Creating contact with email: ${testEmail}`);
        const contactRes = await fetch(`${BASE_URL}/contacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ firstName: 'Test', lastName: 'Contact', email: testEmail })
        });
        if (!contactRes.ok) throw new Error('Failed to create contact');

        // Create Lead
        console.log(`Creating lead with same email: ${testEmail}`);
        const leadRes = await fetch(`${BASE_URL}/leads`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ firstName: 'Test', lastName: 'Lead', email: testEmail })
        });
        const leadData = await leadRes.json();
        if (!leadRes.ok) throw new Error('Failed to create lead');
        const leadId = leadData.id;

        // Try Convert
        console.log(`Attempting to convert lead ${leadId}...`);
        const convertRes = await fetch(`${BASE_URL}/leads/${leadId}/convert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        if (convertRes.status === 400) {
            const err = await convertRes.json();
            if (err.error === 'Contact with this email already exists') {
                console.log('✅ PASS: Correctly blocked conversion with duplicate email.');
            } else {
                console.log(`❌ FAIL: Got 400 but wrong message: ${err.error}`);
            }
        } else {
            console.log(`❌ FAIL: Expected 400, got ${convertRes.status}`);
        }

        // 3. Test Deal Reopen
        console.log('\n--- Test 2: Deal Reopen Status ---');
        console.log('Creating deal...');
        const dealRes = await fetch(`${BASE_URL}/deals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ title: 'Logic Test Deal', value: 1000, stage: 'QUALIFIED' })
        });
        const dealData = await dealRes.json();
        const dealId = dealData.id;

        // Close it
        console.log('Closing deal (CLOSED_WON)...');
        await fetch(`${BASE_URL}/deals/${dealId}/stage`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ stage: 'CLOSED_WON' })
        });

        // Verify ClosedAt
        let dealCheck = await (await fetch(`${BASE_URL}/deals/${dealId}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        })).json();

        if (dealCheck.closedAt) {
            console.log('Verified deal is closed (closedAt set).');
        } else {
            console.log('❌ FAIL: Deal closedAt is null after closing.');
        }

        // Reopen it
        console.log('Reopening deal (NEGOTIATION)...');
        await fetch(`${BASE_URL}/deals/${dealId}/stage`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
            },
            body: JSON.stringify({ stage: 'NEGOTIATION' })
        });

        // Verify ClosedAt is null
        dealCheck = await (await fetch(`${BASE_URL}/deals/${dealId}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        })).json();

        if (dealCheck.closedAt === null) {
            console.log('✅ PASS: Deal closedAt is null after reopening.');
        } else {
            console.log(`❌ FAIL: Deal closedAt is STILL ${dealCheck.closedAt} after reopening.`);
        }

    } catch (e) {
        console.error('Verification Error:', e);
        process.exit(1);
    }
}

main();
