import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

type PaymentField = { name: string; label: string; type?: string; required?: boolean };
type CounterForm = { codigo_contador: string; nombre_propietario: string; dpi: string; nit: string; estado: string };

@Component({
    selector: 'app-pagos',
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './pagos.html',
    styleUrl: '../gestion/gestion.css'
})
export class PagosComponent implements OnInit {
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly api = inject(ApiService);
    private readonly monthNames = [
        'ENERO',
        'FEBRERO',
        'MARZO',
        'ABRIL',
        'MAYO',
        'JUNIO',
        'JULIO',
        'AGOSTO',
        'SEPTIEMBRE',
        'OCTUBRE',
        'NOVIEMBRE',
        'DICIEMBRE'
    ];

    readonly fields: PaymentField[] = [
        { name: 'codigo_contador', label: 'Código de contador', required: true },
        { name: 'monto', label: 'Monto', type: 'number', required: true },
        { name: 'mes_pagado', label: 'Mes', type: 'number', required: true },
        { name: 'ano_pagado', label: 'Año', type: 'number', required: true },
        { name: 'pagado_por', label: 'Pagado por', required: true },
        { name: 'identificacion', label: 'Identificación' }
    ];

    readonly records = signal<Record<string, unknown>[]>([]);
    readonly form = signal<Record<string, unknown>>({});
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly showForm = signal(false);
    readonly showCounterForm = signal(false);
    readonly checkingCounter = signal(false);
    readonly savingCounter = signal(false);
    readonly counterError = signal('');
    readonly lastPaidPeriod = signal('');
    readonly counterForm = signal<CounterForm>({
        codigo_contador: '',
        nombre_propietario: '',
        dpi: '',
        nit: '',
        estado: 'activo'
    });
    readonly counterValidated = signal(false);
    readonly message = signal('');
    readonly error = signal('');
    readonly currentMonth = new Date().getMonth() + 1;
    readonly currentYear = new Date().getFullYear();

    ngOnInit(): void {
        this.resetForm();
        this.loadRecords();
    }

    logout(): void {
        this.auth.logout();
        this.router.navigate(['/login']);
    }

    loadRecords(): void {
        this.loading.set(true);
        this.error.set('');
        this.api.getPagos().subscribe({
            next: response => {
                this.records.set(Array.isArray(response?.data) ? response.data : []);
                this.loading.set(false);
            },
            error: () => {
                this.records.set([]);
                this.error.set('No fue posible cargar los registros.');
                this.loading.set(false);
            }
        });
    }

    openForm(): void {
        this.message.set('');
        this.error.set('');
        this.resetForm();
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
    }

    verifyCounter(): void {
        const code = String(this.form()['codigo_contador'] ?? '').trim();
        this.counterValidated.set(false);
        this.lastPaidPeriod.set('');
        this.form.update(current => ({ ...current, id_contador: '' }));
        if (!code) return;

        this.checkingCounter.set(true);
        this.error.set('');
        this.api.buscarContadorPorCodigo(code).subscribe({
            next: response => {
                const counter = this.extractCounter(response);
                if (counter) {
                    this.form.update(current => ({ ...current, id_contador: counter.id_contador }));
                    this.loadLastPayment(counter.id_contador);
                    return;
                }
                this.openCounterForm(code);
            },
            error: response => {
                this.checkingCounter.set(false);
                if (response?.status === 404) {
                    this.openCounterForm(code);
                    return;
                }
                this.error.set('No fue posible verificar el código del contador.');
            }
        });
    }

    openCounterForm(code: string): void {
        this.checkingCounter.set(false);
        this.counterError.set('');
        this.counterForm.set({ codigo_contador: code, nombre_propietario: '', dpi: '', nit: '', estado: 'activo' });
        this.showCounterForm.set(true);
    }

    closeCounterForm(): void {
        this.showCounterForm.set(false);
    }

