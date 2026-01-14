/**
 * Site Configuration
 * 
 * Experience Center site configuration.
 * This is used for all API calls that require a site_id.
 */

export const siteConfig = {
  // Experience Center site ID
  siteId: "1",
  
  // Organization ID (if needed)
  orgId: "1",
  
  // Site name
  siteName: "Experience Center",
} as const;

/**
 * Get the site ID for API calls
 * Uses the configured site ID or falls back to localStorage
 */
export function getSiteId(): string {
  return siteConfig.siteId || localStorage.getItem("site_id") || "1";
}

/**
 * Get the organization ID for API calls
 */
export function getOrgId(): string {
  return siteConfig.orgId || localStorage.getItem("org_id") || "1";
}
