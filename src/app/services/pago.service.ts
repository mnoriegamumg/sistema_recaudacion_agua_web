import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api.model';
import { PagoRequest } from '../models/pago.model';

@Injectable({ providedIn: 'root' })
export class PagoService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/pagos`;

    registrarPago(data: Partial<PagoRequest>): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(this.baseUrl, data);
    }

    getPagos(limit = 100, offset = 0): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}?limit=${limit}&offset=${offset}`);
    }

    getPago(id: number): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${id}`);
    }

    actualizarPago(id: number, data: Partial<PagoRequest>): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, data);
    }

    getPagosPorContador(idContador: number, ano?: number): Observable<ApiResponse<any[]>> {
        const url = ano
            ? `${this.baseUrl}/contador/${idContador}?ano=${ano}`
            : `${this.baseUrl}/contador/${idContador}`;
        return this.http.get<ApiResponse<any[]>>(url);
    }

    getPagoPorRecibo(recibo: string): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.baseUrl}/recibo/${recibo}`);
    }

    getTarifaContador(idContador: number): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${this.baseUrl}/tarifa/${idContador}`);
    }

    getResumenDiario(fecha?: string): Observable<ApiResponse<any>> {
        const url = fecha ? `${this.baseUrl}/resumen/diario?fecha=${fecha}` : `${this.baseUrl}/resumen/diario`;
        return this.http.get<ApiResponse<any>>(url);
    }

    anularPago(id: number, motivo: string): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${id}`, { motivo });
    }
}
