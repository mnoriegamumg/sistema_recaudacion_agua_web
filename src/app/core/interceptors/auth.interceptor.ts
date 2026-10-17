import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Si la petición ya incluye una cabecera de Authorization explícita (por ejemplo, el token público en consulta pública),
    // se debe respetar y no sobrescribir con el token de sesión administrativa de localStorage
    if (req.headers.has('Authorization')) {
        return next(req);
    }

    const authService = inject(AuthService);
    const token = authService.getToken();

    if (token) {
        const cloned = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        return next(cloned);
    }

    return next(req);
};
