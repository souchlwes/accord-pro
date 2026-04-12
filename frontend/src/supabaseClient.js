import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fttsrwceeiezcucsehxd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0dHNyd2NlZWllemN1Y3NlaHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODc4ODUsImV4cCI6MjA5MDk2Mzg4NX0.OaHtUDMgKhCcOXpuVWdq_3rGS5ZTvTTzUNAlQhfro1Q';

export const supabase = createClient(supabaseUrl, supabaseKey);