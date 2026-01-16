
const BASE_URL = 'http://localhost:4000/api';
export { };
let TOKEN = '';

async function main() {
    try {
        console.log('Starting Dashboard Verification...');

        // 1. Auth/Login
        const email = `dashboard.test.${Date.now()}@example.com`;
        const password = 'password123';
        const name = 'Dash Tester';

        console.log(`Registering user: ${email}`);
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
        TOKEN = regData.token;
        console.log('Logged in.');

        // 2. Get Initial Stats
        console.log('Fetching initial stats...');
        let statsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        let stats = await statsRes.json();
        console.log('Initial dealsProgress:', stats.dealsProgress);
        console.log('Initial taskCompletionRate:', stats.taskCompletionRate);

        if (stats.dealsProgress !== 0 || stats.taskCompletionRate !== 0) {
            console.warn('⚠️ Warning: Expected 0% for new user');
        }

        // 3. Create Data for "Deals Progress"
        // Need to create a Deal (Active) and a Deal (Closed Won) to see movement.
        // Actually formula is: Won / (Active + Won)

        // Create Active Deal
        console.log('Creating Active Deal...');
        await fetch(`${BASE_URL}/deals`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Active Deal', value: 1000, stage: 'NEGOTIATION' })
        });

        // Create Won Deal
        console.log('Creating Won Deal...');
        await fetch(`${BASE_URL}/deals`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Won Deal', value: 2000, stage: 'CLOSED_WON' })
        });

        // 4. Create Data for "Task Completion"
        // Formula: Completed / (Completed + Due This Week)

        // Create Due Task
        console.log('Creating Due Task...');
        await fetch(`${BASE_URL}/activities`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Due Task', type: 'TASK', dueDate: new Date().toISOString() })
        });

        // Create Completed Task
        console.log('Creating Completed Task...');
        const completedTaskRes = await fetch(`${BASE_URL}/activities`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Done Task', type: 'CALL', dueDate: new Date().toISOString() })
        });
        const completedTask = await completedTaskRes.json();

        // Mark as complete
        await fetch(`${BASE_URL}/activities/${completedTask.id}/complete`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
        });

        // 5. Verify Stats Again
        console.log('Fetching updated stats...');
        statsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        stats = await statsRes.json();

        console.log('Updated dealsProgress:', stats.dealsProgress, '%');
        console.log('Updated taskCompletionRate:', stats.taskCompletionRate, '%');

        // Expected:
        // Deals: 1 Active, 1 Won. Progress = 1 / (1+1) = 50%
        // Tasks: 1 Due (Active), 1 Completed. Rate = 1 / (1+1) = 50%

        // Debug: Fetch all activities
        const allActivitiesRes = await fetch(`${BASE_URL}/activities`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        const allActivities = await allActivitiesRes.json();
        console.log('DEBUG: All Activities:', JSON.stringify(allActivities, null, 2));

        if (stats.dealsProgress === 50 && stats.taskCompletionRate === 50) {
            console.log('✅ PASS: Stats calculated correctly.');
        } else {
            console.log('❌ FAIL: Stats mismatch.');
            console.log(`Expected 50% / 50%, got ${stats.dealsProgress}% / ${stats.taskCompletionRate}%`);
        }

    } catch (e) {
        console.error('Verification Error:', e);
        process.exit(1);
    }
}

main();
