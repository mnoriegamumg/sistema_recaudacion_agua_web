import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './dashboard.html',
    styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit {
    usuario: any = null;
    resumenMorosidad: any = {};
    morosos: any[] = [];
    loading: boolean = true;

    totalContadores: number = 0;
    totalMorosos: number = 0;
    porcentajeMorosidad: number = 0;
    totalAdeudado: number = 0;

    constructor(
        private authService: AuthService,
        private apiService: ApiService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.usuario = this.authService.getUsuario();
        this.cargarDatos();
    }

    cargarDatos(): void {
        this.loading = true;

        // Cargar resumen de morosidad
        this.apiService.getResumenMorosidad().subscribe({
            next: (response) => {
                if (response.success) {
                    this.resumenMorosidad = response.data;
                    this.totalContadores = response.data.total_contadores || 0;
                    this.totalMorosos = response.data.morosos || 0;
                    this.totalAdeudado = response.data.total_adeudado || 0;
                    
                    if (this.totalContadores > 0) {
                        this.porcentajeMorosidad = (this.totalMorosos / this.totalContadores) * 100;
                    }
                }
            },
            error: () => {
                this.totalContadores = 0;
                this.totalMorosos = 0;
                this.totalAdeudado = 0;
                this.porcentajeMorosidad = 0;
            }
        });

        // Cargar lista de morosos (últimos 5)
        this.apiService.getMorosos().subscribe({
            next: (response) => {
                if (response.success) {
                    this.morosos = response.data.slice(0, 5);
                }
            },
            error: () => {
                this.morosos = [];
            }
        });

        setTimeout(() => {
            this.loading = false;
        }, 500);
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    irA(route: string): void {
        this.router.navigate([route]);
    }

    getProgresoMorosidad(): number {
        if (this.totalContadores === 0) return 0;
        return (this.totalMorosos / this.totalContadores) * 100;
    }
}