"use client";

import React, { Component, type ReactNode } from "react";
import { colors } from "@/config/theme";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ExperienceErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-4"
          style={{ backgroundColor: colors.background, color: colors.text }}
        >
          <p>Something went wrong loading this experience.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg font-semibold"
            style={{ backgroundColor: colors.primary, color: colors.background }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
