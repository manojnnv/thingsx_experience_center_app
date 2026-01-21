"use client";

import { Button } from "@/app/components/ui/button";
import React from "react";

type ButtonVariant =
  | "outline"
  | "link"
  | "default"
  | "destructive"
  | "secondary"
  | "ghost";

function AppButton({
  label = "Click Me",
  onClick,
  variant = "outline",
  children,
  disabled,
  className,
}: {
  label?: string;
  onClick?: () => void;
  variant?: ButtonVariant;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div>
      <Button
        variant={variant}
        className={`cursor-pointer tracking-wide ${className}`}
        onClick={onClick}
        disabled={disabled}
      >
        {children} {label}
      </Button>
    </div>
  );
}

export default AppButton;
