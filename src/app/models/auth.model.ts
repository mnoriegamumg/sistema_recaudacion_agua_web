export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    data: {
        token: string;
        token_type: string;
        expires_in: number;
        usuario: {
            id: number;
            nombre: string;
            email: string;
            rol: string;
        };
    };
}

export interface Usuario {
    id: number;
    nombre: string;
    email: string;
    rol: string;
}