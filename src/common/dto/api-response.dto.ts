export class PaginationMeta {
  totalCount: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  totalPages: number = 1;
  hasNextPage: boolean = false;
  hasPreviousPage: boolean = false;
}

export class ApiResponse<T> {
  messages: { type: string; description: string }[];
  data: T | null;
  pagination?: PaginationMeta;

  constructor(
    messages: { type: string; description: string }[],
    data: T | null = null,
    pagination?: PaginationMeta,
  ) {
    this.messages = messages;
    this.data = data;
    this.pagination = pagination;
  }

  static success<T>(data: T, message: string, pagination?: PaginationMeta): ApiResponse<T> {
    return new ApiResponse([{ type: 'Success', description: message }], data, pagination);
  }

  static error<T>(message: string, data: T | null = null): ApiResponse<T> {
    return new ApiResponse([{ type: 'Error', description: message }], data);
  }

  static info<T>(data: T, message: string, pagination?: PaginationMeta): ApiResponse<T> {
    return new ApiResponse([{ type: 'Information', description: message }], data, pagination);
  }

  static warning<T>(message: string, data: T | null = null): ApiResponse<T> {
    return new ApiResponse([{ type: 'Warning', description: message }], data);
  }
}