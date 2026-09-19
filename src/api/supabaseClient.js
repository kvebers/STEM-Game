import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
// The "Publishable key" from Project Settings -> API Keys (formerly called
// the "anon" key) — same low-privilege, RLS-respecting role, safe for
// client code. Never put the "Secret key" here.
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill in your Supabase project values.',
  );
}

// Fall back to a syntactically valid placeholder so createClient doesn't
// throw before the console.error above ever gets a chance to render — the
// app will still be non-functional (auth/queries fail) until real env vars
// are set, but at least the page isn't a blank crash.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  publishableKey || 'placeholder-publishable-key',
);

export async function invokeFunction(name, body) {
  console.log(`[invokeFunction] -> ${name}`, body);
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // supabase-js wraps the function's JSON error body in `context`; surface
    // its message when present so screens can show something useful.
    const detail = await error.context?.json?.().catch(() => null);
    console.error(`[invokeFunction] <- ${name} FAILED`, {
      status: error.context?.status,
      detail,
      errorMessage: error.message,
      error,
    });
    throw new Error(detail?.error || error.message);
  }
  console.log(`[invokeFunction] <- ${name} OK`, data);
  return data;
}
