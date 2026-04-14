import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const urlOk = Boolean(supabaseUrl && /^https?:\/\//i.test(supabaseUrl));
const keyOk = Boolean(supabaseAnonKey && supabaseAnonKey.length > 20);

if (__DEV__) {
  console.log('[supabase] EXPO_PUBLIC_SUPABASE_URL set:', urlOk, {
    length: supabaseUrl.length,
    preview: supabaseUrl ? `${supabaseUrl.slice(0, 32)}…` : '(empty)',
  });
  console.log('[supabase] EXPO_PUBLIC_SUPABASE_ANON_KEY set:', keyOk, {
    length: supabaseAnonKey.length,
  });
}

if (!urlOk || !keyOk) {
  console.error(
    '[supabase] Missing or invalid env: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (restart Expo after changes).'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
