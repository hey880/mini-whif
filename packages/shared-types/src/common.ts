/**
 * Common utility types shared across the application
 */

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export type SortOrder = 'asc' | 'desc';

export interface SortParams {
  sortBy?: string;
  sortOrder?: SortOrder;
}

export type Timestamp = Date | string;

export interface WithTimestamps {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WithSoftDelete extends WithTimestamps {
  deletedAt?: Timestamp | null;
}
