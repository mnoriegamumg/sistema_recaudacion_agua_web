import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MorosidadService } from '../../services/morosidad.service';
import { PagoService } from '../../services/pago.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

type Field = { name: string; label: string; type?: string; required?: boolean };
type MonthStatus = { mes: number; nombre: string; pagado: boolean; fechaPago?: string };

@Component({
    selector: 'app-morosidad',
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './morosidad.html',
    styleUrl: '../gestion/gestion.css'
})
export class MorosidadComponent implements OnInit {
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly morosidad = inject(MorosidadService);
    private readonly pagos = inject(PagoService);

    private readonly monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    readonly fields: Field[] = [
        { name: 'mes', label: 'Mes a calcular', type: 'number', required: true },
        { name: 'ano', label: 'Año a calcular', type: 'number', required: true }
    ];

    readonly columns: Field[] = [
        { name: 'codigo_contador', label: 'Contador' },
        { name: 'nombre_propietario', label: 'Propietario' },
        { name: 'meses_adeudados', label: 'Meses adeudados' },
        { name: 'total_adeudado', label: 'Total adeudado' }
    ];

    readonly records = signal<Record<string, unknown>[]>([]);
    readonly form = signal<Record<string, unknown>>({});
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly showForm = signal(false);
    readonly runningCron = signal(false);
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
    }

    logout(): void { this.auth.logout(); this.router.navigate(['/login']); }

    loadRecords(): void {
        this.loading.set(true);
        this.error.set('');
        this.morosidad.getMorosos().subscribe({
            next: response => { this.records.set(Array.isArray(response?.data) ? response.data : []); this.loading.set(false); },
            error: () => { this.records.set([]); this.error.set('No fue posible cargar los registros.'); this.loading.set(false); }
        });
    }

    openForm(): void { this.message.set(''); this.error.set(''); this.resetForm(); this.showForm.set(true); }
    closeForm(): void { this.showForm.set(false); }

    updateField(name: string, value: unknown): void {
        this.form.update(current => ({ ...current, [name]: value }));
    }

    ejecutarCronMorosidad(): void {
        if (this.runningCron()) return;
        this.runningCron.set(true);
        this.message.set('');
        this.error.set('');

        const now = new Date();
        const ano = now.getFullYear();
        const mesActual = now.getMonth() + 1;
        const calculos = Array.from({ length: mesActual }, (_, index) =>
            this.morosidad.calcular(index + 1, ano)
        );

        forkJoin(calculos).subscribe({
            next: responses => {
                this.runningCron.set(false);
                const total = responses.reduce((sum, response) => {
                    const count = response?.meta?.total ?? (Array.isArray(response?.data) ? response.data.length : 0);
                    return sum + (typeof count === 'number' ? count : 0);
                }, 0);
                this.message.set(`Cálculo de morosidad ejecutado para ${mesActual} ${mesActual === 1 ? 'mes' : 'meses'} de ${ano} (enero a mes actual). ${total} registros procesados.`);
                this.loadRecords();
            },
            error: response => {
                this.runningCron.set(false);
                this.error.set(response?.error?.error || 'No fue posible ejecutar el cálculo de morosidad.');
            }
        });
    }

    save(): void {
        const values = this.form();
        if (this.fields.some(field => field.required && !values[field.name])) {
            this.error.set('Completa los campos obligatorios.');
            return;
        }
        this.saving.set(true);
        this.error.set('');
        this.morosidad.calcular(Number(values['mes']), Number(values['ano'])).subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.message.set('Morosidad calculada correctamente.'); this.loadRecords(); },
            error: response => { this.saving.set(false); this.error.set(response?.error?.error || 'No fue posible calcular la morosidad.'); }
        });
    }

    display(record: Record<string, unknown>, field: Field): string {
        const value = record[field.name];
        return value === undefined || value === null || value === '' ? '-' : String(value);
    }

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
        const now = new Date();
        this.form.set({ mes: now.getMonth() + 1, ano: now.getFullYear() });
    }
}
