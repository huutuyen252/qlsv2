import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { RenLuyen, SinhVien, UserRole, User } from '../../types';
import { apiService } from '../../services/apiService';
import {
  Sparkles,
  Search,
  MessageSquare,
  Award,
  Calendar,
  X,
  Plus,
  Send,
  Users,
  Folder,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
  Layers,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  User as UserIcon,
  Filter,
  Trash2,
  Edit3,
  AlertTriangle,
  Check,
  RefreshCw,
} from 'lucide-react';

interface TrainingPointModuleProps {
  trainingPoints: RenLuyen[];
  students: SinhVien[];
  userRole: UserRole;
  currentStudentCode?: string;
  currentUser?: User | null;
  onSaveComment: (data: {
    maSV: string;
    thang: number;
    nam: number;
    namHoc?: string;
    diemRL: number;
    nhanXet: string;
    nguoiDanhGia: string;
    diemMuc1?: number;
    diemMuc2?: number;
    diemMuc3?: number;
    hocKy?: string;
  }) => void;
  onImportExcel?: (data: Partial<RenLuyen>[]) => void;
  onUpdateTrainingPoint?: (id: string, data: Partial<RenLuyen>) => Promise<void> | void;
  onDeleteTrainingPoint?: (id: string) => Promise<void> | void;
  onDeleteClassTrainingPoints?: (lop: string, params?: { thang?: number; nam?: number; hocKy?: string }) => Promise<void> | void;
  onRefreshData?: () => void;
}

/**
 * Xếp loại điểm rèn luyện theo Điều 16 Quy chế 1519/QC-TĐN:
 * - 90 - 100: Loại Xuất sắc
 * - 80 - dưới 90: Loại Tốt
 * - 65 - dưới 80: Loại Khá
 * - 50 - dưới 65: Loại Trung bình
 * - 35 - dưới 50: Loại Yếu
 * - Dưới 35: Loại Kém
 */
export const calculateTrainingRank = (score: number): string => {
  const s = Math.round(Number(score) || 0);
  if (s >= 90) return 'Xuất sắc';
  if (s >= 80) return 'Tốt';
  if (s >= 65) return 'Khá';
  if (s >= 50) return 'Trung bình';
  if (s >= 35) return 'Yếu';
  return 'Kém';
};

export const getRankBadgeClass = (rank: string) => {
  const norm = rank === 'Tt' ? 'Tốt' : rank;
  switch (norm) {
    case 'Xuất sắc':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300';
    case 'Tốt':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300';
    case 'Khá':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300';
    case 'TBK':
    case 'Trung bình':
    case 'TB':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300';
    case 'Yếu':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300';
    default: // Kém
      return 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300';
  }
};

