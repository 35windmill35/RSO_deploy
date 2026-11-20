export type TPaginationResult<T> = IPagination<T> | null;

export interface IPagination<T> {
  items: T[];
  subsriptions?: string[];
}
