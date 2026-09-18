import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ContadorService } from '../../services/contador.service';
import { PagoService } from '../../services/pago.service';
import { TarifaService } from '../../services/tarifa.service';
import { Contador } from '../../models/contador.model';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

type Field = { name: string; label: string; type?: string; required?: boolean; options?: string[] };
type MonthStatus = { mes: number; nombre: string; pagado: boolean; fechaPago?: string };

@Component({
    selector: 'app-contadores',
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './contadores.html',
    styleUrl: '../gestion/gestion.css'
})
export class ContadoresComponent implements OnInit {
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly contadores = inject(ContadorService);
    private readonly pagos = inject(PagoService);
    private readonly tarifas = inject(TarifaService);

    private readonly monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Comunidades obtenidas del API de tarifas.
    readonly comunidades = signal<string[]>([]);

    readonly fields: Field[] = [
        { name: 'codigo_contador', label: 'Código del contador', required: true },
        { name: 'nombre_propietario', label: 'Nombre del propietario', required: true },
        { name: 'dpi', label: 'DPI' },
        { name: 'nit', label: 'NIT' },
        { name: 'comunidad', label: 'Comunidad', required: true },
        { name: 'estado', label: 'Estado', required: true, options: ['activo', 'inactivo', 'suspendido'] }
    ];

    readonly records = signal<Record<string, unknown>[]>([]);
    readonly form = signal<Record<string, unknown>>({});
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly showForm = signal(false);
    readonly editingId = signal<number | null>(null);
    readonly message = signal('');
    readonly error = signal('');

    readonly showStatement = signal(false);
    readonly loadingStatement = signal(false);
    readonly statementError = signal('');
    readonly statementYear = signal(new Date().getFullYear());
    readonly statementRecord = signal<Record<string, unknown> | null>(null);
    readonly monthsStatus = signal<MonthStatus[]>([]);

    ngOnInit(): void {
        this.resetForm();
        this.loadRecords();
        this.loadCommunities();
    }

    /** Carga la lista de comunidades desde el API de tarifas. */
    loadCommunities(): void {
        this.tarifas.getActuales().subscribe({
            next: response => {
                const tarifas = Array.isArray(response?.data) ? response.data as Record<string, unknown>[] : [];
                const comunidades = Array.from(new Set(
                    tarifas
                        .map(tarifa => String(tarifa['comunidad'] ?? '').trim())
                        .filter(comunidad => comunidad !== '')
                )).sort((a, b) => a.localeCompare(b, 'es'));
                this.comunidades.set(comunidades);
            },
            error: () => {
                this.comunidades.set([]);
            }
        });
    }

    logout(): void { this.auth.logout(); this.router.navigate(['/login']); }

    loadRecords(): void {
        this.loading.set(true);
        this.error.set('');
        this.contadores.getContadores().subscribe({
            next: response => { this.records.set(Array.isArray(response?.data) ? response.data as unknown as Record<string, unknown>[] : []); this.loading.set(false); },
            error: () => { this.records.set([]); this.error.set('No fue posible cargar los registros.'); this.loading.set(false); }
        });
    }

    openForm(): void { this.editingId.set(null); this.message.set(''); this.error.set(''); this.resetForm(); this.showForm.set(true); }
    closeForm(): void { this.showForm.set(false); this.editingId.set(null); }

