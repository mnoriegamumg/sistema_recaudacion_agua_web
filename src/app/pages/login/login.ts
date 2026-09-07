import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.html',
    styleUrls: ['./login.css']
})
export class LoginComponent {
    email: string = 'admin@municipalidad.com';
    password: string = 'password';
    isLoading: boolean = false;
    error: string = '';

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    onSubmit(): void {
        if (!this.email || !this.password) {
            this.error = 'Por favor ingresa tu email y contraseña';
            return;
        }

        this.isLoading = true;
        this.error = '';

        this.authService.login({
            email: this.email,
            password: this.password
        }).subscribe({
            next: (response) => {
                this.isLoading = false;
                if (response.success) {
                    this.router.navigate(['/dashboard']);
                }
            },
            error: (error) => {
                this.isLoading = false;
                this.error = error.error?.error || 'Error al iniciar sesión. Verifica tus credenciales.';
            }
        });
    }
}