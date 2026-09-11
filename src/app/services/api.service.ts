import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
    constructor(
        private http: HttpClient,
        private authService: AuthService
    ) {}

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        });
    }

    // ==========================================
    // USUARIOS
    // ==========================================
    getUsuarios(): Observable<any> {
        return this.http.get(`${environment.apiUrl}/usuarios`, { headers: this.getHeaders() });
    }

    createUsuario(data: any): Observable<any> {
        return this.http.post(`${environment.apiUrl}/usuarios`, data, { headers: this.getHeaders() });
    }

    updateUsuario(id: number, data: any): Observable<any> {
        return this.http.put(`${environment.apiUrl}/usuarios/${id}`, data, { headers: this.getHeaders() });
    }

    // ==========================================
    // CONTADORES
    // ==========================================
    getContadores(): Observable<any> {
        return this.http.get(`${environment.apiUrl}/contadores`, { headers: this.getHeaders() });
    }

    getContador(id: number): Observable<any> {
        return this.http.get(`${environment.apiUrl}/contadores/${id}`, { headers: this.getHeaders() });
    }

    createContador(data: any): Observable<any> {
        return this.http.post(`${environment.apiUrl}/contadores`, data, { headers: this.getHeaders() });
    }

    updateContador(id: number, data: any): Observable<any> {
        return this.http.put(`${environment.apiUrl}/contadores/${id}`, data, { headers: this.getHeaders() });
    }

    deleteContador(id: number): Observable<any> {
        return this.http.delete(`${environment.apiUrl}/contadores/${id}`, { headers: this.getHeaders() });
    }

    buscarContadorPorCodigo(codigo: string): Observable<any> {
        return this.http.get(`${environment.apiUrl}/contadores/codigo/${codigo}`, { headers: this.getHeaders() });
    }

    // ==========================================
    // CLIENTES
    // ==========================================
    getClientes(): Observable<any> {
        return this.http.get(`${environment.apiUrl}/clientes`, { headers: this.getHeaders() });
    }

    getCliente(id: number): Observable<any> {
        return this.http.get(`${environment.apiUrl}/clientes/${id}`, { headers: this.getHeaders() });
    }

    getClientePorContador(idContador: number): Observable<any> {
        return this.http.get(`${environment.apiUrl}/clientes/contador/${idContador}`, { headers: this.getHeaders() });
    }

    createCliente(data: any): Observable<any> {
        return this.http.post(`${environment.apiUrl}/clientes`, data, { headers: this.getHeaders() });
    }

    updateCliente(id: number, data: any): Observable<any> {
        return this.http.put(`${environment.apiUrl}/clientes/${id}`, data, { headers: this.getHeaders() });
    }

    deleteCliente(id: number): Observable<any> {
        return this.http.delete(`${environment.apiUrl}/clientes/${id}`, { headers: this.getHeaders() });
    }

    // ==========================================
    // PAGOS
    // ==========================================
    registrarPago(data: any): Observable<any> {
        return this.http.post(`${environment.apiUrl}/pagos`, data, { headers: this.getHeaders() });
    }

    getPagos(limit: number = 100, offset: number = 0): Observable<any> {
        return this.http.get(`${environment.apiUrl}/pagos?limit=${limit}&offset=${offset}`, { headers: this.getHeaders() });
    }

    getPago(id: number): Observable<any> {
        return this.http.get(`${environment.apiUrl}/pagos/${id}`, { headers: this.getHeaders() });
    }

    getPagosPorContador(idContador: number, ano?: number): Observable<any> {
        let url = `${environment.apiUrl}/pagos/contador/${idContador}`;
        if (ano) url += `?ano=${ano}`;
        return this.http.get(url, { headers: this.getHeaders() });
    }

    getPagoPorRecibo(recibo: string): Observable<any> {
        return this.http.get(`${environment.apiUrl}/pagos/recibo/${recibo}`, { headers: this.getHeaders() });
    }

    getTarifaContador(idContador: number): Observable<any> {
        return this.http.get(`${environment.apiUrl}/pagos/tarifa/${idContador}`, { headers: this.getHeaders() });
    }

    getResumenDiario(fecha?: string): Observable<any> {
        const url = fecha ? `${environment.apiUrl}/pagos/resumen/diario?fecha=${fecha}` : `${environment.apiUrl}/pagos/resumen/diario`;
        return this.http.get(url, { headers: this.getHeaders() });
    }

    anularPago(id: number, motivo: string): Observable<any> {
        return this.http.put(`${environment.apiUrl}/pagos/${id}`, { motivo }, { headers: this.getHeaders() });
    }

    // ==========================================
    // MOROSIDAD
    // ==========================================
    getMorosidadActual(idContador: number): Observable<any> {
        return this.http.get(`${environment.apiUrl}/morosidad/actual?id_contador=${idContador}`, { headers: this.getHeaders() });
    }

    getHistorialMorosidad(idContador: number): Observable<any> {
        return this.http.get(`${environment.apiUrl}/morosidad/historial/${idContador}`, { headers: this.getHeaders() });
    }

    getMorosos(): Observable<any> {
        return this.http.get(`${environment.apiUrl}/morosidad/morosos`, { headers: this.getHeaders() });
    }

    getResumenMorosidad(): Observable<any> {
        return this.http.get(`${environment.apiUrl}/morosidad/resumen`, { headers: this.getHeaders() });
    }

    getMorosidadPorMesAno(mes: number, ano: number): Observable<any> {
        return this.http.get(`${environment.apiUrl}/morosidad/${mes}/${ano}`, { headers: this.getHeaders() });
    }

    calcularMorosidad(mes?: number, ano?: number): Observable<any> {
        const body = { mes, ano };
        return this.http.post(`${environment.apiUrl}/morosidad/calcular`, body, { headers: this.getHeaders() });
    }

    // ==========================================
    // TARIFAS
    // ==========================================
    getTarifasActuales(comunidad?: string): Observable<any> {
        const url = comunidad ? `${environment.apiUrl}/tarifas/actual?comunidad=${comunidad}` : `${environment.apiUrl}/tarifas/actual`;
        return this.http.get(url, { headers: this.getHeaders() });
    }

    crearTarifa(data: any): Observable<any> {
        return this.http.post(`${environment.apiUrl}/tarifas`, data, { headers: this.getHeaders() });
    }

    actualizarTarifa(id: number, data: any): Observable<any> {
        return this.http.put(`${environment.apiUrl}/tarifas/${id}`, data, { headers: this.getHeaders() });
    }
}