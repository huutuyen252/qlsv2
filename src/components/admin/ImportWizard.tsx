import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  X,
  FileCheck,
  Layers,
  Database,
  Search,
  Sparkles
} from 'lucide-react';
import { apiService } from '../../services/apiService';

export type ImportDataType = 'STUDENTS' | 'GRADES' | 'SCHEDULE' | 'TRAINING' | 'SUBJECTS';

interface ImportWizardProps {
  onSuccess: (dataType: ImportDataType, count: number) => void;
  showToast: (msg: string) => void;
}

const DATA_TYPE_CONFIGS: Record<
  ImportDataType,
  {
    title: string;
    description: string;
    requiredFields: { key: string; label: string; aliases: string[] }[];
  }
> = {
  STUDENTS: {
    title: 'Danh Sách Sinh Viên',
    description: 'Import hồ sơ sinh viên, mã SV, họ tên, ngày sinh, lớp, khoa...',
    requiredFields: [
      { key: 'maSV', label: 'Mã Sinh Viên', aliases: ['masv', 'mã sinh viên', 'mã sv', 'mssv', 'code'] },
      { key: 'hoTen', label: 'Họ Và Tên', aliases: ['hoten', 'họ và tên', 'họ tên', 'họtên', 'name', 'fullname'] },
      { key: 'lop', label: 'Lớp Hành Chính', aliases: ['lop', 'lớp', 'class', 'malop'] },
      { key: 'ngaySinh', label: 'Ngày Sinh', aliases: ['ngaysinh', 'ngày sinh', 'dob', 'birthdate'] },
      { key: 'gioiTinh', label: 'Giới Tính', aliases: ['gioitinh', 'giới tính', 'gender', 'sex'] },
      { key: 'khoa', label: 'Khoa / Ngành', aliases: ['khoa', 'nganh', 'department', 'faculty'] },
      { key: 'email', label: 'Email Liên Hệ', aliases: ['email', 'mail', 'thu dien tu'] },
    ],
  },
  GRADES: {
    title: 'Bảng Điểm & Kết Quả Học Tập',
    description: 'Import điểm quá trình, giữa kỳ, thi kết thúc học phần, GPA...',
    requiredFields: [
      { key: 'maSV', label: 'Mã Sinh Viên', aliases: ['masv', 'mã sv', 'mssv', 'mã sinh viên'] },
      { key: 'maMH', label: 'Mã Môn Học', aliases: ['mamh', 'mã môn', 'mã học phần', 'coursecode'] },
      { key: 'tenMH', label: 'Tên Môn Học', aliases: ['tenmh', 'tên môn', 'tên học phần', 'coursename'] },
      { key: 'hocKy', label: 'Học Kỳ', aliases: ['hocky', 'học kỳ', 'hk', 'semester'] },
      { key: 'namHoc', label: 'Năm Học', aliases: ['namhoc', 'năm học', 'academic_year', 'year'] },
      { key: 'diemGiuaKy', label: 'Điểm Giữa Kỳ', aliases: ['diemgiuaky', 'điểm gk', 'gk', 'midterm'] },
      { key: 'diemCuoiKy', label: 'Điểm Cuối Kỳ', aliases: ['diemcuoiky', 'điểm ck', 'ck', 'final'] },
    ],
  },
  SCHEDULE: {
    title: 'Thời Khóa Biểu (TKB)',
    description: 'Import lịch học, thứ, tiết bắt đầu, số tiết, phòng học, giảng viên...',
    requiredFields: [
      { key: 'maMH', label: 'Mã Môn Học', aliases: ['mamh', 'mã môn', 'mã học phần'] },
      { key: 'tenMH', label: 'Tên Môn Học', aliases: ['tenmh', 'tên môn', 'tên môn học'] },
      { key: 'thu', label: 'Thứ trong tuần (2-8)', aliases: ['thu', 'thứ', 'day', 'dayofweek'] },
      { key: 'tietBatDau', label: 'Tiết Bắt Đầu', aliases: ['tietbatdau', 'tiết bđ', 'tiết bắt đầu', 'start_period'] },
      { key: 'soTiet', label: 'Số Tiết', aliases: ['sotiet', 'số tiết', 'duration'] },
      { key: 'phongHoc', label: 'Phòng Học', aliases: ['phonghoc', 'phòng', 'phòng học', 'room'] },
      { key: 'lop', label: 'Lớp Học Phần', aliases: ['lop', 'lớp', 'mã lớp'] },
      { key: 'namHoc', label: 'Năm Học', aliases: ['namhoc', 'năm học'] },
      { key: 'hocKy', label: 'Học Kỳ', aliases: ['hocky', 'học kỳ'] },
    ],
  },
  TRAINING: {
    title: 'Điểm Rèn Luyện',
    description: 'Import điểm rèn luyện hàng tháng hoặc từng học kỳ...',
    requiredFields: [
      { key: 'maSV', label: 'Mã Sinh Viên', aliases: ['masv', 'mã sv', 'mssv'] },
      { key: 'thang', label: 'Tháng', aliases: ['thang', 'tháng', 'month'] },
      { key: 'nam', label: 'Năm', aliases: ['nam', 'năm', 'year'] },
      { key: 'diemRL', label: 'Điểm Rèn Luyện (0-100)', aliases: ['diemrl', 'điểm rl', 'điểm rèn luyện', 'score'] },
      { key: 'xepLoai', label: 'Xếp Loại', aliases: ['xeploai', 'xếp loại', 'grade'] },
    ],
  },
  SUBJECTS: {
    title: 'Danh Mục Môn Học',
    description: 'Import danh mục môn học, số tín chỉ, khoa phụ trách...',
    requiredFields: [
      { key: 'maMH', label: 'Mã Môn Học', aliases: ['mamh', 'mã môn', 'mã học phần'] },
      { key: 'tenMH', label: 'Tên Môn Học', aliases: ['tenmh', 'tên môn', 'môn học'] },
      { key: 'soTinChi', label: 'Số Tín Chỉ', aliases: ['sotinchi', 'số tín chỉ', 'stc', 'credits'] },
      { key: 'khoaPhuTrach', label: 'Khoa Phụ Trách', aliases: ['khoaphutrach', 'khoa', 'ngành'] },
    ],
  },
};

