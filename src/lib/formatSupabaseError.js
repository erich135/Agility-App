// src/lib/formatSupabaseError.js

export default function formatSupabaseError(error) {
  if (!error) return 'Unknown error';

  const rawMessage = error.message || String(error);
  if (error.code === '42501' && /permission denied for schema public/i.test(rawMessage)) {
    return 'Database permissions error (permission denied for schema public). Run the Supabase SQL script 03_fix_project_write_permissions.sql (or re-grant USAGE on schema public + INSERT on projects).';
  }

  // supabase-js typically returns: { message, details, hint, code }
  const message = rawMessage;
  const parts = [message];

  if (error.code) parts.push(`code=${error.code}`);
  if (error.status || error.statusCode) parts.push(`status=${error.status ?? error.statusCode}`);
  if (error.details) parts.push(`details=${error.details}`);
  if (error.hint) parts.push(`hint=${error.hint}`);

  return parts.length > 1 ? `${parts[0]} (${parts.slice(1).join(', ')})` : parts[0];
}
