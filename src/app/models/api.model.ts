export interface ApiResponse<T> {
    success: boolean;
    data: T;
    meta?: { total?: number; [key: string]: unknown };
    error?: string;
}
