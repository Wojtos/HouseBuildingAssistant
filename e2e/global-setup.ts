import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Global Setup for E2E Tests
 * 
 * Authenticates with Supabase before running tests to ensure:
 * - RLS policies allow access to test data
 * - Test data can be properly cleaned up after tests
 * 
 * This runs once before all test files.
 */

// Load environment variables - try multiple paths
const envPaths = [
  path.resolve(process.cwd(), '.ai/.env.test'),
  path.resolve(__dirname, '../.ai/.env.test'),
  path.resolve(__dirname, '../../.ai/.env.test'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`📂 Loading env from: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('⚠️ Could not find .env.test file. Tried:', envPaths);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';
const E2E_USERNAME = process.env.E2E_USERNAME || '';
const E2E_PASSWORD = process.env.E2E_PASSWORD || '';

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create authenticated Supabase client
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

/**
 * Global setup function - runs before all tests
 */
async function globalSetup(): Promise<void> {
  console.log('🔐 E2E Global Setup: Authenticating with Supabase...');

  // Validate required environment variables
  if (!E2E_USERNAME || !E2E_PASSWORD) {
    throw new Error(
      'E2E_USERNAME and E2E_PASSWORD must be set in .ai/.env.test'
    );
  }

  const supabase = getSupabaseClient();

  // Sign in with test user credentials
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: E2E_USERNAME,
    password: E2E_PASSWORD,
  });

  if (signInError) {
    console.error('❌ Error signing in:', signInError.message);
    throw signInError;
  }

  if (!data.session) {
    throw new Error('No session returned after sign in');
  }

  console.log(`✅ Authenticated as: ${E2E_USERNAME}`);
  console.log(`   User ID: ${data.user?.id}`);
  
  // Store session info for potential use in tests
  process.env.E2E_ACCESS_TOKEN = data.session.access_token;
  process.env.E2E_USER_ID = data.user?.id;
}

export default globalSetup;
