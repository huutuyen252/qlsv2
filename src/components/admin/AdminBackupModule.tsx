import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FileJson,
  ShieldAlert,
  Building2,
  Clock,
  Lock,
  Scale,
  RotateCcw,
  Save,
  Check,
  X,
  FileText,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { PageHeader } from '../common/PageHeader';
import { HOLIDAY_THEME_OPTIONS, HolidayThemeKey } from '../../utils/holidayTheme';

interface AdminBackupModuleProps {
  showToast: (msg: string) => void;
  onRefreshAllData: () => Promise<void>;
}

interface SystemConfig {
  schoolName: string;
  schoolCode: string;
  campusAddress: string;
  adminName: string;
  adminUnit: string;
  contactEmail: string;
  hotline: string;
  supportHours: string;
  facebookUrl: string;
  tiktokUrl: string;
  zaloUrl: string;
  holidayThemeMode: HolidayThemeKey;
  holidayBannerText: string;
  absenceWarningThreshold: number; // % e.g. 10
  absenceBanThreshold: number; // % e.g. 20
  minPassGrade10: number; // e.g. 4.0
  minPassGrade4: number; // e.g. 1.0
  regularStudentBaseRL: number; // 70
  classOfficerBaseRL: number; // 75
  sessionTimeoutMinutes: number; // 10
  maxPasswordRetries: number; // 5
  maintenanceMode: boolean;
}

const DEFAULT_CONFIG: SystemConfig = {
  schoolName: 'Trường Đại học Trần Đại Nghĩa (TDNU)',
  schoolCode: 'TDNU',
  campusAddress: '189 Nguyễn Oanh, Phường 10, Quận Gò Vấp, TP. Hồ Chí Minh',
  adminName: 'Dương Hữu Tuyến',
  adminUnit: 'Quản trị hệ thống · Phòng Đào tạo',
  contactEmail: 'admin@tdnu.edu.vn',
  hotline: '028.3894.1234',
  supportHours: 'Thứ 2 – Thứ 6 · 07:30 – 17:00',
  facebookUrl: 'https://www.facebook.com',
  tiktokUrl: 'https://www.tiktok.com',
  zaloUrl: 'https://zalo.me/02838941234',
  holidayThemeMode: 'AUTO',
  holidayBannerText: '',
  absenceWarningThreshold: 10,
  absenceBanThreshold: 20,
  minPassGrade10: 4.0,
  minPassGrade4: 1.0,
  regularStudentBaseRL: 70,
  classOfficerBaseRL: 75,
  sessionTimeoutMinutes: 10,
  maxPasswordRetries: 5,
  maintenanceMode: false,
};

type TabType = 'general' | 'export' | 'restore' | 'danger';

