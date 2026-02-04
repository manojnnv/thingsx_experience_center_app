"use client";

import { Toaster } from "sonner";
import { colors } from "@/config/theme";

interface ThemedToasterProps {
    accentColor?: string;
}

/**
 * A themed Toaster component that applies page-specific accent colors
 * to toast messages, matching the dark theme of the experience pages.
 */
function ThemedToaster({ accentColor = colors.primary }: ThemedToasterProps) {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                style: {
                    background: "#000000",
                    border: `1px solid #1a1a1a`,
                    color: accentColor,
                },
                classNames: {
                    toast: "themed-toast",
                    success: "themed-toast-success",
                    error: "themed-toast-error",
                    info: "themed-toast-info",
                },
            }}
        />
    );
}

export default ThemedToaster;
