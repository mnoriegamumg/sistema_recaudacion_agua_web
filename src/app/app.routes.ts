import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { GestionComponent } from './pages/gestion/gestion';
import { ContadoresComponent } from './pages/contadores/contadores';
import { MorosidadComponent } from './pages/morosidad/morosidad';
import { PagosComponent } from './pages/pagos/pagos';
import { UsuariosComponent } from './pages/usuarios/usuarios';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { 
        path: 'dashboard', 
        component: DashboardComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'usuarios',
        component: UsuariosComponent,
        canActivate: [AuthGuard, AdminGuard]
    },
    {
        path: 'gestion/pagos',
        redirectTo: '/pagos',
        pathMatch: 'full'
    },
    {
        path: 'gestion/morosidad',
        redirectTo: '/morosidad',
        pathMatch: 'full'
    },
    {
        path: 'gestion/contadores',
        redirectTo: '/contadores',
        pathMatch: 'full'
    },
    {
        path: 'contadores',
        component: ContadoresComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'morosidad',
        component: MorosidadComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'gestion/:seccion',
        component: GestionComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'pagos',
        component: PagosComponent,
        canActivate: [AuthGuard]
    },
    { path: '**', redirectTo: '/login' }
];