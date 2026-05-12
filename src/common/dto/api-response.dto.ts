export class PaginationMeta {
    totalCount: number;
    pageSize: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export class ApiResponse<T> {
    data: T;
    messages: { type: string; description: string }[];
    pagination?: PaginationMeta;

    constructor(
        data: T,
        messages: { type: string; description: string }[] = [],
        pagination?: PaginationMeta,
    ) {
        this.data = data;
        this.messages = messages;
        this.pagination = pagination;
    }

    static success<T>(
        data: T,
        description = 'Operación exitosa',
        pagination?: PaginationMeta,
    ): ApiResponse<T> {
        return new ApiResponse(
            data,
            [{ type: 'Success', description }],
            pagination,
        );
    }

    static info<T>(
        data: T,
        description = 'Información recuperada correctamente',
        pagination?: PaginationMeta,
    ): ApiResponse<T> {
        return new ApiResponse(
            data,
            [{ type: 'Information', description }],
            pagination,
        );
    }

    static error<T>(description: string): ApiResponse<T> {
        return new ApiResponse(null as T, [{ type: 'Error', description }]);
    }
}
