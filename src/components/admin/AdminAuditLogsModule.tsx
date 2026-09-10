import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Download,
  Trash2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Clock,
  Laptop
} from 'lucide-react';
import { User, AuditLogEntry } from '../../types';
import { apiService } from '../../services/apiService';

interface AdminAuditLogsModuleProps {
  currentUser: User | null;
}

export const AdminAuditLogsModule: React.FC<AdminAuditLogsModuleProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiService.getAuditLogs(500);
      if (res.success && Array.isArray(res.data)) {
        setLogs(res.data);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Không thể tải nhật ký từ máy chủ' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearLogs = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử nhật ký hệ thống? Hành động này không thể hoàn tác!')) {
      return;
    }
    setIsClearing(true);
    try {
      const res = await apiService.clearAuditLogs();
      if (res.success) {
        setFeedback({ type: 'success', message: 'Đã dọn dẹp toàn bộ nhật ký hệ thống thành công!' });
        await fetchLogs(true);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Lỗi khi xóa nhật ký' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Lỗi kết nối máy chủ khi xóa nhật ký' });
    } finally {
      setIsClearing(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (log.user && log.user.toLowerCase().includes(term)) ||
      (log.details && log.details.toLowerCase().includes(term)) ||
      (log.target && log.target.toLowerCase().includes(term)) ||
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.role && log.role.toLowerCase().includes(term)) ||
      (log.ip && log.ip.toLowerCase().includes(term));

    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    const matchesStatus = filterStatus === 'ALL' || log.status === filterStatus;
    return matchesSearch && matchesAction && matchesStatus;
  });

  const handleExportLogs = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      ['Mã Log,Thời Gian,Người Thực Hiện,Vai Trò,Hành Động,Đối Tượng,Chi Tiết,IP,Trạng Thái']
        .concat(
          filteredLogs.map(
            (l) =>
              `"${l.id}","${l.timestamp}","${l.user}","${l.role}","${l.action}","${(l.target || '').replace(/"/g, '""')}","${(l.details || '').replace(/"/g, '""')}","${l.ip || ''}","${l.status}"`
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

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px]">LOGIN</span>;
      case 'IMPORT':
      case 'IMPORT_EXCEL':
        return <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">IMPORT</span>;
      case 'RBAC':
      case 'UPDATE_ROLE':
        return <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px]">RBAC</span>;
      case 'CREATE_USER':
        return <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-bold text-[10px]">TẠO USER</span>;
      case 'DELETE_USER':
      case 'DELETE_STUDENT':
        return <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold text-[10px]">XÓA BẢN GHI</span>;
      case 'UPDATE_GRADE':
      case 'ĐIỂM SỐ':
        return <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px]">ĐIỂM SỐ</span>;
      case 'BACKUP':
      case 'BACKUP_DB':
        return <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">BACKUP</span>;
      case 'CLEAR_DATA':
      case 'CLEAR_LOGS':
        return <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-[10px]">DỌN DẸP</span>;
      case 'ATTENDANCE':
        return <span className="px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold text-[10px]">ĐIỂM DANH</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">{action}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
            Thành công
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
            Cảnh báo
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold">
            Thất bại
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Nhật Ký Hoạt Động & Bảo Mật Thực Tế (Live Audit Logs)</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
              {logs.length} sự kiện
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận và lưu vết thời gian thực mọi thao tác đăng nhập, chỉnh sửa điểm số, thay đổi quyền RBAC, import và sao lưu CSDL PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới nhật ký hệ thống"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleExportLogs}
            disabled={filteredLogs.length === 0}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>

          {currentUser?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={handleClearLogs}
              disabled={isClearing || logs.length === 0}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Xóa toàn bộ nhật ký"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Dọn dẹp</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs hover:underline cursor-pointer ml-2"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo người thực hiện, vai trò, hành động, IP, chi tiết sự kiện..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="w-full sm:w-44 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <option value="ALL">Tất cả hành động</option>
          <option value="LOGIN">Đăng nhập (LOGIN)</option>
          <option value="IMPORT">Import dữ liệu</option>
          <option value="RBAC">Thay đổi vai trò (RBAC)</option>
          <option value="ĐIỂM SỐ">Cập nhật điểm số</option>
          <option value="CREATE_USER">Tạo người dùng</option>
          <option value="DELETE_USER">Xóa người dùng</option>
          <option value="ATTENDANCE">Điểm danh</option>
          <option value="BACKUP">Sao lưu CSDL</option>
          <option value="CLEAR_DATA">Làm sạch dữ liệu</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-36 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="SUCCESS">Thành công</option>
          <option value="WARNING">Cảnh báo</option>
          <option value="FAILED">Thất bại</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="p-3 whitespace-nowrap">Thời gian</th>
              <th className="p-3 whitespace-nowrap">Người thực hiện</th>
              <th className="p-3 whitespace-nowrap">Hành động</th>
              <th className="p-3 whitespace-nowrap">Đối tượng</th>
              <th className="p-3">Chi tiết sự kiện</th>
              <th className="p-3 whitespace-nowrap">Địa chỉ IP</th>
              <th className="p-3 text-center whitespace-nowrap">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                    <span>Đang tải dữ liệu nhật ký hệ thống...</span>
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                    <span>Không tìm thấy nhật ký hoạt động phù hợp</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{log.timestamp}</span>
                    </div>
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{log.user}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                        {log.role}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">{getActionBadge(log.action)}</td>
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[180px] truncate" title={log.target}>
                    {log.target}
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px] max-w-sm break-words">
                    {log.details}
                  </td>
                  <td className="p-3 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                    <div className="flex items-center gap-1">
                      <Laptop className="w-3 h-3 text-slate-400" />
                      <span>{log.ip || '127.0.0.1'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    {getStatusBadge(log.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
