"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserEnv } from "@/lib/supabase/env";

export function createClient() {
  const { supabaseKey, supabaseUrl } = getSupabaseBrowserEnv();

  return createBrowserClient(supabaseUrl, supabaseKey);
}
