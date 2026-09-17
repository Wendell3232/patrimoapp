import { supabase } from "@/integrations/supabase/client";

export async function hasActiveLicense(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("has_license_for_user");
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}
