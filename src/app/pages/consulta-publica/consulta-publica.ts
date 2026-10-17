import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginPublicService } from '../../services/login-public.service';

export interface PublicMonthStatus {
    mes: number;
    nombre: string;
    pagado: boolean;
    fechaPago?: string;
    recibo?: string;
    monto?: number;
    vencido: boolean;
}

@Component({
    selector: 'app-consulta-publica',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './consulta-publica.html',
    styleUrl: './consulta-publica.css'
})
export class ConsultaPublicaComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly http = inject(HttpClient);
    private readonly loginPublicService = inject(LoginPublicService);

    // Usuario público requerido
    readonly userPublic = 'userPublic';

    readonly monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Entrada del usuario y estado del reCAPTCHA
    readonly codigoInput = signal('');
    readonly isCodigoLocked = signal(false);
    readonly recaptchaToken = signal('');
    readonly tokenCreatedAt = signal<number>(0);
    readonly captchaVerified = signal(false);
    readonly captchaChecking = signal(false);
    readonly captchaError = signal('');

    // Estado del progreso
    readonly loading = signal(false);
    readonly stepMessage = signal('');
    readonly error = signal('');
    readonly searched = signal(false);

    // Datos obtenidos para el estado de cuenta y ficha
    readonly contador = signal<Record<string, unknown> | null>(null);
    readonly selectedYear = signal(new Date().getFullYear());
    readonly monthsStatus = signal<PublicMonthStatus[]>([]);
    readonly paymentHistory = signal<Record<string, unknown>[]>([]);
    readonly monthlyRate = signal<number>(0);
    readonly copiedLink = signal(false);

    readonly availableYears = [
        new Date().getFullYear(),
        new Date().getFullYear() - 1,
        new Date().getFullYear() - 2
    ];

    ngOnInit(): void {
        // Soporta /consulta/:codigo, /consulta?codigo=... o /consulta?id=...
        this.route.paramMap.subscribe(params => {
            const pathValue = (params.get('codigo') || params.get('id') || '').trim();

            this.route.queryParamMap.subscribe(queryParams => {
                const queryVal = (queryParams.get('codigo') || queryParams.get('id') || queryParams.get('contador') || '').trim();
                const anoParam = queryParams.get('ano');

                if (anoParam) {
                    const parsedAno = Number(anoParam);
                    if (Number.isInteger(parsedAno) && parsedAno >= 2000) {
                        this.selectedYear.set(parsedAno);
                    }
                }

                const target = pathValue || queryVal;
                if (target) {
                    this.codigoInput.set(target);
                    // Si la URL contiene el parámetro del código, no permitir editarlo
                    this.isCodigoLocked.set(true);
                } else {
                    // Si no tiene parámetro en la URL, permitir edición libre
                    this.isCodigoLocked.set(false);
                }
            });
        });
    }

    /**
     * Genera un token aleatorio de exactamente 15 caracteres alfanuméricos
     */
    private generarTokenRecaptcha(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(15);
        crypto.getRandomValues(array);
        let token = '';
        for (let i = 0; i < 15; i++) {
            token += chars[array[i] % chars.length];
        }
        return token;
    }

    /**
     * Interacción con el widget de reCAPTCHA
     */
    toggleCaptcha(): void {
        if (this.captchaChecking()) {
            return;
        }

        // Si ya está verificado y hace clic de nuevo, renueva el token
        this.captchaChecking.set(true);
        this.captchaError.set('');

        setTimeout(() => {
            const token = this.generarTokenRecaptcha();
            this.recaptchaToken.set(token);
            this.tokenCreatedAt.set(Date.now());
            this.captchaVerified.set(true);
            this.captchaChecking.set(false);
            this.captchaError.set('');

            // Si ya hay un código en el campo de texto, iniciar consulta de inmediato
            if (this.codigoInput().trim()) {
                this.ejecutarConsulta();
            }
        }, 650);
    }

    onFormSubmit(): void {
        const codigo = this.codigoInput().trim();
        if (!codigo) {
            this.error.set('Por favor ingresa el código del contador (ej. M003).');
            return;
        }

        if (!this.captchaVerified() || !this.recaptchaToken()) {
            this.captchaError.set('Por favor completa la verificación reCAPTCHA para generar un token de seguridad.');
            return;
        }

        this.ejecutarConsulta();
    }

    /**
     * Flujo completo:
     * 1. Validar token reCAPTCHA con loginPublic(userPublic, token) -> devuelve JWT (sin sesión en frontend)
     * 2. Consultar /api/contadores/codigo/{codigo} con el JWT
     * 3. Mostrar datos generales del contador encontrado
     * 4. Consultar /api/pagos/contador/{id}?ano={ano} con el JWT
     * 5. Dibujar estado de cuenta
     */
    private ejecutarConsulta(): void {
        const codigo = this.codigoInput().trim();
        const tokenRecaptcha = this.recaptchaToken();
        const createdAt = this.tokenCreatedAt();

        this.loading.set(true);
        this.error.set('');
        this.searched.set(true);
        this.contador.set(null);
        this.monthsStatus.set([]);
        this.paymentHistory.set([]);

        // Paso 1: Consumir loginPublic con userPublic y recaptchaToken
        this.stepMessage.set(`1/3 Validando token reCAPTCHA (${tokenRecaptcha}) para usuario "${this.userPublic}"...`);

        this.loginPublicService.loginPublic(this.userPublic, tokenRecaptcha, createdAt).pipe(
            switchMap(authRes => {
                const jwtToken = authRes.token;

                // Paso 2: Consultar /api/contadores/codigo/{codigo}
                this.stepMessage.set(`2/3 Consultando datos generales del contador "${codigo}"...`);
                const headers = new HttpHeaders({ Authorization: `Bearer ${jwtToken}` });

                return this.http.get<any>(`${environment.apiUrl}/contadores/codigo/${encodeURIComponent(codigo)}`, { headers }).pipe(
                    switchMap(contadorRes => {
                        const contadorData = (contadorRes?.data ?? contadorRes) as Record<string, unknown>;
                        if (!contadorData) {
                            throw new Error(`No se encontró ningún contador con código "${codigo}".`);
                        }

                        // Guardar datos generales del contador
                        this.contador.set(contadorData);

                        const idContador = contadorData['id_contador'] ?? contadorData['id'];
                        if (!idContador) {
                            throw new Error('El contador no tiene un identificador válido.');
                        }

                        // Paso 3: Consultar /api/pagos/contador/{id}?ano={ano}
                        const year = this.selectedYear();
                        this.stepMessage.set(`3/3 Consultando pagos del contador #${idContador} para el año ${year}...`);

                        return this.http.get<any>(`${environment.apiUrl}/pagos/contador/${idContador}?ano=${year}`, { headers });
                    })
                );
            })
        ).subscribe({
            next: pagosRes => {
                this.loading.set(false);
                this.stepMessage.set('');

                const pagos = Array.isArray(pagosRes?.data)
                    ? pagosRes.data
                    : (Array.isArray(pagosRes) ? pagosRes : []);

                this.paymentHistory.set(pagos);
                this.procesarMeses(pagos, this.selectedYear());
            },
            error: err => {
                this.loading.set(false);
                this.stepMessage.set('');

                const errorMsg = err?.error?.error || err?.message || 'Error al procesar la solicitud.';

                // Si falló por validación de reCAPTCHA, invalidar el captcha para exigir uno nuevo
                if (err?.status === 400 && String(errorMsg).toLowerCase().includes('recaptcha')) {
                    this.captchaVerified.set(false);
                    this.recaptchaToken.set('');
                    this.captchaError.set(errorMsg);
                } else if (err?.status === 404) {
                    this.error.set(`No se encontró ningún contador con el código "${codigo}". Verifica que esté escrito exactamente como en tu recibo.`);
                } else {
                    this.error.set(errorMsg);
                }
            }
        });
    }

    /**
     * Mapeo de meses y cálculo de morosidad
     */
    private procesarMeses(pagos: Record<string, unknown>[], year: number): void {
        const paymentMap = new Map<number, { fecha: string; recibo: string; monto: number }>();
        let sumMonto = 0;
        let countMonto = 0;

        pagos.forEach(pago => {
            const mes = Number(pago['mes_pagado']);
            const monto = Number(pago['monto']);
            if (Number.isFinite(monto) && monto > 0) {
                sumMonto += monto;
                countMonto++;
            }

            if (Number.isInteger(mes) && mes >= 1 && mes <= 12) {
                paymentMap.set(mes, {
                    fecha: this.formatDate(pago['fecha_pago'] ?? pago['created_at']),
                    recibo: String(pago['numero_recibo'] ?? ''),
                    monto: Number(pago['monto'] ?? 0)
                });
            }
        });

        if (countMonto > 0) {
            this.monthlyRate.set(Math.round((sumMonto / countMonto) * 100) / 100);
        }

        const now = new Date();
        const statuses: PublicMonthStatus[] = [];

        for (let mes = 1; mes <= 12; mes++) {
            const info = paymentMap.get(mes);
            const isPastOrCurrent = year < now.getFullYear() || (year === now.getFullYear() && mes <= (now.getMonth() + 1));
            statuses.push({
                mes,
                nombre: this.monthNames[mes - 1],
                pagado: !!info,
                fechaPago: info?.fecha,
                recibo: info?.recibo,
                monto: info?.monto,
                vencido: !info && isPastOrCurrent
            });
        }

        this.monthsStatus.set(statuses);
    }

    cambiarAno(ano: number): void {
        this.selectedYear.set(ano);
        if (this.codigoInput().trim()) {
            // Renueva token reCAPTCHA para la nueva consulta de año
            this.recaptchaToken.set(this.generarTokenRecaptcha());
            this.tokenCreatedAt.set(Date.now());
            this.captchaVerified.set(true);
            this.ejecutarConsulta();
        }
    }

    isMoroso(): boolean {
        return this.monthsStatus().some(m => m.vencido);
    }

    totalAdeudado(): number {
        const pendingCount = this.mesesAdeudadosCount();
        const rate = this.monthlyRate();
        if (pendingCount > 0 && rate > 0) {
            return pendingCount * rate;
        }
        return 0;
    }

    mesesAdeudadosCount(): number {
        return this.monthsStatus().filter(m => m.vencido).length;
    }

    mesesPagadosCount(): number {
        return this.monthsStatus().filter(m => m.pagado).length;
    }

    /**
     * Imprimir estado de cuenta (abre la opción de impresión del navegador)
     */
    imprimirPagina(): void {
        window.print();
    }

    getPublicShareUrl(): string {
        const codigo = String(this.contador()?.['codigo_contador'] || this.codigoInput()).trim();
        return `${window.location.origin}/consulta?codigo=${encodeURIComponent(codigo)}&ano=${this.selectedYear()}`;
    }

    getWhatsAppShareUrl(): string {
        const codigo = String(this.contador()?.['codigo_contador'] || this.codigoInput()).trim();
        const url = this.getPublicShareUrl();
        const nombre = String(this.contador()?.['nombre_propietario'] ?? 'Vecino(a)');
        const estado = this.isMoroso()
            ? `⚠️ PENDIENTE DE PAGO (${this.mesesAdeudadosCount()} meses adeudados en ${this.selectedYear()})`
            : `✅ AL DÍA / SOLVENTE (${this.selectedYear()})`;

        const texto = `Estimado(a) ${nombre}, le compartimos el enlace para consultar su estado de cuenta del servicio de agua potable:\n\n` +
            `💧 *Código de Contador:* ${codigo}\n` +
            `📅 *Año:* ${this.selectedYear()}\n` +
            `📌 *Estado:* ${estado}\n` +
            `🔗 *Ver detalle completo:* ${url}`;

        return `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    }

    copyShareLink(): void {
        const url = this.getPublicShareUrl();
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.copiedLink.set(true);
                setTimeout(() => this.copiedLink.set(false), 3000);
            });
        }
    }

    formatDate(raw: unknown): string {
        if (!raw) return '-';
        const date = new Date(String(raw));
        if (Number.isNaN(date.getTime())) return String(raw);
        return date.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    formatCurrency(val: unknown): string {
        const amount = Number(val);
        return Number.isFinite(amount)
            ? `Q ${amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : 'Q 0.00';
    }

    getEstado(): string {
        return String(this.contador()?.['estado'] || 'activo');
    }

    pagoMesAno(pago: Record<string, unknown>): string {
        const mes = Number(pago['mes_pagado']);
        const ano = pago['ano_pagado'] ?? this.selectedYear();
        const mesNombre = Number.isInteger(mes) && mes >= 1 && mes <= 12 ? this.monthNames[mes - 1] : String(pago['mes_pagado'] ?? '-');
        return `${mesNombre} ${ano}`.trim();
    }
}
