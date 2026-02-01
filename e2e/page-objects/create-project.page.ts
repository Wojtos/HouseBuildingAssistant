import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Create Project Page Object
 * 
 * Encapsulates the create project form interactions.
 * Follows Page Object Model pattern for maintainable E2E tests.
 */
export class CreateProjectPage {
  readonly page: Page;
  
  // Form elements
  readonly nameInput: Locator;
  readonly locationInput: Locator;
  readonly phaseSelect: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly backToProjectsLink: Locator;
  
  // Feedback elements
  readonly errorBanner: Locator;
  readonly nameError: Locator;
  readonly locationError: Locator;
  readonly nameCharCount: Locator;
  readonly locationCharCount: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Form inputs - using id selectors as defined in CreateProjectView.tsx
    this.nameInput = page.locator('#name');
    this.locationInput = page.locator('#location');
    // PhaseSelect doesn't have an id, locate by label text
    this.phaseSelect = page.locator('label:has-text("Current Phase") + div select');
    
    // Buttons
    this.submitButton = page.getByRole('button', { name: /create project/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.backToProjectsLink = page.getByRole('button', { name: /back to projects/i });
    
    // Error elements
    this.errorBanner = page.getByRole('alert');
    this.nameError = page.locator('#name-error');
    this.locationError = page.locator('#location-error');
    
    // Character count hints
    this.nameCharCount = page.locator('#name-hint');
    this.locationCharCount = page.locator('#location-hint');
  }

  /**
   * Navigate to create project page
   */
  async goto(): Promise<void> {
    await this.page.goto('/projects/new');
  }

  /**
   * Fill the project name field
   */
  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  /**
   * Fill the location field
   */
  async fillLocation(location: string): Promise<void> {
    await this.locationInput.fill(location);
  }

  /**
   * Select a construction phase
   */
  async selectPhase(phase: string): Promise<void> {
    await this.phaseSelect.selectOption({ label: phase });
  }

  /**
   * Submit the form
   * Waits for the button to be enabled before clicking (React state updates are async)
   */
  async submit(): Promise<void> {
    // Wait for button to be visible first
    await this.submitButton.waitFor({ state: 'visible' });
    
    // Wait for button to be enabled with longer timeout for CI environments
    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    
    await this.submitButton.click();
  }

  /**
   * Fill all form fields and submit
   */
  async createProject(options: {
    name: string;
    location?: string;
    phase?: string;
  }): Promise<void> {
    await this.fillName(options.name);
    
    if (options.location) {
      await this.fillLocation(options.location);
    }
    
    if (options.phase) {
      await this.selectPhase(options.phase);
    }
    
    await this.submit();
  }

  /**
   * Assert successful project creation (redirects to chat)
   * If redirect fails, captures error state for debugging
   */
  async expectCreateSuccess(): Promise<void> {
    // First wait for loading state to complete (button should stop showing "Creating...")
    await this.page.waitForFunction(
      () => {
        const button = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        // Either redirected away, or button is not in loading state
        return !button || !button.textContent?.includes('Creating');
      },
      { timeout: 15000 }
    ).catch(() => {
      // Timeout - form might still be loading
    });

    // Check for error banner
    const errorBanner = this.page.getByRole('alert');
    const hasError = await errorBanner.isVisible().catch(() => false);
    
    if (hasError) {
      const errorText = await errorBanner.textContent();
      throw new Error(`Project creation failed with error: ${errorText}`);
    }

    // Wait for redirect to project chat page
    await expect(this.page).toHaveURL(/\/projects\/[^/]+\/chat/, { timeout: 10000 });
  }

  /**
   * Assert name validation error is shown
   */
  async expectNameError(message?: string): Promise<void> {
    await expect(this.nameError).toBeVisible();
    if (message) {
      await expect(this.nameError).toContainText(message);
    }
  }

  /**
   * Assert location validation error is shown
   */
  async expectLocationError(message?: string): Promise<void> {
    await expect(this.locationError).toBeVisible();
    if (message) {
      await expect(this.locationError).toContainText(message);
    }
  }

  /**
   * Assert general submit error is shown
   */
  async expectSubmitError(message?: string): Promise<void> {
    await expect(this.errorBanner).toBeVisible();
    if (message) {
      await expect(this.errorBanner).toContainText(message);
    }
  }

  /**
   * Assert the submit button is disabled
   */
  async expectSubmitDisabled(): Promise<void> {
    await expect(this.submitButton).toBeDisabled();
  }

  /**
   * Assert the submit button is enabled
   */
  async expectSubmitEnabled(): Promise<void> {
    await expect(this.submitButton).toBeEnabled();
  }

  /**
   * Assert character count is displayed correctly
   */
  async expectNameCharCount(count: number): Promise<void> {
    await expect(this.nameCharCount).toContainText(`${count}/255`);
  }
}
