import React, { useState, useEffect, useId } from 'react';
import { Upload, FileSpreadsheet, Check, X, CheckCircle2, RefreshCw, Download } from 'lucide-react';
import { apiService } from '../../services/apiService';
import * as XLSX from 'xlsx';
import { ErrorBanner } from '../common';

interface ScheduleFileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableClasses: string[];
  availableNamHocOptions?: string[];
  availableSemesterOptions?: { id: string; name: string }[];
  onUploadSuccess: () => void;
  showToast: (msg: string) => void;
}

interface ParsedScheduleItem {
  maMH: string;
  tenMH: string;
  soTinChi: number;
  giangVien: string;
  phongHoc: string;
  thu: number;
  tietBatDau: number;
  soTiet: number;
  tuanTu: number;
  tuanDen: number;
  selected?: boolean;
}

export const ScheduleFileUploadModal: React.FC<ScheduleFileUploadModalProps> = ({
  isOpen,
  onClose,
  availableClasses,
  availableNamHocOptions = [],
  availableSemesterOptions = [],
  onUploadSuccess,
  showToast,
}) => {
  const titleId = useId();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetLop, setTargetLop] = useState<string>(availableClasses[0] || '');
  const [targetHocKy, setTargetHocKy] = useState<string>(availableSemesterOptions[0]?.id || '');
  const [targetNamHoc, setTargetNamHoc] = useState<string>(availableNamHocOptions[0] || '');
  const [parsedData, setParsedData] = useState<ParsedScheduleItem[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTargetLop((prev) => prev || availableClasses[0] || '');
    setTargetHocKy((prev) => prev || availableSemesterOptions[0]?.id || '');
    setTargetNamHoc((prev) => prev || availableNamHocOptions[0] || '');
  }, [isOpen, availableClasses, availableSemesterOptions, availableNamHocOptions]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleDownloadSampleTemplate = () => {
    const templateHeaders = [
      {
        'Mã MH': '',
        'Tên môn học': '',
        'Số tín chỉ': '',
        'Giảng viên': '',
        'Phòng học': '',
        'Thứ': '',
        'Tiết bắt đầu': '',
        'Số tiết': '',
        'Từ tuần': '',
        'Đến tuần': '',
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateHeaders);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ThoiKhoaBieu');
    XLSX.writeFile(workbook, 'Mau_Nhap_ThoiKhoaBieu.xlsx');
    showToast('Đã tải xuống tệp mẫu Excel (Mau_Nhap_ThoiKhoaBieu.xlsx)');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParseError(null);
      parseFile(file);
    }
  };

  const parseFile = (file: File) => {
    setIsParsing(true);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const items: ParsedScheduleItem[] = [];
        rawJson.forEach((row, idx) => {
          if (idx === 0) return;
          if (!row || row.length < 2) return;
          const maMH = String(row[0] || row['Mã MH'] || row['Mã môn'] || '').trim();
          const tenMH = String(row[1] || row['Tên môn học'] || row['Tên MH'] || '').trim();
          if (!maMH && !tenMH) return;
          if (tenMH.toLowerCase() === 'tên môn học') return;

          const rawStc =
            row[2] !== undefined && row[2] !== ''
              ? row[2]
              : row['Số tín chỉ'] !== undefined
              ? row['Số tín chỉ']
              : row['STC'] !== undefined
              ? row['STC']
              : '';
          const soTinChi = rawStc !== '' && !isNaN(Number(rawStc)) ? Number(rawStc) : 0;
          const giangVien = String(row[3] || row['Giảng viên'] || '').trim();
          const phongHoc = String(row[4] || row['Phòng học'] || '').trim();
          const thu = Number(row[5] || row['Thứ']) || 2;
          const tietBatDau = Number(row[6] || row['Tiết bắt đầu']) || 1;
          const soTiet = Number(row[7] || row['Số tiết']) || 3;
          const tuanTu = Number(row[8] || row['Từ tuần']) || 1;
          const tuanDen = Number(row[9] || row['Đến tuần']) || 15;

          items.push({
            maMH,
            tenMH,
            soTinChi,
            giangVien,
            phongHoc,
            thu,
            tietBatDau,
            soTiet,
            tuanTu,
            tuanDen,
            selected: true,
          });
        });

        if (items.length === 0) {
          setParseError('Tệp không có dòng dữ liệu hợp lệ.');
          setParsedData([]);
        } else {
          setParsedData(items);
        }
      } catch {
        setParseError('Không thể đọc cấu trúc tệp. Vui lòng kiểm tra định dạng Excel (.xlsx, .xls).');
        setParsedData([]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    const selectedItems = parsedData.filter((i) => i.selected);
    if (selectedItems.length === 0) {
      setParseError('Vui lòng chọn ít nhất một môn học để tải lên.');
      return;
    }
    setIsSubmitting(true);
    setParseError(null);
    try {
      const res = await apiService.uploadScheduleFile({
        fileName: selectedFile?.name || 'ThoiKhoaBieu.xlsx',
        fileType: selectedFile?.name?.endsWith('.pdf') ? 'PDF' : 'EXCEL',
        lop: targetLop,
        hocKy: targetHocKy,
        namHoc: targetNamHoc,
        schedules: selectedItems,
      });
      showToast(res.message || 'Nhập thời khóa biểu thành công');
      setIsSubmitting(false);
      onUploadSuccess();
      onClose();
    } catch {
      setParseError('Không thể lưu thời khóa biểu lên máy chủ.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h3 id={titleId} className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Nhập thời khóa biểu từ tệp
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          {parseError && <ErrorBanner message={parseError} />}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-800">
            <div>
              <label htmlFor="upload-tkb-lop" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                Lớp áp dụng
              </label>
              <select
                id="upload-tkb-lop"
                value={targetLop}
                onChange={(e) => setTargetLop(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
              >
                {availableClasses.length === 0 ? (
                  <option value="">Chưa có dữ liệu lớp</option>
                ) : (
                  availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label htmlFor="upload-tkb-hocky" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                Học kỳ
              </label>
              <select
                id="upload-tkb-hocky"
                value={targetHocKy}
                onChange={(e) => setTargetHocKy(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium"
              >
                {availableSemesterOptions.length === 0 ? (
                  <option value="">Chưa có dữ liệu học kỳ</option>
                ) : (
                  availableSemesterOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label htmlFor="upload-tkb-namhoc" className="font-semibold block mb-1 text-slate-700 dark:text-slate-200">
                Năm học
              </label>
              <select
                id="upload-tkb-namhoc"
                value={targetNamHoc}
                onChange={(e) => setTargetNamHoc(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono font-medium"
              >
                {availableNamHocOptions.length === 0 ? (
                  <option value="">Chưa có dữ liệu năm học</option>
                ) : (
                  availableNamHocOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-600 transition-colors p-5 rounded-md text-center bg-slate-50/70 dark:bg-slate-800/30">
            <Upload className="w-7 h-7 text-blue-700 dark:text-blue-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              Chọn tệp Excel (.xlsx, .xls, .csv)
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded text-xs cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải mẫu Excel (.xlsx)</span>
              </button>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Chọn tệp</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {selectedFile && (
              <p className="mt-3 font-mono text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Đã chọn tệp: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {isParsing ? (
            <div className="p-6 text-center space-y-2">
              <RefreshCw className="w-5 h-5 text-blue-700 dark:text-blue-400 animate-spin mx-auto" />
              <p className="font-medium text-slate-700 dark:text-slate-300">Đang đọc tệp...</p>
            </div>
          ) : (
            parsedData.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Dữ liệu đọc được ({parsedData.length})
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setParsedData(parsedData.map((i) => ({ ...i, selected: !parsedData.every((x) => x.selected) })))
                    }
                    className="text-xs text-blue-700 dark:text-blue-400 font-medium hover:underline cursor-pointer"
                  >
                    {parsedData.every((x) => x.selected) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-md">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2 px-2.5 w-8 text-center">Chọn</th>
                        <th className="py-2 px-2.5">Mã MH</th>
                        <th className="py-2 px-2.5">Tên môn học</th>
                        <th className="py-2 px-2.5 text-center">STC</th>
                        <th className="py-2 px-2.5">Phòng</th>
                        <th className="py-2 px-2.5">Thứ</th>
                        <th className="py-2 px-2.5">Tiết</th>
                        <th className="py-2 px-2.5">Giảng viên</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {parsedData.map((item, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20">
                          <td className="py-2 px-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={Boolean(item.selected)}
                              onChange={(e) => {
                                const updated = [...parsedData];
                                updated[idx].selected = e.target.checked;
                                setParsedData(updated);
                              }}
                              className="rounded text-blue-700"
                            />
                          </td>
                          <td className="py-2 px-2.5 font-mono font-semibold text-blue-700 dark:text-blue-400">
                            {item.maMH || '—'}
                          </td>
                          <td className="py-2 px-2.5 font-medium text-slate-900 dark:text-slate-100">
                            {item.tenMH || '—'}
                          </td>
                          <td className="py-2 px-2.5 text-center font-mono tabular-nums">
                            {item.soTinChi > 0 ? `${item.soTinChi} TC` : '—'}
                          </td>
                          <td className="py-2 px-2.5 font-mono">{item.phongHoc || '—'}</td>
                          <td className="py-2 px-2.5">Thứ {item.thu}</td>
                          <td className="py-2 px-2.5 font-mono tabular-nums">
                            Tiết {item.tietBatDau}–{item.tietBatDau + item.soTiet - 1}
                          </td>
                          <td className="py-2 px-2.5">{item.giangVien || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium rounded cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isSubmitting || parsedData.length === 0}
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold rounded cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận nhập'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
