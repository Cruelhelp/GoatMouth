// Supabase Configuration from environment variables
const SUPABASE_URL = window.ENV?.SUPABASE_URL || 'https://hvdivdqxsdhabeurwkfb.supabase.co';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2ZGl2ZHF4c2RoYWJldXJ3a2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NDkwNDIsImV4cCI6MjA4MTEyNTA0Mn0.h6WOImT19AyGZIrqeRZ1axkPJhftlZtW6HNKD5gRebI';

// Initialize Supabase client
if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
