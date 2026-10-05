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
  latestTrendLabel = '';
  latestTrendCount = 0;

  brandBars: any[] = [];
  brandYTicks: any[] = [];
  leadingBrandLabel = '';
  leadingBrandCount = 0;

  hoveredPoint: any = null;
  hoveredBar: any = null;

  getSmoothLinePath(points: { x: number; y: number }[]): string {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

    let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  }

  // Data Listing & Table Specs
  registrations: any[] = [];
  totalCount = 0;
  pagesArray: number[] = [];
  visiblePages: (number | string)[] = [];

  // Active Query Parameters
  search = '';
  activeSearch = '';
  brandFilter = '';
  statusFilter = '';
  startDate = '';
  endDate = '';
  sortField = 'created_at';
  sortOrder = 'DESC';
  page = 1;
  limit = 1000;

  // Modals & Panels Control
  selectedRegistration: any = null;
  showDetailsDrawer = false;

  showSettingsModal = false;
  instagramUsername = 'godofmobiles';
  newInstagramUsername = '';
  isSavingSettings = false;

  // Restore Modal Security Password
  restoreConfirmPassword = '';
  restoreErrorMsg = '';

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
  ) { }

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

    if (filledTrend.length > 0) {
      this.latestTrendLabel = filledTrend[filledTrend.length - 1].label;
      this.latestTrendCount = filledTrend[filledTrend.length - 1].count;
    } else {
      this.latestTrendLabel = '';
      this.latestTrendCount = 0;
    }

    const viewBoxWidth = 520;
    const viewBoxHeight = 240;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 40;
    const paddingBottom = 40;
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
      const x = paddingLeft + (i / Math.max(filledTrend.length - 1, 1)) * chartWidth;
      const y = paddingTop + chartHeight - (item.count / maxCount) * chartHeight;
      const pointRatio = maxCount > 0 ? item.count / maxCount : 0;
      return { x, y, pointRatio, ...item };
    });

    this.trendLinePath = this.getSmoothLinePath(this.trendPoints);
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

    if (topBrands.length > 0) {
      this.leadingBrandLabel = topBrands[0].brand.toUpperCase();
      this.leadingBrandCount = topBrands[0].count;
    } else {
      this.leadingBrandLabel = '';
      this.leadingBrandCount = 0;
    }

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
    const barSpacing = N > 5 ? 18 : 28;
    const totalSpacings = (N - 1) * barSpacing;
    const barWidth = (chartWidth - totalSpacings) / N;

    // Rich dynamic gradient palettes ordered by count intensity ratio
    const gradientPalettes = [
      { start: '#10b981', middle: '#059669', stop: '#047857', topText: '#065f46' }, // Emerald / Green (Highest / Leader)
      { start: '#06b6d4', middle: '#0284c7', stop: '#0369a1', topText: '#0c4a6e' }, // Cyan / Blue (Very High)
      { start: '#6366f1', middle: '#4f46e5', stop: '#3730a3', topText: '#312e81' }, // Indigo / Cobalt (High)
      { start: '#8b5cf6', middle: '#7c3aed', stop: '#5b21b6', topText: '#4c1d95' }, // Violet / Purple (Medium)
      { start: '#f59e0b', middle: '#d97706', stop: '#92400e', topText: '#78350f' }, // Amber / Golden (Low-Medium)
      { start: '#64748b', middle: '#475569', stop: '#1e293b', topText: '#0f172a' }  // Slate / Charcoal (Lowest)
    ];

    this.brandBars = topBrands.map((item: any, i: number) => {
      const x = paddingLeft + i * (barWidth + barSpacing);
      const barValHeight = (item.count / maxBrandCount) * chartHeight;
      const y = paddingTop + chartHeight - barValHeight;
      const ratio = maxBrandCount > 0 ? item.count / maxBrandCount : 0;

      // Select gradient based on count comparison ratio & rank order
      let palette = gradientPalettes[Math.min(i, gradientPalettes.length - 1)];
      if (ratio >= 0.80) palette = gradientPalettes[0];
      else if (ratio >= 0.60) palette = gradientPalettes[1];
      else if (ratio >= 0.40) palette = gradientPalettes[2];
      else if (ratio >= 0.25) palette = gradientPalettes[3];
      else if (ratio >= 0.12) palette = gradientPalettes[4];
      else palette = gradientPalettes[5];

      return {
        brand: item.brand,
        count: item.count,
        x,
        y,
        width: barWidth,
        height: Math.max(barValHeight, 4),
        labelX: x + barWidth / 2,
        colorStart: palette.start,
        colorMiddle: palette.middle,
        colorStop: palette.stop,
        topTextColor: palette.topText,
        ratio
      };
    });
  }

  loadRegistrations() {
    const filters = {
      page: this.page,
      limit: this.limit,
      search: this.activeSearch,
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
    
    const pages: (number | string)[] = [];
    const current = this.page;
    const total = totalPages;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show page 1
      pages.push(1);

      if (current > 4) {
        pages.push('...');
      }

      // Middle pages range
      const start = Math.max(2, current - 2);
      const end = Math.min(total - 1, current + 2);

      let adjustedStart = start;
      let adjustedEnd = end;
      if (current <= 4) {
        adjustedEnd = 5;
      }
      if (current >= total - 3) {
        adjustedStart = total - 4;
      }

      for (let i = adjustedStart; i <= adjustedEnd; i++) {
        pages.push(i);
      }

      if (current < total - 3) {
        pages.push('...');
      }

      // Always show last page
      pages.push(total);
    }
    this.visiblePages = pages;
  }

  Math = Math;

  // Filters Handlers
  onSearch() {
    this.activeSearch = this.search.trim();
    this.page = 1;
    this.loadRegistrations();
  }

  resetFilters() {
    this.search = '';
    this.activeSearch = '';
    this.brandFilter = '';
    this.statusFilter = '';
    this.startDate = '';
    this.endDate = '';
    this.page = 1;
    this.loadRegistrations();
  }

  toggleSort(field: string) {
    this.onSort(field);
  }

  getStatusClass(status: string): string {
    if (!status) return '';
    switch (status.toLowerCase()) {
      case 'new': return 'new';
      case 'under review': return 'review';
      case 'contacted': return 'contacted';
      case 'recovery in progress': return 'recovery-in-progress';
      case 'recovered': return 'recovered';
      case 'closed': return 'closed';
      default: return '';
    }
  }

  getInstaUrl(insta: string): string {
    if (!insta) return '#';
    if (insta.startsWith('http')) return insta;
    const handle = insta.replace('@', '').trim();
    return `https://www.instagram.com/${handle}`;
  }

  getInstaHandle(insta: string): string {
    if (!insta) return '-';
    if (insta.startsWith('http')) {
      const parts = insta.split('/').filter(p => p.length > 0);
      return parts[parts.length - 1] || insta;
    }
    return insta.startsWith('@') ? insta : `@${insta}`;
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'unfold_more';
    return this.sortOrder === 'ASC' ? 'arrow_upward' : 'arrow_downward';
  }

  isSorted(field: string): boolean {
    return this.sortField === field;
  }

  saveStatusUpdate() {
    if (this.selectedRegistration && this.selectedRegistration.status) {
      this.onUpdateStatus(this.selectedRegistration.status);
    }
  }

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
  goToPage(pageNum: number | string) {
    const pageInt = typeof pageNum === 'string' ? parseInt(pageNum, 10) : pageNum;
    if (!isNaN(pageInt) && pageInt >= 1 && pageInt <= this.pagesArray.length) {
      this.page = pageInt;
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
      search: this.activeSearch,
      brand: this.brandFilter,
      status: this.statusFilter,
      startDate: this.startDate,
      endDate: this.endDate,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    };

    this.adminService.exportExcel(filters).subscribe({
      next: (blob: Blob) => {
        if (blob.type === 'application/json' || blob.type.includes('json')) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const res = JSON.parse(reader.result as string);
              this.showNotification(res.message || 'Failed to export Excel file', 'error');
            } catch (e) {
              this.showNotification('Failed to export Excel file', 'error');
            }
          };
          reader.readAsText(blob);
          return;
        }
        this.downloadBlob(blob, `registrations_export_${Date.now()}.xlsx`);
        this.showNotification('Excel sheet downloaded successfully!', 'success');
      },
      error: (err) => {
        console.error('Error exporting Excel:', err);
        if (err.error instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const res = JSON.parse(reader.result as string);
              this.showNotification(res.message || 'Failed to export Excel file', 'error');
            } catch (e) {
              this.showNotification('Failed to export Excel file', 'error');
            }
          };
          reader.readAsText(err.error);
        } else {
          this.showNotification(err.error?.message || 'Failed to export Excel file', 'error');
        }
      }
    });
  }

  exportCSV() {
    const filters = {
      search: this.activeSearch,
      brand: this.brandFilter,
      status: this.statusFilter,
      startDate: this.startDate,
      endDate: this.endDate,
      sortField: this.sortField,
      sortOrder: this.sortOrder
    };

    this.adminService.exportCSV(filters).subscribe({
      next: (blob: Blob) => {
        if (blob.type === 'application/json' || blob.type.includes('json')) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const res = JSON.parse(reader.result as string);
              this.showNotification(res.message || 'Failed to export CSV file', 'error');
            } catch (e) {
              this.showNotification('Failed to export CSV file', 'error');
            }
          };
          reader.readAsText(blob);
          return;
        }
        this.downloadBlob(blob, `registrations_export_${Date.now()}.csv`);
        this.showNotification('CSV file downloaded successfully!', 'success');
      },
      error: (err) => {
        console.error('Error exporting CSV:', err);
        if (err.error instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const res = JSON.parse(reader.result as string);
              this.showNotification(res.message || 'Failed to export CSV file', 'error');
            } catch (e) {
              this.showNotification('Failed to export CSV file', 'error');
            }
          };
          reader.readAsText(err.error);
        } else {
          this.showNotification(err.error?.message || 'Failed to export CSV file', 'error');
        }
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

  // Active Admin View Tab
  activeTab: 'dashboard' | 'backups' = 'dashboard';

  // Database Backups & Vault State
  backups: any[] = [];
  backupStats: any = {
    lastBackup: null,
    nextSchedule: { title: 'Weekly Once', detail: 'Sundays 02:00 AM IST' },
    totalBackups: 0,
    retentionPolicy: 'Keep latest 8',
    storageUsedBytes: 0,
    storageUsedFormatted: '0 B',
    dbTables: 0,
    tablesSubtitle: '100% current & future tables',
    lastSize: '0 B',
    lastDuration: '-',
    systemHealth: 'HEALTHY',
    storageRoot: 'db_backups/'
  };

  backupSearch = '';
  backupTypeFilter = 'ALL';
  isBackingUp = false;
  isRestoring = false;
  isUploadingBackup = false;
  isLoadingBackups = false;

  selectedBackupForRestore: any = null;
  showRestoreConfirmModal = false;

  showUploadZipModal = false;
  selectedZipFile: File | null = null;
  uploadProgress = false;
  isCheckingHealth = false;

  // Progressing UI State for Database Operations
  isOperationInProgress = false;
  operationType: 'BACKUP' | 'UPLOAD' | 'RESTORE' | 'HEALTH' | null = null;
  operationTitle = '';
  operationDetail = '';
  operationProgress = 0;
  operationStage = 1;
  operationSteps: string[] = [];
  progressTimer: any = null;

  startProgressTracker(type: 'BACKUP' | 'UPLOAD' | 'RESTORE' | 'HEALTH', title: string, steps: string[], detail: string) {
    this.stopProgressTracker();
    this.isOperationInProgress = true;
    this.operationType = type;
    this.operationTitle = title;
    this.operationDetail = detail;
    this.operationSteps = steps;
    this.operationProgress = 12;
    this.operationStage = 1;

    this.progressTimer = setInterval(() => {
      if (this.operationProgress < 92) {
        this.operationProgress += Math.floor(Math.random() * 6) + 4;
        if (this.operationProgress > 25 && this.operationStage < 2) {
          this.operationStage = 2;
        } else if (this.operationProgress > 55 && this.operationStage < 3) {
          this.operationStage = 3;
        } else if (this.operationProgress > 80 && this.operationStage < 4) {
          this.operationStage = 4;
        }
      }
    }, 350);
  }

  completeProgressTracker(success: boolean, callback?: () => void) {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.operationProgress = 100;
    this.operationStage = this.operationSteps.length;
    setTimeout(() => {
      this.isOperationInProgress = false;
      this.operationType = null;
      this.operationProgress = 0;
      this.operationStage = 1;
      if (callback) callback();
    }, 700);
  }

  stopProgressTracker() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.isOperationInProgress = false;
    this.operationType = null;
    this.operationProgress = 0;
  }

  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';

  // Database Vault Access Authorization Security State
  isBackupsUnlocked = false;
  showBackupsAuthModal = false;
  backupsAuthPassword = '';
  backupsAuthErrorMsg = '';

  switchTab(tab: 'dashboard' | 'backups') {
    if (tab === 'backups') {
      if (this.isBackupsUnlocked) {
        this.activeTab = 'backups';
        this.loadBackups();
      } else {
        this.openBackupsAuthModal();
      }
    } else {
      this.activeTab = tab;
    }
  }

  openBackupsAuthModal() {
    this.backupsAuthPassword = '';
    this.backupsAuthErrorMsg = '';
    this.showBackupsAuthModal = true;
  }

  closeBackupsAuthModal() {
    this.showBackupsAuthModal = false;
    this.backupsAuthPassword = '';
    this.backupsAuthErrorMsg = '';
  }

  verifyBackupsPassword() {
    if (!this.backupsAuthPassword || this.backupsAuthPassword.trim() === '') {
      this.backupsAuthErrorMsg = 'Please enter security password / பாதுகாப்பு கடவுச்சொல்லை உள்ளிடவும்';
      return;
    }

    if (this.backupsAuthPassword.trim() === 'Mec170761$') {
      this.isBackupsUnlocked = true;
      this.showBackupsAuthModal = false;
      this.backupsAuthPassword = '';
      this.backupsAuthErrorMsg = '';
      this.activeTab = 'backups';
      this.loadBackups();
      this.showNotification('Database Vault Access Granted', 'success');
    } else {
      this.backupsAuthErrorMsg = 'Incorrect security password / தவறான பாதுகாப்பு கடவுச்சொல்';
    }
  }

  lockBackupsAccess() {
    this.isBackupsUnlocked = false;
    this.activeTab = 'dashboard';
    this.showNotification('Database Vault Locked', 'info');
  }

  loadBackups() {
    this.isLoadingBackups = true;
    this.adminService.getBackups({
      search: this.backupSearch,
      type: this.backupTypeFilter
    }).subscribe({
      next: (res) => {
        this.isLoadingBackups = false;
        if (res && res.success) {
          this.backups = res.data || [];
          if (res.stats) {
            this.backupStats = res.stats;
          }
        }
      },
      error: (err) => {
        this.isLoadingBackups = false;
        console.error('Error loading backups:', err);
        this.showNotification('Failed to fetch backup vault records', 'error');
      }
    });
  }

  onBackupSearch() {
    this.loadBackups();
  }

  setBackupTypeFilter(type: string) {
    this.backupTypeFilter = type;
    this.loadBackups();
  }

  triggerBackupNow() {
    if (this.isBackingUp || this.isOperationInProgress) return;
    this.isBackingUp = true;

    this.startProgressTracker(
      'BACKUP',
      'Creating Database Snapshot Package',
      ['Extract Schemas & Data', 'Generate SHA-256 Checksum', 'Upload to Firebase Storage', 'Catalog Vault History'],
      'Taking full PostgreSQL snapshot & uploading to Firebase Storage...'
    );

    this.adminService.createBackupNow().subscribe({
      next: (res) => {
        this.isBackingUp = false;
        if (res && res.success) {
          this.completeProgressTracker(true, () => {
            this.showNotification('Database snapshot created successfully!', 'success');
            this.loadBackups();
          });
        } else {
          this.stopProgressTracker();
          this.showNotification(res.message || 'Backup failed', 'error');
        }
      },
      error: (err) => {
        this.isBackingUp = false;
        this.stopProgressTracker();
        console.error('Error creating backup:', err);
        this.showNotification(err.error?.message || 'Failed to create backup snapshot', 'error');
      }
    });
  }

  openUploadZipModal() {
    this.selectedZipFile = null;
    this.showUploadZipModal = true;
  }

  closeUploadZipModal() {
    this.showUploadZipModal = false;
    this.selectedZipFile = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        this.showNotification('Please select a valid .ZIP backup file', 'error');
        this.selectedZipFile = null;
        return;
      }
      this.selectedZipFile = file;
    }
  }

  submitUploadBackupZip() {
    if (!this.selectedZipFile || this.isUploadingBackup || this.isOperationInProgress) return;
    this.isUploadingBackup = true;

    this.startProgressTracker(
      'UPLOAD',
      'Uploading & Restoring Backup ZIP Package',
      ['Verify Package Metadata', 'Upload to Firebase Storage', 'Generate Safety Snapshot', 'Atomic Table Restore'],
      'Uploading backup ZIP to Firebase Storage root: db_backups/...'
    );

    this.adminService.uploadBackupZip(this.selectedZipFile).subscribe({
      next: (res) => {
        this.isUploadingBackup = false;
        this.closeUploadZipModal();
        if (res && res.success) {
          this.completeProgressTracker(true, () => {
            this.showNotification('Backup ZIP uploaded & database restored successfully!', 'success');
            this.loadBackups();
            this.loadStats();
            this.loadRegistrations();
          });
        } else {
          this.stopProgressTracker();
          this.showNotification(res.message || 'Upload failed', 'error');
        }
      },
      error: (err) => {
        this.isUploadingBackup = false;
        this.stopProgressTracker();
        console.error('Error uploading backup zip:', err);
        this.showNotification(err.error?.message || 'Upload failed', 'error');
      }
    });
  }

  openRestoreModal(backup: any) {
    this.selectedBackupForRestore = backup;
    this.restoreConfirmPassword = '';
    this.restoreErrorMsg = '';
    this.showRestoreConfirmModal = true;
  }

  closeRestoreModal() {
    this.showRestoreConfirmModal = false;
    this.selectedBackupForRestore = null;
    this.restoreConfirmPassword = '';
    this.restoreErrorMsg = '';
  }

  confirmRestoreBackup() {
    if (!this.selectedBackupForRestore || this.isRestoring || this.isOperationInProgress) return;
    if (!this.restoreConfirmPassword || this.restoreConfirmPassword.trim() === '') {
      this.restoreErrorMsg = 'Please enter security password / பாதுகாப்பு கடவுச்சொல்லை உள்ளிடவும்';
      return;
    }

    this.restoreErrorMsg = '';
    this.isRestoring = true;

    this.startProgressTracker(
      'RESTORE',
      'Executing Disaster Recovery Database Restore',
      ['Security Password Check', 'Pre-Restore Safety Snapshot', 'Atomic Table Truncate & Insert', 'Sequence Counter Alignment'],
      'Verifying password & restoring database snapshot...'
    );

    const backupId = this.selectedBackupForRestore.id;
    this.adminService.restoreBackup(backupId, this.restoreConfirmPassword.trim()).subscribe({
      next: (res) => {
        this.isRestoring = false;
        this.closeRestoreModal();
        if (res && res.success) {
          this.completeProgressTracker(true, () => {
            this.showNotification(res.message || 'Database restored successfully!', 'success');
            this.loadBackups();
            this.loadStats();
            this.loadRegistrations();
          });
        } else {
          this.stopProgressTracker();
          this.showNotification(res.message || 'Restore failed', 'error');
        }
      },
      error: (err) => {
        this.isRestoring = false;
        this.stopProgressTracker();
        console.error('Error restoring backup:', err);
        const errMsg = err.error?.message || 'Incorrect security password or restore failed';
        this.restoreErrorMsg = errMsg;
        this.showNotification(errMsg, 'error');
      }
    });
  }

  downloadBackupFile(backup: any) {
    this.showNotification(`Downloading ${backup.name}...`, 'info');
    this.adminService.downloadBackup(backup.id).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, backup.name);
      },
      error: (err) => {
        console.error('Error downloading backup file:', err);
        this.showNotification('Failed to download backup file', 'error');
      }
    });
  }

  confirmDeleteBackup(backup: any) {
    if (confirm(`Are you sure you want to permanently delete snapshot "${backup.name}" from storage?`)) {
      this.adminService.deleteBackup(backup.id).subscribe({
        next: (res) => {
          if (res && res.success) {
            this.showNotification('Backup snapshot deleted', 'success');
            this.loadBackups();
          }
        },
        error: (err) => {
          console.error('Error deleting backup:', err);
          this.showNotification('Failed to delete backup snapshot', 'error');
        }
      });
    }
  }

  runSystemHealthCheck() {
    if (this.isCheckingHealth || this.isOperationInProgress) return;
    this.isCheckingHealth = true;

    this.startProgressTracker(
      'HEALTH',
      'Verifying System & Storage Health',
      ['Ping PostgreSQL Pool', 'Ping Firebase Cloud Storage', 'Validate Bucket Metadata'],
      'Running system health check for PostgreSQL & Firebase Storage...'
    );

    this.adminService.getBackupHealth().subscribe({
      next: (res) => {
        this.isCheckingHealth = false;
        if (res && res.healthy) {
          this.completeProgressTracker(true, () => {
            this.showNotification('🟢 BACKUP SYSTEM HEALTHY: PostgreSQL and Storage connected.', 'success');
            this.loadBackups();
          });
        } else {
          this.stopProgressTracker();
          this.showNotification('🔴 BACKUP SYSTEM DEGRADED: ' + (res.message || 'Storage issue detected'), 'error');
          this.loadBackups();
        }
      },
      error: (err) => {
        this.isCheckingHealth = false;
        this.stopProgressTracker();
        this.showNotification('🔴 BACKUP SYSTEM DEGRADED', 'error');
      }
    });
  }

  copyChecksum(checksum: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(checksum);
      this.showNotification('SHA-256 Checksum copied to clipboard', 'info');
    }
  }

  showNotification(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    this.toastMessage = msg;
    this.toastType = type;
    setTimeout(() => {
      if (this.toastMessage === msg) {
        this.toastMessage = '';
      }
    }, 4000);
  }

  logout() {
    this.adminService.logout();
    this.router.navigate(['/admin/login']);
  }
}

