import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './sidebar.html',
    styleUrl: './sidebar.css'
})
export class SidebarComponent {
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    logout(): void {
        this.auth.logout();
        this.router.navigate(['/login']);
    }
}
