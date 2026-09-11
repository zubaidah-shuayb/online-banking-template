import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/velora/client";
import { btn } from "@/components/velora/ui";

export const Route = createFileRoute("/admin/_gate")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/admin/login" });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    const isAdmin = Boolean(roles?.some((r: { role: string }) => r.role === "admin"));
    return { adminUser: data.user, isAdmin };
  },
  component: AdminGate,
});

function AdminGate() {
  const { isAdmin } = Route.useRouteContext();
  const navigate = useNavigate();

  if (!isAdmin) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md rounded-[2rem] border border-border/70 bg-card/70 p-8 text-center backdrop-blur-2xl">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h1 className="mt-4 text-2xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account doesn't hold the Administrator role. The velora admin portal is separate from the
            customer portal.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              className={btn({ size: "md" })}
              onClick={async () => {
                await supabase.auth.signOut();
                void navigate({ to: "/admin/login", replace: true });
              }}
            >
              Sign in as administrator
            </button>
            <Link to="/dashboard" className={btn({ variant: "ghost", size: "md" })}>
              Customer dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <Outlet />;
}
