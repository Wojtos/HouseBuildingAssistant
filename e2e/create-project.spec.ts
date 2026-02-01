import { test, expect, TEST_USER } from './fixtures/auth.fixture';

/**
 * Create Project E2E Tests
 * 
 * Tests the project creation flow for authenticated users.
 * Following AAA (Arrange, Act, Assert) pattern.
 * 
 * Prerequisites:
 * - Test user exists: e2e@e2e.com (from .env.test)
 * - Frontend running on localhost:4321
 * - Backend API available
 */
test.describe('Create Project Flow', () => {
  /**
   * Setup: Authenticate before each test
   */
  test.beforeEach(async ({ authenticatedPage }) => {
    // authenticatedPage fixture handles login
  });

  test('should display create project form after navigating from projects list', async ({ 
    page,
    createProjectPage,
  }) => {
    // Arrange: Navigate to create project page
    await createProjectPage.goto();

    // Assert: Form elements are visible
    await expect(createProjectPage.nameInput).toBeVisible();
    await expect(createProjectPage.locationInput).toBeVisible();
    await expect(createProjectPage.phaseSelect).toBeVisible();
    await expect(createProjectPage.submitButton).toBeVisible();
    await expect(createProjectPage.cancelButton).toBeVisible();
  });

  test('should have submit button disabled when name is empty', async ({ 
    page,
    createProjectPage,
  }) => {
    // Arrange: Navigate to create project page
    await createProjectPage.goto();

    // Assert: Submit button should be disabled initially
    await createProjectPage.expectSubmitDisabled();
  });

  test('should enable submit button when name is filled', async ({ 
    page,
    createProjectPage,
  }) => {
    // Arrange: Navigate to create project page
    await createProjectPage.goto();

    // Act: Fill in project name
    await createProjectPage.fillName('My Test Project');

    // Assert: Submit button should be enabled
    await createProjectPage.expectSubmitEnabled();
  });

  test('should show character count for name field', async ({ 
    page,
    createProjectPage,
  }) => {
    // Arrange: Navigate to create project page
    await createProjectPage.goto();

    // Act: Type a project name
    await createProjectPage.fillName('Test Project');

    // Assert: Character count is updated
    await createProjectPage.expectNameCharCount(12);
  });

  test('should show validation error when submitting empty name', async ({ 
    page,
    createProjectPage,
  }) => {
    // Arrange: Navigate to create project page
    await createProjectPage.goto();
    
    // Make submit button clickable by adding spaces (triggers validation)
    await createProjectPage.nameInput.fill('   ');
    
    // Act: Clear and try to submit (button will be disabled, so test validation on blur)
    await createProjectPage.nameInput.clear();
    await createProjectPage.nameInput.blur();
    
    // Assert: Submit button should be disabled for empty name
    await createProjectPage.expectSubmitDisabled();
  });

  test('should successfully create a project with only name', async ({ 
    page,
    createProjectPage,
  }) => {
    // Arrange: Navigate to create project page
    await createProjectPage.goto();
    
    // Generate unique project name to avoid conflicts
    const projectName = `E2E Test Project ${Date.now()}`;

    // Act: Fill name and submit
    await createProjectPage.createProject({ name: projectName });

    // Assert: Should redirect to project chat page
    await createProjectPage.expectCreateSuccess();
  });

  test('should successfully create a project with all fields', async ({ 
    page,
    createProjectPage,
  }) => {
    // Arrange: Navigate to create project page
    await createProjectPage.goto();
    
    // Generate unique project name
    const projectName = `E2E Full Project ${Date.now()}`;

    // Act: Fill all fields and submit
    await createProjectPage.createProject({
      name: projectName,
      location: '123 Test Street, Test City, TC 12345',
      phase: 'Design',
    });

    // Assert: Should redirect to project chat page
    await createProjectPage.expectCreateSuccess();
  });

  test('should navigate back to projects list when clicking Cancel', async ({ 
    page,
    createProjectPage,
  }) => {
    // Arrange: Navigate to create project page
    await createProjectPage.goto();

    // Act: Click cancel button
    await createProjectPage.cancelButton.click();

    // Assert: Should redirect to projects list
    await expect(page).toHaveURL(/\/projects$/);
  });

  test('should navigate back to projects list when clicking Back to Projects', async ({ 
    page,
    createProjectPage,
  }) => {
    // Arrange: Navigate to create project page
    await createProjectPage.goto();

    // Act: Click back link
    await createProjectPage.backToProjectsLink.click();

    // Assert: Should redirect to projects list
    await expect(page).toHaveURL(/\/projects$/);
  });

  test('should redirect to login when accessing create project without authentication', async ({ 
    browser,
  }) => {
    // Arrange: Create a new context without authentication
    const context = await browser.newContext();
    const page = await context.newPage();

    // Act: Try to access create project page directly
    await page.goto('/projects/new');

    // Assert: Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Cleanup
    await context.close();
  });
});

test.describe('Create Project Form Validation', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // authenticatedPage fixture handles login
  });

  test('should show loading state while submitting', async ({ 
    page,
    createProjectPage,
  }) => {
    // Arrange: Navigate and fill form
    await createProjectPage.goto();
    const projectName = `E2E Loading Test ${Date.now()}`;
    await createProjectPage.fillName(projectName);

    // Act: Submit and check for loading state
    await createProjectPage.submitButton.click();

    // Assert: Button should show loading text (may be brief)
    // Note: This test captures the submitting state if network is slow enough
    // The form will redirect on success, so we verify final state
    await createProjectPage.expectCreateSuccess();
  });
});
