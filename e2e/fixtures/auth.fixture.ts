import { test as base, expect } from '@playwright/test';
import { AuthPage } from '../page-objects/auth.page';
import { CreateProjectPage } from '../page-objects/create-project.page';

/**
 * Test credentials from .env.test
 */
const TEST_USER = {
  email: process.env.E2E_USERNAME || 'e2e@e2e.com',
  password: process.env.E2E_PASSWORD || 'e2e',
};

/**
 * Extended test fixtures with page objects and authenticated state
 */
export type TestFixtures = {
  authPage: AuthPage;
  createProjectPage: CreateProjectPage;
  authenticatedPage: void;
};

/**
 * Custom test with page objects and authentication support
 * 
 * Usage:
 * - test('my test', async ({ authPage }) => { ... })
 * - test('needs auth', async ({ authenticatedPage, createProjectPage }) => { ... })
 */
export const test = base.extend<TestFixtures>({
  /**
   * Auth page object fixture
   */
  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },

  /**
   * Create project page object fixture
   */
  createProjectPage: async ({ page }, use) => {
    const createProjectPage = new CreateProjectPage(page);
    await use(createProjectPage);
  },

  /**
   * Authenticated state fixture
   * 
   * Performs login before the test runs.
   * Use this fixture when the test requires an authenticated user.
   */
  authenticatedPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    
    // Arrange: Navigate to login and authenticate
    await authPage.login(TEST_USER.email, TEST_USER.password);
    
    // Verify login was successful
    await expect(page).toHaveURL(/\/projects/);
    
    // Provide authenticated context to test
    await use();
  },
});

export { expect } from '@playwright/test';

/**
 * Test user credentials for use in tests
 */
export { TEST_USER };
