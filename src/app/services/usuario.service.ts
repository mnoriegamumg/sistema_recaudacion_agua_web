import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/usuarios`;

    getUsuarios(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(this.baseUrl);
    }

    createUsuario(data: Record<string, unknown>): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(this.baseUrl, data);
    }

    updateUsuario(id: number, data: Record<string, unknown>): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
    }
}
