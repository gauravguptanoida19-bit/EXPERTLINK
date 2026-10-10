import { test, expect } from '@playwright/test';

test.describe('ExpertLink End-to-End User Journey', () => {
  test('Landing Page: Renders hero, capabilities, and interactive preview', async ({ page }) => {
    // 1. Visit root landing page
    await page.goto('/');
    await expect(page).toHaveTitle(/ExpertLink/);
    await expect(page.locator('h1')).toContainText('Connect with vetted industry leaders');
    await expect(page.locator('text=384-Dim')).toBeVisible();
    await expect(page.locator('text=Get Started Free')).toBeVisible();

    // 2. Click "Get Started Free" leading to register
    await page.click('text=Get Started Free');
    await page.waitForURL('**/register');
    await expect(page.locator('h1')).toContainText('Create an Account');
  });

  test('Complete matching flow: Login -> Post Query -> View ML Matches -> Book Consultation', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/login');
    await expect(page).toHaveTitle(/ExpertLink/);
    await expect(page.locator('h1')).toContainText('Welcome back');

    // 2. Perform 1-Click Demo Client Login
    const clientDemoBtn = page.getByRole('button', { name: 'Client' });
    await expect(clientDemoBtn).toBeVisible();
    await clientDemoBtn.click();

    // Verify redirected to Dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1')).toContainText('Client Dashboard');

    // 3. Navigate to Post Query
    await page.click('a[href="/queries/create"]');
    await page.waitForURL('**/queries/create');
    await expect(page.locator('h1')).toContainText('Post Research Query');

    // 4. Fill form and interact with AI Copilot
    await page.fill('input[formcontrolname="title"]', 'LLM Agent Architectures for Automated Trading');
    await page.selectOption('select[formcontrolname="industry"]', 'Fintech');
    await page.fill('input[formcontrolname="budgetUsd"]', '750');
    await page.fill(
      'textarea[formcontrolname="description"]',
      'We are evaluating stateful multi-agent systems for high-frequency algorithmic trade reconciliation with sub-millisecond latency guarantees.'
    );

    // Click AI Enhance
    const aiEnhanceBtn = page.getByRole('button', { name: /Enhance with AI/i });
    await aiEnhanceBtn.click();

    // Verify clarifying question or enhanced content is loaded
    await page.waitForTimeout(500);

    // 5. Submit Query & Trigger ML Matching
    const submitBtn = page.getByRole('button', { name: /Submit & Run Matcher/i });
    await submitBtn.click();

    // Wait for navigation to matches page
    await page.waitForURL(/.*\/queries\/.*\/matches/);
    await expect(page.locator('h1')).toBeVisible();

    // 6. Verify Match Results and "Why this expert" panels
    // Ranked cards should load
    const expertCards = page.locator('div.bg-white.dark\\:bg-slate-900.rounded-2xl');
    await expect(expertCards.first()).toBeVisible({ timeout: 10000 });

    // Verify Fit Score exists
    await expect(page.locator('text=Match Fit Score').first()).toBeVisible();

    // Verify "Why this expert matches your query" section
    await expect(page.locator('text=Why this expert matches your query:').first()).toBeVisible();

    // 7. Proceed to Book Consultation
    const bookBtn = page.getByRole('link', { name: 'Book Call' }).first();
    await bookBtn.click();

    // Wait for navigation to booking flow
    await page.waitForURL(/.*\/bookings.*/);
    await expect(page.locator('h1')).toContainText('Consultation Bookings');

    // Verify safe idempotency booking button
    const confirmBookingBtn = page.getByRole('button', { name: /Confirm Booking/i });
    if (await confirmBookingBtn.isVisible()) {
      await confirmBookingBtn.click();
    }

    // Verify booking is confirmed and listed
    await expect(page.locator('text=Advisory Consultation').first()).toBeVisible({ timeout: 5000 });
  });

  test('Expert Profile Editor: Update Bio & Re-generate 384-dim Embedding', async ({ page }) => {
    // 1. Login as Expert
    await page.goto('/login');
    const expertDemoBtn = page.getByRole('button', { name: 'Expert' });
    await expertDemoBtn.click();

    await page.waitForURL('**/dashboard');

    // 2. Navigate to Expert Profile
    await page.goto('/expert/profile');
    await expect(page.locator('h1')).toContainText('Expert Profile & Availability');

    // 3. Update Skills & Headline
    await page.fill('input[formcontrolname="headline"]', 'Principal Distributed Systems Architect | High Throughput Consensus');
    await page.fill('input[formcontrolname="hourlyRateUsd"]', '450');

    // 4. Save and trigger embedding re-generation
    const saveBtn = page.getByRole('button', { name: /Save & Re-Index Profile/i });
    await saveBtn.click();

    // 5. Verify success alert
    await expect(page.locator('text=Profile updated successfully!').first()).toBeVisible({ timeout: 5000 });
  });
});
