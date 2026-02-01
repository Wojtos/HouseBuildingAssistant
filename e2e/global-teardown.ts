import { getSupabaseClient } from './global-setup';

/**
 * Global Teardown for E2E Tests
 * 
 * Cleans up test data and signs out after all tests complete.
 * Uses the authenticated Supabase client from global-setup.
 */

/**
 * Global teardown function - runs after all tests
 */
async function globalTeardown(): Promise<void> {
  console.log('\n🧹 E2E Global Teardown: Cleaning up...');

  const supabase = getSupabaseClient();
  const userId = process.env.E2E_USER_ID;

  if (userId) {
    try {
      // Delete test projects created during E2E tests
      // Only delete projects with names starting with "E2E" to be safe
      const { data: projects, error: fetchError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', userId)
        .like('name', 'E2E%');

      if (fetchError) {
        console.warn('⚠️ Could not fetch test projects:', fetchError.message);
      } else if (projects && projects.length > 0) {
        console.log(`   Found ${projects.length} test project(s) to clean up`);
        
        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .eq('user_id', userId)
          .like('name', 'E2E%');

        if (deleteError) {
          console.warn('⚠️ Could not delete test projects:', deleteError.message);
        } else {
          console.log(`   ✅ Deleted ${projects.length} test project(s)`);
        }
      } else {
        console.log('   No test projects to clean up');
      }
    } catch (error) {
      console.warn('⚠️ Cleanup error:', error);
    }
  }

  // Sign out
  const { error: signOutError } = await supabase.auth.signOut();
  
  if (signOutError) {
    console.warn('⚠️ Error signing out:', signOutError.message);
  } else {
    console.log('✅ Signed out successfully');
  }
}

export default globalTeardown;
