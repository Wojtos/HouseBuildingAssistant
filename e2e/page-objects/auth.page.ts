import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Auth Page Object
 * 
 * Encapsulates login and signup page interactions.
 * Follows Page Object Model pattern for maintainable E2E tests.
 */
export class AuthPage {
  readonly page: Page;
  
  // Login form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorBanner: Locator;
  
  // Navigation elements
  readonly signUpLink: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Form inputs - password inputs don't have textbox role
    this.emailInput = page.getByRole('textbox', { name: /email/i });
    this.passwordInput = page.locator('input[type="password"]');
    this.submitButton = page.getByRole('button', { name: /sign in|create account/i });
    this.errorBanner = page.getByRole('alert');
    
    // Navigation links
    this.signUpLink = page.getByRole('link', { name: /create account/i });
    this.signInLink = page.getByRole('link', { name: /sign in/i });
  }

  /**
   * Navigate to login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  /**
   * Navigate to signup page
   */
  async gotoSignup(): Promise<void> {
    await this.page.goto('/signup');
  }

  /**
   * Fill login credentials
   * Waits for React hydration to complete before filling
   */
  async fillCredentials(email: string, password: string): Promise<void> {
    // Wait for the form inputs to be ready (React hydration complete)
    await this.emailInput.waitFor({ state: 'visible' });
    await this.passwordInput.waitFor({ state: 'visible' });
    
    // Click to focus first to ensure React event handlers are attached
    await this.emailInput.click();
    await this.emailInput.fill(email);
    
    await this.passwordInput.click();
    await this.passwordInput.fill(password);
    
    // Wait a moment for React state to update after filling
    await this.page.waitForTimeout(100);
  }

  /**
   * Submit the login/signup form
   * Waits for the button to be enabled before clicking (React state updates are async)
   */
  async submit(): Promise<void> {
    // Wait for button to be visible first
    await this.submitButton.waitFor({ state: 'visible' });
    
    // Wait for button to be enabled with longer timeout for CI environments
    // React state updates can be slow in CI due to resource constraints
    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    
    await this.submitButton.click();
  }

  /**
   * Complete login flow and wait for redirect
   */
  async login(email: string, password: string): Promise<void> {
    await this.goto();
    await this.fillCredentials(email, password);
    await this.submit();
    
    // Wait for successful redirect to projects page
    await this.page.waitForURL('**/projects**', { timeout: 10000 });
  }

  /**
   * Assert that login was successful
   */
  async expectLoginSuccess(): Promise<void> {
    await expect(this.page).toHaveURL(/\/projects/);
  }

  /**
   * Assert that an error message is displayed
   */
  async expectError(message?: string): Promise<void> {
    await expect(this.errorBanner).toBeVisible();
    if (message) {
      await expect(this.errorBanner).toContainText(message);
    }
  }
}
