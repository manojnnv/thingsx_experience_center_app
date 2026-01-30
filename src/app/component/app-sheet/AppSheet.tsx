import React from "react";
import { colors } from "@/config/theme";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";

function AppSheet({
  title,
  id,
  children,
  footer,
  open,
  onOpenChange,
  accentColor,
}: {
  title?: string;
  id?: number | string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accentColor?: string;
}) {
  const accent = accentColor || colors.primary;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="p-4 sm-w-[60%] sm:max-w-[60%] w-full"
        style={{
          backgroundColor: colors.backgroundCard,
          borderColor: colors.border,
          color: colors.text,
          ["--background" as string]: colors.background,
          ["--card" as string]: colors.backgroundCard,
          ["--card-foreground" as string]: colors.text,
          ["--muted-foreground" as string]: colors.textMuted,
          ["--border" as string]: colors.border,
        }}
      >
        <SheetHeader>
          <SheetTitle style={{ color: accent }}>
            {title || "Drawer"} {id}
          </SheetTitle>
        </SheetHeader>
        <div className="w-full">{children}</div>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}

export default AppSheet;
