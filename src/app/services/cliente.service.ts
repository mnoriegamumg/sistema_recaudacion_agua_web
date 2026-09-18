import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api.model';
import { Cliente } from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClienteService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.apiUrl}/clientes`;

    getClientes(): Observable<ApiResponse<Cliente[]>> {
        return this.http.get<ApiResponse<Cliente[]>>(this.baseUrl);
    }

    getCliente(id: number): Observable<ApiResponse<Cliente>> {
        return this.http.get<ApiResponse<Cliente>>(`${this.baseUrl}/${id}`);
    }

    getPorContador(idContador: number): Observable<ApiResponse<Cliente>> {
        return this.http.get<ApiResponse<Cliente>>(`${this.baseUrl}/contador/${idContador}`);
    }

    createCliente(data: Partial<Cliente>): Observable<ApiResponse<Cliente>> {
        return this.http.post<ApiResponse<Cliente>>(this.baseUrl, data);
    }

    updateCliente(id: number, data: Partial<Cliente>): Observable<ApiResponse<Cliente>> {
        return this.http.put<ApiResponse<Cliente>>(`${this.baseUrl}/${id}`, data);
    }

    deleteCliente(id: number): Observable<ApiResponse<unknown>> {
        return this.http.delete<ApiResponse<unknown>>(`${this.baseUrl}/${id}`);
    }
}
