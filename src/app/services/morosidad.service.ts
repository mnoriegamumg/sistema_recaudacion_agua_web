import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class MorosidadService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/morosidad`;

    getActual(idContador: number): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.baseUrl}/actual?id_contador=${idContador}`);
    }

    getHistorial(idContador: number): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/historial/${idContador}`);
    }

    getMorosos(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/morosos`);
    }

    getResumen(): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.baseUrl}/resumen`);
    }

    getPorMesAno(mes: number, ano: number): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${mes}/${ano}`);
    }

    calcular(mes?: number, ano?: number): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.baseUrl}/calcular`, { mes, ano });
    }
}
