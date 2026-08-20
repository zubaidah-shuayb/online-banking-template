import { AlertTriangle } from "lucide-react";
import { useBankSettings } from "@/lib/dashboard-data";

/** Shows a bank-wide notice whenever maintenance mode is switched on in admin. */
export function MaintenanceBanner() {
  const settings = useBankSettings();
  if (!settings.data?.maintenance_mode) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 border-b border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground sm:px-6 lg:px-10"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="leading-relaxed">
        <span className="font-semibold">Scheduled maintenance.</span>{" "}
        {settings.data.maintenance_message?.trim() ||
          "Some services may be briefly unavailable while we complete essential upgrades."}
      </p>
    </div>
  );
}
