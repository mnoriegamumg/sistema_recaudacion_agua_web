import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { GestionComponent } from './pages/gestion/gestion';
import { PagosComponent } from './pages/pagos/pagos';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { 
        path: 'dashboard', 
        component: DashboardComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'gestion/pagos',
        redirectTo: '/pagos',
        pathMatch: 'full'
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