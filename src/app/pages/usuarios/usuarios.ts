import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

interface UsuarioRecord {
    id_usuario: number;
    nombre_completo: string;
    correo: string;
    rol: string;
    activo: boolean | number;
    created_at: string;
    updated_at: string;
}

type UsuarioForm = {
    nombre_completo: string;
    correo: string;
    password: string;
    rol: string;
    activo: boolean;
};

@Component({
    selector: 'app-usuarios',
    imports: [CommonModule, FormsModule, SidebarComponent],
    templateUrl: './usuarios.html',
    styleUrl: '../gestion/gestion.css'
})
export class UsuariosComponent implements OnInit {
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly api = inject(ApiService);

    readonly roles = ['admin', 'tesorero', 'cajero'];
    readonly records = signal<UsuarioRecord[]>([]);
    readonly form = signal<UsuarioForm>(this.emptyForm());
    readonly editingId = signal<number | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly showForm = signal(false);
    readonly message = signal('');
    readonly error = signal('');

    ngOnInit(): void {
        this.loadRecords();
    }

    logout(): void {
        this.auth.logout();
        this.router.navigate(['/login']);
    }

    loadRecords(): void {
        this.loading.set(true);
        this.error.set('');
        this.api.getUsuarios().subscribe({
            next: response => {
                const records = Array.isArray(response?.data) ? response.data : response;
                this.records.set(Array.isArray(records) ? records as UsuarioRecord[] : []);
                this.loading.set(false);
            },
            error: () => {
                this.records.set([]);
                this.error.set('No fue posible cargar los usuarios.');
                this.loading.set(false);
            }
        });
    }

    openCreateForm(): void {
        this.editingId.set(null);
        this.form.set(this.emptyForm());
        this.message.set('');
        this.error.set('');
        this.showForm.set(true);
    }

    openEditForm(user: UsuarioRecord): void {
        this.editingId.set(user.id_usuario);
        this.form.set({
            nombre_completo: user.nombre_completo,
            correo: user.correo,
            password: '',
            rol: user.rol,
            activo: this.isActive(user.activo)
        });
        this.message.set('');
        this.error.set('');
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
    }

    updateField(field: keyof UsuarioForm, value: string | boolean): void {
        this.form.update(current => ({ ...current, [field]: value }));
    }

    save(): void {
        const values = this.form();
        if (!values.nombre_completo.trim() || !values.correo.trim() || !values.rol) {
            this.error.set('Completa el nombre, correo y rol.');
            return;
        }
        if (!this.editingId() && !values.password.trim()) {
            this.error.set('La contraseña es obligatoria al crear un usuario.');
            return;
        }

        const payload: Record<string, unknown> = {
            nombre_completo: values.nombre_completo.trim(),
            correo: values.correo.trim(),
            rol: values.rol,
            activo: values.activo
        };
        if (values.password.trim()) payload['password'] = values.password;

        this.saving.set(true);
        this.error.set('');
        const request = this.editingId()
            ? this.api.updateUsuario(this.editingId()!, payload)
            : this.api.createUsuario(payload);

        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.showForm.set(false);
                this.message.set(this.editingId() ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
                this.loadRecords();
            },
            error: response => {
                this.saving.set(false);
                this.error.set(response?.error?.error || 'No fue posible guardar el usuario.');
            }
        });
    }

    private emptyForm(): UsuarioForm {
        return { nombre_completo: '', correo: '', password: '', rol: this.roles[0], activo: true };
    }

    isActive(value: boolean | number): boolean {
        return value === true || value === 1;
    }

    displayDate(value: string): string {
        if (!value) return '-';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-GT');
    }
}
