import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  Clock,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  XCircle
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
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px] border border-blue-500/20">
            LOGIN
          </span>
        );
      case 'IMPORT':
      case 'IMPORT_EXCEL':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/20">
            IMPORT
          </span>
        );
      case 'RBAC':
      case 'UPDATE_ROLE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[11px] border border-purple-500/20">
            RBAC
          </span>
        );
      case 'CREATE_USER':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold text-[11px] border border-cyan-500/20">
            TẠO USER
          </span>
        );
      case 'DELETE_USER':
      case 'DELETE_STUDENT':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[11px] border border-rose-500/20">
            XÓA BẢN GHI
          </span>
        );
      case 'UPDATE_GRADE':
      case 'ĐIỂM SỐ':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px] border border-amber-500/20">
            ĐIỂM SỐ
          </span>
        );
      case 'BACKUP':
      case 'BACKUP_DB':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] border border-indigo-500/20">
            BACKUP
          </span>
        );
      case 'CLEAR_DATA':
      case 'CLEAR_LOGS':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-[11px] border border-red-500/20">
            DỌN DẸP
          </span>
        );
      case 'ATTENDANCE':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-[11px] border border-teal-500/20">
            ĐIỂM DANH
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-500/10 text-slate-700 dark:text-slate-300 font-bold text-[11px] border border-slate-500/20">
            {action}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Thành công</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>Cảnh báo</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>Thất bại</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-500/20">
            {status}
          </span>
        );
    }
  };

  // Format IP addresses cleanly, separating client IP from proxy hops
  const renderIpAddress = (rawIp?: string) => {
    const ipStr = rawIp || '127.0.0.1';
    const parts = ipStr.split(',').map((s) => s.trim()).filter(Boolean);
    const clientIp = parts[0] || '127.0.0.1';
    const proxyHops = parts.slice(1);

    return (
      <div className="flex items-center gap-1.5" title={`IP Chi tiết: ${ipStr}`}>
        <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">
          {clientIp}
        </span>
        {proxyHops.length > 0 && (
          <span
            className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 cursor-help shrink-0"
            title={`Các máy chủ chuyển tiếp (Proxy): ${proxyHops.join(' -> ')}`}
          >
            +{proxyHops.length}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Nhật Ký Hoạt Động & Bảo Mật Thực Tế (Audit Logs)</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800">
              {logs.length} bản ghi
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ghi nhận và lưu vết thời gian thực mọi thao tác đăng nhập, chỉnh sửa điểm số, thay đổi quyền RBAC, import và sao lưu CSDL PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới nhật ký hệ thống"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleExportLogs}
            disabled={filteredLogs.length === 0}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>

          {currentUser?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={handleClearLogs}
              disabled={isClearing || logs.length === 0}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 border border-rose-200 dark:border-rose-900/50"
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
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
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
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="w-full sm:w-44 px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
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
          className="w-full sm:w-36 px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="SUCCESS">Thành công</option>
          <option value="WARNING">Cảnh báo</option>
          <option value="FAILED">Thất bại</option>
        </select>
      </div>

      {/* Logs Table with generous column widths & professional layout */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-inner bg-slate-50/30 dark:bg-slate-900/30">
        <table className="min-w-[1050px] w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="p-3.5 w-[165px] min-w-[165px] whitespace-nowrap">Thời gian</th>
              <th className="p-3.5 w-[150px] min-w-[150px] whitespace-nowrap">Người thực hiện</th>
              <th className="p-3.5 w-[110px] min-w-[110px] whitespace-nowrap">Hành động</th>
              <th className="p-3.5 w-[190px] min-w-[190px] whitespace-nowrap">Đối tượng</th>
              <th className="p-3.5 min-w-[380px]">Chi tiết sự kiện</th>
              <th className="p-3.5 w-[150px] min-w-[150px] whitespace-nowrap">Địa chỉ IP</th>
              <th className="p-3.5 w-[120px] min-w-[120px] text-center whitespace-nowrap">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                    <span className="font-medium text-xs">Đang tải dữ liệu nhật ký hệ thống...</span>
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                    <span className="font-medium text-xs">Không tìm thấy nhật ký hoạt động phù hợp</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors">
                  {/* Thời gian */}
                  <td className="p-3.5 whitespace-nowrap w-[165px] min-w-[165px]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px] font-mono font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{log.timestamp}</span>
                    </div>
                  </td>

                  {/* Người thực hiện */}
                  <td className="p-3.5 whitespace-nowrap w-[150px] min-w-[150px]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
                        {log.user.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                          {log.user}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {log.role}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Hành động */}
                  <td className="p-3.5 whitespace-nowrap w-[110px] min-w-[110px]">
                    {getActionBadge(log.action)}
                  </td>

                  {/* Đối tượng */}
                  <td className="p-3.5 whitespace-nowrap w-[190px] min-w-[190px]">
                    <span
                      className="font-semibold text-slate-800 dark:text-slate-200 text-xs block max-w-[185px] truncate"
                      title={log.target}
                    >
                      {log.target}
                    </span>
                  </td>

                  {/* Chi tiết sự kiện - Wide, beautiful readable text */}
                  <td className="p-3.5 min-w-[380px]">
                    <div className="text-[12px] text-slate-800 dark:text-slate-200 leading-relaxed font-normal bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      {log.details}
                    </div>
                  </td>

                  {/* Địa chỉ IP */}
                  <td className="p-3.5 whitespace-nowrap w-[150px] min-w-[150px]">
                    {renderIpAddress(log.ip)}
                  </td>

                  {/* Trạng thái */}
                  <td className="p-3.5 text-center whitespace-nowrap w-[120px] min-w-[120px]">
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
