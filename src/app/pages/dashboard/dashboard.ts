import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, SidebarComponent],
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

        forkJoin({
            contadores: this.apiService.getContadores(),
            morosidad: this.apiService.getResumenMorosidad(),
            morosos: this.apiService.getMorosos()
        }).subscribe({
            next: ({ contadores, morosidad, morosos }) => {
                const contadoresData = Array.isArray(contadores?.data) ? contadores.data : [];
                const morososData = Array.isArray(morosos?.data) ? morosos.data : [];

                this.resumenMorosidad = morosidad?.data || {};
                this.totalContadores = contadores?.meta?.total ?? contadoresData.length;
                this.totalMorosos = morosos?.meta?.total ?? morososData.length;
                this.totalAdeudado = morosidad?.data?.total_adeudado || 0;
                this.morosos = morososData.slice(0, 5);
                this.porcentajeMorosidad = this.totalContadores > 0
                    ? (this.totalMorosos / this.totalContadores) * 100
                    : 0;
            },
            error: () => {
                this.totalContadores = 0;
                this.totalMorosos = 0;
                this.totalAdeudado = 0;
                this.porcentajeMorosidad = 0;
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