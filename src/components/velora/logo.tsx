export function VELORALogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow elevated">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M4 5.5 12 19l8-13.5"
            stroke="currentColor"
            className="text-primary-foreground"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[15px] font-semibold tracking-[0.22em] text-foreground">
          VELORA
        </span>
      )}
    </span>
  );
}
