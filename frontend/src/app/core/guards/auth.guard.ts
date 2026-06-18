import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminService } from '../services/admin.service';

export const authGuard: CanActivateFn = (route, state) => {
  const adminService = inject(AdminService);
  const router = inject(Router);

  if (adminService.isLoggedIn()) {
    return true;
  }

  // Redirect to login if user is unauthorized
  router.navigate(['/admin/login']);
  return false;
};
