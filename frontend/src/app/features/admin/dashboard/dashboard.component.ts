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

  // Charts processed data
  trendPoints: any[] = [];
  trendLinePath = '';
  trendAreaPath = '';
  trendYTicks: any[] = [];
  
  brandBars: any[] = [];
  brandYTicks: any[] = [];

  hoveredPoint: any = null;
  hoveredBar: any = null;

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
          this.processChartsData(res.data);
        }
      },
      error: (err) => {
        console.error('Error fetching stats:', err);
      }
    });
  }

  processChartsData(resData: any) {
    // 1. Process Trend Line Chart
    const trendMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      trendMap.set(dateStr, 0);
    }

    if (resData.dailyTrend) {
      resData.dailyTrend.forEach((item: any) => {
        trendMap.set(item.date, item.count);
      });
    }

    const filledTrend = Array.from(trendMap.entries()).map(([date, count]) => {
      const parts = date.split('-');
      const day = parts[2];
      const monthStr = parts[1];
      const label = `${day}/${monthStr}`;
      return { date, count, label };
    });

    const viewBoxWidth = 500;
    const viewBoxHeight = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;
    const chartWidth = viewBoxWidth - paddingLeft - paddingRight;
    const chartHeight = viewBoxHeight - paddingTop - paddingBottom;

    let maxCount = Math.max(...filledTrend.map(d => d.count));
    if (maxCount === 0) maxCount = 5;

    // Calculate Y-axis ticks (4 ticks: 0, 33%, 66%, 100%)
    const ticksCount = 4;
    this.trendYTicks = [];
    for (let i = 0; i < ticksCount; i++) {
      const val = Math.round((maxCount * i) / (ticksCount - 1));
      const y = paddingTop + chartHeight - (val / maxCount) * chartHeight;
      this.trendYTicks.push({ val, y });
    }

    this.trendPoints = filledTrend.map((item, i) => {
      const x = paddingLeft + (i / (filledTrend.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (item.count / maxCount) * chartHeight;
      return { x, y, ...item };
    });

    this.trendLinePath = this.trendPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    this.trendAreaPath = this.trendLinePath ? `${this.trendLinePath} L ${this.trendPoints[this.trendPoints.length - 1].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} L ${this.trendPoints[0].x.toFixed(1)} ${(paddingTop + chartHeight).toFixed(1)} Z` : '';

    // 2. Process Brand Distribution Bar Chart
    const rawBrands = resData.brandDistribution || [];
    // Limit to top 6 brands, sum the rest to 'Other'
    let topBrands = rawBrands.slice(0, 6);
    const remainingCount = rawBrands.slice(6).reduce((sum: number, item: any) => sum + item.count, 0);
    if (remainingCount > 0) {
      const otherIdx = topBrands.findIndex((b: any) => b.brand.toLowerCase() === 'other');
      if (otherIdx >= 0) {
        topBrands[otherIdx].count += remainingCount;
      } else {
        topBrands.push({ brand: 'Other', count: remainingCount });
      }
    }

    topBrands.sort((a: any, b: any) => b.count - a.count);

    let maxBrandCount = Math.max(...topBrands.map((b: any) => b.count));
    if (maxBrandCount === 0) maxBrandCount = 5;

    // Y ticks for Brand chart
    this.brandYTicks = [];
    for (let i = 0; i < ticksCount; i++) {
      const val = Math.round((maxBrandCount * i) / (ticksCount - 1));
      const y = paddingTop + chartHeight - (val / maxBrandCount) * chartHeight;
      this.brandYTicks.push({ val, y });
    }

    const N = topBrands.length;
    const barSpacing = N > 5 ? 15 : 25;
    const totalSpacings = (N - 1) * barSpacing;
    const barWidth = (chartWidth - totalSpacings) / N;

    this.brandBars = topBrands.map((item: any, i: number) => {
      const x = paddingLeft + i * (barWidth + barSpacing);
      const barValHeight = (item.count / maxBrandCount) * chartHeight;
      const y = paddingTop + chartHeight - barValHeight;
      return {
        brand: item.brand,
        count: item.count,
        x,
        y,
        width: barWidth,
        height: Math.max(barValHeight, 2),
        labelX: x + barWidth / 2
      };
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
