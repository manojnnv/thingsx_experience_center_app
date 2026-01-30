/**
 * Component Type Definitions
 */

import { ButtonHTMLAttributes, ReactNode } from 'react';

export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => ReactNode;
}

export interface TableProps<T> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
}

type ButtonVariant =
  | 'outline'
  | 'link'
  | 'default'
  | 'destructive'
  | 'secondary'
  | 'ghost';

export interface AppIconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon: React.ElementType;
  variant?: ButtonVariant;
  classname?: string;
}
