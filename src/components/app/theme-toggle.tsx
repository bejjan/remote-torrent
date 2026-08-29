"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const THEMES = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

function useThemeSelection() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const selected = mounted ? (theme ?? "system") : "system";
  const Icon =
    !mounted || selected === "system" ? Monitor : selected === "light" ? Sun : Moon;

  return { selected, setTheme, resolvedTheme, mounted, Icon };
}

function ThemeRadioItems({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (value: string) => void;
}) {
  return (
    <DropdownMenuRadioGroup
      value={selected}
      onValueChange={(value) => {
        if (value) onChange(value);
      }}
    >
      {THEMES.map(({ value, label, icon: ItemIcon }) => (
        <DropdownMenuRadioItem key={value} value={value}>
          <ItemIcon />
          {label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

export function ThemeMenuSub() {
  const { selected, setTheme, Icon } = useThemeSelection();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon /> Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <ThemeRadioItems selected={selected} onChange={setTheme} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function ThemeToggle() {
  const { selected, setTheme, resolvedTheme, mounted, Icon } = useThemeSelection();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Theme"
            title={
              mounted
                ? `Theme: ${selected}${selected === "system" && resolvedTheme ? ` (${resolvedTheme})` : ""}`
                : "Theme"
            }
          />
        }
      >
        <Icon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ThemeRadioItems selected={selected} onChange={setTheme} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
