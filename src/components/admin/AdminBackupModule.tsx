import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FileJson,
  ShieldAlert,
  HardDrive,
  Cloud,
  Flame,
  CloudUpload,
  ExternalLink,
  Check,
} from 'lucide-react';
import { apiService } from '../../services/apiService';

interface AdminBackupModuleProps {
  showToast: (msg: string) => void;
  onRefreshAllData: () => Promise<void>;
}

export const AdminBackupModule: React.FC<AdminBackupModuleProps> = ({
  showToast,
  onRefreshAllData,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Cloudinary & Firebase Cloud States
  const [isCheckingCloud, setIsCheckingCloud] = useState<boolean>(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);
  const [cloudStatus, setCloudStatus] = useState<any>(null);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);

  const fetchCloudStatus = async () => {
    setIsCheckingCloud(true);
    try {
      const res = await fetch('/api/cloud/status');
      const data = await res.json();
      if (data.success) {
        setCloudStatus(data.services);
      }
    } catch (e) {
      console.warn('Lỗi kiểm tra cloud status:', e);
    } finally {
      setIsCheckingCloud(false);
    }
  };

  useEffect(() => {
    fetchCloudStatus();
  }, []);

  const handleSyncFirebase = async () => {
    setIsSyncingFirebase(true);
    setCloudSyncMsg('Đang đồng bộ toàn bộ hồ sơ sinh viên lên Google Firebase Firestore...');
    try {
      const res = await fetch('/api/cloud/sync-firebase', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCloudSyncMsg(data.message || `Đã đồng bộ ${data.count} sinh viên lên Firebase thành công!`);
        showToast(`Đồng bộ thành công ${data.count} hồ sơ sinh viên lên Firebase Firestore!`);
      } else {
        setCloudSyncMsg(`Lỗi đồng bộ: ${data.message || 'Không thể đồng bộ'}`);
        showToast(`Lỗi: ${data.message || 'Không thể đồng bộ'}`);
      }
    } catch (err: any) {
      setCloudSyncMsg(`Lỗi kết nối API: ${err.message}`);
      showToast(`Lỗi: ${err.message}`);
    } finally {
      setIsSyncingFirebase(false);
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
          showToast('File sao lưu không đúng định dạng chuẩn!');
          return;
        }

        const { students, grades, schedule, training, subjects } = parsed.data;

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

  // Safe Clear all data (Admin only)
  const handleClearDatabase = async () => {
    if (
      window.confirm(
        'CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn xóa toàn bộ dữ liệu TKB, Điểm, Sinh viên trong CSDL? Thao tác này không thể hoàn tác!'
      )
    ) {
      setIsClearing(true);
      try {
        const res = await apiService.clearAllData();
        if (res.success) {
          showToast('Đã xóa trắng dữ liệu CSDL thành công!');
          await onRefreshAllData();
        }
      } catch {
        showToast('Xóa dữ liệu thất bại!');
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-600" />
          <span>Sao Lưu Dữ Liệu Hệ Thống (Snapshot Export)</span>
        </h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Tạo bản sao lưu toàn diện chứa tài khoản, sinh viên, bảng điểm, thời khóa biểu và điểm rèn luyện dưới dạng tệp JSON có cấu trúc.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Download JSON Backup */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <FileJson className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Tải Xuất Bản Snapshot JSON
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Xuất file sao lưu đầy đủ tất cả các bảng dữ liệu trong một lần bấm.
              </p>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportJSON}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isExporting ? 'Đang xuất snapshot...' : 'Tải File Sao Lưu (.JSON)'}</span>
              </button>
            </div>
          </div>

          {/* Restore JSON Backup */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Upload className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                Khôi Phục Dữ Liệu Từ File
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nạp lại dữ liệu từ tệp snapshot JSON đã xuất trước đó.
              </p>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-200 dark:border-slate-700/80">
              <input
                type="file"
                id="backup-json-input"
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
              <label
                htmlFor="backup-json-input"
                className={`w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  isRestoring ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{isRestoring ? 'Đang khôi phục...' : 'Chọn File Khôi Phục'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Storage (Cloudinary) & Firebase Firestore Integration */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Lưu Trữ Đám Mây & Hồ Sơ Sinh Viên</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold border border-emerald-200 dark:border-emerald-800">
                  Cloudinary & Firebase
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động lưu trữ ảnh chân dung qua Cloudinary CDN và đồng bộ hồ sơ sinh viên an toàn lên Google Firebase Firestore
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchCloudStatus}
            disabled={isCheckingCloud}
            className="self-start sm:self-auto px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingCloud ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới trạng thái Cloud</span>
          </button>
        </div>

        {/* 2 Service Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cloudinary Box */}
          <div className="p-4 rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-bold text-xs">
                <CloudUpload className="w-4 h-4 text-sky-600" />
                <span>Cloudinary Media Storage</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                cloudStatus?.cloudinary?.configured
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
              }`}>
                {cloudStatus?.cloudinary?.configured ? 'Đã kết nối API Keys' : 'Chế độ Lưu trữ Cục bộ / Đang chờ Keys'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Lưu trữ và tối ưu hóa ảnh đại diện sinh viên, ảnh thẻ scan tự động với băng thông CDN tốc độ cao.
            </p>
            <div className="pt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex flex-wrap gap-2">
              <span>Thư mục: <strong className="text-slate-700 dark:text-slate-300">tdnu_students</strong></span>
              {cloudStatus?.cloudinary?.cloudName && (
                <span>• Cloud Name: <strong className="text-slate-700 dark:text-slate-300">{cloudStatus.cloudinary.cloudName}</strong></span>
              )}
            </div>
          </div>

          {/* Firebase Box */}
          <div className="p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs">
                <Flame className="w-4 h-4 text-amber-600" />
                <span>Google Firebase Cloud Firestore</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                {cloudStatus?.firebase?.firestoreReady ? 'Firestore Sẵn sàng' : 'Đã cấu hình App'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Lưu trữ hồ sơ sinh viên phân tán không giới hạn, sao lưu song song với PostgreSQL và bảo mật với Firebase Rules.
            </p>
            <div className="pt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex flex-wrap gap-2">
              <span>Bộ sưu tập: <strong className="text-slate-700 dark:text-slate-300">sinhvien</strong></span>
              <span>• Project: <strong className="text-slate-700 dark:text-slate-300">{cloudStatus?.firebase?.projectId || 'triple-network-nxctm'}</strong></span>
            </div>
          </div>
        </div>

        {/* Sync Action and Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Đồng Bộ Hồ Sơ Sinh Viên Lên Firebase Firestore
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quét toàn bộ danh sách sinh viên hiện có từ PostgreSQL và đẩy lên bộ sưu tập <code className="font-mono text-blue-600 dark:text-blue-400">/sinhvien</code> trên Firebase Cloud.
            </p>
            {cloudSyncMsg && (
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{cloudSyncMsg}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSyncFirebase}
            disabled={isSyncingFirebase}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0 transition-all"
          >
            {isSyncingFirebase ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CloudUpload className="w-4 h-4" />
            )}
            <span>{isSyncingFirebase ? 'Đang đồng bộ...' : 'Đồng Bộ Tất Cả Lên Firebase'}</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2 text-rose-700 dark:text-rose-400">
          <ShieldAlert className="w-5 h-5" />
          <h4 className="text-sm font-bold">Vùng Nguy Hiểm (Danger Zone)</h4>
        </div>
        <p className="text-xs text-rose-600 dark:text-rose-300/80 mb-4 leading-relaxed">
          Xóa toàn bộ các bảng dữ liệu sinh viên, bảng điểm, thời khóa biểu và điểm rèn luyện. Chỉ giữ lại tài khoản Quản trị viên.
        </p>

        <button
          type="button"
          disabled={isClearing}
          onClick={handleClearDatabase}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          {isClearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          <span>{isClearing ? 'Đang xóa...' : 'Xóa Trắng Dữ Liệu Demo / Thử Nghiệm'}</span>
        </button>
      </div>
    </div>
  );
};