    updateCounterField(name: keyof CounterForm, value: string): void {
        this.counterForm.update(current => ({ ...current, [name]: value }));
    }

    saveCounter(): void {
        const counter = this.counterForm();
        if (!counter.codigo_contador.trim() || !counter.nombre_propietario.trim()) {
            this.counterError.set('Completa el código y el nombre del propietario.');
            return;
        }

        this.savingCounter.set(true);
        this.counterError.set('');
        this.api.createContador(counter).subscribe({
            next: response => {
                const created = this.extractCounter(response);
                if (!created) {
                    this.savingCounter.set(false);
                    this.counterError.set('El contador fue creado, pero no se recibió su identificador.');
                    return;
                }
                this.form.update(current => ({ ...current, codigo_contador: counter.codigo_contador, id_contador: created.id_contador }));
                this.counterValidated.set(true);
                this.lastPaidPeriod.set('Sin pagos registrados');
                this.savingCounter.set(false);
                this.showCounterForm.set(false);
            },
            error: response => {
                this.savingCounter.set(false);
                this.counterError.set(response?.error?.error || 'No fue posible crear el contador.');
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
        this.api.registrarPago({ ...values, periodo_inicio: '', periodo_fin: '' }).subscribe({
            next: () => {
                this.saving.set(false);
                this.showForm.set(false);
                this.message.set('Pagos actualizado correctamente.');
                this.loadRecords();
            },
            error: response => {
                this.saving.set(false);
                this.error.set(response?.error?.error || 'No fue posible guardar el registro.');
            }
        });
    }

    updateField(name: string, value: unknown): void {
        this.form.update(current => ({ ...current, [name]: value }));
    }

    private loadLastPayment(idContador: number): void {
        this.api.getPagosPorContador(idContador).subscribe({
            next: response => {
                const payments = Array.isArray(response?.data) ? response.data as Record<string, unknown>[] : [];
                const latest = payments
                    .filter(payment => payment['mes_pagado'] && payment['ano_pagado'])
                    .sort((first, second) => this.paymentPeriod(second) - this.paymentPeriod(first))[0];
                this.lastPaidPeriod.set(latest ? `${latest['mes_pagado']}/${latest['ano_pagado']}` : 'Sin pagos registrados');
                this.counterValidated.set(true);
                this.checkingCounter.set(false);
            },
            error: () => {
                this.lastPaidPeriod.set('No disponible');
                this.counterValidated.set(true);
                this.checkingCounter.set(false);
            }
        });
    }

    display(record: Record<string, unknown>, field: PaymentField): string {
        const value = record[field.name];
        if (field.name === 'mes_pagado' && value !== undefined && value !== null && value !== '') {
            const month = Number(value);
            return this.monthNames[month - 1] ?? String(value);
        }
        return value === undefined || value === null || value === '' ? '-' : String(value);
    }

    placeholder(field: PaymentField): string {
        if (field.name === 'mes_pagado') return `Mes actual: ${this.currentMonth}`;
        if (field.name === 'ano_pagado') return `Año actual: ${this.currentYear}`;
        return field.label;
    }

    private resetForm(): void {
        this.counterValidated.set(false);
        this.form.set({
            codigo_contador: '',
            id_contador: '',
            monto: '',
            mes_pagado: this.currentMonth,
            ano_pagado: this.currentYear,
            pagado_por: '',
            identificacion: ''
        });
    }

    private extractCounter(response: Record<string, unknown>): { id_contador: number } | null {
        const data = response?.['data'] as Record<string, unknown> | undefined;
        const source = data ?? response;
        const id = source?.['id_contador'] ?? source?.['id'];
        return typeof id === 'number' || typeof id === 'string' ? { id_contador: Number(id) } : null;
    }

    private paymentPeriod(payment: Record<string, unknown>): number {
        return Number(payment['ano_pagado']) * 100 + Number(payment['mes_pagado']);
    }
}
