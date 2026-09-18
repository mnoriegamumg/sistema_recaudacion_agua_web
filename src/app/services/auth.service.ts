import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, Usuario } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly TOKEN_KEY = 'token';
    private readonly USER_KEY = 'usuario';
    private readonly EXPIRES_KEY = 'token_expires_at';

    constructor(private http: HttpClient) {}

    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(
            `${environment.apiUrl}/auth/login`,
            credentials
        ).pipe(
            tap(response => {
                if (response.success) {
                    this.setSession(response.data);
                }
            })
        );
    }

    private setSession(data: LoginResponse['data']): void {
        localStorage.setItem(this.TOKEN_KEY, data.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.usuario));
        if (data.expires_in) {
            const expiresAt = Date.now() + data.expires_in * 1000;
            localStorage.setItem(this.EXPIRES_KEY, String(expiresAt));
        }
    }

    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.EXPIRES_KEY);
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    getUsuario(): Usuario | null {
        const user = localStorage.getItem(this.USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    isTokenExpired(): boolean {
        const expiresAt = localStorage.getItem(this.EXPIRES_KEY);
        if (!expiresAt) {
            return false;
        }
        return Date.now() >= Number(expiresAt);
    }

    isAuthenticated(): boolean {
        return !!this.getToken() && !this.isTokenExpired();
    }

    getMe(): Observable<any> {
        return this.http.get(`${environment.apiUrl}/auth/me`);
    }
}
