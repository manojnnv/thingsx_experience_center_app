import React from "react";
import { Button } from "@/app/components/ui/button";
import { AppIconButtonProps } from "@/types";

function AppIconButton({
  label,
  onClick,
  icon: Icon,
  type = "button",
  variant = "outline",
  classname,
  ...props
}: AppIconButtonProps) {
  return (
    <div className="flex justify-between gap-2 items-center cursor-pointer">
      <Button
        className={`cursor-pointer ${classname}`}
        type={type}
        variant={variant}
        onClick={onClick}
        {...props}
      >
        <Icon size={20} />
        {label}
      </Button>
    </div>
  );
}

export default AppIconButton;
