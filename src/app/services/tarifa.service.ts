import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class TarifaService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/tarifas`;

    getActuales(comunidad?: string): Observable<ApiResponse<any[]>> {
        const url = comunidad ? `${this.baseUrl}/actual?comunidad=${comunidad}` : `${this.baseUrl}/actual`;
        return this.http.get<ApiResponse<any[]>>(url);
    }

    crear(data: Record<string, unknown>): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(this.baseUrl, data);
    }

    actualizar(id: number, data: Record<string, unknown>): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
    }
}
