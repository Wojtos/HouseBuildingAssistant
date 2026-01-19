/// <reference types="astro/client" />

/**
 * Environment variable type declarations for the frontend application.
 * 
 * PUBLIC_* variables are exposed to client-side code.
 * Non-PUBLIC variables are only available server-side.
 */
interface ImportMetaEnv {
  /** Supabase project URL */
  readonly PUBLIC_SUPABASE_URL: string;
  /** Supabase anonymous/public key */
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  /** FastAPI backend URL for API calls */
  readonly PUBLIC_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Astro.locals type declarations
 * Extended by middleware to include authenticated user data
 */
declare namespace App {
  interface Locals {
    /** Authenticated user data set by middleware */
    user?: {
      id: string;
      email: string | undefined;
    };
  }
}
