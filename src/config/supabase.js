/**
 * Supabase Configuration Module
 * Handles environment-based configuration for Supabase client
 */

// Get environment variables from Vite's import.meta.env or fallback to window.ENV
const getEnvVariable = (key, fallback) => {
  // Check Vite environment variables first (for development/build)
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }

  // Check window.ENV (for runtime configuration)
  if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
    return window.ENV[key];
  }

  // Return fallback
  return fallback;
};

export const SUPABASE_URL = getEnvVariable(
  'VITE_SUPABASE_URL',
  'https://hvdivdqxsdhabeurwkfb.supabase.co'
);

export const SUPABASE_ANON_KEY = getEnvVariable(
  'VITE_SUPABASE_ANON_KEY',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZGl2ZHF4c2RoYWJldXJ3a2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NDkwNDIsImV4cCI6MjA4MTEyNTA0Mn0.h6WOImT19AyGZIrqeRZ1axkPJhftlZtW6HNKD5gRebI'
);

export const ODDS_API_URL = getEnvVariable(
  'VITE_ODDS_API_URL',
  'https://goatmouth-odds-api.onrender.com'
);

// Export default config object
export default {
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  oddsApiUrl: ODDS_API_URL
};
