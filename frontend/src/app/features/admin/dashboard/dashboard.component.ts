import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  // KPI Statistics
  stats = signal<any>({
    totalRegistrations: 0,
    todayRegistrations: 0,
    pendingCases: 0,
    underReviewCases: 0,
    recoveryInProgress: 0,
    recoveredCases: 0,
    closedCases: 0
  });

  // Data Listing & Table Specs
  registrations: any[] = [];
  totalCount = 0;
  pagesArray: number[] = [];

  // Active Query Parameters
  search = '';
  brandFilter = '';
  statusFilter = '';
  startDate = '';
  endDate = '';
  sortField = 'created_at';
  sortOrder = 'DESC';
  page = 1;
  limit = 10;

  // Modals & Panels Control
  selectedRegistration: any = null;
  showDetailsDrawer = false;
  
  showSettingsModal = false;
  instagramUsername = 'godofmobiles';
  newInstagramUsername = '';
  isSavingSettings = false;

  // Brand dropdown options
  brands = [
    'Samsung', 'Apple', 'Vivo', 'Oppo', 'Redmi', 
    'Realme', 'Nokia', 'Motorola', 'OnePlus', 
    'Google Pixel', 'Other'
  ];

  // Status options
  statuses = ['New', 'Under Review', 'Contacted', 'Recovery In Progress', 'Recovered', 'Closed'];

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loadStats();
    this.loadRegistrations();
  }

  loadStats() {
    this.adminService.getDashboardStats().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.stats.set(res.data);
        }
      },
      error: (err) => {
        console.error('Error fetching stats:', err);
      }
    });
  }

  loadRegistrations() {
    const filters = {
      page: this.page,
      limit: this.limit,
      search: this.search,
      brand: this.brandFilter,
      status: this.statusFilter,
      startDate: this.startDate,
      endDate: this.endDate,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    };

    this.adminService.getRegistrations(filters).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.registrations = res.data;
          this.totalCount = res.pagination.total;
          this.updatePagesArray(res.pagination.totalPages);
        }
      },
      error: (err) => {
        console.error('Error loading registrations:', err);
      }
    });
  }

  updatePagesArray(totalPages: number) {
    this.pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Filters Handlers
  onApplyFilters() {
    this.page = 1;
    this.loadRegistrations();
  }

  onClearFilters() {
    this.search = '';
    this.brandFilter = '';
    this.statusFilter = '';
    this.startDate = '';
    this.endDate = '';
    this.page = 1;
    this.loadRegistrations();
  }

  // Sorting
  onSort(field: string) {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortField = field;
      this.sortOrder = 'DESC';
    }
    this.page = 1;
    this.loadRegistrations();
  }

  // Pagination
  goToPage(pageNum: number) {
    if (pageNum >= 1 && pageNum <= this.pagesArray.length) {
      this.page = pageNum;
      this.loadRegistrations();
    }
  }

  // View Detailed Drawer
  openDetails(reg: any) {
    this.adminService.getRegistrationById(reg.id).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.selectedRegistration = res.data;
          this.showDetailsDrawer = true;
        }
      },
      error: (err) => {
        console.error('Error fetching detail by ID:', err);
      }
    });
  }

  closeDetails() {
    this.showDetailsDrawer = false;
    this.selectedRegistration = null;
  }

  // Status management dropdown
  onUpdateStatus(newStatus: string) {
    if (!this.selectedRegistration) return;
    
    const id = this.selectedRegistration.id;
    this.adminService.updateStatus(id, newStatus).subscribe({
      next: (res) => {
        if (res && res.success) {
          // Update item state locally
          this.selectedRegistration.status = newStatus;
          // Refresh list and KPI counts
          this.loadDashboardData();
        }
      },
      error: (err) => {
        console.error('Error updating status:', err);
      }
    });
  }

  // Dynamic Settings Drawer
  openSettings() {
    this.adminService.getSettings().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.instagramUsername = res.settings.instagram_username || 'godofmobiles';
          this.newInstagramUsername = this.instagramUsername;
          this.showSettingsModal = true;
        }
      },
      error: (err) => {
        console.error('Error loading settings:', err);
      }
    });
  }

  closeSettings() {
    this.showSettingsModal = false;
  }

  saveSettings() {
    if (!this.newInstagramUsername.trim()) return;

    this.isSavingSettings = true;
    this.adminService.updateSetting('instagram_username', this.newInstagramUsername.trim()).subscribe({
      next: (res) => {
        this.isSavingSettings = false;
        this.instagramUsername = this.newInstagramUsername.trim();
        this.showSettingsModal = false;
        console.log('Instagram setting updated successfully.');
      },
      error: (err) => {
        this.isSavingSettings = false;
        console.error('Error updating setting:', err);
      }
    });
  }

  // Exporters
  exportExcel() {
    const filters = {
      search: this.search,
      brand: this.brandFilter,
      status: this.statusFilter,
      startDate: this.startDate,
      endDate: this.endDate,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    };

    this.adminService.exportExcel(filters).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `registrations_export_${Date.now()}.xlsx`);
      },
      error: (err) => {
        console.error('Error exporting Excel:', err);
      }
    });
  }

  exportCSV() {
    const filters = {
      search: this.search,
      brand: this.brandFilter,
      status: this.statusFilter,
      startDate: this.startDate,
      endDate: this.endDate,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    };

    this.adminService.exportCSV(filters).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `registrations_export_${Date.now()}.csv`);
      },
      error: (err) => {
        console.error('Error exporting CSV:', err);
      }
    });
  }

  downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  logout() {
    this.adminService.logout();
    this.router.navigate(['/admin/login']);
  }
}
