import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  XCircle,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  UserCheck,
  Activity,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { User, AuditLogEntry } from '../../types';
import { apiService } from '../../services/apiService';
import { PageHeader } from '../common/PageHeader';

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

  // Inspector modal & Clear confirmation modal states (Zero window.confirm)
  const [inspectingLog, setInspectingLog] = useState<AuditLogEntry | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [confirmClearInput, setConfirmClearInput] = useState<string>('');
  const [copiedDetail, setCopiedDetail] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiService.getAuditLogs(1000);
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

  // High-Security Clear Execution (No window.confirm)
  const handleConfirmClearLogs = async () => {
    if (confirmClearInput.trim().toUpperCase() !== 'XAC NHAN XOA NHAT KY') {
      setFeedback({ type: 'error', message: 'Chuỗi xác thực không khớp. Vui lòng nhập đúng!' });
      return;
    }

    setIsClearing(true);
    try {
      const res = await apiService.clearAuditLogs();
      if (res.success) {
        setFeedback({ type: 'success', message: 'Đã dọn dẹp toàn bộ nhật ký hệ thống thành công!' });
        setIsClearModalOpen(false);
        setConfirmClearInput('');
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

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return logs.filter((log) => {
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
  }, [logs, searchTerm, filterAction, filterStatus]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAction, filterStatus, pageSize]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Metrics summary
  const loginCount = useMemo(() => logs.filter((l) => l.action === 'LOGIN').length, [logs]);
  const mutationCount = useMemo(
    () =>
      logs.filter((l) =>
        ['IMPORT', 'IMPORT_EXCEL', 'UPDATE_ROLE', 'RBAC', 'UPDATE_GRADE', 'ĐIỂM SỐ', 'CREATE_USER', 'DELETE_USER', 'ATTENDANCE'].includes(
          l.action
        )
      ).length,
    [logs]
  );
  const failureCount = useMemo(
    () => logs.filter((l) => l.status === 'FAILED' || l.status === 'WARNING').length,
    [logs]
  );

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
    link.setAttribute('download', `TDNU_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyDetails = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDetail(true);
    setTimeout(() => setCopiedDetail(false), 2000);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 font-mono font-bold text-[10px] border border-blue-500/30">
            LOGIN
          </span>
        );
      case 'IMPORT':
      case 'IMPORT_EXCEL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/30">
            IMPORT
          </span>
        );
      case 'RBAC':
      case 'UPDATE_ROLE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 font-mono font-bold text-[10px] border border-purple-500/30">
            RBAC
          </span>
        );
      case 'CREATE_USER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-mono font-bold text-[10px] border border-cyan-500/30">
            TẠO USER
          </span>
        );
      case 'DELETE_USER':
      case 'DELETE_STUDENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 font-mono font-bold text-[10px] border border-rose-500/30">
            XÓA BẢN GHI
          </span>
        );
      case 'UPDATE_GRADE':
      case 'ĐIỂM SỐ':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono font-bold text-[10px] border border-amber-500/30">
            ĐIỂM SỐ
          </span>
        );
      case 'BACKUP':
      case 'BACKUP_DB':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-mono font-bold text-[10px] border border-indigo-500/30">
            BACKUP
          </span>
        );
      case 'CLEAR_DATA':
      case 'CLEAR_LOGS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 font-mono font-bold text-[10px] border border-rose-500/30">
            DỌN DẸP
          </span>
        );
      case 'ATTENDANCE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-400 font-mono font-bold text-[10px] border border-teal-500/30">
            ĐIỂM DANH
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-500/10 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px] border border-slate-500/30">
            {action}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Thành công</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            <span>Cảnh báo</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-bold border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            <span>Thất bại</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-500/10 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-500/30">
            {status}
          </span>
        );
    }
  };

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
            className="px-1 py-0.2 rounded text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 cursor-help shrink-0"
            title={`Các máy chủ chuyển tiếp (Proxy): ${proxyHops.join(' -> ')}`}
          >
            +{proxyHops.length}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Nhật Ký Hoạt Động & Kiểm Toán (Audit Logs)"
        icon={History}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLogs(true)}
              disabled={refreshing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Làm mới nhật ký"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handleExportLogs}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV</span>
            </button>

            {currentUser?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => {
                  setConfirmClearInput('');
                  setIsClearModalOpen(true);
                }}
                disabled={isClearing || logs.length === 0}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold text-xs rounded border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Dọn dẹp nhật ký</span>
              </button>
            )}
          </div>
        }
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Tổng số nhật ký
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
              {logs.length.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <History className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Lượt đăng nhập (LOGIN)
            </span>
            <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-0.5 block">
              {loginCount.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Thao tác ghi & cập nhật
            </span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              {mutationCount.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Cảnh báo & Lỗi
            </span>
            <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
              {failureCount.toLocaleString()}
            </span>
          </div>
          <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          role="status"
          className={`p-3 rounded-md text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs hover:underline cursor-pointer ml-2 p-1"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-3.5 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm người thực hiện, hành động, IP, đối tượng, chi tiết..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full sm:w-44 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
            className="w-full sm:w-36 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SUCCESS">Thành công</option>
            <option value="WARNING">Cảnh báo</option>
            <option value="FAILED">Thất bại</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="w-24 px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value={15}>15 dòng</option>
            <option value={25}>25 dòng</option>
            <option value={50}>50 dòng</option>
            <option value={100}>100 dòng</option>
          </select>
        </div>
      </div>

      {/* Logs Table (Dense Enterprise Academic Layout) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3 w-[150px] whitespace-nowrap">Thời gian</th>
                <th className="py-2.5 px-3 w-[140px] whitespace-nowrap">Người thực hiện</th>
                <th className="py-2.5 px-3 w-[100px] whitespace-nowrap">Hành động</th>
                <th className="py-2.5 px-3 w-[180px] whitespace-nowrap">Đối tượng</th>
                <th className="py-2.5 px-3 min-w-[380px]">Chi tiết hành động</th>
                <th className="py-2.5 px-3 w-[140px] whitespace-nowrap">Địa chỉ IP</th>
                <th className="py-2.5 px-3 w-[105px] text-center whitespace-nowrap">Trạng thái</th>
                <th className="py-2.5 px-3 w-[60px] text-center whitespace-nowrap">Xem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-xs">Đang tải nhật ký kiểm toán từ máy chủ...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                      <span className="text-xs font-medium">Không tìm thấy bản ghi nhật ký phù hợp với bộ lọc</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    onClick={() => setInspectingLog(log)}
                  >
                    {/* Thời gian */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{log.timestamp}</span>
                      </div>
                    </td>

                    {/* Người thực hiện */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px] flex items-center justify-center uppercase shrink-0">
                          {log.user.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[100px]">
                            {log.user}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {log.role}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Hành động */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    {/* Đối tượng */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className="font-medium text-slate-800 dark:text-slate-200 text-xs block max-w-[170px] truncate"
                        title={log.target}
                      >
                        {log.target || '—'}
                      </span>
                    </td>

                    {/* Chi tiết hành động */}
                    <td className="py-2 px-3 max-w-[400px]">
                      <span
                        className="line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300 leading-snug block"
                        title={log.details}
                      >
                        {log.details}
                      </span>
                    </td>

                    {/* Địa chỉ IP */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {renderIpAddress(log.ip)}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>

                    {/* Xem chi tiết */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingLog(log);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Xem chi tiết bản ghi"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="py-2.5 px-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Hiển thị{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-mono">
              {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </strong>{' '}
            -{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-mono">
              {Math.min(currentPage * pageSize, filteredLogs.length)}
            </strong>{' '}
            trong tổng số{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-mono">
              {filteredLogs.length}
            </strong>{' '}
            bản ghi
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>

            <span className="px-2 font-mono text-slate-700 dark:text-slate-300">
              Trang {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* LOG INSPECTOR MODAL */}
      {inspectingLog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md p-5 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Chi Tiết Bản Ghi Kiểm Toán (Audit Inspector)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">
                    Mã bản ghi (ID)
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 select-all font-semibold">
                    {inspectingLog.id}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">
                    Thời điểm ghi nhận
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    {inspectingLog.timestamp}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">
                    Người thực hiện
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {inspectingLog.user}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {inspectingLog.role}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">
                    Hành động
                  </span>
                  <div className="mt-1">{getActionBadge(inspectingLog.action)}</div>
                </div>

                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">
                    Trạng thái
                  </span>
                  <div className="mt-1">{getStatusBadge(inspectingLog.status)}</div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">
                  Thực thể tác động (Target)
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {inspectingLog.target || 'Toàn hệ thống'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    Chi tiết nội dung hành vi (Full Payload)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyDetails(inspectingLog.details)}
                    className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {copiedDetail ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDetail ? 'Đã sao chép' : 'Sao chép'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-all">
                  {inspectingLog.details}
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">
                  Địa chỉ IP & Tuyến chuyển tiếp (Hop Trace)
                </span>
                {renderIpAddress(inspectingLog.ip)}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIGH-SECURITY CLEAR MODAL (Zero window.confirm) */}
      {isClearModalOpen && (
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
                  Xác Nhận Dọn Dẹp Nhật Ký Hệ Thống
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn đang yêu cầu xóa toàn bộ lịch sử truy cập và nhật ký kiểm toán hệ thống. Hành động này
              sẽ dọn sạch dữ liệu audit log và không thể hoàn tác. Để tiếp tục, vui lòng nhập chính xác
              chuỗi ký tự bên dưới:
            </p>

            <div className="p-2.5 rounded bg-rose-100/60 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-center">
              <span className="font-mono text-xs font-bold text-rose-700 dark:text-rose-300 select-all tracking-wider">
                XAC NHAN XOA NHAT KY
              </span>
            </div>

            <div>
              <input
                type="text"
                placeholder="Nhập chính xác chuỗi ở trên để xác nhận..."
                value={confirmClearInput}
                onChange={(e) => setConfirmClearInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={
                  isClearing ||
                  confirmClearInput.trim().toUpperCase() !== 'XAC NHAN XOA NHAT KY'
                }
                onClick={handleConfirmClearLogs}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isClearing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isClearing ? 'Đang dọn dẹp...' : 'Xác Nhận Xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
