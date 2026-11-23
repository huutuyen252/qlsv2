import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AdministrativeUnit,
  AdministrativeUnitHistory,
  EthnicityCatalog,
  ReligionCatalog,
} from '../../types';
import { profileService } from '../../services/profileService';
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  LoadingState,
  PageHeader,
  StatusBadge,
} from '../common';
import { Download, Layers, Plus, Trash2, Upload } from 'lucide-react';

interface AdminCatalogsModuleProps {
  showToast?: (msg: string) => void;
}

type CatalogTab = 'ADMIN_UNITS' | 'ETHNICITY_RELIGION';

export const AdminCatalogsModule: React.FC<AdminCatalogsModuleProps> = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState<CatalogTab>('ADMIN_UNITS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [units, setUnits] = useState<AdministrativeUnit[]>([]);
  const [unitHistory, setUnitHistory] = useState<AdministrativeUnitHistory[]>([]);
  const [ethnicities, setEthnicities] = useState<EthnicityCatalog[]>([]);
  const [religions, setReligions] = useState<ReligionCatalog[]>([]);

  // Unit form
  const [unitForm, setUnitForm] = useState({
    officialCode: '',
    unitLevel: 'PROVINCE' as 'PROVINCE' | 'COMMUNE',
    name: '',
    unitType: 'Tỉnh',
    parentId: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });
  const [mergeState, setMergeState] = useState<{
    source: AdministrativeUnit;
    targetUnitId: string;
    resolutionNo: string;
    effectiveDate: string;
    notes: string;
  } | null>(null);

  // Simple catalog forms
  const [ethForm, setEthForm] = useState({ officialCode: '', name: '' });
  const [relForm, setRelForm] = useState({ officialCode: '', name: '' });

  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'UNIT' | 'ETH' | 'REL';
    id: string;
    label: string;
  } | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    const [uRes, catRes] = await Promise.all([
      profileService.getAdminUnits(),
      profileService.getCatalogs(),
    ]);
    if (uRes.success && uRes.data) {
      setUnits(uRes.data.units);
      setUnitHistory(uRes.data.history);
    }
    if (catRes.success && catRes.data) {
      setEthnicities(catRes.data.ethnicities);
      setReligions(catRes.data.religions);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const provinces = units.filter((u) => u.unitLevel === 'PROVINCE');

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await profileService.saveAdminUnit({
      ...unitForm,
      parentId: unitForm.unitLevel === 'COMMUNE' ? unitForm.parentId : null,
    });
    if (!res.success) {
      setError(res.message || 'Không thể lưu đơn vị hành chính.');
      return;
    }
    setUnitForm({ ...unitForm, officialCode: '', name: '' });
    showToast?.('Đã lưu đơn vị hành chính 2 cấp.');
    await loadAll();
  };

  const handleDownloadAdminUnitsTemplate = () => {
    const templateRows = [
      {
        'Mã chính thức': '',
        'Cấp': '',
        'Tên đơn vị': '',
        'Loại hình': '',
        'Mã Tỉnh/TP cha': '',
        'Ngày hiệu lực': '',
      },
    ];
    const guideRows = [
      {
        'Cột dữ liệu': 'Mã chính thức',
        'Bắt buộc': 'Có',
        'Quy tắc định dạng': 'Mã định danh chuẩn của ĐVHC (lưu dạng Text để giữ số 0 ở đầu nếu có).',
      },
      {
        'Cột dữ liệu': 'Cấp',
        'Bắt buộc': 'Có',
        'Quy tắc định dạng': 'Chỉ nhập PROVINCE (Tỉnh/TP) hoặc COMMUNE (Xã/Phường/Đặc khu).',
      },
      {
        'Cột dữ liệu': 'Tên đơn vị',
        'Bắt buộc': 'Có',
        'Quy tắc định dạng': 'Tên đầy đủ của Tỉnh/TP hoặc Xã/Phường/Đặc khu.',
      },
      {
        'Cột dữ liệu': 'Loại hình',
        'Bắt buộc': 'Có',
        'Quy tắc định dạng': 'Ví dụ: Tỉnh, Thành phố, Phường, Xã, Đặc khu.',
      },
      {
        'Cột dữ liệu': 'Mã Tỉnh/TP cha',
        'Bắt buộc': 'Có nếu Cấp = COMMUNE',
        'Quy tắc định dạng': 'Nhập đúng Mã chính thức của Tỉnh/TP trực thuộc (để trống nếu Cấp = PROVINCE).',
      },
      {
        'Cột dữ liệu': 'Ngày hiệu lực',
        'Bắt buộc': 'Tùy chọn',
        'Quy tắc định dạng': 'Định dạng YYYY-MM-DD (để trống sẽ lấy ngày hiện tại).',
      },
    ];

    const wsData = XLSX.utils.json_to_sheet(templateRows);
    wsData['!cols'] = [
      { wch: 16 },
      { wch: 14 },
      { wch: 28 },
      { wch: 22 },
      { wch: 18 },
      { wch: 16 },
    ];
    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 20 }, { wch: 24 }, { wch: 72 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, 'DonViHanhChinh');
    XLSX.utils.book_append_sheet(wb, wsGuide, 'HuongDan');
    XLSX.writeFile(wb, 'Mau_Import_Don_Vi_Hanh_Chinh_2_Cap.xlsx');
    showToast?.('Đã tải file Excel mẫu ĐVHC 2 cấp.');
  };

  const handleDownloadSimpleTemplate = (kind: 'ETH' | 'REL') => {
    const isEth = kind === 'ETH';
    const nameHeader = isEth ? 'Tên dân tộc' : 'Tên tôn giáo';
    const sheetName = isEth ? 'DanToc' : 'TonGiao';
    const fileName = isEth ? 'Mau_Import_Dan_Toc.xlsx' : 'Mau_Import_Ton_Giao.xlsx';

    const templateRows = [
      {
        'Mã chính thức': '',
        [nameHeader]: '',
        'Thứ tự': '',
      },
    ];
    const guideRows = [
      {
        'Cột dữ liệu': 'Mã chính thức',
        'Bắt buộc': 'Có',
        'Quy tắc định dạng': `Mã chuẩn danh mục ${isEth ? 'dân tộc' : 'tôn giáo'} (nên định dạng Text để giữ số 0 ở đầu).`,
      },
      {
        'Cột dữ liệu': nameHeader,
        'Bắt buộc': 'Có',
        'Quy tắc định dạng': `Tên ${isEth ? 'dân tộc' : 'tôn giáo'} theo danh mục chuẩn.`,
      },
      {
        'Cột dữ liệu': 'Thứ tự',
        'Bắt buộc': 'Tùy chọn',
        'Quy tắc định dạng': 'Số nguyên dương để sắp xếp hiển thị (1, 2, 3...).',
      },
    ];

    const wsData = XLSX.utils.json_to_sheet(templateRows);
    wsData['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 12 }];
    const wsGuide = XLSX.utils.json_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 68 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, sheetName);
    XLSX.utils.book_append_sheet(wb, wsGuide, 'HuongDan');
    XLSX.writeFile(wb, fileName);
    showToast?.(`Đã tải file Excel mẫu ${isEth ? 'Dân tộc' : 'Tôn giáo'}.`);
  };

  const handleImportAdminUnitsExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const mapped = json
        .map((r) => {
          const officialCode = String(
            r['Mã chính thức'] ?? r.officialCode ?? r.official_code ?? r.ma ?? ''
          ).trim();
          const rawLevel = String(
            r['Cấp'] ?? r.unitLevel ?? r.unit_level ?? r.cap ?? ''
          )
            .trim()
            .toUpperCase();
          const unitLevel = (
            rawLevel === 'TỈNH' || rawLevel === 'TINH'
              ? 'PROVINCE'
              : rawLevel === 'XÃ' || rawLevel === 'XA' || rawLevel === 'PHƯỜNG' || rawLevel === 'PHUONG' || rawLevel === 'ĐẶC KHU'
              ? 'COMMUNE'
              : rawLevel || 'PROVINCE'
          ) as 'PROVINCE' | 'COMMUNE';
          const name = String(r['Tên đơn vị'] ?? r.name ?? r.ten ?? '').trim();
          const unitType = String(
            r['Loại hình'] ?? r.unitType ?? r.unit_type ?? r.loai ?? ''
          ).trim();
          const rawParent =
            r['Mã Tỉnh/TP cha'] ?? r.parentOfficialCode ?? r.parent_official_code ?? r.ma_tinh ?? '';
          const parentOfficialCode = String(rawParent).trim() || undefined;
          const rawEff = r['Ngày hiệu lực'] ?? r.effectiveFrom ?? r.effective_from ?? '';
          const effectiveFrom = String(rawEff).trim() || undefined;

          return {
            officialCode,
            unitLevel,
            name,
            unitType: unitType || 'Đơn vị hành chính',
            parentOfficialCode,
            effectiveFrom,
          };
        })
        .filter((row) => row.officialCode || row.name);

      if (mapped.length === 0) {
        setError('File Excel không có dòng dữ liệu hợp lệ nào.');
        return;
      }

      const res = await profileService.importAdminUnits(mapped);
      if (!res.success || !res.data) {
        setError(res.message || 'Import thất bại.');
      } else {
        showToast?.(`Import ${res.data.imported} đơn vị hành chính (lỗi: ${res.data.errors.length}).`);
        if (res.data.errors.length > 0) {
          setError(
            `Có ${res.data.errors.length} dòng lỗi. Ví dụ dòng ${res.data.errors[0].row}: ${res.data.errors[0].message}`
          );
        }
        await loadAll();
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể đọc file Excel.');
    } finally {
      e.target.value = '';
    }
  };

  const handleMergeUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeState) return;
    setError(null);
    const res = await profileService.mergeAdminUnit(mergeState.source.id, {
      targetUnitId: mergeState.targetUnitId,
      resolutionNo: mergeState.resolutionNo,
      effectiveDate: mergeState.effectiveDate,
      notes: mergeState.notes,
    });
    if (!res.success) {
      setError(res.message || 'Không thể thực hiện sáp nhập.');
      return;
    }
    setMergeState(null);
    showToast?.('Đã ghi nhận sáp nhập và lưu lịch sử địa giới.');
    await loadAll();
  };

  const handleImportSimpleExcel = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'ETH' | 'REL'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const rows = json
        .map((r, i) => {
          const officialCode = String(
            r['Mã chính thức'] ?? r.officialCode ?? r.official_code ?? r.ma ?? ''
          ).trim();
          const name = String(
            r['Tên dân tộc'] ?? r['Tên tôn giáo'] ?? r['Tên'] ?? r.name ?? r.ten ?? ''
          ).trim();
          const rawOrder = r['Thứ tự'] ?? r.sortOrder ?? r.sort_order;
          const sortOrder = rawOrder !== '' && rawOrder !== undefined ? Number(rawOrder) : i + 1;
          return {
            officialCode,
            name,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : i + 1,
          };
        })
        .filter((row) => row.officialCode || row.name);

      if (rows.length === 0) {
        setError('File Excel không có dòng dữ liệu hợp lệ nào.');
        return;
      }

      const res =
        kind === 'ETH'
          ? await profileService.importEthnicities(rows)
          : await profileService.importReligions(rows);
      if (!res.success) {
        setError(res.message || 'Import thất bại.');
      } else {
        showToast?.(`Import danh mục ${kind === 'ETH' ? 'Dân tộc' : 'Tôn giáo'} thành công.`);
        await loadAll();
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể đọc file Excel.');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setError(null);
    let res: { success: boolean; message?: string };
    if (deleteTarget.kind === 'UNIT') res = await profileService.deleteAdminUnit(deleteTarget.id);
    else if (deleteTarget.kind === 'ETH') res = await profileService.deleteEthnicity(deleteTarget.id);
    else res = await profileService.deleteReligion(deleteTarget.id);

    setDeleteTarget(null);
    if (!res.success) {
      setError(res.message || 'Không thể xóa bản ghi (đang được tham chiếu).');
      return;
    }
    showToast?.(`Đã xóa "${deleteTarget.label}".`);
    await loadAll();
  };

  if (loading) return <LoadingState rows={6} />;

  const inputCls =
    'w-full h-9 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors disabled:opacity-50';

  return (
    <div className="space-y-4">
      <PageHeader title="Quản trị Danh mục chuẩn" icon={Layers} />

      {error && <ErrorBanner message={error} />}

      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 px-3 gap-1">
          {[
            { id: 'ADMIN_UNITS', label: 'Hành chính 2 cấp & Sáp nhập' },
            { id: 'ETHNICITY_RELIGION', label: 'Dân tộc & Tôn giáo' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as CatalogTab)}
              className={`px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                activeTab === t.id
                  ? 'border-blue-700 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {/* TAB 1: ADMINISTRATIVE UNITS (2-TIER) */}
          {activeTab === 'ADMIN_UNITS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mô hình 2 cấp: Tỉnh/Thành phố (<span className="font-mono">PROVINCE</span>) và Xã/Phường/Đặc khu (<span className="font-mono">COMMUNE</span>).
                </p>
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleDownloadAdminUnitsTemplate}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Tải file Excel mẫu</span>
                  </button>
                  <label className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer whitespace-nowrap shrink-0 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Excel ĐVHC 2 cấp</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportAdminUnitsExcel}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <form
                onSubmit={handleSaveUnit}
                className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50/50 dark:bg-slate-950/30 grid grid-cols-1 md:grid-cols-6 gap-2.5 items-end"
              >
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Cấp (2 cấp)
                  </label>
                  <select
                    value={unitForm.unitLevel}
                    onChange={(e) => setUnitForm({ ...unitForm, unitLevel: e.target.value as any, parentId: '' })}
                    className={inputCls}
                  >
                    <option value="PROVINCE">PROVINCE (Tỉnh/TP)</option>
                    <option value="COMMUNE">COMMUNE (Xã/Phường/Đặc khu)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Mã chính thức *
                  </label>
                  <input
                    required
                    type="text"
                    value={unitForm.officialCode}
                    onChange={(e) => setUnitForm({ ...unitForm, officialCode: e.target.value })}
                    placeholder="VD: 79"
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Tên đơn vị *
                  </label>
                  <input
                    required
                    type="text"
                    value={unitForm.name}
                    onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Loại hình
                  </label>
                  <input
                    required
                    type="text"
                    value={unitForm.unitType}
                    onChange={(e) => setUnitForm({ ...unitForm, unitType: e.target.value })}
                    placeholder="Tỉnh / Thành phố / Phường / Xã / Đặc khu"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Thuộc Tỉnh/TP (nếu COMMUNE)
                  </label>
                  <select
                    disabled={unitForm.unitLevel === 'PROVINCE'}
                    required={unitForm.unitLevel === 'COMMUNE'}
                    value={unitForm.parentId}
                    onChange={(e) => setUnitForm({ ...unitForm, parentId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">-- Chọn Tỉnh/TP --</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.officialCode} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1 h-9 px-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer whitespace-nowrap transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm ĐVHC</span>
                </button>
              </form>

              {units.length === 0 ? (
                <EmptyState message="Chưa có đơn vị hành chính nào. Hãy tải file Excel mẫu để import hoặc thêm thủ công." />
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-96">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-[11px] uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Mã chính thức</th>
                        <th className="py-2.5 px-3">Cấp</th>
                        <th className="py-2.5 px-3">Tên đơn vị</th>
                        <th className="py-2.5 px-3">Thuộc Tỉnh/TP</th>
                        <th className="py-2.5 px-3">Hiệu lực</th>
                        <th className="py-2.5 px-3">Trạng thái</th>
                        <th className="py-2.5 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {units.map((u) => {
                        const parent = u.parentId ? units.find((p) => p.id === u.parentId) : null;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-semibold tabular-nums">{u.officialCode}</td>
                            <td className="py-2.5 px-3 font-mono">{u.unitLevel}</td>
                            <td className="py-2.5 px-3 font-medium">
                              {u.name}{' '}
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                ({u.unitType})
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {parent ? `${parent.officialCode} - ${parent.name}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] tabular-nums">
                              {u.effectiveFrom} → {u.effectiveTo || 'Nay'}
                            </td>
                            <td className="py-2.5 px-3">
                              <StatusBadge
                                label={u.status}
                                variant={u.status === 'ACTIVE' ? 'success' : u.status === 'MERGED' ? 'warning' : 'danger'}
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-1.5">
                              {u.status === 'ACTIVE' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMergeState({
                                      source: u,
                                      targetUnitId: '',
                                      resolutionNo: '',
                                      effectiveDate: new Date().toISOString().split('T')[0],
                                      notes: '',
                                    })
                                  }
                                  className="px-2 py-1 rounded-lg text-[11px] font-medium border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/70 cursor-pointer transition-colors"
                                >
                                  Sáp nhập
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ kind: 'UNIT', id: u.id, label: u.name })}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Xóa</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {unitHistory.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                    Lịch sử thay đổi địa giới ({unitHistory.length})
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {unitHistory.map((h) => (
                      <div key={h.id} className="px-3.5 py-2.5 flex justify-between gap-3">
                        <span className="text-slate-700 dark:text-slate-200">
                          {h.changeType}: {h.sourceUnitId} → {h.targetUnitId || '-'} ({h.resolutionNo || 'Chưa ghi QĐ'})
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                          {h.effectiveDate}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ETHNICITY & RELIGION */}
          {activeTab === 'ETHNICITY_RELIGION' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ethnicities */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    Danh mục Dân tộc (<span className="font-mono tabular-nums">{ethnicities.length}</span>)
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadSimpleTemplate('ETH')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Tải file Excel mẫu</span>
                    </button>
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer whitespace-nowrap transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>Import Excel</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => handleImportSimpleExcel(e, 'ETH')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    const res = await profileService.saveEthnicity(ethForm);
                    if (!res.success) setError(res.message || 'Lỗi lưu dân tộc.');
                    else {
                      setEthForm({ officialCode: '', name: '' });
                      showToast?.('Đã thêm dân tộc.');
                      await loadAll();
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    required
                    placeholder="Mã (VD: 01)"
                    value={ethForm.officialCode}
                    onChange={(e) => setEthForm({ ...ethForm, officialCode: e.target.value })}
                    className="w-24 h-9 px-2.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <input
                    required
                    placeholder="Tên dân tộc..."
                    value={ethForm.name}
                    onChange={(e) => setEthForm({ ...ethForm, name: e.target.value })}
                    className="flex-1 h-9 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="h-9 px-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer whitespace-nowrap transition-colors"
                  >
                    Thêm
                  </button>
                </form>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {ethnicities.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 dark:text-slate-500">
                      Chưa có danh mục dân tộc. Hãy tải file Excel mẫu để import hoặc thêm thủ công.
                    </div>
                  ) : (
                    ethnicities.map((eth) => (
                      <div key={eth.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <span className="text-slate-800 dark:text-slate-200">
                          <strong className="font-mono tabular-nums">{eth.officialCode}</strong> · {eth.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ kind: 'ETH', id: eth.id, label: eth.name })}
                          className="text-rose-600 dark:text-rose-400 hover:underline text-[11px] font-medium cursor-pointer shrink-0"
                        >
                          Xóa
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Religions */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    Danh mục Tôn giáo (<span className="font-mono tabular-nums">{religions.length}</span>)
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadSimpleTemplate('REL')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>Tải file Excel mẫu</span>
                    </button>
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer whitespace-nowrap transition-colors">
                      <Upload className="w-3 h-3" />
                      <span>Import Excel</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => handleImportSimpleExcel(e, 'REL')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    const res = await profileService.saveReligion(relForm);
                    if (!res.success) setError(res.message || 'Lỗi lưu tôn giáo.');
                    else {
                      setRelForm({ officialCode: '', name: '' });
                      showToast?.('Đã thêm tôn giáo.');
                      await loadAll();
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    required
                    placeholder="Mã"
                    value={relForm.officialCode}
                    onChange={(e) => setRelForm({ ...relForm, officialCode: e.target.value })}
                    className="w-24 h-9 px-2.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <input
                    required
                    placeholder="Tên tôn giáo..."
                    value={relForm.name}
                    onChange={(e) => setRelForm({ ...relForm, name: e.target.value })}
                    className="flex-1 h-9 px-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="h-9 px-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium cursor-pointer whitespace-nowrap transition-colors"
                  >
                    Thêm
                  </button>
                </form>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {religions.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 dark:text-slate-500">
                      Chưa có danh mục tôn giáo. Hãy tải file Excel mẫu để import hoặc thêm thủ công.
                    </div>
                  ) : (
                    religions.map((rel) => (
                      <div key={rel.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <span className="text-slate-800 dark:text-slate-200">
                          <strong className="font-mono tabular-nums">{rel.officialCode}</strong> · {rel.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ kind: 'REL', id: rel.id, label: rel.name })}
                          className="text-rose-600 dark:text-rose-400 hover:underline text-[11px] font-medium cursor-pointer shrink-0"
                        >
                          Xóa
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Merge Unit Modal */}
      {mergeState && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleMergeUnit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Sáp nhập đơn vị hành chính: {mergeState.source.name}
            </h3>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Đơn vị kế nhiệm ({mergeState.source.unitLevel}) *
              </label>
              <select
                required
                value={mergeState.targetUnitId}
                onChange={(e) => setMergeState({ ...mergeState, targetUnitId: e.target.value })}
                className={inputCls}
              >
                <option value="">-- Chọn đơn vị kế nhiệm --</option>
                {units
                  .filter(
                    (u) =>
                      u.unitLevel === mergeState.source.unitLevel &&
                      u.id !== mergeState.source.id &&
                      u.status === 'ACTIVE'
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.officialCode} - {u.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Số Nghị quyết / QĐ
                </label>
                <input
                  type="text"
                  value={mergeState.resolutionNo}
                  onChange={(e) => setMergeState({ ...mergeState, resolutionNo: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Ngày hiệu lực *
                </label>
                <input
                  required
                  type="date"
                  value={mergeState.effectiveDate}
                  onChange={(e) => setMergeState({ ...mergeState, effectiveDate: e.target.value })}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMergeState(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                Xác nhận Sáp nhập
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title="Xác nhận xóa danh mục"
          message={`Bạn có chắc muốn xóa "${deleteTarget.label}"? Hệ thống sẽ tự động chặn nếu đã có hồ sơ sinh viên sử dụng.`}
          confirmLabel="Xóa"
          variant="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};
