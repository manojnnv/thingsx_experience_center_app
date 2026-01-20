"use client";

// Stubbed layout service; replace with real implementation when layout is provided.

export interface LayoutData {
  id?: string | number;
  name?: string;
  layout_json?: string;
  [key: string]: any;
}

export async function getLayout(): Promise<{ data: LayoutData | null; error: string | null }> {
  // TODO: wire to real API once layout endpoint/details are available
  return { data: null, error: null };
}

export function parseLayoutJson(layout: LayoutData | null): LayoutData | null {
  if (!layout || !layout.layout_json) return layout;
  try {
    return { ...layout, parsed: JSON.parse(layout.layout_json) };
  } catch {
    return layout;
  }
}

export function fixLayoutImageUrls(layout: LayoutData | null): LayoutData | null {
  // Placeholder; apply CDN/base URL fixes when URLs are known
  return layout;
}

export function sanitizeLayoutObjects(layout: LayoutData | null): LayoutData | null {
  return layout;
}
