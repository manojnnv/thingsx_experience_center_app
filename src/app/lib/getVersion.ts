/**
 * Version Helper
 * Get application version information
 */

export function getVersion(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';
}

export function getBuildTime(): string {
  return process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();
}

export function getVersionInfo() {
  return {
    version: getVersion(),
    buildTime: getBuildTime(),
  };
}