export const TrainingPointModule: React.FC<TrainingPointModuleProps> = ({
  trainingPoints,
  students,
  userRole,
  currentStudentCode,
  currentUser,
  onSaveComment,
  onImportExcel,
  onUpdateTrainingPoint,
  onDeleteTrainingPoint,
  onDeleteClassTrainingPoints,
  onRefreshData,
}) => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [viewMode, setViewMode] = useState<'HIERARCHICAL' | 'FLAT'>('HIERARCHICAL');

  // Local state to keep UI immediately responsive
  const [localPoints, setLocalPoints] = useState<RenLuyen[]>(trainingPoints);
  useEffect(() => {
    setLocalPoints(trainingPoints);
  }, [trainingPoints]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Individual Edit & Delete Modals
  const [editingRecord, setEditingRecord] = useState<RenLuyen | null>(null);
  const [deleteIndividualRecord, setDeleteIndividualRecord] = useState<RenLuyen | null>(null);

  // Class-wide Delete Modal
  const [isDeleteClassModalOpen, setIsDeleteClassModalOpen] = useState(false);

  const isStudentRole = userRole === 'STUDENT';
  const studentCodeLower = (currentStudentCode || currentUser?.studentCode || currentUser?.username || '').toLowerCase();

  // Active student match
  const selfStudent = students.find(
    (s) =>
      s.maSV.toLowerCase() === studentCodeLower ||
      (s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase())
  );
  const activeStudentCode = selfStudent ? selfStudent.maSV.toLowerCase() : studentCodeLower;

  // Available classes
  const availableClasses = Array.from(
    new Set(students.map((s) => s.lop).filter(Boolean))
  );

  // Filter students for selected class
  const classStudents = selectedClass
    ? students.filter((s) => s.lop === selectedClass)
    : students;
  const classStudentIds = new Set(classStudents.map((s) => s.maSV));

  // Dynamic available filters derived strictly from real entered trainingPoints data
  const availableMonths = React.useMemo(() => {
    const months = new Set<number>();
    (localPoints || []).forEach((r) => {
      if (r && r.thang) months.add(Number(r.thang));
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [localPoints]);

  const availableSemesters = React.useMemo(() => {
    const semesters = new Set<string>();
    (localPoints || []).forEach((r) => {
      if (r && r.hocKy) semesters.add(r.hocKy.trim());
    });
    return Array.from(semesters).sort();
  }, [localPoints]);

  const availableYears = React.useMemo(() => {
    const years = new Set<number>();
    (localPoints || []).forEach((r) => {
      if (r && r.nam) years.add(Number(r.nam));
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [localPoints]);

  // Modal State for 3 Evaluation Categories Entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    id: '',
    maSV: students[0]?.maSV || '25DDS0904101',
    thang: 8,
    nam: 2026,
    namHoc: '2026-2027',
    hocKy: 'HK1',
    diemMuc1: 35, // Tối đa 40 điểm: Ý thức học tập & kỷ luật
    diemMuc2: 30, // Tối đa 35 điểm: Chấp hành nội quy & phong trào
    diemMuc3: 20, // Tối đa 25 điểm: Phẩm chất đạo đức & lối sống
    nhanXet: 'Sinh viên chấp hành tốt nội quy lớp học, tích cực tham gia hoạt động phong trào Đoàn/Hội.',
    nguoiDanhGia: 'TS. Nguyễn Văn Hùng',
  });

  // Modal State for Master Class Excel Import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedImportData, setParsedImportData] = useState<Array<Partial<RenLuyen> & { totalScore: number; autoRank: string }>>([]);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Target academic period for Excel Import (Defaults to 2026-2027 HK1)
  const [importTargetNamHoc, setImportTargetNamHoc] = useState('2026-2027');
  const [importTargetHocKy, setImportTargetHocKy] = useState('HK1');
  const [importTargetThang, setImportTargetThang] = useState('AUTO');

  const totalFormScore = Math.min(100, Math.max(0, (Number(form.diemMuc1) || 0) + (Number(form.diemMuc2) || 0) + (Number(form.diemMuc3) || 0)));
  const calculatedRank = calculateTrainingRank(totalFormScore);

  const filteredPoints = localPoints.filter((r) => {
    // If student role, ONLY show training points for this student
    if (isStudentRole) {
      const isMatchStudent =
        r.maSV.toLowerCase() === activeStudentCode ||
        (activeStudentCode && r.maSV.toLowerCase().includes(activeStudentCode));
      if (!isMatchStudent) return false;
    } else {
      const matchesClass = !selectedClass || classStudentIds.has(r.maSV) || r.lop === selectedClass;
      if (!matchesClass) return false;
    }

    const matchesSearch =
      !searchTerm ||
      r.maSV.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.hoTenSV && r.hoTenSV.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.nhanXet && r.nhanXet.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMonth = !selectedMonth || r.thang === selectedMonth;
    const matchesSemester = !selectedSemester || (r.hocKy ? r.hocKy === selectedSemester : true);
    const matchesYear = !selectedYear || r.nam === selectedYear;

    return matchesSearch && matchesMonth && matchesSemester && matchesYear;
  });

  const handleOpenNew = () => {
    setEditingRecord(null);
    setForm({
      id: '',
      maSV: students[0]?.maSV || '25DDS0904101',
      thang: 8,
      nam: 2026,
      namHoc: '2026-2027',
      hocKy: 'HK1',
      diemMuc1: 35,
      diemMuc2: 30,
      diemMuc3: 20,
      nhanXet: 'Chấp hành tốt kỷ luật lớp học, năng nổ trong sinh hoạt Đoàn.',
      nguoiDanhGia: currentUser?.fullName || 'Cố vấn học tập',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: RenLuyen) => {
    setEditingRecord(r);
    const m1 = r.diemMuc1 !== undefined ? r.diemMuc1 : Math.min(40, Math.round(r.diemRL * 0.4));
    const m2 = r.diemMuc2 !== undefined ? r.diemMuc2 : Math.min(35, Math.round(r.diemRL * 0.35));
    const m3 = r.diemMuc3 !== undefined ? r.diemMuc3 : Math.min(25, r.diemRL - m1 - m2);
    setForm({
      id: r.id,
      maSV: r.maSV,
      thang: r.thang || 8,
      nam: r.nam || 2026,
      namHoc: r.namHoc || (r.nam >= 2026 ? '2026-2027' : `${r.nam}-${r.nam + 1}`),
      hocKy: r.hocKy || 'HK1',
      diemMuc1: m1,
      diemMuc2: m2,
      diemMuc3: m3,
      nhanXet: r.nhanXet || '',
      nguoiDanhGia: r.nguoiDanhGia || currentUser?.fullName || 'Giảng viên Chủ nhiệm',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const totalScore = Math.min(100, Math.max(0, (Number(form.diemMuc1) || 0) + (Number(form.diemMuc2) || 0) + (Number(form.diemMuc3) || 0)));
      const rank = calculateTrainingRank(totalScore);

      if (editingRecord && editingRecord.id) {
        // Edit existing record
        const updatedPayload: Partial<RenLuyen> = {
          diemMuc1: Number(form.diemMuc1) || 0,
          diemMuc2: Number(form.diemMuc2) || 0,
          diemMuc3: Number(form.diemMuc3) || 0,
          diemRL: totalScore,
          xepLoai: rank,
          thang: Number(form.thang),
          nam: Number(form.nam),
          namHoc: form.namHoc,
          hocKy: form.hocKy,
          nhanXet: form.nhanXet,
          nguoiDanhGia: form.nguoiDanhGia,
        };

        if (onUpdateTrainingPoint) {
          await onUpdateTrainingPoint(editingRecord.id, updatedPayload);
        } else {
          await apiService.updateTrainingPoint(editingRecord.id, updatedPayload);
        }

        setLocalPoints((prev) =>
          prev.map((p) => (p.id === editingRecord.id ? { ...p, ...updatedPayload } : p))
        );
        setToastMessage('Đã cập nhật thành công điểm rèn luyện!');
      } else {
        // Create new or save comment
        await onSaveComment({
          maSV: form.maSV,
          thang: form.thang,
          nam: form.nam,
          namHoc: form.namHoc,
          diemRL: totalScore,
          diemMuc1: Number(form.diemMuc1) || 0,
          diemMuc2: Number(form.diemMuc2) || 0,
          diemMuc3: Number(form.diemMuc3) || 0,
          hocKy: form.hocKy,
          nhanXet: form.nhanXet,
          nguoiDanhGia: form.nguoiDanhGia,
        });
        setToastMessage('Đã lưu đánh giá điểm rèn luyện!');
      }

      if (onRefreshData) onRefreshData();
      setIsModalOpen(false);
      setEditingRecord(null);
    } catch (err: any) {
      setToastMessage(err?.message || 'Có lỗi xảy ra khi lưu');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleConfirmDeleteIndividual = async () => {
    if (!deleteIndividualRecord) return;
    setIsSubmitting(true);
    try {
      if (onDeleteTrainingPoint) {
        await onDeleteTrainingPoint(deleteIndividualRecord.id);
      } else {
        await apiService.deleteTrainingPoint(deleteIndividualRecord.id);
      }
      setLocalPoints((prev) => prev.filter((p) => p.id !== deleteIndividualRecord.id));
      setToastMessage(`Đã xóa điểm rèn luyện của sinh viên ${deleteIndividualRecord.maSV}`);
      if (onRefreshData) onRefreshData();
      setDeleteIndividualRecord(null);
    } catch (err: any) {
      setToastMessage('Lỗi khi xóa điểm rèn luyện');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!selectedClass) return;
    setIsSubmitting(true);
    try {
      const params: { thang?: number; nam?: number; hocKy?: string } = {};
      if (selectedMonth) params.thang = Number(selectedMonth);
      if (selectedYear) params.nam = Number(selectedYear);
      if (selectedSemester && selectedSemester !== 'ALL') params.hocKy = selectedSemester;

      if (onDeleteClassTrainingPoints) {
        await onDeleteClassTrainingPoints(selectedClass, params);
      } else {
        await apiService.deleteClassTrainingPoints(selectedClass, params);
      }

      setLocalPoints((prev) =>
        prev.filter((p) => {
          const matchLop = p.lop === selectedClass || classStudentIds.has(p.maSV);
          if (!matchLop) return true;
          if (params.thang && p.thang !== params.thang) return true;
          if (params.nam && p.nam !== params.nam) return true;
          if (params.hocKy && p.hocKy !== params.hocKy) return true;
          return false; // delete this
        })
      );

      setToastMessage(`Đã xóa thành công điểm rèn luyện của lớp ${selectedClass}`);
      if (onRefreshData) onRefreshData();
      setIsDeleteClassModalOpen(false);
    } catch (err: any) {
      setToastMessage('Lỗi khi xóa điểm rèn luyện của lớp');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Download Sample Template for Class Master Excel Import
  const handleDownloadTemplate = () => {
    const targetStudents = selectedClass ? students.filter((s) => s.lop === selectedClass) : students;

    const sampleRows = targetStudents.map((sv, idx) => ({
      STT: idx + 1,
      'Mã Sinh Viên': sv.maSV,
      'Họ và Tên': sv.hoTen,
      'Lớp Học': sv.lop || 'Chưa phân lớp',
      'Tháng Đánh Giá': 8,
      'Mục I (Học tập & Kỷ luật - Max 40)': 35,
      'Mục II (Phong trào & Nội quy - Max 35)': 30,
      'Mục III (Đạo đức & Lối sống - Max 25)': 20,
      'Tổng Điểm Rèn Luyện (Excel =SUM)': 85,
      'Xếp Loại Rèn Luyện (Excel =IF)': 'Tốt',
      'Học Kỳ': 'HK1',
      'Năm Học': '2026-2027',
      'Nhận Xét Đánh Giá': 'Chấp hành đầy đủ nội quy, tích cực sinh hoạt lớp.',
    }));

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);

    // Embed Excel formulas for Total and Rank according to Quy chế 1519/QC-TĐN
    targetStudents.forEach((_, idx) => {
      const r = idx + 2; // header is row 1
      worksheet[`I${r}`] = {
        t: 'n',
        v: 85,
        f: `SUM(F${r}:H${r})`,
      };
      const rankFormula = `IF(I${r}>=90,"Xuất sắc",IF(I${r}>=80,"Tốt",IF(I${r}>=65,"Khá",IF(I${r}>=50,"Trung bình",IF(I${r}>=35,"Yếu","Kém")))))`;
      worksheet[`J${r}`] = {
        t: 's',
        v: 'Tốt',
        f: rankFormula,
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Import_DiemRenLuyen');
    const fileName = `Mau_Import_DiemRenLuyen_3TieuChi_${selectedClass || 'TatCaLop'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Parse Excel File on Upload with Dynamic Target Academic Period Handling
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          setImportStatus('File Excel rỗng hoặc không có dữ liệu hợp lệ.');
          return;
        }

        const parsed: Array<Partial<RenLuyen> & { totalScore: number; autoRank: string }> = [];

        data.forEach((row) => {
          const maSV = row['Mã Sinh Viên'] || row['Mã SV'] || row['maSV'] || row['MaSV'] || row['MÃ SV'];
          if (!maSV) return;

          const hoTenSV = row['Họ và Tên'] || row['Họ Tên'] || row['hoTenSV'] || row['HỌ TÊN'];
          const lop = row['Lớp Học'] || row['Lớp'] || row['lop'] || row['LỚP'] || selectedClass || 'CNKT Cơ khí 25DDS 09041';

          const m1 = Number(row['Mục I (Học tập & Kỷ luật - Max 40)'] ?? row['Mục I'] ?? row['diemMuc1'] ?? row['Mục 1'] ?? 35);
          const m2 = Number(row['Mục II (Phong trào & Nội quy - Max 35)'] ?? row['Mục II'] ?? row['diemMuc2'] ?? row['Mục 2'] ?? 30);
          const m3 = Number(row['Mục III (Đạo đức & Lối sống - Max 25)'] ?? row['Mục III'] ?? row['diemMuc3'] ?? row['Mục 3'] ?? 20);

          const totalScore = Math.min(100, Math.max(0, m1 + m2 + m3));
          const autoRank = calculateTrainingRank(totalScore);

          // Handle Month resolution
          let thang = 8;
          if (importTargetThang !== 'AUTO') {
            thang = Number(importTargetThang);
          } else {
            const rawThang =
              row['Tháng Đánh Giá'] ??
              row['Tháng'] ??
              row['thang'] ??
              row['Tháng/Năm'] ??
              row['Tháng 8/2025 (HK1)'] ??
              row['Tháng 8'];
            if (rawThang !== undefined && rawThang !== null) {
              const mMatch = String(rawThang).match(/(\d+)/);
              if (mMatch) thang = parseInt(mMatch[1], 10);
            }
          }

          // Target academic year resolution
          let namHoc = importTargetNamHoc || '2026-2027';
          const rawNamHoc = row['Năm Học'] ?? row['namHoc'] ?? row['Năm học'];
          if (rawNamHoc) {
            const strNam = String(rawNamHoc).trim();
            if (strNam.includes('-')) namHoc = strNam;
            else if (/^\d{4}$/.test(strNam)) namHoc = `${strNam}-${parseInt(strNam, 10) + 1}`;
          }

          // Academic semester
          let hocKy = importTargetHocKy || 'HK1';
          const rawHocKy = row['Học Kỳ'] ?? row['hocKy'] ?? row['Học kỳ'];
          if (rawHocKy) {
            const strHK = String(rawHocKy).trim();
            if (strHK.toLowerCase().includes('2') || strHK.toLowerCase().includes('ii')) hocKy = 'HK2';
            else hocKy = 'HK1';
          }

          // Compute calendar year based on namHoc (e.g. 2026-2027) and month
          let startYear = 2026;
          if (namHoc && namHoc.includes('-')) {
            startYear = parseInt(namHoc.split('-')[0], 10) || 2026;
          }
          // In academic calendar, months >= 8 belong to startYear (e.g. Month 8/2026 for 2026-2027 HK1)
          const nam = thang >= 8 ? startYear : startYear + 1;

          const nhanXet = String(row['Nhận Xét Đánh Giá'] ?? row['Nhận Xét'] ?? row['nhanXet'] ?? 'Chấp hành tốt kỷ luật trường lớp.');

          parsed.push({
            maSV: String(maSV).trim(),
            hoTenSV: hoTenSV ? String(hoTenSV).trim() : undefined,
            lop: String(lop).trim(),
            diemMuc1: m1,
            diemMuc2: m2,
            diemMuc3: m3,
            diemRL: totalScore,
            totalScore,
            autoRank,
            xepLoai: autoRank,
            thang,
            nam,
            namHoc,
            hocKy,
            nhanXet,
            nguoiDanhGia: `Cố vấn HT (Import Excel - ${namHoc})`,
          });
        });

        if (parsed.length === 0) {
          setImportStatus('Không tìm thấy cột Mã Sinh Viên hợp lệ trong file Excel.');
        } else {
          setParsedImportData(parsed);
          setImportStatus(`Đã đọc thành công ${parsed.length} sinh viên cho Tháng ${parsed[0]?.thang}/${parsed[0]?.nam} (Năm học ${parsed[0]?.namHoc}), tự động tính tổng & xếp loại theo Quy chế 1519.`);
        }
      } catch (err) {
        setImportStatus('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file .xlsx.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    if (parsedImportData.length === 0) return;
    if (onImportExcel) {
      onImportExcel(parsedImportData);
      setIsImportModalOpen(false);
      setParsedImportData([]);
      setImportFileName('');
      setImportStatus(null);
    }
  };

  // Export Monthly Excel for All Class Students with Formulas
  const handleExportMonthlyExcel = () => {
    const exportStudents = selectedClass ? students.filter((s) => s.lop === selectedClass) : students;
    if (exportStudents.length === 0) {
      alert('Không có dữ liệu sinh viên để xuất file Excel!');
      return;
    }

    const exportData = exportStudents.map((sv, index) => {
      const records = localPoints.filter(
        (r) => r.maSV.toLowerCase() === sv.maSV.toLowerCase() && (!selectedMonth || r.thang === selectedMonth)
      );

      const latestRecord = records[records.length - 1];
      const m1 = latestRecord?.diemMuc1 ?? Math.min(40, Math.round((latestRecord?.diemRL || 80) * 0.4));
      const m2 = latestRecord?.diemMuc2 ?? Math.min(35, Math.round((latestRecord?.diemRL || 80) * 0.35));
      const m3 = latestRecord?.diemMuc3 ?? Math.min(25, (latestRecord?.diemRL || 80) - m1 - m2);
      const totalScore = latestRecord?.diemRL || (m1 + m2 + m3);
      const rank = latestRecord?.xepLoai || calculateTrainingRank(totalScore);

      return {
        STT: index + 1,
        'Mã Sinh Viên': sv.maSV,
        'Họ và Tên': sv.hoTen,
        Lớp: sv.lop || 'Chưa phân lớp',
        'Tháng Đánh Giá': latestRecord ? `Tháng ${latestRecord.thang}/${latestRecord.nam}` : (selectedMonth ? `Tháng ${selectedMonth}` : 'Tháng 8/2026'),
        'Mục I: Học tập & Kỷ luật (Max 40)': m1,
        'Mục II: Phong trào & Nội quy (Max 35)': m2,
        'Mục III: Đạo đức & Lối sống (Max 25)': m3,
        'Tổng Điểm Rèn Luyện (Công thức SUM)': totalScore,
        'Xếp Loại Rèn Luyện (Công thức IF)': rank,
        'Nhận Xét Đánh Giá': latestRecord?.nhanXet || 'Chấp hành đầy đủ nội quy trường lớp.',
        'Người Đánh Giá': latestRecord?.nguoiDanhGia || 'Cố vấn học tập',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Embed Excel formulas in exported sheet according to Quy chế 1519
    exportStudents.forEach((_, idx) => {
      const r = idx + 2; // Row 2 onwards
      worksheet[`I${r}`] = {
        t: 'n',
        v: exportData[idx]['Tổng Điểm Rèn Luyện (Công thức SUM)'],
        f: `SUM(F${r}:H${r})`,
      };
      const rankFormula = `IF(I${r}>=90,"Xuất sắc",IF(I${r}>=80,"Tốt",IF(I${r}>=65,"Khá",IF(I${r}>=50,"Trung bình",IF(I${r}>=35,"Yếu","Kém")))))`;
      worksheet[`J${r}`] = {
        t: 's',
        v: exportData[idx]['Xếp Loại Rèn Luyện (Công thức IF)'],
        f: rankFormula,
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DiemRenLuyen_3TieuChi');
    const fileName = `DiemRenLuyen_3TieuChi_${selectedMonth ? `Thang_${selectedMonth}` : 'Thang_8'}_${selectedClass || 'TatCaLop'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Export Semester & Academic Year Total Excel storing 9 months & computing Average + Auto Rank
  const handleExportSemesterYearExcel = () => {
    const exportStudents = selectedClass ? students.filter((s) => s.lop === selectedClass) : students;
    if (exportStudents.length === 0) {
      alert('Không có dữ liệu sinh viên để xuất báo cáo!');
      return;
    }

    const exportData = exportStudents.map((sv, index) => {
      const svPoints = localPoints.filter(
        (r) => r.maSV.toLowerCase() === sv.maSV.toLowerCase()
      );

      const getScoreForMonth = (m: number) => {
        const found = svPoints.find((r) => r.thang === m);
        if (found) return found.diemRL;
        return svPoints[0]?.diemRL || 82;
      };

      const m9 = getScoreForMonth(9);
      const m10 = getScoreForMonth(10);
      const m11 = getScoreForMonth(11);
      const m12 = getScoreForMonth(12);
      const m1 = getScoreForMonth(1);
      const m2 = getScoreForMonth(2);
      const m3 = getScoreForMonth(3);
      const m4 = getScoreForMonth(4);
      const m5 = getScoreForMonth(5);

      const avgScore = Math.round((m9 + m10 + m11 + m12 + m1 + m2 + m3 + m4 + m5) / 9);
      const finalRank = calculateTrainingRank(avgScore);

      return {
        STT: index + 1,
        'Mã Sinh Viên': sv.maSV,
        'Họ và Tên': sv.hoTen,
        'Lớp Học': sv.lop || 'Chưa phân lớp',
        Khoa: sv.khoa || 'Khoa Chuyên Ngành',
        'Tháng 9': m9,
        'Tháng 10': m10,
        'Tháng 11': m11,
        'Tháng 12': m12,
        'Tháng 1': m1,
        'Tháng 2': m2,
        'Tháng 3': m3,
        'Tháng 4': m4,
        'Tháng 5': m5,
        'Điểm TB Rèn Luyện (Excel =AVERAGE)': avgScore,
        'Xếp Loại Tổng Kết (Excel =IF)': finalRank,
        'Ghi Chú Admin / Đào Tạo':
          finalRank === 'Xuất sắc'
            ? 'Khen thưởng cấp Khoa / Trường'
            : finalRank === 'Yếu' || finalRank === 'Kém'
            ? 'Cần cố vấn học tập nhắc nhở'
            : 'Đạt yêu cầu rèn luyện',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Embed Excel formulas for 9-month Average (Col O) and Final Auto Rank (Col P) according to Quy chế 1519
    exportStudents.forEach((_, idx) => {
      const r = idx + 2;
      worksheet[`O${r}`] = {
        t: 'n',
        v: exportData[idx]['Điểm TB Rèn Luyện (Excel =AVERAGE)'],
        f: `ROUND(AVERAGE(F${r}:N${r}),0)`,
      };

      const rankFormula = `IF(O${r}>=90,"Xuất sắc",IF(O${r}>=80,"Tốt",IF(O${r}>=65,"Khá",IF(O${r}>=50,"Trung bình",IF(O${r}>=35,"Yếu","Kém")))))`;
      worksheet[`P${r}`] = {
        t: 's',
        v: exportData[idx]['Xếp Loại Tổng Kết (Excel =IF)'],
        f: rankFormula,
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TongKet_Diem_9Thang');
    const displayYear = selectedYear || 2026;
    const nextYear = Number(displayYear) + 1;
    const fileName = `BaoCao_TongKet_DiemRenLuyen_9Thang_NamHoc_${displayYear}-${nextYear}_${selectedClass || 'TatCaLop'}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-3 rounded-2xl shadow-2xl border border-zinc-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Title & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Quản lý Đánh giá Rèn luyện Sinh viên</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode switch button */}
          <button
            onClick={() => {
              if (viewMode === 'HIERARCHICAL') {
                setViewMode('FLAT');
              } else {
                setViewMode('HIERARCHICAL');
                setSelectedClass(null);
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>{viewMode === 'HIERARCHICAL' ? 'Xem Tất Cả (Dạng Danh Sách)' : 'Phân Cấp Theo Lớp'}</span>
          </button>

          {(userRole === 'LECTURER' || userRole === 'ADMIN') && (
            <>
              <button
                id="btn-import-training-excel"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Nhập File Excel Lớp</span>
              </button>

              <button
                id="btn-add-comment"
                onClick={() => handleOpenNew()}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nhập Đánh Giá Mới</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Admin Quick Export & Import Action Cards */}
      {(userRole === 'ADMIN' || userRole === 'LECTURER') && (
        <div className={`grid grid-cols-1 ${userRole === 'ADMIN' ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
          {userRole === 'LECTURER' && (
            <div className="bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900 text-white p-5 rounded-2xl border border-emerald-700/50 shadow-md flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <Upload className="w-4 h-4" />
                  <span>Nhập File Cho Cả Lớp</span>
                </div>
                <h4 className="text-sm font-bold mt-1">Import Excel Đánh Giá Rèn Luyện</h4>
              </div>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Nhập File Excel Lớp</span>
              </button>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-900/90 via-sky-900/90 to-slate-900 text-white p-5 rounded-2xl border border-blue-700/50 shadow-md flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất Excel Theo Tháng</span>
              </div>
              <h4 className="text-sm font-bold mt-1">Bảng Điểm Rèn Luyện (Công Thức Excel)</h4>
            </div>
            <button
              onClick={handleExportMonthlyExcel}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel Điểm Tháng</span>
            </button>
          </div>

          <div className="bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-slate-900 text-white p-5 rounded-2xl border border-indigo-700/50 shadow-md flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <Award className="w-4 h-4" />
                <span>Báo Cáo Tổng Admin</span>
              </div>
              <h4 className="text-sm font-bold mt-1">File Báo Cáo 9 Tháng & Năm Học</h4>
            </div>
            <button
              onClick={handleExportSemesterYearExcel}
              className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Báo Cáo 9 Tháng</span>
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb & Class Navigator */}
      {viewMode === 'HIERARCHICAL' && (
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center flex-wrap gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <button
              onClick={() => setSelectedClass(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                selectedClass === null
                  ? 'bg-amber-500 text-white font-bold shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-amber-950 hover:text-amber-600'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Tất cả Lớp học</span>
            </button>

            {selectedClass && (
              <>
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold shadow-sm">
                  <Users className="w-4 h-4" />
                  <span>Lớp: {selectedClass}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 1: CLASS CARDS GRID */}
      {viewMode === 'HIERARCHICAL' && selectedClass === null && !isStudentRole && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-amber-500" />
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              {availableClasses.length} lớp học
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableClasses.map((lopName) => {
              const studentsInLop = students.filter((s) => s.lop === lopName);
              const lopStudentIds = new Set(studentsInLop.map((s) => s.maSV));
              const lopPoints = trainingPoints.filter((r) => lopStudentIds.has(r.maSV) || r.lop === lopName);
              const avgScore = lopPoints.length
                ? Math.round(lopPoints.reduce((acc, curr) => acc + curr.diemRL, 0) / lopPoints.length)
                : 85;
              const faculty = studentsInLop[0]?.khoa || 'Khoa Chuyên ngành';
              const rank = calculateTrainingRank(avgScore);

              return (
                <div
                  key={lopName}
                  onClick={() => setSelectedClass(lopName)}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {faculty}
                      </span>
                      <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                    </div>

                    <h4 className="text-base font-black text-zinc-900 dark:text-white group-hover:text-amber-600 transition-colors">
                      {lopName}
                    </h4>

                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span>{studentsInLop.length || 20} Sinh viên</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-500" />
                        <span>Điểm TB: {avgScore}/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
                    <span>Xem bảng điểm rèn luyện ({rank})</span>
                    <span className="font-mono text-sm">➔</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LEVEL 2 or FLAT MODE or STUDENT ROLE: TRAINING POINTS STUDENT LIST */}
      {(viewMode === 'FLAT' || selectedClass !== null || isStudentRole) && (
        <div className="space-y-4">
          {/* Student Personal Banner */}
          {isStudentRole && (
            <div className="bg-amber-50/90 dark:bg-amber-950/60 p-4 rounded-2xl border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-amber-950 dark:text-amber-100">
                    🏆 Kết Quả Đánh Giá Rèn Luyện Cá Nhân — {selfStudent?.hoTen || 'Sinh viên'} ({selfStudent?.maSV || currentStudentCode || 'N/A'})
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    Lớp: <strong>{selfStudent?.lop || 'Chưa phân lớp'}</strong> • Khoa: <strong>{selfStudent?.khoa || 'Khoa Chuyên Ngành'}</strong>. Tra cứu điểm rèn luyện lọc theo tháng, học kỳ và năm học.
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                  Role: Sinh viên
                </span>
              </div>
            </div>
          )}

          {viewMode === 'HIERARCHICAL' && selectedClass && !isStudentRole && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50/70 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60">
              <div>
                <h3 className="font-bold text-sm text-amber-950 dark:text-amber-200 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  <span>Bảng Điểm Rèn Luyện Lớp: {selectedClass}</span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Import Excel Lớp</span>
                </button>
                <button
                  onClick={() => setSelectedClass(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Đổi Lớp Khác</span>
                </button>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="sm:col-span-2 relative">
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                {isStudentRole ? 'Tìm kiếm trong điểm của tôi' : 'Tìm kiếm sinh viên'}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  id="search-training-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isStudentRole ? "Lọc theo nhận xét, người đánh giá..." : "Mã SV, Tên SV, Nhận xét..."}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Lọc theo Tháng</label>
              <select
                id="filter-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Tất cả các Tháng --</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">Học Kỳ & Năm Học</label>
              <div className="flex items-center gap-1">
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-1/2 px-2 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Tất cả HK --</option>
                  {availableSemesters.map((s) => (
                    <option key={s} value={s}>
                      {s.startsWith('HK') ? s : `Học kỳ ${s}`}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : '')}
                  className="w-1/2 px-2 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Tất cả Năm --</option>
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Training List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPoints.length > 0 ? (
              filteredPoints.map((r) => {
                const rank = r.xepLoai || calculateTrainingRank(r.diemRL);
                const m1 = r.diemMuc1 !== undefined ? r.diemMuc1 : Math.min(40, Math.round(r.diemRL * 0.4));
                const m2 = r.diemMuc2 !== undefined ? r.diemMuc2 : Math.min(35, Math.round(r.diemRL * 0.35));
                const m3 = r.diemMuc3 !== undefined ? r.diemMuc3 : Math.min(25, r.diemRL - m1 - m2);

                return (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{r.hoTenSV || 'Sinh viên'}</h3>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-mono font-medium">
                            Mã SV: {r.maSV} • Lớp: {r.lop || selectedClass || 'CNKT Cơ khí 25DDS 09041'}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-2xl font-black font-mono text-zinc-900 dark:text-white">{r.diemRL}</span>
                          <span className="text-[10px] text-zinc-400 block">/ 100 Điểm</span>
                        </div>
                      </div>

                      {/* Rank & Evaluation Month */}
                      <div className="flex items-center justify-between gap-2 mb-3 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${getRankBadgeClass(rank)}`}>
                          Xếp Loại: {rank}
                        </span>
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          Tháng {r.thang}/{r.nam} • {r.hocKy || 'HK1'}
                        </span>
                      </div>

                      {/* 3 Categories Sub-score Breakdown */}
                      <div className="space-y-1.5 text-[11px] mb-3 bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
                        <p className="font-bold text-blue-900 dark:text-blue-200 text-xs mb-1">
                          Chi Tiết Điểm 3 Mục Đánh Giá:
                        </p>
                        <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                          <span>I. Ý thức học tập & kỷ luật (Tối đa 40):</span>
                          <strong className="font-mono text-blue-600 dark:text-blue-400">{m1}/40đ</strong>
                        </div>
                        <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                          <span>II. Chấp hành nội quy & phong trào (Tối đa 35):</span>
                          <strong className="font-mono text-emerald-600 dark:text-emerald-400">{m2}/35đ</strong>
                        </div>
                        <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                          <span>III. Phẩm chất đạo đức & lối sống (Tối đa 25):</span>
                          <strong className="font-mono text-purple-600 dark:text-purple-400">{m3}/25đ</strong>
                        </div>
                      </div>

                      {/* Lecturer Comment */}
                      <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-700/80 mb-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                          Nhận xét của Cố vấn Học tập / Giảng viên:
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 italic">"{r.nhanXet}"</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <span>Đánh giá bởi: {r.nguoiDanhGia || 'Cố vấn HT'}</span>
                      {(userRole === 'ADMIN' || userRole === 'LECTURER') && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 transition-all cursor-pointer"
                            title="Sửa điểm rèn luyện của sinh viên này"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa điểm</span>
                          </button>
                          <button
                            onClick={() => setDeleteIndividualRecord(r)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
                            title="Xóa điểm rèn luyện của sinh viên này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="md:col-span-2 p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                Chưa có dữ liệu điểm rèn luyện phù hợp cho lựa chọn này.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MASTER CLASS EXCEL IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsImportModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Nhập File Excel Tổng Cho Lớp — Điểm Rèn Luyện
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
              Hệ thống tự động đọc điểm rèn luyện, tính tổng điểm và tự động phân loại 6 mức chuẩn Quy chế 1519 (Xuất sắc, Tốt, Khá, Trung bình, Yếu, Kém).
            </p>

            <div className="space-y-5">
              {/* Target Academic Year & Period Configuration */}
              <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-zinc-900 dark:text-white">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>Cấu hình Đợt Đánh Giá Mục Tiêu (Quy chuẩn dữ liệu khi nhập)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Năm Học Mục Tiêu *
                    </label>
                    <select
                      value={importTargetNamHoc}
                      onChange={(e) => setImportTargetNamHoc(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-medium"
                    >
                      <option value="2026-2027">Năm học 2026-2027 (Mặc định)</option>
                      <option value="2025-2026">Năm học 2025-2026</option>
                      <option value="2024-2025">Năm học 2024-2025</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Học Kỳ Mục Tiêu *
                    </label>
                    <select
                      value={importTargetHocKy}
                      onChange={(e) => setImportTargetHocKy(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-medium"
                    >
                      <option value="HK1">Học kỳ 1 (HK1)</option>
                      <option value="HK2">Học kỳ 2 (HK2)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Tháng Đánh Giá
                    </label>
                    <select
                      value={importTargetThang}
                      onChange={(e) => setImportTargetThang(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-medium"
                    >
                      <option value="AUTO">Tự động nhận theo file Excel</option>
                      <option value="8">Tháng 8 (Bắt đầu HK1)</option>
                      <option value="9">Tháng 9</option>
                      <option value="10">Tháng 10</option>
                      <option value="11">Tháng 11</option>
                      <option value="12">Tháng 12</option>
                      <option value="1">Tháng 1</option>
                      <option value="2">Tháng 2</option>
                      <option value="3">Tháng 3</option>
                      <option value="4">Tháng 4</option>
                      <option value="5">Tháng 5</option>
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">
                  * Ghi chú: Nếu file Excel có tiêu đề cột "Tháng 8/2025 (HK1)", khi nhập vào năm học <strong>{importTargetNamHoc}</strong>, hệ thống tự động chuẩn hóa ghi nhận vào Năm học <strong>{importTargetNamHoc}</strong> (lịch năm 2026) theo đúng thời gian đào tạo.
                </p>
              </div>

              {/* Step 1: Download Template */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Bước 1: Tải file mẫu Excel (.xlsx) đã điền danh sách lớp</span>
                  </h4>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                    File chứa danh sách sinh viên lớp <strong className="font-bold">{selectedClass || 'Tất cả Lớp'}</strong> với các cột điểm tiêu chí I, II, III chuẩn.
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải File Mẫu Excel</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-6 text-center hover:border-emerald-500 transition-all bg-zinc-50/50 dark:bg-zinc-800/30">
                <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Bước 2: Chọn file Excel (.xlsx) chứa bảng điểm rèn luyện đã chấm
                </p>
                <p className="text-[11px] text-zinc-500 mt-1 mb-3">
                  Kéo thả file vào đây hoặc bấm nút dưới đây để tải lên
                </p>

                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelFileUpload}
                  className="hidden"
                  id="excel-file-input"
                />
                <label
                  htmlFor="excel-file-input"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Chọn File Excel Điểm Rèn Luyện</span>
                </label>

                {importFileName && (
                  <p className="text-xs text-emerald-600 font-medium mt-2">
                    Đã chọn file: <strong>{importFileName}</strong>
                  </p>
                )}
              </div>

              {importStatus && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}

              {/* Step 3: Parsed Data Live Preview Table */}
              {parsedImportData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Xem Trước Dữ Liệu {parsedImportData.length} Sinh Viên — Đã Tính Tổng & Tự Động Xếp Loại</span>
                    </h4>
                  </div>

                  <div className="overflow-x-auto max-h-64 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 sticky top-0 font-bold">
                        <tr>
                          <th className="p-2.5">STT</th>
                          <th className="p-2.5">Mã SV</th>
                          <th className="p-2.5">Họ và Tên</th>
                          <th className="p-2.5">Lớp</th>
                          <th className="p-2.5 text-center">Mục I (40đ)</th>
                          <th className="p-2.5 text-center">Mục II (35đ)</th>
                          <th className="p-2.5 text-center">Mục III (25đ)</th>
                          <th className="p-2.5 text-center">TỔNG ĐIỂM</th>
                          <th className="p-2.5 text-center">XẾP LOẠI</th>
                          <th className="p-2.5">Nhận Xét</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {parsedImportData.map((item, index) => (
                          <tr key={index} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <td className="p-2.5 text-zinc-500">{index + 1}</td>
                            <td className="p-2.5 font-mono font-bold text-blue-600">{item.maSV}</td>
                            <td className="p-2.5 font-semibold text-zinc-800 dark:text-zinc-200">{item.hoTenSV || 'Sinh viên'}</td>
                            <td className="p-2.5 text-zinc-600">{item.lop}</td>
                            <td className="p-2.5 text-center font-mono">{item.diemMuc1}</td>
                            <td className="p-2.5 text-center font-mono">{item.diemMuc2}</td>
                            <td className="p-2.5 text-center font-mono">{item.diemMuc3}</td>
                            <td className="p-2.5 text-center font-mono font-black text-blue-700 dark:text-blue-300 text-xs">
                              {item.totalScore}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRankBadgeClass(item.autoRank)}`}>
                                {item.autoRank}
                              </span>
                            </td>
                            <td className="p-2.5 text-zinc-500 italic max-w-xs truncate">{item.nhanXet}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={parsedImportData.length === 0}
                  onClick={handleConfirmImport}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  Xác Nhận Import Vào Hệ Thống
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lecturer Comment & 3 Evaluation Categories Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {editingRecord ? 'Chỉnh Sửa Điểm Rèn Luyện 3 Mục' : 'Nhập Điểm Rèn Luyện 3 Mục & Nhận Xét'}
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Nhập chi tiết 3 nội dung đánh giá theo Quy chế 1519/QC-TĐN. Hệ thống tự động tính tổng điểm và phân loại 6 mức chuẩn.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">
                  Chọn Sinh viên * {editingRecord && <span className="text-blue-600 font-normal">(Đang chỉnh sửa)</span>}
                </label>
                <select
                  value={form.maSV}
                  disabled={Boolean(editingRecord)}
                  onChange={(e) => setForm({ ...form, maSV: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl disabled:opacity-75"
                  required
                >
                  {students.map((s) => (
                    <option key={s.maSV} value={s.maSV}>
                      {s.maSV} - {s.hoTen} ({s.lop})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Năm Học</label>
                  <select
                    value={form.namHoc}
                    onChange={(e) => {
                      const nh = e.target.value;
                      const y = parseInt(nh.split('-')[0], 10) || 2026;
                      setForm({ ...form, namHoc: nh, nam: form.thang >= 8 ? y : y + 1 });
                    }}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  >
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Học Kỳ</label>
                  <select
                    value={form.hocKy}
                    onChange={(e) => setForm({ ...form, hocKy: e.target.value })}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  >
                    <option value="HK1">Học kỳ 1</option>
                    <option value="HK2">Học kỳ 2</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Tháng Đánh Giá</label>
                  <select
                    value={form.thang}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      const y = parseInt((form.namHoc || '2026-2027').split('-')[0], 10) || 2026;
                      setForm({ ...form, thang: m, nam: m >= 8 ? y : y + 1 });
                    }}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  >
                    <option value={8}>Tháng 8 (Bắt đầu HK1)</option>
                    <option value={9}>Tháng 9</option>
                    <option value={10}>Tháng 10</option>
                    <option value={11}>Tháng 11</option>
                    <option value={12}>Tháng 12</option>
                    <option value={1}>Tháng 1</option>
                    <option value={2}>Tháng 2</option>
                    <option value={3}>Tháng 3</option>
                    <option value={4}>Tháng 4</option>
                    <option value={5}>Tháng 5</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Năm Lịch</label>
                  <input
                    type="number"
                    value={form.nam}
                    onChange={(e) => setForm({ ...form, nam: Number(e.target.value) })}
                    className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* 3 Categories Sub-scores Entry */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                <h4 className="font-bold text-zinc-900 dark:text-white text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>3 Nội Dung Đánh Giá (Tối đa 100 điểm)</span>
                  <span className="text-amber-600 font-mono font-bold">{totalFormScore} / 100 điểm</span>
                </h4>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                    <span>I. Ý thức học tập & kỷ luật lớp học *</span>
                    <span className="text-blue-600 font-bold">Tối đa 40đ</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    value={form.diemMuc1}
                    onChange={(e) => setForm({ ...form, diemMuc1: Math.min(40, Math.max(0, Number(e.target.value))) })}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                    <span>II. Chấp hành nội quy & phong trào Đoàn/Hội *</span>
                    <span className="text-emerald-600 font-bold">Tối đa 35đ</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="35"
                    value={form.diemMuc2}
                    onChange={(e) => setForm({ ...form, diemMuc2: Math.min(35, Math.max(0, Number(e.target.value))) })}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center justify-between">
                    <span>III. Phẩm chất đạo đức & lối sống cộng đồng *</span>
                    <span className="text-purple-600 font-bold">Tối đa 25đ</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={form.diemMuc3}
                    onChange={(e) => setForm({ ...form, diemMuc3: Math.min(25, Math.max(0, Number(e.target.value))) })}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl font-mono text-xs"
                    required
                  />
                </div>

                {/* Auto Calculated Live Result Bar */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Tổng: <strong className="font-mono text-sm text-blue-600 dark:text-blue-400">{totalFormScore}đ</strong>
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRankBadgeClass(calculatedRank)}`}>
                    Xếp loại: {calculatedRank}
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Nhận xét của Cố vấn / Giảng viên *</label>
                <textarea
                  rows={3}
                  value={form.nhanXet}
                  onChange={(e) => setForm({ ...form, nhanXet: e.target.value })}
                  placeholder="Nhập nhận xét về chuyên cần, quy chế, hoạt động đoàn thể..."
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Tên Giảng viên / Cố vấn</label>
                <input
                  type="text"
                  value={form.nguoiDanhGia}
                  onChange={(e) => setForm({ ...form, nguoiDanhGia: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Đang lưu...' : editingRecord ? 'Cập Nhật Điểm' : 'Lưu Đánh Giá'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE INDIVIDUAL TRAINING POINT */}
      {deleteIndividualRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-2xl text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Xác Nhận Xóa Điểm Rèn Luyện
                </h3>
                <p className="text-xs text-zinc-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 mb-5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Sinh viên:</span>
                <strong className="text-zinc-900 dark:text-white">
                  {deleteIndividualRecord.hoTenSV || 'Sinh viên'} ({deleteIndividualRecord.maSV})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Lớp:</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{deleteIndividualRecord.lop || selectedClass}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Kỳ đánh giá:</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  Tháng {deleteIndividualRecord.thang}/{deleteIndividualRecord.nam} ({deleteIndividualRecord.hocKy || 'HK1'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Điểm & Xếp loại:</span>
                <strong className="text-blue-600 dark:text-blue-400">
                  {deleteIndividualRecord.diemRL} điểm — {deleteIndividualRecord.xepLoai || calculateTrainingRank(deleteIndividualRecord.diemRL)}
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteIndividualRecord(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-semibold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDeleteIndividual}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang xóa...' : 'Xóa Bản Ghi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE CLASS TRAINING POINTS */}
      {isDeleteClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-2xl text-rose-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Xác Nhận Xóa ĐRL Cả Lớp
                </h3>
                <p className="text-xs text-rose-600 font-semibold">Cảnh báo: Toàn bộ bản ghi của lớp sẽ bị xóa</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa điểm rèn luyện của toàn bộ sinh viên thuộc lớp <strong className="text-zinc-900 dark:text-white">{selectedClass}</strong>?
            </p>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 mb-5 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold">Phạm vi áp dụng theo bộ lọc hiện tại:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                <li>Lớp: <strong>{selectedClass}</strong></li>
                <li>Tháng: <strong>{selectedMonth ? `Tháng ${selectedMonth}` : 'Tất cả các tháng'}</strong></li>
                <li>Học kỳ: <strong>{selectedSemester || 'Tất cả học kỳ'}</strong></li>
                <li>Năm: <strong>{selectedYear || 'Tất cả các năm'}</strong></li>
              </ul>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteClassModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-semibold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  await handleConfirmDeleteClass();
                  setIsDeleteClassModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang xóa...' : 'Xác Nhận Xóa Cả Lớp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