export const ImportWizard: React.FC<ImportWizardProps> = ({ onSuccess, showToast }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [dataType, setDataType] = useState<ImportDataType>('STUDENTS');
  const [fileName, setFileName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<{ row: number; field: string; message: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [committedCount, setCommittedCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = DATA_TYPE_CONFIGS[dataType];

  // Step 1 -> Handle File Upload & Parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });
        if (jsonData.length < 2) {
          showToast('File Excel không có dữ liệu hợp lệ!');
          return;
        }

        const headers = (jsonData[0] as string[]).map((h) => String(h || '').trim()).filter(Boolean);
        const rows: Record<string, any>[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const rowArr = jsonData[i] as any[];
          if (!rowArr || rowArr.length === 0) continue;
          const rowObj: Record<string, any> = {};
          let hasVal = false;
          headers.forEach((h, colIdx) => {
            const val = rowArr[colIdx];
            if (val !== undefined && val !== null && val !== '') {
              hasVal = true;
              rowObj[h] = val;
            }
          });
          if (hasVal) rows.push(rowObj);
        }

        setRawHeaders(headers);
        setRawRows(rows);

        // Auto Map Columns intelligently
        const autoMap: Record<string, string> = {};
        config.requiredFields.forEach((req) => {
          const matchedHeader = headers.find((h) => {
            const clean = h.toLowerCase().replace(/[\s_-]/g, '');
            return req.aliases.some((alias) => clean.includes(alias.replace(/[\s_-]/g, '')));
          });
          if (matchedHeader) {
            autoMap[req.key] = matchedHeader;
          }
        });
        setColumnMapping(autoMap);
        setCurrentStep(2); // Go to Preview
      } catch (err) {
        showToast('Lỗi đọc file Excel. Vui lòng kiểm tra định dạng file!');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Step 3 -> Step 4 Validate mapped rows
  const handleRunValidation = () => {
    const errors: { row: number; field: string; message: string }[] = [];

    rawRows.forEach((row, idx) => {
      config.requiredFields.forEach((rf) => {
        const mappedCol = columnMapping[rf.key];
        const val = mappedCol ? row[mappedCol] : undefined;

        if (val === undefined || val === null || String(val).trim() === '') {
          // Warning for essential identifiers
          if (['maSV', 'maMH', 'hoTen', 'thu', 'tietBatDau'].includes(rf.key)) {
            errors.push({
              row: idx + 1,
              field: rf.label,
              message: `Thiếu giá trị bắt buộc cho cột "${rf.label}"`,
            });
          }
        }
      });
    });

    setValidationErrors(errors);
    setCurrentStep(4);
  };

  // Step 5 -> Commit to Database via apiService
  const handleCommitData = async () => {
    setIsProcessing(true);
    try {
      // Transform rows based on mapping
      const transformedRows = rawRows.map((row) => {
        const item: Record<string, any> = {};
        Object.keys(columnMapping).forEach((targetKey) => {
          const sourceHeader = columnMapping[targetKey];
          if (sourceHeader && row[sourceHeader] !== undefined) {
            item[targetKey] = row[sourceHeader];
          }
        });
        return item;
      });

      let res: { success: boolean; message?: string } = { success: false };

      if (dataType === 'STUDENTS') {
        res = await apiService.importStudentsExcel(transformedRows);
      } else if (dataType === 'GRADES') {
        res = await apiService.importGradesExcel(transformedRows);
      } else if (dataType === 'SCHEDULE') {
        res = await apiService.importScheduleExcel(transformedRows);
      } else if (dataType === 'TRAINING') {
        res = await apiService.importTrainingExcel(transformedRows);
      } else if (dataType === 'SUBJECTS') {
        for (const sub of transformedRows) {
          if (sub.maMH && sub.tenMH) {
            await apiService.addSubject({
              maMH: String(sub.maMH).trim(),
              tenMH: String(sub.tenMH).trim(),
              soTinChi: Number(sub.soTinChi) || 3,
              khoaPhuTrach: sub.khoaPhuTrach || 'Công nghệ thông tin',
            });
          }
        }
        res = { success: true, message: `Đã import ${transformedRows.length} môn học thành công` };
      }

      if (res.success) {
        setCommittedCount(transformedRows.length);
        setCurrentStep(5);
        onSuccess(dataType, transformedRows.length);
        showToast(res.message || `Đã import thành công ${transformedRows.length} bản ghi vào CSDL!`);
      } else {
        showToast(res.message || 'Import dữ liệu thất bại');
      }
    } catch {
      showToast('Đã xảy ra lỗi trong quá trình lưu dữ liệu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setValidationErrors([]);
    setCommittedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const steps = [
    { num: 1, title: '1. Upload File' },
    { num: 2, title: '2. Xem trước' },
    { num: 3, title: '3. Map cột' },
    { num: 4, title: '4. Kiểm tra' },
    { num: 5, title: '5. Hoàn tất' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-indigo-600 text-white shadow-md ring-4 ring-indigo-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                  </div>
                  <span
                    className={`text-[11px] font-bold mt-1.5 hidden sm:block ${
                      isCurrent
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      currentStep > idx + 1 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: SELECT DATA TYPE & UPLOAD */}
      {currentStep === 1 && (
        <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Chọn Loại Dữ Liệu Cần Import
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(DATA_TYPE_CONFIGS) as ImportDataType[]).map((key) => {
                const conf = DATA_TYPE_CONFIGS[key];
                const isSelected = dataType === key;
                return (
                  <div
                    key={key}
                    onClick={() => setDataType(key)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{conf.title}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      {conf.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-3xl p-8 text-center transition-all bg-slate-50/50 dark:bg-slate-800/30">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
              id="wizard-excel-input"
            />
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Kéo thả hoặc Chọn File Excel (.xlsx, .xls)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Hệ thống sẽ tự động quét dòng tiêu đề và gợi ý liên kết cột dữ liệu
            </p>
            <label
              htmlFor="wizard-excel-input"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Duyệt File Trên Máy Tính</span>
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW RAW DATA */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Xem trước dữ liệu từ file: <strong className="text-indigo-600">{fileName}</strong></span>
              </h3>
              <p className="text-xs text-slate-500">
                Tìm thấy <strong>{rawRows.length}</strong> dòng dữ liệu và <strong>{rawHeaders.length}</strong> cột tiêu đề.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Chọn file khác
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Tiếp tục: Map cột</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <th className="p-3 w-12 text-center">STT</th>
                  {rawHeaders.map((h, i) => (
                    <th key={i} className="p-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rawRows.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    {rawHeaders.map((h, colIdx) => (
                      <td key={colIdx} className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {String(row[h] !== undefined ? row[h] : '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rawRows.length > 10 && (
            <p className="text-[11px] text-slate-400 italic text-right">
              Đang hiển thị 10/{rawRows.length} dòng đầu tiên.
            </p>
          )}
        </div>
      )}

      {/* STEP 3: COLUMN MAPPING */}
      {currentStep === 3 && (
        <div className="space-y-5 max-w-3xl mx-auto animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Khớp Cột Dữ Liệu (Column Mapping)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chọn cột trong file Excel tương ứng với từng trường thông tin trong cơ sở dữ liệu.
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
            {config.requiredFields.map((field) => {
              const selectedCol = columnMapping[field.key] || '';
              return (
                <div key={field.key} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/20">
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{field.label}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {field.key}
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:w-64">
                    <select
                      value={selectedCol}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                    >
                      <option value="">-- Không ghép cột này --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
            <button
              type="button"
              onClick={handleRunValidation}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Kiểm tra tính hợp lệ</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: VALIDATION REPORT */}
      {currentStep === 4 && (
        <div className="space-y-5 max-w-2xl mx-auto animate-in fade-in">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Kết Quả Kiểm Tra Dữ Liệu (Validation)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Tổng số dòng sẵn sàng ghi vào CSDL: <strong>{rawRows.length}</strong> bản ghi.
            </p>
          </div>

          {validationErrors.length > 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Phát hiện {validationErrors.length} cảnh báo thiếu dữ liệu:</span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-amber-200/50 dark:divide-amber-800/40 text-[11px] text-amber-700 dark:text-amber-300 pr-1">
                {validationErrors.slice(0, 15).map((err, idx) => (
                  <div key={idx} className="py-1 flex items-center justify-between">
                    <span>Dòng {err.row}: {err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Dữ liệu hoàn toàn hợp lệ!
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Tất cả các trường khóa chính đã được ánh xạ chính xác và sẵn sàng import vào cơ sở dữ liệu PostgreSQL.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Chỉnh sửa Mapping</span>
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleCommitData}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang ghi vào CSDL...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Lưu {rawRows.length} Bản Ghi Vào CSDL</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SUCCESS SUMMARY */}
      {currentStep === 5 && (
        <div className="text-center max-w-md mx-auto py-8 space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Import Dữ Liệu Thành Công!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Đã lưu thành công <strong>{committedCount}</strong> bản ghi thuộc phân hệ <strong>{config.title}</strong> vào hệ thống.
          </p>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import File Khác</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
