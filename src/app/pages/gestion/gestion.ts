import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ContadorService } from '../../services/contador.service';
import { ClienteService } from '../../services/cliente.service';
import { TarifaService } from '../../services/tarifa.service';
import { Contador } from '../../models/contador.model';
import { Cliente } from '../../models/cliente.model';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

type SectionKey = 'clientes' | 'tarifas';
type Field = { name: string; label: string; type?: string; required?: boolean; options?: string[] };
type Section = { key: SectionKey; label: string; description: string; icon: string; fields: Field[]; columns?: Field[] };
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
    private readonly contadores = inject(ContadorService);
    private readonly clientes = inject(ClienteService);
    private readonly tarifas = inject(TarifaService);

    readonly sections: Section[] = [
        {
            key: 'clientes', label: 'Clientes', icon: '◎', description: 'Consulta y registra usuarios del servicio.', fields: [
                { name: 'nombre_propietario', label: 'Nombre completo', required: true }, { name: 'dpi', label: 'DPI' },
                { name: 'direccion', label: 'Dirección' }, { name: 'telefono', label: 'Teléfono' },
                { name: 'codigo_contador', label: 'Código del contador', required: true }
            ]
        },
        {
            key: 'tarifas', label: 'Tarifas', icon: '◈', description: 'Define las tarifas vigentes por servicio.',
            fields: [
                { name: 'nombre', label: 'Nombre de tarifa', required: true }, { name: 'monto', label: 'Monto', type: 'number', required: true },
                { name: 'comunidad', label: 'Comunidad' }, { name: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true }
            ],
            columns: [
                { name: 'nombre', label: 'Nombre de tarifa' },
                { name: 'comunidad', label: 'Comunidad' },
                { name: 'tarifa_mensual', label: 'Tarifa mensual' },
                { name: 'tarifa_anual', label: 'Tarifa anual' },
                { name: 'descuento_anual', label: 'Descuento anual' }
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
    readonly editingId = signal<number | null>(null);

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
        const request = key === 'clientes' ? this.clientes.getClientes() : this.tarifas.getActuales();
        request.subscribe({
            next: response => { this.records.set(Array.isArray(response?.data) ? response.data : []); this.loading.set(false); },
            error: () => { this.records.set([]); this.error.set('No fue posible cargar los registros.'); this.loading.set(false); }
        });
    }

    openForm(): void { this.editingId.set(null); this.message.set(''); this.error.set(''); this.resetForm(); this.showForm.set(true); }
    closeForm(): void { this.showForm.set(false); this.editingId.set(null); }

    canEdit(): boolean { return this.section().key === 'clientes'; }

    recordId(record: Record<string, unknown>): number | null {
        const value = record['id_cliente'] ?? record['id'];
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
        this.counterValidated.set(true);
        const values: Record<string, unknown> = {};
        this.section().fields.forEach(field => values[field.name] = record[field.name] ?? '');
        values['id_contador'] = record['id_contador'] ?? '';
        this.form.set(values);
        this.showForm.set(true);
    }

    verifyClientCounter(): void {
        const code = String(this.form()['codigo_contador'] ?? '').trim();
        this.counterValidated.set(false);
        this.form.update(current => ({ ...current, id_contador: '' }));
        if (!code) return;

        this.checkingCounter.set(true);
        this.error.set('');
        this.contadores.buscarPorCodigo(code).subscribe({
            next: response => {
                const counter = this.contadores.extractId(response);
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
        this.contadores.createContador(counter as Partial<Contador>).subscribe({
            next: response => {
                const created = this.contadores.extractId(response);
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
        const editId = this.editingId();
        let request;
        if (key === 'clientes' && editId !== null) {
            request = this.clientes.updateCliente(editId, clientValues as Partial<Cliente>);
        } else if (key === 'clientes') {
            request = this.clientes.createCliente(clientValues as Partial<Cliente>);
        } else {
            request = this.tarifas.crear(values);
        }
        request.subscribe({
            next: () => { this.saving.set(false); this.showForm.set(false); this.editingId.set(null); this.message.set(`${this.section().label} ${editId !== null ? 'actualizado' : 'guardado'} correctamente.`); this.loadRecords(); },
            error: response => { this.saving.set(false); this.error.set(response?.error?.error || 'No fue posible guardar el registro.'); }
        });
    }

    updateField(name: string, value: unknown): void { this.form.update(current => ({ ...current, [name]: value })); }
    display(record: Record<string, unknown>, field: Field): string { const value = record[field.name]; return value === undefined || value === null || value === '' ? '-' : String(value); }

    /** Columnas a mostrar en la tabla: usa `columns` de la sección si existe, si no los `fields`. */
    tableColumns(): Field[] { return this.section().columns ?? this.section().fields; }

    private resetForm(): void {
        this.counterValidated.set(false);
        const values: Record<string, unknown> = {};
        this.section().fields.forEach(field => values[field.name] = field.options?.[0] ?? '');
        if (this.section().key === 'clientes') values['id_contador'] = '';

        this.form.set(values);
    }
}
