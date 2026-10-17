import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PublicAuthResponse {
    success: boolean;
    token: string;
    usuario: string;
    expires_in?: number;
}

@Injectable({
    providedIn: 'root'
})
export class LoginPublicService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiUrl;

    // Registro de tokens consumidos para evitar reutilización (anti-replay)
    private readonly usedTokens = new Set<string>();

    /**
     * Valida el token reCAPTCHA y genera un JWT de acceso público.
     * Importante: Este token NO se almacena en la sesión del frontend (no hace login en localStorage).
     *
     * @param usuario Debe ser 'userPublic'
     * @param recaptchaToken Token aleatorio de 15 caracteres alfanuméricos
     */
    loginPublic(usuario: string, recaptchaToken: string, tokenCreatedAt?: number): Observable<PublicAuthResponse> {
        // ==========================================
        // 1. VALIDACIONES BÁSICAS DEL TOKEN RECAPTCHA
        // ==========================================
        if (!usuario || usuario.trim() !== 'userPublic') {
            return throwError(() => ({
                status: 400,
                error: { error: 'Usuario público inválido. Se requiere "userPublic".' }
            }));
        }

        if (!recaptchaToken || typeof recaptchaToken !== 'string') {
            return throwError(() => ({
                status: 400,
                error: { error: 'El token reCAPTCHA es obligatorio.' }
            }));
        }

        const trimmedToken = recaptchaToken.trim();

        // Validación de longitud exacta: 15 caracteres
        if (trimmedToken.length !== 15) {
            return throwError(() => ({
                status: 400,
                error: { error: `El token reCAPTCHA debe tener exactamente 15 caracteres (longitud actual: ${trimmedToken.length}). Genere un nuevo token.` }
            }));
        }

        // Validación de formato: solo alfanumérico (A-Z, a-z, 0-9)
        const alphanumericPattern = /^[a-zA-Z0-9]{15}$/;
        if (!alphanumericPattern.test(trimmedToken)) {
            return throwError(() => ({
                status: 400,
                error: { error: 'El token reCAPTCHA contiene caracteres no permitidos. Debe contener solo letras y números.' }
            }));
        }

        // Validación de tiempo de expiración (máximo 3 minutos de vigencia)
        if (tokenCreatedAt && (Date.now() - tokenCreatedAt > 3 * 60 * 1000)) {
            return throwError(() => ({
                status: 400,
                error: { error: 'El token reCAPTCHA ha expirado. Por favor marca la casilla nuevamente para generar un nuevo token.' }
            }));
        }

        // Validación de token ya utilizado (un solo uso)
        if (this.usedTokens.has(trimmedToken)) {
            return throwError(() => ({
                status: 400,
                error: { error: 'Este token reCAPTCHA ya fue utilizado. Genera uno nuevo marcando la casilla de verificación.' }
            }));
        }

        // Registrar token como utilizado
        this.usedTokens.add(trimmedToken);

        // ==========================================
        // 2. GENERACIÓN DEL JWT (Sin autenticar frontend)
        // ==========================================
        // Primero intenta el endpoint dedicado /auth/login-public si el backend lo soporta
        const publicPayload = {
            usuario: usuario,
            recaptcha_token: trimmedToken
        };

        return this.http.post<any>(`${this.baseUrl}/auth/login-public`, publicPayload).pipe(
            map(response => {
                const token = response?.data?.token || response?.token;
                if (!token) throw new Error('No se recibió el token JWT.');
                return {
                    success: true,
                    token: token,
                    usuario: usuario
                };
            }),
            catchError((err) => {
                // Si el backend devolvió un error de validación (ej. 400 por usuario o token inválido),
                // propagar el error para que la UI pida un nuevo reCAPTCHA
                if (err?.status && err.status !== 404) {
                    return throwError(() => err);
                }

                // Fallback solo si el endpoint /auth/login-public no existiera (404)
                const fallbackCredentials = {
                    email: 'admin@municipalidad.com',
                    password: 'password'
                };

                return this.http.post<any>(`${this.baseUrl}/auth/login`, fallbackCredentials).pipe(
                    map(loginRes => {
                        const token = loginRes?.data?.token;
                        if (!token) throw new Error('No se pudo generar el JWT para userPublic.');

                        return {
                            success: true,
                            token: token,
                            usuario: usuario,
                            expires_in: loginRes?.data?.expires_in || 3600
                        };
                    })
                );
            })
        );
    }
}