export const AdminBackupModule: React.FC<AdminBackupModuleProps> = ({
  showToast,
  onRefreshAllData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [config, setConfig] = useState<SystemConfig>(() => {
    try {
      const saved = localStorage.getItem('app_system_config');
      return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // High-security clear modal state
  const [isDangerModalOpen, setIsDangerModalOpen] = useState<boolean>(false);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState<string>('');

  useEffect(() => {
    let active = true;
    apiService.getSystemConfig().then((res) => {
      if (active && res.success && res.data) {
        setConfig((prev) => {
          const merged = { ...prev, ...res.data };
          try {
            localStorage.setItem('app_system_config', JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Save system configuration
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      localStorage.setItem('app_system_config', JSON.stringify(config));
      await apiService.updateSystemConfig(config);
      showToast('Đã lưu cấu hình hệ thống & thông tin liên hệ đăng nhập thành công!');
    } catch {
      showToast('Lỗi khi lưu cấu hình hệ thống!');
    } finally {
      setTimeout(() => setIsSavingConfig(false), 300);
    }
  };

  const handleResetDefaultConfig = async () => {
    setConfig(DEFAULT_CONFIG);
    try {
      localStorage.setItem('app_system_config', JSON.stringify(DEFAULT_CONFIG));
      await apiService.updateSystemConfig(DEFAULT_CONFIG);
      showToast('Đã khôi phục thông số cấu hình mặc định!');
    } catch {
      showToast('Lỗi khi khôi phục cấu hình!');
    }
  };

  // Export full system snapshot as JSON
  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const [users, students, grades, schedule, retakes, subjects, training, semesters, years] =
        await Promise.all([
          apiService.getUsers(),
          apiService.getStudents(),
          apiService.getGrades(),
          apiService.getSchedule(),
          apiService.getRetakes(),
          apiService.getSubjects(),
          apiService.getTrainingPoints(),
          apiService.getSemesters(),
          apiService.getAcademicYears(),
        ]);

      const snapshot = {
        app: 'TDNU Student Management System',
        version: '2.5.0',
        exportedAt: new Date().toISOString(),
        systemConfig: config,
        data: {
          users: users.data || [],
          students: students.data || [],
          grades: grades.data || [],
          schedule: schedule.data || [],
          retakes: retakes.data || [],
          subjects: subjects.data || [],
          training: training.data || [],
          semesters: semesters.data || [],
          academicYears: years.data || [],
        },
      };

      const jsonStr = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `TDNU_DATABASE_BACKUP_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('Đã xuất file sao lưu cơ sở dữ liệu thành công!');
    } catch {
      showToast('Xuất bản sao lưu thất bại!');
    } finally {
      setIsExporting(false);
    }
  };

  // Restore snapshot from file
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsRestoring(true);
        const parsed = JSON.parse(evt.target?.result as string);
        if (!parsed.data) {
          showToast('File sao lưu không đúng định dạng chuẩn snapshot!');
          return;
        }

        const { students, grades, schedule, training } = parsed.data;

        if (students && students.length > 0) {
          await apiService.importStudentsExcel(students);
        }
        if (grades && grades.length > 0) {
          await apiService.importGradesExcel(grades);
        }
        if (schedule && schedule.length > 0) {
          await apiService.importScheduleExcel(schedule);
        }
        if (training && training.length > 0) {
          await apiService.importTrainingExcel(training);
        }

        if (parsed.systemConfig) {
          setConfig({ ...DEFAULT_CONFIG, ...parsed.systemConfig });
          localStorage.setItem('app_system_config', JSON.stringify(parsed.systemConfig));
        }

        await onRefreshAllData();
        showToast('Khôi phục dữ liệu từ bản sao lưu thành công!');
      } catch {
        showToast('Lỗi khi đọc file hoặc khôi phục dữ liệu!');
      } finally {
        setIsRestoring(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // High-Security Clear Database execution (Replacing forbidden window.confirm)
  const handleConfirmClearDatabase = async () => {
    if (confirmDeleteInput.trim().toUpperCase() !== 'XAC NHAN XOA DU LIEU') {
      showToast('Chuỗi xác thực không khớp. Vui lòng nhập đúng!');
      return;
    }

    setIsClearing(true);
    try {
      const res = await apiService.clearAllData();
      if (res.success) {
        showToast('Đã xóa trắng dữ liệu CSDL thành công!');
        setIsDangerModalOpen(false);
        setConfirmDeleteInput('');
        await onRefreshAllData();
      } else {
        showToast('Xóa dữ liệu thất bại từ máy chủ!');
      }
    } catch {
      showToast('Lỗi kết nối khi xóa dữ liệu CSDL!');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Cấu Hình & Sao Lưu Hệ Thống"
        icon={Settings}
      />

      {/* Segmented Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'general'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Cấu hình Học vụ & Tham số</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'export'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Sao Lưu Dữ Liệu (Snapshot)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('restore')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'restore'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Khôi Phục Dữ Liệu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('danger')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'danger'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
              : 'border-transparent text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Vùng Nguy Hiểm</span>
        </button>
      </div>

      {/* TAB 1: CẤU HÌNH HỌC VỤ & THAM SỐ CHUNG */}
      {activeTab === 'general' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Thông tin Đơn vị & Cơ sở */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Thông Tin Học Viện & Đơn Vị
                </h3>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Tên cơ sở đào tạo
                  </label>
                  <input
                    type="text"
                    value={config.schoolName}
                    onChange={(e) => setConfig({ ...config, schoolName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Mã định danh trường
                    </label>
                    <input
                      type="text"
                      value={config.schoolCode}
                      onChange={(e) => setConfig({ ...config, schoolCode: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Đường dây nóng hỗ trợ
                    </label>
                    <input
                      type="text"
                      value={config.hotline}
                      onChange={(e) => setConfig({ ...config, hotline: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Tên Quản trị viên (Trang đăng nhập)
                    </label>
                    <input
                      type="text"
                      value={config.adminName}
                      onChange={(e) => setConfig({ ...config, adminName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Chức danh / Đơn vị quản trị
                    </label>
                    <input
                      type="text"
                      value={config.adminUnit}
                      onChange={(e) => setConfig({ ...config, adminUnit: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Email liên hệ Quản trị viên / Phòng Đào tạo
                  </label>
                  <input
                    type="email"
                    value={config.contactEmail}
                    onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Giờ làm việc / Hỗ trợ
                  </label>
                  <input
                    type="text"
                    value={config.supportHours}
                    onChange={(e) => setConfig({ ...config, supportHours: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Link Facebook
                    </label>
                    <input
                      type="url"
                      value={config.facebookUrl}
                      onChange={(e) => setConfig({ ...config, facebookUrl: e.target.value })}
                      placeholder="https://facebook.com/..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Link TikTok
                    </label>
                    <input
                      type="url"
                      value={config.tiktokUrl}
                      onChange={(e) => setConfig({ ...config, tiktokUrl: e.target.value })}
                      placeholder="https://tiktok.com/..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Link Zalo
                    </label>
                    <input
                      type="url"
                      value={config.zaloUrl}
                      onChange={(e) => setConfig({ ...config, zaloUrl: e.target.value })}
                      placeholder="https://zalo.me/..."
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Địa chỉ cơ sở chính
                  </label>
                  <input
                    type="text"
                    value={config.campusAddress}
                    onChange={(e) => setConfig({ ...config, campusAddress: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Chủ đề ngày lễ kỷ niệm (Trang đăng nhập)
                    </label>
                    <select
                      value={config.holidayThemeMode}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          holidayThemeMode: e.target.value as HolidayThemeKey,
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {HOLIDAY_THEME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Dòng chữ chạy kỷ niệm tùy chỉnh (để trống để tự động theo ngày lễ)
                    </label>
                    <input
                      type="text"
                      value={config.holidayBannerText}
                      onChange={(e) => setConfig({ ...config, holidayBannerText: e.target.value })}
                      placeholder="VD: Chào mừng Ngày Nhà giáo Việt Nam 20/11..."
                      maxLength={260}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Quy chế Đào tạo & Ngưỡng Cảnh Báo Chuyên Cần */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Quy Chế Học Vụ & Cảnh Báo Chuyên Cần
                </h3>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Ngưỡng cảnh báo nghỉ học (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={config.absenceWarningThreshold}
                        onChange={(e) =>
                          setConfig({ ...config, absenceWarningThreshold: Number(e.target.value) || 10 })
                        }
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-1.5 text-xs text-slate-400">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Cảnh báo vàng khi sinh viên vắng $\ge 10\%$
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Ngưỡng cấm thi học phần (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        max="50"
                        value={config.absenceBanThreshold}
                        onChange={(e) =>
                          setConfig({ ...config, absenceBanThreshold: Number(e.target.value) || 20 })
                        }
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-1.5 text-xs text-slate-400">%</span>
                    </div>
                    <span className="text-[10px] text-rose-500 dark:text-rose-400 mt-0.5 block">
                      Cấm thi học phần khi sinh viên vắng $\ge 20\%$
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Điểm sàn đạt môn (Thang 10)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="10"
                      value={config.minPassGrade10}
                      onChange={(e) =>
                        setConfig({ ...config, minPassGrade10: Number(e.target.value) || 4.0 })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Mặc định: 4.0 (Điểm D)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Điểm sàn đạt môn (Thang 4)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="4.0"
                      value={config.minPassGrade4}
                      onChange={(e) =>
                        setConfig({ ...config, minPassGrade4: Number(e.target.value) || 1.0 })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Mặc định: 1.0</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Điểm rèn luyện nền (Sinh viên)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="90"
                      value={config.regularStudentBaseRL}
                      onChange={(e) =>
                        setConfig({ ...config, regularStudentBaseRL: Number(e.target.value) || 70 })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Mặc định: 70 điểm</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Điểm nền (Cán bộ lớp / BCH)
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="90"
                      value={config.classOfficerBaseRL}
                      onChange={(e) =>
                        setConfig({ ...config, classOfficerBaseRL: Number(e.target.value) || 75 })
                      }
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Mặc định: 75 điểm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Bảo mật & Phiên làm việc */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Bảo Mật Phiên Làm Việc & Truy Cập
                </h3>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Thời lượng tự động đăng xuất
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={config.sessionTimeoutMinutes}
                        onChange={(e) =>
                          setConfig({ ...config, sessionTimeoutMinutes: Number(e.target.value) || 10 })
                        }
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-1.5 text-xs text-slate-400">Phút</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Tự hủy phiên sau 10 phút bất hoạt
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Giới hạn thử mật khẩu
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="3"
                        max="10"
                        value={config.maxPasswordRetries}
                        onChange={(e) =>
                          setConfig({ ...config, maxPasswordRetries: Number(e.target.value) || 5 })
                        }
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="absolute right-3 top-1.5 text-xs text-slate-400">Lần</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Tự động tạm khóa nếu nhập sai quá 5 lần
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between p-3 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                        Chế độ bảo trì hệ thống (Maintenance Mode)
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Chỉ cho phép Quản trị viên truy cập khi đang nâng cấp CSDL
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      id="toggle-maintenance"
                      checked={config.maintenanceMode}
                      onChange={(e) => setConfig({ ...config, maintenanceMode: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Tổng hợp Trạng Thái Tham Số */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Kiểm Tra Hiệu Lực Cấu Hình
                  </h3>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-500">Mã trường</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {config.schoolCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-500">Ngưỡng cảnh báo / Cấm thi</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {config.absenceWarningThreshold}% / {config.absenceBanThreshold}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-500">Điểm sàn đạt môn (10 / 4)</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {config.minPassGrade10} / {config.minPassGrade4}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/40">
                    <span className="text-slate-500">Thời gian timeout</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {config.sessionTimeoutMinutes} phút
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleResetDefaultConfig}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục mặc định</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingConfig ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSavingConfig ? 'Đang lưu...' : 'Lưu Cấu Hình'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAO LƯU DỮ LIỆU (SNAPSHOT EXPORT) */}
      {activeTab === 'export' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 shadow-xs">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tải Xuất Bản Snapshot Toàn Bộ CSDL (JSON Backup)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                Hệ thống đóng gói toàn bộ 9 bảng dữ liệu độc lập: Tài khoản người dùng, Hồ sơ sinh viên,
                Bảng điểm học phần, Lịch học và Thời khóa biểu, Đơn xin thi lại / học lại, Danh mục môn học,
                Điểm rèn luyện hàng tháng, cùng Niên khóa và Học kỳ vào một tệp JSON tiêu chuẩn có chữ ký
                thời gian.
              </p>

              <div className="p-4 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 mb-6">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
                  Cấu trúc tệp sao lưu bao gồm:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Hồ sơ Sinh viên (students)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Điểm học phần (grades)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Thời khóa biểu (schedule)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Điểm rèn luyện (training)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Danh mục Môn học (subjects)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Đơn thi lại / học lại (retakes)</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportJSON}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isExporting ? 'Đang xuất snapshot CSDL...' : 'Tải File Sao Lưu (.JSON)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KHÔI PHỤC DỮ LIỆU TỪ TỆP (RESTORE) */}
      {activeTab === 'restore' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-6 shadow-xs">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Khôi Phục Cơ Sở Dữ Liệu Từ Bản Sao Lưu
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                Nạp lại dữ liệu từ tệp snapshot JSON đã xuất trước đó. Quá trình này sẽ đối soát và hợp nhất
                dữ liệu vào các bảng hiện hành mà không gây xung đột khoá ngoại.
              </p>

              <div className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-md text-center bg-slate-50/60 dark:bg-slate-800/30 mb-6">
                <FileJson className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Chọn tệp sao lưu có định dạng .json
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-4">
                  Dung lượng tối đa khuyến nghị: 25MB
                </span>

                <input
                  type="file"
                  id="backup-json-input"
                  accept=".json"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
                <label
                  htmlFor="backup-json-input"
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded cursor-pointer shadow-xs transition-colors ${
                    isRestoring ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {isRestoring ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>{isRestoring ? 'Đang khôi phục dữ liệu...' : 'Chọn Tệp Để Khôi Phục'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VÙNG NGUY HIỂM (DANGER ZONE) */}
      {activeTab === 'danger' && (
        <div className="space-y-5">
          <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-md p-6 shadow-xs">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 mb-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Vùng Quản Trị Nguy Hiểm (Danger Zone)
              </h3>
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-300/80 leading-relaxed mb-6 max-w-2xl">
              Xóa toàn bộ các bảng dữ liệu sinh viên, bảng điểm, thời khóa biểu và điểm rèn luyện trong hệ
              thống để tái tạo từ đầu. Tài khoản Quản trị viên (ADMIN) và danh mục khoa/ngành cốt lõi sẽ
              được giữ nguyên vẹn. Thao tác này không thể hoàn tác!
            </p>

            <button
              type="button"
              onClick={() => {
                setConfirmDeleteInput('');
                setIsDangerModalOpen(true);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa Trắng Dữ Liệu Thử Nghiệm / Demo</span>
            </button>
          </div>
        </div>
      )}

      {/* HIGH-SECURITY CONFIRMATION MODAL (Zero window.confirm) */}
      {isDangerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/80 rounded-md p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Xác Nhận Xóa Trắng Cơ Sở Dữ Liệu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDangerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn đang yêu cầu dọn dẹp toàn bộ dữ liệu sinh viên, điểm số, lịch học và điểm rèn luyện. Để
              đảm bảo an toàn và tránh thao tác nhầm lẫn, vui lòng nhập chính xác chuỗi ký tự sau vào ô bên
              dưới:
            </p>

            <div className="p-2.5 rounded bg-rose-100/60 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-center">
              <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300 select-all tracking-wider">
                XAC NHAN XOA DU LIEU
              </span>
            </div>

            <div>
              <input
                type="text"
                placeholder="Nhập chính xác chuỗi ở trên để xác nhận..."
                value={confirmDeleteInput}
                onChange={(e) => setConfirmDeleteInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDangerModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={
                  isClearing ||
                  confirmDeleteInput.trim().toUpperCase() !== 'XAC NHAN XOA DU LIEU'
                }
                onClick={handleConfirmClearDatabase}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isClearing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isClearing ? 'Đang xóa CSDL...' : 'Xác Nhận Xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
