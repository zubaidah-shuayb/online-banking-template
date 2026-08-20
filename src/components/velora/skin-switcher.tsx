import { Palette } from "lucide-react";
import { SKINS, useSkin } from "@/lib/skins";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SkinSwitcher() {
  const { skin, setSkin } = useSkin();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Change bank skin"
        className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
      >
        <Palette className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Bank skin</DropdownMenuLabel>
        {SKINS.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onSelect={() => setSkin(s.id)}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <span
                data-skin={s.id}
                className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-primary to-primary-glow"
              />
              {s.name}
            </span>
            {skin === s.id && <span className="text-xs text-muted-foreground">Active</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
