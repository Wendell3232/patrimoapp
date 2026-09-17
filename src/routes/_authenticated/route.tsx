import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hasActiveLicense } from "@/lib/licenses";
import { LICENSE_OWNER_EMAILS } from "@/lib/sales";

const FREE_ROUTES = ["/onboarding", "/ativar"];

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const user = data.user;

    if (!FREE_ROUTES.includes(location.pathname)) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (profile && !profile.onboarding_completed) {
        throw redirect({ to: "/onboarding" });
      }

      const ownerEmail = LICENSE_OWNER_EMAILS.some(
        (email) => email.toLowerCase() === (user.email ?? "").toLowerCase(),
      );
      const licensed = ownerEmail || (await hasActiveLicense());
      if (!licensed) {
        throw redirect({ to: "/ativar" });
      }
    }

    return { user };
  },
  component: () => <Outlet />,
});
