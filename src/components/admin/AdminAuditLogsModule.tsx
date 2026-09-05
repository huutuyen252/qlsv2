import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Calendar,
  Layers
} from 'lucide-react';
import { User } from '../../types';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: 'LOGIN' | 'CREATE_USER' | 'UPDATE_ROLE' | 'IMPORT_EXCEL' | 'DELETE_SCHEDULE' | 'UPDATE_GRADE' | 'BACKUP_DB';
  target: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

interface AdminAuditLogsModuleProps {
  currentUser: User | null;
}

const SAMPLE_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'LOG-001',
    timestamp: new Date(Date.now() - 5 * 60000).toLocaleString('vi-VN'),
    user: 'admin',
    role: 'ADMIN',
    action: 'LOGIN',
    target: 'Hệ thống Quản trị',
    details: 'Đăng nhập thành công vào Admin Console qua thiết bị trình duyệt',
    status: 'SUCCESS',
  },
  {
    id: 'LOG-002',
    timestamp: new Date(Date.now() - 25 * 60000).toLocaleString('vi-VN'),
    user: 'admin',
    role: 'ADMIN',
    action: 'IMPORT_EXCEL',
    target: 'Bảng Thời Khóa Biểu',
    details: 'Import 48 lớp học phần thời khóa biểu học kỳ HK2 năm học 2025-2026',
    status: 'SUCCESS',
  },
  {
    id: 'LOG-003',
    timestamp: new Date(Date.now() - 2 * 3600000).toLocaleString('vi-VN'),
    user: 'gv_cntt',
    role: 'LECTURER',
    action: 'UPDATE_GRADE',
    target: 'Môn Lập trình Web (TIN101)',
    details: 'Cập nhật điểm quá trình và giữa kỳ cho 45 sinh viên lớp DH22TH01',
    status: 'SUCCESS',
  },
  {
    id: 'LOG-004',
    timestamp: new Date(Date.now() - 5 * 3600000).toLocaleString('vi-VN'),
    user: 'admin',
    role: 'ADMIN',
    action: 'UPDATE_ROLE',
    target: 'User ID: USER_092',
    details: 'Thay đổi vai trò người dùng từ STUDENT sang LECTURER, cấp quyền nhập điểm',
    status: 'SUCCESS',
  },
  {
    id: 'LOG-005',
    timestamp: new Date(Date.now() - 24 * 3600000).toLocaleString('vi-VN'),
    user: 'system',
    role: 'SYSTEM',
    action: 'BACKUP_DB',
    target: 'Snapshot PostgreSQL',
    details: 'Tạo snapshot dữ liệu định kỳ tự động',
    status: 'SUCCESS',
  },
];

export const AdminAuditLogsModule: React.FC<AdminAuditLogsModuleProps> = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(SAMPLE_AUDIT_LOGS);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const handleExportLogs = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Mã Log,Thời Gian,Người Thực Hiện,Vai Trò,Hành Động,Đối Tượng,Chi Tiết,Trạng Thái']
        .concat(
          filteredLogs.map(
            (l) =>
              `"${l.id}","${l.timestamp}","${l.user}","${l.role}","${l.action}","${l.target}","${l.details}","${l.status}"`
          )
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: AuditLogEntry['action']) => {
    switch (action) {
      case 'LOGIN':
        return <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">LOGIN</span>;
      case 'IMPORT_EXCEL':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">IMPORT</span>;
      case 'UPDATE_ROLE':
        return <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px]">RBAC</span>;
      case 'UPDATE_GRADE':
        return <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px]">ĐIỂM SỐ</span>;
      case 'BACKUP_DB':
        return <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">BACKUP</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">{action}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <span>Nhật Ký Hoạt Động & Bảo Mật (Audit Logs)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Giám sát thời gian thực các thao tác đăng nhập, chỉnh sửa quyền và import dữ liệu.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportLogs}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Xuất CSV</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo user, hành động, chi tiết..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 dark:text-slate-300"
        >
          <option value="ALL">Tất cả hành động</option>
          <option value="LOGIN">Đăng nhập</option>
          <option value="IMPORT_EXCEL">Import Excel</option>
          <option value="UPDATE_ROLE">Thay đổi quyền RBAC</option>
          <option value="UPDATE_GRADE">Cập nhật điểm</option>
          <option value="BACKUP_DB">Sao lưu CSDL</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="p-3">Thời gian</th>
              <th className="p-3">Người thực hiện</th>
              <th className="p-3">Hành động</th>
              <th className="p-3">Đối tượng</th>
              <th className="p-3">Chi tiết</th>
              <th className="p-3 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <td className="p-3 text-slate-500 whitespace-nowrap text-[11px] font-mono">{log.timestamp}</td>
                <td className="p-3 font-bold text-slate-900 dark:text-white">
                  <div className="flex items-center gap-1.5">
                    <span>{log.user}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {log.role}
                    </span>
                  </div>
                </td>
                <td className="p-3">{getActionBadge(log.action)}</td>
                <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{log.target}</td>
                <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px] max-w-xs">{log.details}</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                    Thành công
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
