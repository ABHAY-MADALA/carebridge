"use client";

import { Component, type ReactNode } from "react";

/*
  Catches a WebGL/Canvas creation failure so the rest of the health-entry
  workflow keeps working — never a blank crashed page, always a path back
  to BodyRegionList.
*/
export class BodyPickerErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[carebridge] Body3D failed to render, falling back to list:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
