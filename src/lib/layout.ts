"use client";

import { api } from "@/app/utils/api";
import { getOrgId, getSiteId } from "@/config/site";
import { fail, getErrorMessage, ok, ServiceResult } from "@/app/services/serviceUtils";

export interface LayoutData {
  layout_id?: number;
  level?: number;
  layout_json?: string | Record<string, any>;
  [key: string]: any;
}

let layoutPromise: Promise<ServiceResult<LayoutData | null>> | null = null;

async function fetchLayout(): Promise<ServiceResult<LayoutData | null>> {
  try {
    const response = await api.post("/v1/layout/get", {
      org_id: getOrgId(),
      site_id: getSiteId(),
    });

    const payload = response?.data?.data ?? response?.data ?? null;
    if (Array.isArray(payload)) {
      return ok(payload[0] ?? null);
    }
    return ok(payload ?? null);
  } catch (error) {
    return fail(getErrorMessage(error, "Failed to load layout"));
  }
}

/** Single-flight cache for the session — concurrent callers share one request. */
export async function getLayout(): Promise<ServiceResult<LayoutData | null>> {
  if (!layoutPromise) {
    layoutPromise = fetchLayout().then((result) => {
      if (result.error) layoutPromise = null;
      return result;
    });
  }
  return layoutPromise;
}

export function parseLayoutJson(layout: LayoutData | null): LayoutData | null {
  if (!layout || !layout.layout_json) return layout;
  if (typeof layout.layout_json === "object") {
    return { ...layout, parsed: layout.layout_json };
  }
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
