import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api.model';
import { Contador } from '../models/contador.model';

@Injectable({ providedIn: 'root' })
export class ContadorService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/contadores`;

    getContadores(): Observable<ApiResponse<Contador[]>> {
        return this.http.get<ApiResponse<Contador[]>>(this.baseUrl);
    }

    getContador(id: number): Observable<ApiResponse<Contador>> {
        return this.http.get<ApiResponse<Contador>>(`${this.baseUrl}/${id}`);
    }

    createContador(data: Partial<Contador>): Observable<ApiResponse<Contador>> {
        return this.http.post<ApiResponse<Contador>>(this.baseUrl, data);
    }

    updateContador(id: number, data: Partial<Contador>): Observable<ApiResponse<Contador>> {
        return this.http.put<ApiResponse<Contador>>(`${this.baseUrl}/${id}`, data);
    }

    deleteContador(id: number): Observable<ApiResponse<unknown>> {
        return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`);
    }

    buscarPorCodigo(codigo: string): Observable<ApiResponse<Contador>> {
        return this.http.get<ApiResponse<Contador>>(`${this.baseUrl}/codigo/${codigo}`);
    }

    /**
     * Extrae el identificador de un contador desde una respuesta del API,
     * tolerando tanto `{ data: {...} }` como el objeto directo, y las
     * variantes de clave `id_contador` / `id`.
     */
    extractId(response: unknown): { id_contador: number } | null {
        const record = (response ?? {}) as Record<string, unknown>;
        const data = record['data'] as Record<string, unknown> | undefined;
        const source = data ?? record;
        const id = source?.['id_contador'] ?? source?.['id'];
        return typeof id === 'number' || typeof id === 'string' ? { id_contador: Number(id) } : null;
    }
}
