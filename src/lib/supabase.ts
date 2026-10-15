import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ooqtmpnasgricxreqzbb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcXRtcG5hc2dyaWN4cmVxemJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwMDg0ODYsImV4cCI6MjEwNzU4NDQ4Nn0.fjwzEGWns9FyS8ArAOU0CXbHQKty2u_eyq4ftL-RZwQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
