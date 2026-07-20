import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://your-project-id.supabase.co";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export const getPublicUrl = (bucket, path) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || "";
};

export const uploadImage = async (bucket, file, fileName) => {
  if (!file) return null;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { upsert: true });
  if (error) throw error;
  return getPublicUrl(bucket, fileName);
};
