import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AdminService } from '../services/admin.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const adminService = inject(AdminService);
  const token = adminService.token();

  // Attach token if present and endpoint is in the admin path
  if (token && req.url.includes('/api/admin')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};