    recordId(record: Record<string, unknown>): number | null {
        const value = record['id_contador'] ?? record['id'];
        const id = Number(value);
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    openEditForm(record: Record<string, unknown>): void {
        const id = this.recordId(record);
        if (id === null) {
            this.error.set('El registro no tiene un identificador válido para editarlo.');
            return;
        }
        this.editingId.set(id);
        this.message.set('');
        this.error.set('');
        const values: Record<string, unknown> = {};
        this.fields.forEach(field => values[field.name] = record[field.name] ?? (field.options?.[0] ?? ''));
        this.form.set(values);
        this.showForm.set(true);
    }

    save(): void {
        const values = this.form();
        if (this.fields.some(field => field.required && !values[field.name])) {
            this.error.set('Completa los campos obligatorios.');
            return;
        }
        this.saving.set(true);
        this.error.set('');
        const editId = this.editingId();
        const request = editId !== null
            ? this.contadores.updateContador(editId, values as Partial<Contador>)
            : this.contadores.createContador(values as Partial<Contador>);
        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.showForm.set(false);
                this.editingId.set(null);
                this.message.set(`Contador ${editId !== null ? 'actualizado' : 'guardado'} correctamente.`);
                this.loadRecords();
            },
            error: response => {
                this.saving.set(false);
                this.error.set(response?.error?.error || 'No fue posible guardar el registro.');
            }
        });
    }

    updateField(name: string, value: unknown): void { this.form.update(current => ({ ...current, [name]: value })); }
    display(record: Record<string, unknown>, field: Field): string { const value = record[field.name]; return value === undefined || value === null || value === '' ? '-' : String(value); }

    // ==========================================
    // Estado de cuenta
    // ==========================================
    private formatPaymentDate(pago: Record<string, unknown>): string {
        const raw = pago['fecha_pago'] ?? pago['fecha'] ?? pago['created_at'] ?? pago['fecha_creacion'];
        if (raw === undefined || raw === null || raw === '') {
            return '';
        }
        const date = new Date(String(raw));
        if (Number.isNaN(date.getTime())) {
            return String(raw);
        }
        return date.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    private contadorId(record: Record<string, unknown>): number | null {
        const value = record['id_contador'] ?? record['id'];
        const id = Number(value);
        return Number.isInteger(id) && id > 0 ? id : null;
    }

    openStatement(record: Record<string, unknown>): void {
        const idContador = this.contadorId(record);
        if (idContador === null) {
            this.error.set('El registro no tiene un contador válido para consultar su estado de cuenta.');
            return;
        }

        const year = new Date().getFullYear();
        this.statementRecord.set(record);
        this.statementYear.set(year);
        this.statementError.set('');
        this.monthsStatus.set([]);
        this.loadingStatement.set(true);
        this.showStatement.set(true);

        this.pagos.getPagosPorContador(idContador, year).pipe(
            catchError(() => of({ success: false, data: [] }))
        ).subscribe(response => {
            const pagos = Array.isArray(response?.data) ? response.data as Record<string, unknown>[] : [];
            const paymentDates = new Map<number, string>();
            pagos.forEach(pago => {
                const mes = Number(pago['mes_pagado']);
                if (Number.isInteger(mes) && mes >= 1 && mes <= 12 && !paymentDates.has(mes)) {
                    paymentDates.set(mes, this.formatPaymentDate(pago));
                }
            });

            const now = new Date();
            const lastMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
            const statuses: MonthStatus[] = [];
            for (let mes = 1; mes <= lastMonth; mes++) {
                const pagado = paymentDates.has(mes);
                statuses.push({ mes, nombre: this.monthNames[mes - 1], pagado, fechaPago: pagado ? paymentDates.get(mes) : undefined });
            }
            this.monthsStatus.set(statuses);
            this.loadingStatement.set(false);
        });
    }

    closeStatement(): void {
        this.showStatement.set(false);
        this.statementRecord.set(null);
        this.monthsStatus.set([]);
    }

    printStatement(): void {
        window.print();
    }

    statementValue(name: string): string {
        const value = this.statementRecord()?.[name];
        return value === undefined || value === null || value === '' ? '-' : String(value);
    }

    paidMonths(): MonthStatus[] {
        return this.monthsStatus().filter(month => month.pagado);
    }

    unpaidMonths(): MonthStatus[] {
        return this.monthsStatus().filter(month => !month.pagado);
    }

    private resetForm(): void {
        const values: Record<string, unknown> = {};
        this.fields.forEach(field => values[field.name] = field.options?.[0] ?? '');
        this.form.set(values);
    }
}
