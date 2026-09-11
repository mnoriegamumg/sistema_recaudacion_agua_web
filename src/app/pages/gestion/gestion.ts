import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

type SectionKey = 'contadores' | 'clientes' | 'morosidad' | 'tarifas';
type Field = { name: string; label: string; type?: string; required?: boolean; options?: string[] };
type Section = { key: SectionKey; label: string; description: string; icon: string; fields: Field[] };
type CounterForm = { codigo_contador: string; nombre_propietario: string; dpi: string; nit: string; estado: string };

@Component({
    selector: 'app-gestion',
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './gestion.html',
    styleUrl: './gestion.css'
})
export class GestionComponent implements OnInit {
    readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly api = inject(ApiService);

    readonly sections: Section[] = [
        {
            key: 'contadores', label: 'Contadores', icon: '⌁', description: 'Administra medidores y propietarios.', fields: [
                { name: 'codigo_contador', label: 'Código del contador', required: true },
                { name: 'nombre_propietario', label: 'Nombre del propietario', required: true },
                { name: 'dpi', label: 'DPI' }, { name: 'nit', label: 'NIT' },
                { name: 'estado', label: 'Estado', required: true, options: ['activo', 'inactivo', 'suspendido'] }
            ]
        },
        {
            key: 'clientes', label: 'Clientes', icon: '◎', description: 'Consulta y registra usuarios del servicio.', fields: [
                { name: 'nombre', label: 'Nombre completo', required: true }, { name: 'dpi', label: 'DPI' },
                { name: 'direccion', label: 'Dirección' }, { name: 'telefono', label: 'Teléfono' },
                { name: 'codigo_contador', label: 'Código del contador', required: true }
            ]
        },
        {
            key: 'morosidad', label: 'Morosidad', icon: '◒', description: 'Calcula y revisa saldos pendientes.', fields: [
                { name: 'mes', label: 'Mes a calcular', type: 'number', required: true },
                { name: 'ano', label: 'Año a calcular', type: 'number', required: true }
            ]
        },
        {
            key: 'tarifas', label: 'Tarifas', icon: '◈', description: 'Define las tarifas vigentes por servicio.', fields: [
                { name: 'nombre', label: 'Nombre de tarifa', required: true }, { name: 'monto', label: 'Monto', type: 'number', required: true },
                { name: 'comunidad', label: 'Comunidad' }, { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true }
            ]
        }
    ];

    readonly section = signal<Section>(this.sections[0]);
    readonly records = signal<Record<string, unknown>[]>([]);
    readonly form = signal<Record<string, unknown>>({});
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly showForm = signal(false);
    readonly showCounterForm = signal(false);
    readonly checkingCounter = signal(false);
    readonly savingCounter = signal(false);
    readonly counterValidated = signal(false);
    readonly counterError = signal('');
    readonly counterForm = signal<CounterForm>({ codigo_contador: '', nombre_propietario: '', dpi: '', nit: '', estado: 'activo' });
    readonly message = signal('');
    readonly error = signal('');

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const selected = this.sections.find(item => item.key === params.get('seccion')) ?? this.sections[0];
            this.section.set(selected);
            this.resetForm();
            this.loadRecords();
        });
    }

    logout(): void { this.auth.logout(); this.router.navigate(['/login']); }

    loadRecords(): void {
        this.loading.set(true); this.error.set('');
        const key = this.section().key;
        const request = key === 'contadores' ? this.api.getContadores() : key === 'clientes' ? this.api.getClientes() : key === 'morosidad' ? this.api.getMorosos() : this.api.getTarifasActuales();
        request.subscribe({
            next: response => { this.records.set(Array.isArray(response?.data) ? response.data : []); this.loading.set(false); },
            error: () => { this.records.set([]); this.error.set('No fue posible cargar los registros.'); this.loading.set(false); }
        });
    }

    openForm(): void { this.message.set(''); this.error.set(''); this.resetForm(); this.showForm.set(true); }
    closeForm(): void { this.showForm.set(false); }

    verifyClientCounter(): void {
        const code = String(this.form()['codigo_contador'] ?? '').trim();
        this.counterValidated.set(false);
        this.form.update(current => ({ ...current, id_contador: '' }));
        if (!code) return;

        this.checkingCounter.set(true);
        this.error.set('');
        this.api.buscarContadorPorCodigo(code).subscribe({
            next: response => {
                const counter = this.extractCounter(response);
                if (counter) {
                    this.form.update(current => ({ ...current, id_contador: counter.id_contador }));
                    this.counterValidated.set(true);
                    this.checkingCounter.set(false);
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
        this.counterError.set('');
        this.counterForm.set({ codigo_contador: code, nombre_propietario: '', dpi: '', nit: '', estado: 'activo' });
        this.showCounterForm.set(true);
    }

    closeCounterForm(): void { this.showCounterForm.set(false); }

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
        if (this.section().fields.some(field => field.required && !values[field.name])) { this.error.set('Completa los campos obligatorios.'); return; }
        this.saving.set(true); this.error.set('');
        const key = this.section().key;
        const clientValues = { ...values };
        delete clientValues['codigo_contador'];
        const request = key === 'contadores' ? this.api.createContador(values) : key === 'clientes' ? this.api.createCliente(clientValues) : key === 'morosidad' ? this.api.calcularMorosidad(Number(values['mes']), Number(values['ano'])) : this.api.crearTarifa(values);
        request.subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.message.set(`${this.section().label} actualizado correctamente.`); this.loadRecords(); },
            error: response => { this.saving.set(false); this.error.set(response?.error?.error || 'No fue posible guardar el registro.'); }
        });
    }

    updateField(name: string, value: unknown): void { this.form.update(current => ({ ...current, [name]: value })); }
    display(record: Record<string, unknown>, field: Field): string { const value = record[field.name]; return value === undefined || value === null || value === '' ? '-' : String(value); }

    private resetForm(): void {
        this.counterValidated.set(false);
        const values: Record<string, unknown> = {};
        this.section().fields.forEach(field => values[field.name] = field.options?.[0] ?? '');
        if (this.section().key === 'clientes') values['id_contador'] = '';

        this.form.set(values);
    }

    private extractCounter(response: Record<string, unknown>): { id_contador: number } | null {
        const data = response?.['data'] as Record<string, unknown> | undefined;
        const source = data ?? response;
        const id = source?.['id_contador'] ?? source?.['id'];
        return typeof id === 'number' || typeof id === 'string' ? { id_contador: Number(id) } : null;
    }
}
