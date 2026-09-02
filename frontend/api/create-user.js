import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, password, name, role, dept, university } = req.body;

  try {
    const supabaseAdmin = createClient(
      process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Creates user and instantly confirms email, bypassing the default Supabase verification
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: name }
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // Save to profiles
    await supabaseAdmin.from('profiles').upsert([{
      id: authData.user.id, full_name: name, email,
      role: role || 'PROCTOR', assigned_dept: dept, status: 'ACTIVE', university
    }]);

    return res.status(200).json({ success: true, userId: authData.user.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
