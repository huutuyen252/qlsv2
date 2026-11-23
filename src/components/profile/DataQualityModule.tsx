import React, { useEffect, useMemo, useState } from 'react';
import { DataQualityIssue, DataQualityIssueCategory } from '../../types';
import { profileService } from '../../services/profileService';
import {
  DataToolbar,
  EmptyState,
  ErrorBanner,
  FilteredEmptyState,
  LoadingState,
  MetricStrip,
  PageHeader,
  StatusBadge,
} from '../common';
import { ProfileTabKey } from './StudentFullProfileView';
import { RefreshCw, ShieldCheck } from 'lucide-react';

interface DataQualityModuleProps {
  onOpenStudentTab: (maSV: string, tab: ProfileTabKey) => void;
}

const CATEGORY_LABELS: Partial<Record<DataQualityIssueCategory, string>> = {
  MISSING_CURRENT_ADDRESS: 'Thiếu nơi ở hiện tại',
  MISSING_PERMANENT_ADDRESS: 'Thiếu địa chỉ thường trú',
  UNVERIFIED_ADDRESS: 'Địa chỉ chưa xác minh',
  EXPIRED_OR_MERGED_ADMIN_UNIT: 'Đơn vị HC hết hiệu lực/sáp nhập',
  UNRESOLVED_CLASS_MAPPING: 'Chưa khớp lop_id',
  MISSING_DEMOGRAPHICS: 'Chưa khai dân tộc/tôn giáo',
};

const EXCLUDED_CATEGORIES = new Set<DataQualityIssueCategory>([
  'FAMILY_NOT_DECLARED',
  'FAMILY_INCOMPLETE',
  'MISSING_EMERGENCY_CONTACT',
  'INCOMPLETE_ORGANIZATION_INFO',
]);

export const DataQualityModule: React.FC<DataQualityModuleProps> = ({ onOpenStudentTab }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<DataQualityIssue[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await profileService.getDataQuality();
    if (!res.success || !res.data) {
      setError(res.message || 'Không thể tải báo cáo chất lượng hồ sơ.');
      setLoading(false);
      return;
    }
    setIssues(res.data.issues.filter((iss) => !EXCLUDED_CATEGORIES.has(iss.category)));
    setSummary(res.data.summary);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((iss) => {
      if (categoryFilter !== 'ALL' && iss.category !== categoryFilter) return false;
      if (q) {
        return (
          iss.maSV.toLowerCase().includes(q) ||
          iss.hoTen.toLowerCase().includes(q) ||
          iss.lop.toLowerCase().includes(q) ||
          iss.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [issues, search, categoryFilter]);

  if (loading) return <LoadingState rows={6} />;
  if (error) return <ErrorBanner message={error} onRetry={loadData} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Giám sát Chất lượng Dữ liệu Hồ sơ"
        subtitle="Phát hiện tự động hồ sơ thiếu địa chỉ 2 cấp, chưa xác minh, đơn vị hành chính sáp nhập và thiếu dân tộc/tôn giáo"
        icon={ShieldCheck}
        actions={
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Quét kiểm tra lại</span>
          </button>
        }
      />

      {summary && (
        <MetricStrip
          metrics={[
            { label: 'Tổng SV rà soát', value: summary.totalStudents },
            { label: 'Thiếu nơi ở hiện tại', value: summary.missingCurrentAddress, dotColor: summary.missingCurrentAddress > 0 ? 'rose' : 'emerald' },
            { label: 'ĐVHC hết hiệu lực', value: summary.expiredAdminUnits, dotColor: summary.expiredAdminUnits > 0 ? 'rose' : 'emerald' },
            {
              label: 'Chưa khai dân tộc/tôn giáo',
              value: issues.filter((i) => i.category === 'MISSING_DEMOGRAPHICS').length,
              dotColor: issues.some((i) => i.category === 'MISSING_DEMOGRAPHICS') ? 'amber' : 'emerald',
            },
          ]}
        />
      )}

      <DataToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm Mã SV, Họ tên, Lớp..."
        hasActiveFilters={Boolean(search || categoryFilter !== 'ALL')}
        filters={
          <select
            id="dq-category"
            aria-label="Lọc nhóm vấn đề"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            <option value="ALL">Tất cả nhóm vấn đề</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        }
        onClearFilters={() => {
          setSearch('');
          setCategoryFilter('ALL');
        }}
      />

      {issues.length === 0 ? (
        <EmptyState message="Toàn bộ hồ sơ trong phạm vi quản lý đều đạt chuẩn chất lượng dữ liệu." />
      ) : filteredIssues.length === 0 ? (
        <FilteredEmptyState
          onClearFilters={() => {
            setSearch('');
            setCategoryFilter('ALL');
          }}
        />
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Mã SV</th>
                <th className="py-2.5 px-3">Họ và tên</th>
                <th className="py-2.5 px-3">Lớp</th>
                <th className="py-2.5 px-3">Mức độ</th>
                <th className="py-2.5 px-3">Nhóm vấn đề</th>
                <th className="py-2.5 px-3">Mô tả chi tiết</th>
                <th className="py-2.5 px-3 text-right">Xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredIssues.map((iss) => (
                <tr key={iss.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                  <td className="py-2.5 px-3 font-mono font-semibold text-blue-700 dark:text-blue-400">{iss.maSV}</td>
                  <td className="py-2.5 px-3 font-medium">{iss.hoTen}</td>
                  <td className="py-2.5 px-3">{iss.lop}</td>
                  <td className="py-2.5 px-3">
                    <StatusBadge
                      label={iss.severity === 'HIGH' ? 'Cao' : iss.severity === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
                      variant={iss.severity === 'HIGH' ? 'danger' : iss.severity === 'MEDIUM' ? 'warning' : 'neutral'}
                      dot
                    />
                  </td>
                  <td className="py-2.5 px-3 font-medium">{CATEGORY_LABELS[iss.category] || iss.category}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{iss.description}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenStudentTab(iss.maSV, iss.targetTab === 'ADDRESS' ? 'ADDRESS' : 'GENERAL')}
                      className="px-2.5 py-1 rounded text-[11px] font-medium border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 cursor-pointer whitespace-nowrap"
                    >
                      Mở tab xử lý
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
