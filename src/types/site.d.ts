/**
 * Site Configuration Type Definitions
 */

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  disabled?: boolean;
  external?: boolean;
  children?: NavItem[];
}

export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  links: {
    github?: string;
    docs?: string;
    support?: string;
  };
  mainNav: NavItem[];
  sidebarNav: NavItem[];
}

export interface ThemeConfig {
  defaultTheme: 'light' | 'dark' | 'system';
  enableSystem: boolean;
  storageKey: string;
}
