export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ApiResponseOptions<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    errors?: unknown;
    meta?: PaginationMeta | Record<string, unknown>;
}

export class ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    errors?: unknown;
    meta?: PaginationMeta | Record<string, unknown>;

    constructor(options: ApiResponseOptions<T>) {
        this.success = options.success;
        this.message = options.message;
        this.data = options.data;
        this.errors = options.errors;
        this.meta = options.meta;
    }

    static success<T>(
        message = "Success",
        data?: T,
        meta?: PaginationMeta | Record<string, unknown>
    ) {
        return new ApiResponse<T>({
            success: true,
            message,
            data,
            meta,
        });
    }

    static created<T>(
        message = "Created successfully",
        data?: T
    ) {
        return new ApiResponse<T>({
            success: true,
            message,
            data,
        });
    }

    static failure(
        message = "Request failed",
        errors?: unknown
    ) {
        return new ApiResponse({
            success: false,
            message,
            errors,
        });
    }
}