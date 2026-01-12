/**
 * Page Type Definitions
 */

export interface PageParams {
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>;
}

export interface LayoutParams {
  children: React.ReactNode;
  params: Record<string, string>;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageMeta {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
}
