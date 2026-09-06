export interface Contador {
    id_contador?: number;
    codigo_contador: string;
    dpi?: string;
    nit?: string;
    nombre_propietario: string;
    estado: 'activo' | 'inactivo' | 'suspendido';
    created_at?: string;
    updated_at?: string;
    creado_por?: string;
}

export interface ContadorResponse {
    success: boolean;
    data: Contador[];
    meta?: { total: number };
}