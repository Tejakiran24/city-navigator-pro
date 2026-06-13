import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        return { user: data.user };
      }
    } catch (e) {
      console.warn("Supabase user verification failed, using fallback check:", e);
    }

    if (typeof window !== "undefined") {
      const fallbackUser = sessionStorage.getItem("urbanflow_fallback_user");
      if (fallbackUser) {
        try {
          return { user: JSON.parse(fallbackUser) };
        } catch (e) {
          console.error("Failed to parse fallback session:", e);
        }
      }
    }

    throw redirect({ to: "/auth" });
  },
  component: () => <Outlet />,
});