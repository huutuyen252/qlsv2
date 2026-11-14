import React, { useState, useMemo, useEffect, useId } from 'react';
import * as XLSX from 'xlsx';
import { SinhVien, UserRole, HoSoFile, User, Diem, RenLuyen, ThiLaiHocLai } from '../../types';
import { apiService } from '../../services/apiService';
import { StudentDetailDrawer } from './StudentDetailDrawer';
import {
  PageHeader,
  MetricStrip,
  DataToolbar,
  StatusBadge,
  PaginationBar,
  ConfirmDialog,
  LoadingState,
  EmptyState,
  FilteredEmptyState,
  ErrorBanner,
  ErrorState,
} from '../common';
import {
  normalizeClassName,
  normalizeFacultyName,
  getFacultyForClass as getFacultyFromHelper,
  getMajorForClass,
  getCohortForClass,
  isSameClass,
  CANONICAL_CLASS_CO_KHI,
  CANONICAL_CLASS_O_TO,
  FACULTY_CO_KHI,
  FACULTY_O_TO,
} from '../../utils/classHelper';
import {
  Users,
  Plus,
  FileText,
  Upload,
  Edit3,
  Trash2,
  ExternalLink,
  X,
  Eye,
  GraduationCap,
  Folder,
  FolderTree,
  Building2,
  BookOpen,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Paperclip,
  Download,
  FileSpreadsheet,
  Info,
  FileUp,
  Check,
  Lock,
  ShieldCheck,
  Phone,
  Calendar,
  User as UserIcon,
  Camera,
  Award,
  RotateCcw,
} from 'lucide-react';

export const getStudentAvatarUrl = (student: Partial<SinhVien>): string => {
  if (student.avatar && student.avatar.trim()) {
    return student.avatar.trim();
  }
  const cleanName = encodeURIComponent(student.hoTen || student.maSV || 'SV');
  const isFemale = student.gioiTinh === 'Nữ';
  return `https://ui-avatars.com/api/?name=${cleanName}&background=${isFemale ? 'e11d48' : '1d4ed8'}&color=fff&size=200&bold=true&font-size=0.38`;
};

const isImageFile = (fileUrl: string, fileName: string): boolean => {
  const lowerUrl = (fileUrl || '').toLowerCase();
  const lowerName = (fileName || '').toLowerCase();
  if (lowerUrl.startsWith('data:image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerName) || /\.(png|jpe?g|gif|webp)$/i.test(lowerUrl);
};

interface PreviewDocState {
  fileUrl: string;
  customName: string;
  fileName: string;
  studentName: string;
  maSV: string;
  lop?: string;
}

interface StudentProfileModuleProps {
  students: SinhVien[];
  grades?: Diem[];
  trainingPoints?: RenLuyen[];
  retakes?: ThiLaiHocLai[];
  activeSemester?: string;
  userRole: UserRole;
  currentStudentCode?: string;
  currentUser?: User | null;
  onAddStudent: (student: SinhVien) => void;
  onUpdateStudent: (maSV: string, student: Partial<SinhVien>) => void;
  onDeleteStudent: (maSV: string) => void;
  onDeleteClassStudents?: (lop: string) => Promise<void> | void;
  onUploadHoSo: (maSV: string, fileName: string, fileData?: string) => void;
  onImportStudents?: (students: Partial<SinhVien>[]) => void;
  onSwitchView?: (view: string) => void;
  isLoading?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
}

export const StudentProfileModule: React.FC<StudentProfileModuleProps> = ({
  students,
  grades = [],
  trainingPoints = [],
  retakes = [],
  activeSemester = '',
  userRole,
  currentStudentCode,
  currentUser,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onDeleteClassStudents,
  onUploadHoSo,
  onImportStudents,
  onSwitchView,
  isLoading = false,
  loadError = null,
  onRetryLoad,
}) => {
  const formIdPrefix = useId();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'HIERARCHY' | 'CLASSES' | 'STUDENTS'>('HIERARCHY');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKhoa, setSelectedKhoa] = useState('');
  const [selectedLop, setSelectedLop] = useState('');
  const [selectedCohortFilter, setSelectedCohortFilter] = useState('');
  const [expandedFaculties, setExpandedFaculties] = useState<Record<string, boolean>>({});

  // Pagination state
  const [classesPage, setClassesPage] = useState(1);
  const [classesPageSize, setClassesPageSize] = useState(10);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPageSize, setStudentsPageSize] = useState(20);

  // User-created/edited class map (seeded strictly from real students, never fabricated)
  const [customClassMap, setCustomClassMap] = useState<Record<string, string>>({});

  const classMap = useMemo(() => {
    const merged: Record<string, string> = { ...customClassMap };
    students.forEach((s) => {
      if (s.lop) {
        const normLop = normalizeClassName(s.lop);
        if (normLop && !merged[normLop]) {
          merged[normLop] = normalizeFacultyName(s.khoa, normLop);
        }
      }
    });
    return merged;
  }, [students, customClassMap]);

  // Edit / Add Class Modals State
  const [editingClassModal, setEditingClassModal] = useState<{
    oldLopName: string;
    lopName: string;
    khoa: string;
    nganh?: string;
    khoaHoc?: string;
  } | null>(null);

  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassFormData, setNewClassFormData] = useState({
    lopName: '',
    khoa: '',
    nganh: '',
    khoaHoc: '',
  });

  const getFacultyForClass = (lopName: string | undefined | null): string => {
    if (!lopName) return '';
    const norm = normalizeClassName(lopName);
    if (classMap[norm]) return classMap[norm];
    if (classMap[lopName]) return classMap[lopName];
    return getFacultyFromHelper(norm);
  };

  const availableClasses: string[] = useMemo(() => {
    const set = new Set<string>();
    Object.keys(classMap).forEach((c) => {
      const norm = normalizeClassName(c);
      if (norm) set.add(norm);
    });
    students.forEach((s) => {
      if (s.lop) {
        const norm = normalizeClassName(s.lop);
        if (norm) set.add(norm);
      }
    });
    return Array.from(set).sort();
  }, [students, classMap]);

  const uniqueFaculties: string[] = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      const k = normalizeFacultyName(s.khoa, s.lop);
      if (k) set.add(k);
    });
    Object.values(classMap).forEach((k) => {
      if (k) set.add(k);
    });
    return Array.from(set).sort();
  }, [students, classMap]);

  const uniqueMajors: string[] = useMemo(() => {
    const set = new Set<string>();
    availableClasses.forEach((lop) => {
      set.add(getMajorForClass(lop));
    });
    return Array.from(set).sort();
  }, [availableClasses]);

  const uniqueCohorts: string[] = useMemo(() => {
    const set = new Set<string>();
    availableClasses.forEach((lop) => {
      set.add(getCohortForClass(lop));
    });
    return Array.from(set).sort();
  }, [availableClasses]);

  const toggleFacultyExpand = (faculty: string) => {
    setExpandedFaculties((prev) => ({
      ...prev,
      [faculty]: prev[faculty] === undefined ? false : !prev[faculty],
    }));
  };

  const handleSelectClass = (lopName: string | null) => {
    if (!lopName) {
      setSelectedClass(null);
      setSelectedLop('');
      setSelectedKhoa('');
      return;
    }
    const norm = normalizeClassName(lopName);
    setSelectedClass(norm);
    setSelectedLop(norm);
    setSelectedKhoa(getFacultyForClass(norm));
  };

  const handleSelectLopFilter = (newLop: string) => {
    if (!newLop) {
      setSelectedLop('');
      setSelectedClass(null);
      return;
    }
    const norm = normalizeClassName(newLop);
    setSelectedLop(norm);
    setSelectedClass(norm);
    setSelectedKhoa(getFacultyForClass(norm));
  };

  const handleSelectKhoaFilter = (newKhoa: string) => {
    setSelectedKhoa(newKhoa);
    if (!newKhoa) return;

    const activeClass = selectedLop || selectedClass;
    if (activeClass) {
      const classFaculty = getFacultyForClass(activeClass);
      if (normalizeFacultyName(classFaculty).toLowerCase() !== normalizeFacultyName(newKhoa).toLowerCase()) {
        setSelectedLop('');
        setSelectedClass(null);
      }
    }
  };

  // In-app Toast & Confirmation Dialog state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  const [classToDeleteConfirm, setClassToDeleteConfirm] = useState<{
    lopName: string;
    faculty: string;
    count: number;
  } | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // In-app Document Preview modal state (replaces window.open)
  const [previewDoc, setPreviewDoc] = useState<PreviewDocState | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<SinhVien | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCustomClassInput, setIsCustomClassInput] = useState(false);
  const [viewingDocumentStudent, setViewingDocumentStudent] = useState<SinhVien | null>(null);
  const [viewingDetailStudent, setViewingDetailStudent] = useState<SinhVien | null>(null);

  // Excel Import state
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [previewExcelStudents, setPreviewExcelStudents] = useState<Partial<SinhVien>[]>([]);
  const [excelFileName, setExcelFileName] = useState('');

  // Keep viewingDetailStudent / viewingDocumentStudent synchronized when students prop updates
  useEffect(() => {
    if (viewingDetailStudent) {
      const fresh = students.find((s) => s.maSV.toLowerCase() === viewingDetailStudent.maSV.toLowerCase());
      if (fresh && fresh !== viewingDetailStudent) {
        setViewingDetailStudent(fresh);
      }
    }
    if (viewingDocumentStudent) {
      const fresh = students.find((s) => s.maSV.toLowerCase() === viewingDocumentStudent.maSV.toLowerCase());
      if (fresh && fresh !== viewingDocumentStudent) {
        setViewingDocumentStudent(fresh);
      }
    }
  }, [students]);

  // Global Esc handler for open dialogs/modals in this module
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (previewDoc) {
        setPreviewDoc(null);
      } else if (editingClassModal) {
        setEditingClassModal(null);
      } else if (isAddClassModalOpen) {
        setIsAddClassModalOpen(false);
      } else if (isExcelImportModalOpen) {
        setIsExcelImportModalOpen(false);
        setPreviewExcelStudents([]);
        setExcelFileName('');
      } else if (viewingDocumentStudent) {
        setViewingDocumentStudent(null);
      } else if (isAddModalOpen) {
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    previewDoc,
    editingClassModal,
    isAddClassModalOpen,
    isExcelImportModalOpen,
    viewingDocumentStudent,
    isAddModalOpen,
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setClassesPage(1);
    setStudentsPage(1);
  }, [searchTerm, selectedKhoa, selectedLop, selectedClass, selectedCohortFilter]);

  const handleSaveNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLop = normalizeClassName(newClassFormData.lopName.trim());
    const trimmedKhoa = newClassFormData.khoa.trim();
    if (!trimmedLop || !trimmedKhoa) return;

    setCustomClassMap((prev) => ({
      ...prev,
      [trimmedLop]: trimmedKhoa,
    }));

    setIsAddClassModalOpen(false);
    setNewClassFormData({ lopName: '', khoa: '', nganh: '', khoaHoc: '' });
    showToast(`Đã tạo lớp "${trimmedLop}" thuộc ${trimmedKhoa}.`, 'success');
  };

  const handleSaveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassModal) return;

    const { oldLopName, lopName, khoa } = editingClassModal;
    const newLopName = normalizeClassName(lopName.trim());
    const newKhoa = khoa.trim();
    if (!newLopName || !newKhoa) return;

    setCustomClassMap((prev) => {
      const next = { ...prev };
      if (oldLopName !== newLopName) {
        delete next[oldLopName];
      }
      next[newLopName] = newKhoa;
      return next;
    });

    const studentsInOldClass = students.filter((s) => isSameClass(s.lop, oldLopName));
    studentsInOldClass.forEach((s) => {
      onUpdateStudent(s.maSV, { lop: newLopName, khoa: newKhoa });
    });

    if (selectedClass && isSameClass(selectedClass, oldLopName)) {
      setSelectedClass(newLopName);
      setSelectedLop(newLopName);
    }

    setEditingClassModal(null);
    showToast(`Đã cập nhật lớp "${newLopName}" (${studentsInOldClass.length} sinh viên).`, 'success');
  };

  const handleDeleteClass = (lopName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const studentsInLop = students.filter((s) => isSameClass(s.lop, lopName));
    const faculty = getFacultyForClass(lopName);

    if (studentsInLop.length === 0) {
      setCustomClassMap((prev) => {
        const next = { ...prev };
        delete next[lopName];
        return next;
      });
      showToast(`Đã xóa lớp trống "${lopName}" khỏi danh mục.`, 'info');
      return;
    }

    setClassToDeleteConfirm({ lopName, faculty, count: studentsInLop.length });
  };

  const handleExecuteDeleteClass = async () => {
    if (!classToDeleteConfirm) return;
    const { lopName, faculty, count } = classToDeleteConfirm;
    setIsDeletingClass(true);
    try {
      if (onDeleteClassStudents) {
        await onDeleteClassStudents(lopName);
      } else {
        const studentsInLop = students.filter((s) => isSameClass(s.lop, lopName));
        studentsInLop.forEach((s) => {
          onDeleteStudent(s.maSV);
        });
      }

      setCustomClassMap((prev) => ({
        ...prev,
        [lopName]: faculty,
      }));
      setClassToDeleteConfirm(null);
      showToast(`Đã xóa ${count} sinh viên trong lớp "${lopName}".`, 'success');
    } finally {
      setIsDeletingClass(false);
    }
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Mã SV': '25DDS0904188',
        'Họ và tên': 'Nguyễn Văn Minh',
        'Lớp': CANONICAL_CLASS_CO_KHI,
        'Mã Lớp': '25DDS09041',
        'Khoa / Viện': FACULTY_CO_KHI,
        'Ngày sinh': '2007-04-15',
        'Giới tính': 'Nam',
        'Số điện thoại': '0987654321',
        'Email': 'minh.nv25@tdnu.edu.vn',
        'Địa chỉ': 'TP. Hồ Chí Minh',
        'Ngày nhập học': '2025-09-05',
        'Trạng thái': 'Đang học',
      },
      {
        'Mã SV': '25DDS0902190',
        'Họ và tên': 'Lê Hoàng Nam',
        'Lớp': CANONICAL_CLASS_O_TO,
        'Mã Lớp': '25DDS09021',
        'Khoa / Viện': FACULTY_O_TO,
        'Ngày sinh': '2007-11-02',
        'Giới tính': 'Nam',
        'Số điện thoại': '0933445566',
        'Email': 'nam.lh25@tdnu.edu.vn',
        'Địa chỉ': 'Đồng Nai',
        'Ngày nhập học': '2025-09-05',
        'Trạng thái': 'Đang học',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachSinhVien');
    XLSX.writeFile(workbook, 'Mau_Import_DanhSach_SinhVien.xlsx');
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const parsed: Partial<SinhVien>[] = data
          .map((row) => {
            const maSV = String(row['Mã SV'] || row['MaSV'] || row['MSSV'] || row['Mã sinh viên'] || row['maSV'] || '').trim();
            const hoTen = String(row['Họ và tên'] || row['HoTen'] || row['Họ tên'] || row['hoTen'] || '').trim();
            const lopVal = String(row['Lớp'] || row['Lop'] || row['Lớp sinh hoạt'] || row['lop'] || '').trim();
            const maLopVal = String(row['Mã Lớp'] || row['Mã lớp'] || row['MaLop'] || row['maLop'] || '').trim();

            let rawLop = '';
            if (lopVal && maLopVal) {
              rawLop = lopVal.includes(maLopVal) ? lopVal : `${lopVal} ${maLopVal}`;
            } else if (maLopVal) {
              rawLop = maLopVal;
            } else if (lopVal) {
              rawLop = lopVal;
            }

            const lop = normalizeClassName(rawLop);
            const rawKhoa = String(row['Khoa / Viện'] || row['Khoa'] || row['KhoaViên'] || row['khoa'] || '').trim();
            const khoa = rawKhoa ? normalizeFacultyName(rawKhoa, lop) : (lop ? getFacultyFromHelper(lop) : '');
            const ngaySinh = String(row['Ngày sinh'] || row['NgaySinh'] || row['ngaySinh'] || '').trim();
            const gioiTinh = String(row['Giới tính'] || row['GioiTinh'] || row['gioiTinh'] || 'Nam').trim();
            const soDienThoai = String(row['Số điện thoại'] || row['SoDienThoai'] || row['SĐT'] || row['soDienThoai'] || '').trim();
            const email = String(row['Email'] || row['email'] || '').trim();
            const diaChi = String(row['Địa chỉ'] || row['DiaChi'] || row['diaChi'] || '').trim();
            const ngayNhapHoc = String(row['Ngày nhập học'] || row['NgayNhapHoc'] || row['ngayNhapHoc'] || '').trim();
            const trangThai = String(row['Trạng thái'] || row['TrangThai'] || row['trangThai'] || 'Đang học').trim();

            return {
              maSV,
              hoTen,
              lop,
              khoa,
              ngaySinh,
              gioiTinh: (gioiTinh.toLowerCase().includes('nữ') || gioiTinh.toLowerCase().includes('nu') ? 'Nữ' : 'Nam') as 'Nam' | 'Nữ',
              soDienThoai,
              email,
              diaChi,
              ngayNhapHoc,
              trangThai: (trangThai as SinhVien['trangThai']) || 'Đang học',
              hoSoFiles: [],
            };
          })
          .filter((s) => s.maSV && s.hoTen)
          .sort((a, b) => (a.maSV || '').localeCompare(b.maSV || '', undefined, { numeric: true, sensitivity: 'base' }));

        setPreviewExcelStudents(parsed);
        setExcelFileName(file.name);
      } catch (error) {
        console.error(error);
        showToast('Không thể đọc tệp Excel. Vui lòng kiểm tra lại định dạng tệp.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImportExcel = () => {
    if (previewExcelStudents.length === 0) return;
    const sortedStudents = [...previewExcelStudents].sort((a, b) =>
      (a.maSV || '').localeCompare(b.maSV || '', undefined, { numeric: true, sensitivity: 'base' })
    );
    if (onImportStudents) {
      onImportStudents(sortedStudents);
    } else {
      sortedStudents.forEach((st) => onAddStudent(st as SinhVien));
    }
    setIsExcelImportModalOpen(false);
    setPreviewExcelStudents([]);
    setExcelFileName('');
  };

  const [formData, setFormData] = useState<Partial<SinhVien>>({
    maSV: '',
    hoTen: '',
    ngaySinh: '',
    gioiTinh: 'Nam',
    lop: '',
    khoa: '',
    soDienThoai: '',
    email: '',
    diaChi: '',
    ngayNhapHoc: '',
    trangThai: 'Đang học',
    hoSoFiles: [],
  });

  const getStudentFiles = (student: SinhVien): HoSoFile[] => {
    if (student.hoSoFiles && student.hoSoFiles.length > 0) {
      return student.hoSoFiles;
    }
    if (student.hoSoFile) {
      return [
        {
          id: `legacy-${student.maSV}`,
          customName: student.hoSoFileName || 'Hồ sơ đính kèm',
          fileName: student.hoSoFileName || `HoSo_${student.maSV}.pdf`,
          fileUrl: student.hoSoFile,
          uploadedAt: student.ngayNhapHoc || '',
        },
      ];
    }
    return [];
  };

  const isStudentRole = userRole === 'STUDENT';
  const canEditProfile =
    userRole === 'ADMIN' ||
    userRole === 'LECTURER' ||
    Boolean(currentUser?.permissions?.canEditHoSo) ||
    Boolean(currentUser?.permissions?.canManageStudents);

  const studentCodeLower = (currentStudentCode || currentUser?.studentCode || currentUser?.username || '').toLowerCase();

  const studentSelfList = useMemo(() => {
    return students.filter(
      (s) =>
        (studentCodeLower && s.maSV.toLowerCase() === studentCodeLower) ||
        (s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [students, studentCodeLower, currentUser?.email]);

  const baseStudentsList = isStudentRole ? studentSelfList : students;
  const myProfile = isStudentRole ? studentSelfList[0] || null : null;

  const filteredStudents = useMemo(() => {
    return baseStudentsList
      .filter((s) => {
        const activeClass = selectedLop || selectedClass;
        const matchesClass = !activeClass || isSameClass(s.lop, activeClass);
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !q ||
          s.maSV.toLowerCase().includes(q) ||
          s.hoTen.toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.lop || '').toLowerCase().includes(q) ||
          (s.khoa || '').toLowerCase().includes(q);
        const sKhoa = normalizeFacultyName(s.khoa, s.lop);
        const matchesKhoa = !selectedKhoa || sKhoa.toLowerCase().trim() === selectedKhoa.toLowerCase().trim();
        const matchesCohort = !selectedCohortFilter || (s.lop ? getCohortForClass(s.lop) === selectedCohortFilter : false);
        return matchesClass && matchesSearch && matchesKhoa && matchesCohort;
      })
      .sort((a, b) => a.maSV.localeCompare(b.maSV, undefined, { numeric: true, sensitivity: 'base' }));
  }, [baseStudentsList, selectedLop, selectedClass, searchTerm, selectedKhoa, selectedCohortFilter]);

  const filteredClasses = useMemo(() => {
    return availableClasses.filter((lopName) => {
      const fac = getFacultyForClass(lopName);
      const matchFac = !selectedKhoa || fac === selectedKhoa;
      const matchCoh = !selectedCohortFilter || getCohortForClass(lopName) === selectedCohortFilter;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        lopName.toLowerCase().includes(q) ||
        getMajorForClass(lopName).toLowerCase().includes(q) ||
        fac.toLowerCase().includes(q);
      return matchFac && matchCoh && matchSearch;
    });
  }, [availableClasses, selectedKhoa, selectedCohortFilter, searchTerm, classMap]);

  const paginatedClasses = useMemo(() => {
    const start = (classesPage - 1) * classesPageSize;
    return filteredClasses.slice(start, start + classesPageSize);
  }, [filteredClasses, classesPage, classesPageSize]);

  const paginatedStudents = useMemo(() => {
    const start = (studentsPage - 1) * studentsPageSize;
    return filteredStudents.slice(start, start + studentsPageSize);
  }, [filteredStudents, studentsPage, studentsPageSize]);

  const handleOpenAdd = () => {
    const initialClass = selectedClass || availableClasses[0] || '';
    setFormData({
      maSV: '',
      hoTen: '',
      ngaySinh: '',
      gioiTinh: 'Nam',
      lop: initialClass,
      khoa: initialClass ? getFacultyForClass(initialClass) : '',
      soDienThoai: '',
      email: '',
      diaChi: '',
      ngayNhapHoc: '',
      trangThai: 'Đang học',
      hoSoFiles: [],
    });
    setFormError(null);
    setIsCustomClassInput(availableClasses.length === 0);
    setEditingStudent(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: SinhVien) => {
    setEditingStudent(student);
    const files = getStudentFiles(student);
    const normLop = normalizeClassName(student.lop);
    setFormData({
      ...student,
      lop: normLop,
      khoa: normalizeFacultyName(student.khoa, student.lop),
      hoSoFiles: files,
    });
    setFormError(null);
    setIsCustomClassInput(Boolean(normLop && !availableClasses.includes(normLop)));
    setIsAddModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const maSVTrim = (formData.maSV || '').trim();
    const hoTenTrim = (formData.hoTen || '').trim();
    const lopTrim = normalizeClassName((formData.lop || '').trim());

    if (!maSVTrim) {
      setFormError('Vui lòng nhập Mã sinh viên.');
      return;
    }
    if (!hoTenTrim) {
      setFormError('Vui lòng nhập Họ và tên sinh viên.');
      return;
    }
    if (!lopTrim) {
      setFormError('Vui lòng chọn hoặc nhập Lớp sinh hoạt.');
      return;
    }

    const normKhoa = (formData.khoa || '').trim() || getFacultyFromHelper(lopTrim);
    const payload: Partial<SinhVien> = {
      ...formData,
      maSV: maSVTrim,
      hoTen: hoTenTrim,
      lop: lopTrim,
      khoa: normKhoa,
    };

    if (editingStudent) {
      onUpdateStudent(editingStudent.maSV, payload);
    } else {
      onAddStudent(payload as SinhVien);
    }
    setFormError(null);
    setIsAddModalOpen(false);
  };

  const handleUpdateCustomName = (fileId: string, newName: string) => {
    setFormData((prev) => {
      const currentFiles = prev.hoSoFiles || [];
      const updated = currentFiles.map((f) => (f.id === fileId ? { ...f, customName: newName } : f));
      return { ...prev, hoSoFiles: updated };
    });
  };

  const handleRemoveFile = (fileId: string) => {
    setFormData((prev) => {
      const currentFiles = prev.hoSoFiles || [];
      const updated = currentFiles.filter((f) => f.id !== fileId);
      return {
        ...prev,
        hoSoFiles: updated,
        hoSoFile: updated[0]?.fileUrl || '',
        hoSoFileName: updated[0]?.fileName || '',
      };
    });
  };

  const handleMultipleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray: File[] = Array.from(files);
    const existingFiles = [...(formData.hoSoFiles || [])];

    let loadedCount = 0;
    filesArray.forEach((file: File, index: number) => {
      const reader = new FileReader();
      reader.onload = () => {
        let defaultName = file.name.replace(/\.[^/.]+$/, '');
        const fname = file.name.toLowerCase();
        if (fname.includes('cccd') || fname.includes('cmnd')) defaultName = 'Căn cước công dân';
        else if (fname.includes('thpt') || fname.includes('bang')) defaultName = 'Bằng tốt nghiệp THPT';
        else if (fname.includes('khai sinh')) defaultName = 'Giấy khai sinh';
        else if (fname.includes('nhap hoc') || fname.includes('giay bao')) defaultName = 'Giấy báo nhập học';
        else if (fname.includes('ly lich') || fname.includes('so yeu')) defaultName = 'Sơ yếu lý lịch';

        const localData = reader.result as string;
        apiService
          .uploadHoSoFile(formData.maSV || 'temp', file.name, localData)
          .then((res) => {
            const finalUrl = res.success && res.fileUrl ? res.fileUrl : localData;
            existingFiles.push({
              id: `file-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
              customName: defaultName,
              fileName: file.name,
              fileUrl: finalUrl,
              uploadedAt: new Date().toISOString().split('T')[0],
            });
            loadedCount++;
            if (loadedCount === filesArray.length) {
              setFormData((prev) => ({
                ...prev,
                hoSoFiles: [...existingFiles],
                hoSoFile: existingFiles[0]?.fileUrl || prev.hoSoFile,
                hoSoFileName: existingFiles[0]?.fileName || prev.hoSoFileName,
              }));
            }
          })
          .catch(() => {
            existingFiles.push({
              id: `file-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
              customName: defaultName,
              fileName: file.name,
              fileUrl: localData,
              uploadedAt: new Date().toISOString().split('T')[0],
            });
            loadedCount++;
            if (loadedCount === filesArray.length) {
              setFormData((prev) => ({
                ...prev,
                hoSoFiles: [...existingFiles],
                hoSoFile: existingFiles[0]?.fileUrl || prev.hoSoFile,
                hoSoFileName: existingFiles[0]?.fileName || prev.hoSoFileName,
              }));
            }
          });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDirectUploadSim = (student: SinhVien, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const existingFiles = getStudentFiles(student);
    const newFiles: HoSoFile[] = [...existingFiles];

    let loadedCount = 0;
    const filesArr: File[] = Array.from(files);
    filesArr.forEach((file: File, index: number) => {
      const reader = new FileReader();
      reader.onload = () => {
        const defaultName = file.name.replace(/\.[^/.]+$/, '') || 'Tài liệu đính kèm';
        const localData = reader.result as string;

        apiService
          .uploadHoSoFile(student.maSV, file.name, localData)
          .then((res) => {
            const finalUrl = res.success && res.fileUrl ? res.fileUrl : localData;
            newFiles.push({
              id: `hs-${Date.now()}-${index}`,
              customName: defaultName,
              fileName: file.name,
              fileUrl: finalUrl,
              uploadedAt: new Date().toISOString().split('T')[0],
            });
            loadedCount++;
            if (loadedCount === filesArr.length) {
              onUpdateStudent(student.maSV, {
                hoSoFiles: newFiles,
                hoSoFile: newFiles[0]?.fileUrl,
                hoSoFileName: newFiles[0]?.fileName,
              });
              onUploadHoSo(student.maSV, file.name, finalUrl);
            }
          })
          .catch(() => {
            newFiles.push({
              id: `hs-${Date.now()}-${index}`,
              customName: defaultName,
              fileName: file.name,
              fileUrl: localData,
              uploadedAt: new Date().toISOString().split('T')[0],
            });
            loadedCount++;
            if (loadedCount === filesArr.length) {
              onUpdateStudent(student.maSV, {
                hoSoFiles: newFiles,
                hoSoFile: newFiles[0]?.fileUrl,
                hoSoFileName: newFiles[0]?.fileName,
              });
            }
          });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleOpenSinglePdf = (
    fileUrl: string,
    customName: string,
    fileName: string,
    student: { hoTen: string; maSV: string; lop?: string }
  ) => {
    setPreviewDoc({
      fileUrl,
      customName,
      fileName,
      studentName: student.hoTen,
      maSV: student.maSV,
      lop: student.lop,
    });
  };

  const getStatusVariant = (trangThai?: string) => {
    if (trangThai === 'Đang học') return 'success';
    if (trangThai === 'Bảo lưu') return 'warning';
    if (trangThai === 'Tốt nghiệp') return 'info';
    return 'danger';
  };

  const hasActiveFilters = Boolean(searchTerm || selectedKhoa || selectedCohortFilter || selectedLop || selectedClass);
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedKhoa('');
    setSelectedCohortFilter('');
    setSelectedLop('');
    setSelectedClass(null);
  };

  // Loading & error gates when data is not loaded yet
  if (isLoading && students.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={isStudentRole ? 'Hồ sơ & Lý lịch Sinh viên' : 'Khoa, Ngành, Khóa & Lớp Học'}
          icon={isStudentRole ? GraduationCap : Building2}
        />
        <LoadingState rows={6} />
      </div>
    );
  }

  if (loadError && students.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={isStudentRole ? 'Hồ sơ & Lý lịch Sinh viên' : 'Khoa, Ngành, Khóa & Lớp Học'}
          icon={isStudentRole ? GraduationCap : Building2}
        />
        <ErrorState type="error" message={loadError} onRetry={onRetryLoad} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadError && students.length > 0 && (
        <ErrorBanner message={loadError} onRetry={onRetryLoad} />
      )}

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`p-3 rounded border text-xs font-medium flex items-center justify-between gap-3 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : toastMessage.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200'
              : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'error' ? (
              <X className="w-4 h-4 text-rose-600 shrink-0" />
            ) : toastMessage.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:opacity-70 rounded cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STUDENT ROLE VIEW                                                         */}
      {/* ========================================================================= */}
      {isStudentRole ? (
        myProfile ? (
          <div className="space-y-4">
            <PageHeader
              title="Hồ sơ & Lý lịch Sinh viên"
              icon={GraduationCap}
              actions={
                canEditProfile ? (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(myProfile)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Cập nhật lý lịch</span>
                  </button>
                ) : undefined
              }
            />

            {/* Portal Shortcuts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <a
                href="/grades"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchView?.('grades');
                }}
                className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors flex items-center gap-2.5 cursor-pointer group no-underline"
              >
                <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">
                  Bảng Điểm & GPA
                </span>
              </a>

              <a
                href="/schedule"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchView?.('schedule');
                }}
                className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-colors flex items-center gap-2.5 cursor-pointer group no-underline"
              >
                <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  Thời Khóa Biểu
                </span>
              </a>

              <a
                href="/retakes"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchView?.('retakes');
                }}
                className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-colors flex items-center gap-2.5 cursor-pointer group no-underline"
              >
                <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-400">
                  Thi Lại / Học Lại
                </span>
              </a>

              <a
                href="/training"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchView?.('training');
                }}
                className="p-2.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-colors flex items-center gap-2.5 cursor-pointer group no-underline"
              >
                <div className="p-1.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">
                  Điểm Rèn Luyện
                </span>
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Personal Details */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <img
                    src={getStudentAvatarUrl(myProfile)}
                    alt={myProfile.hoTen}
                    className="w-14 h-14 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(myProfile.hoTen || 'SV')}&background=1d4ed8&color=fff&size=120`;
                    }}
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{myProfile.hoTen}</h2>
                      <span className="font-mono text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900 tabular-nums">
                        {myProfile.maSV}
                      </span>
                      <StatusBadge
                        label={myProfile.trangThai || 'Đang học'}
                        variant={getStatusVariant(myProfile.trangThai)}
                        dot
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Lớp: <strong className="text-slate-800 dark:text-slate-200">{myProfile.lop || 'Chưa cập nhật'}</strong>
                      {myProfile.khoa ? (
                        <>
                          {' · Khoa: '}
                          <strong className="text-slate-800 dark:text-slate-200">{myProfile.khoa}</strong>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Mã sinh viên</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">{myProfile.maSV}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Họ và tên</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{myProfile.hoTen}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Lớp sinh hoạt</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-400">{myProfile.lop || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Khoa / Viện</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{myProfile.khoa || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Ngày sinh & Giới tính</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      {myProfile.ngaySinh || 'Chưa cập nhật'} <span className="font-sans">({myProfile.gioiTinh})</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Số điện thoại</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                      {myProfile.soDienThoai || 'Chưa cập nhật'}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Email sinh viên</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate block">
                      {myProfile.email || 'Chưa cập nhật'}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Ngày nhập học</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      {myProfile.ngayNhapHoc || 'Chưa cập nhật'}
                    </span>
                  </div>

                  <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Địa chỉ thường trú</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{myProfile.diaChi || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>

              {/* Digital Documents */}
              <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Hồ sơ số hóa
                      </h3>
                    </div>
                    <StatusBadge label={`${getStudentFiles(myProfile).length} tệp`} variant="info" />
                  </div>

                  <div className="mt-3 space-y-2">
                    {getStudentFiles(myProfile).length > 0 ? (
                      getStudentFiles(myProfile).map((file, idx) => (
                        <div
                          key={file.id || idx}
                          className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                              <span className="font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                                {file.customName || file.fileName}
                              </span>
                            </div>
                            {file.uploadedAt && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                                {file.uploadedAt}
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            {file.fileName}
                          </div>

                          <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSinglePdf(file.fileUrl, file.customName || 'Hồ sơ', file.fileName, myProfile)
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem</span>
                            </button>
                            <a
                              href={file.fileUrl}
                              download={file.fileName}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              <Download className="w-3 h-3" />
                              <span>Tải về</span>
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState message="Chưa có dữ liệu." />
                    )}
                  </div>
                </div>

                {canEditProfile && (
                  <label className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded hover:border-blue-600 dark:hover:border-blue-500 cursor-pointer bg-slate-50 dark:bg-slate-800/60 transition-colors text-center">
                    <Upload className="w-4 h-4 text-blue-700 dark:text-blue-400 mb-1" />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Tải lên tệp hồ sơ
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={(e) => handleDirectUploadSim(myProfile, e)}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <PageHeader title="Hồ sơ & Lý lịch Sinh viên" icon={GraduationCap} />
            <EmptyState message="Chưa có dữ liệu." />
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* ADMIN & LECTURER ROLE VIEW                                                */
        /* ========================================================================= */
        <>
          <PageHeader
            title="Khoa, Ngành, Khóa & Lớp Học"
            icon={Building2}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="tablist"
                  aria-label="Chế độ hiển thị"
                  className="inline-flex items-center p-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-medium"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'HIERARCHY' && selectedClass === null}
                    onClick={() => {
                      setViewMode('HIERARCHY');
                      setSelectedClass(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      viewMode === 'HIERARCHY' && selectedClass === null
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                    <span>Cơ cấu tổ chức</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'CLASSES' && selectedClass === null}
                    onClick={() => {
                      setViewMode('CLASSES');
                      setSelectedClass(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      viewMode === 'CLASSES' && selectedClass === null
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Danh mục Lớp</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'STUDENTS' || selectedClass !== null}
                    onClick={() => {
                      setViewMode('STUDENTS');
                      setSelectedClass(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      viewMode === 'STUDENTS' && selectedClass === null
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Danh sách Sinh viên</span>
                  </button>
                </div>

                {userRole === 'ADMIN' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      id="btn-add-class-academic"
                      type="button"
                      onClick={() => {
                        setNewClassFormData({
                          lopName: '',
                          khoa: uniqueFaculties[0] || '',
                          nganh: '',
                          khoaHoc: '',
                        });
                        setIsAddClassModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                      <span>Tạo Lớp mới</span>
                    </button>

                    <button
                      id="btn-import-students-excel"
                      type="button"
                      onClick={() => setIsExcelImportModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border border-emerald-600/40 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Import Excel</span>
                    </button>

                    <button
                      id="btn-add-student"
                      type="button"
                      onClick={handleOpenAdd}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm sinh viên</span>
                    </button>
                  </div>
                )}
              </div>
            }
          />

          <MetricStrip
            metrics={[
              { label: 'Khoa / Viện', value: uniqueFaculties.length, dotColor: 'blue' },
              { label: 'Ngành đào tạo', value: uniqueMajors.length },
              { label: 'Khóa tuyển sinh', value: uniqueCohorts.length },
              { label: 'Lớp học', value: availableClasses.length },
              { label: 'Tổng sinh viên', value: students.length },
              {
                label: 'Đang học',
                value: students.filter((s) => s.trangThai === 'Đang học').length,
                dotColor: 'emerald',
              },
              {
                label: 'Sĩ số TB',
                value:
                  availableClasses.length > 0
                    ? `${(students.length / availableClasses.length).toFixed(1)} SV/lớp`
                    : '—',
              },
            ]}
          />

          <DataToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Tìm theo Mã SV, họ tên, lớp, khoa hoặc ngành..."
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearAllFilters}
            filters={
              <>
                <select
                  id="filter-khoa-select"
                  value={selectedKhoa}
                  onChange={(e) => handleSelectKhoaFilter(e.target.value)}
                  aria-label="Lọc theo Khoa hoặc Viện"
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="">Tất cả Khoa / Viện ({uniqueFaculties.length})</option>
                  {uniqueFaculties.map((kh) => (
                    <option key={kh} value={kh}>
                      {kh}
                    </option>
                  ))}
                </select>

                <select
                  id="filter-khoa-hoc-select"
                  value={selectedCohortFilter}
                  onChange={(e) => setSelectedCohortFilter(e.target.value)}
                  aria-label="Lọc theo Khóa tuyển sinh"
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="">Tất cả Khóa ({uniqueCohorts.length})</option>
                  {uniqueCohorts.map((kh) => (
                    <option key={kh} value={kh}>
                      {kh}
                    </option>
                  ))}
                </select>

                <select
                  id="filter-lop-select"
                  value={selectedLop || selectedClass || ''}
                  onChange={(e) => handleSelectLopFilter(e.target.value)}
                  aria-label="Lọc theo Lớp học"
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="">Tất cả Lớp ({availableClasses.length})</option>
                  {availableClasses.map((lop) => (
                    <option key={lop} value={lop}>
                      {lop}
                    </option>
                  ))}
                </select>
              </>
            }
          />

          {/* ========================================================================= */}
          {/* LEVEL 1A: 4-TIER HIERARCHY TREE                                           */}
          {/* ========================================================================= */}
          {viewMode === 'HIERARCHY' && selectedClass === null && (
            <div className="space-y-4">
              {uniqueFaculties.length === 0 ? (
                <EmptyState message="Chưa có dữ liệu." />
              ) : uniqueFaculties.filter((f) => !selectedKhoa || f === selectedKhoa).every((faculty) => {
                  const facClasses = availableClasses.filter((lop) => {
                    const matchFaculty = getFacultyForClass(lop) === faculty;
                    const matchCohort = !selectedCohortFilter || getCohortForClass(lop) === selectedCohortFilter;
                    const q = searchTerm.trim().toLowerCase();
                    const matchSearch =
                      !q ||
                      lop.toLowerCase().includes(q) ||
                      getMajorForClass(lop).toLowerCase().includes(q) ||
                      faculty.toLowerCase().includes(q);
                    return matchFaculty && matchCohort && matchSearch;
                  });
                  return facClasses.length === 0;
                }) ? (
                <FilteredEmptyState onClearFilters={clearAllFilters} />
              ) : (
                uniqueFaculties
                  .filter((faculty) => !selectedKhoa || faculty === selectedKhoa)
                  .map((faculty) => {
                    const facultyClasses = availableClasses.filter((lop) => {
                      const matchFaculty = getFacultyForClass(lop) === faculty;
                      const matchCohort = !selectedCohortFilter || getCohortForClass(lop) === selectedCohortFilter;
                      const q = searchTerm.trim().toLowerCase();
                      const matchSearch =
                        !q ||
                        lop.toLowerCase().includes(q) ||
                        getMajorForClass(lop).toLowerCase().includes(q) ||
                        faculty.toLowerCase().includes(q);
                      return matchFaculty && matchCohort && matchSearch;
                    });

                    if (facultyClasses.length === 0 && (searchTerm || selectedCohortFilter || selectedKhoa)) {
                      return null;
                    }

                    const facultyStudents = students.filter(
                      (s) => normalizeFacultyName(s.khoa, s.lop) === faculty
                    );
                    const isExpanded = expandedFaculties[faculty] !== false;
                    const majorsInFaculty = Array.from(
                      new Set(facultyClasses.map((lop) => getMajorForClass(lop)))
                    ).sort();

                    return (
                      <div
                        key={faculty}
                        className="border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 overflow-hidden"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onClick={() => toggleFacultyExpand(faculty)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleFacultyExpand(faculty);
                            }
                          }}
                          className="px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-600"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="p-0.5 text-slate-500 dark:text-slate-300">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                            <Building2 className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                            <div className="flex items-center gap-2 min-w-0">
                              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide truncate">
                                {faculty}
                              </h2>
                              <StatusBadge label={`${facultyClasses.length} lớp`} variant="neutral" />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 shrink-0">
                            <span className="hidden sm:inline font-mono tabular-nums">
                              <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                                {facultyStudents.length}
                              </strong>{' '}
                              SV
                            </span>
                            <span className="hidden md:inline text-slate-300 dark:text-slate-700">|</span>
                            <span className="hidden md:inline font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                              {facultyStudents.filter((s) => s.trangThai === 'Đang học').length} đang học
                            </span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-3.5 space-y-4">
                            {majorsInFaculty.length === 0 ? (
                              <EmptyState message="Chưa có dữ liệu." />
                            ) : (
                              majorsInFaculty.map((major) => {
                                const classesInMajor = facultyClasses.filter((c) => getMajorForClass(c) === major);
                                const cohortsInMajor = Array.from(
                                  new Set(classesInMajor.map((c) => getCohortForClass(c)))
                                ).sort();

                                return (
                                  <div
                                    key={major}
                                    className="border border-slate-200 dark:border-slate-800 rounded bg-slate-50/50 dark:bg-slate-800/30 p-3 space-y-3"
                                  >
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                                      <div className="flex items-center gap-2">
                                        <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                          {major}
                                        </h3>
                                        <StatusBadge label={`${classesInMajor.length} lớp`} variant="info" />
                                      </div>
                                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                                        {classesInMajor.reduce(
                                          (sum, c) => sum + students.filter((s) => isSameClass(s.lop, c)).length,
                                          0
                                        )}{' '}
                                        SV
                                      </span>
                                    </div>

                                    <div className="space-y-3">
                                      {cohortsInMajor.map((cohort) => {
                                        const classesInCohort = classesInMajor.filter(
                                          (c) => getCohortForClass(c) === cohort
                                        );

                                        return (
                                          <div key={cohort} className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <GraduationCap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                {cohort}
                                              </span>
                                              <span className="text-[10px] text-slate-400 font-mono">
                                                ({classesInCohort.length})
                                              </span>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                                              {classesInCohort.map((lopName) => {
                                                const studentsInLop = students.filter((s) => isSameClass(s.lop, lopName));
                                                const activeCount = studentsInLop.filter(
                                                  (s) => s.trangThai === 'Đang học'
                                                ).length;
                                                const docCount = studentsInLop.reduce(
                                                  (acc, s) => acc + getStudentFiles(s).length,
                                                  0
                                                );

                                                return (
                                                  <div
                                                    key={lopName}
                                                    className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-colors space-y-2"
                                                  >
                                                    <div className="flex items-start justify-between gap-2">
                                                      <div className="min-w-0">
                                                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                                          {lopName}
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                          {faculty} · {major}
                                                        </p>
                                                      </div>
                                                      <StatusBadge label={cohort.split(' ')[0]} variant="info" />
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-1.5 py-1.5 px-2 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800 text-[11px]">
                                                      <div>
                                                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                                          Sĩ số
                                                        </span>
                                                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                                          {studentsInLop.length}
                                                        </span>
                                                      </div>
                                                      <div>
                                                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                                          Đang học
                                                        </span>
                                                        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                                          {activeCount}
                                                        </span>
                                                      </div>
                                                      <div>
                                                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                                                          Số hóa
                                                        </span>
                                                        <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                                                          {docCount} tệp
                                                        </span>
                                                      </div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                                                      <button
                                                        type="button"
                                                        onClick={() => handleSelectClass(lopName)}
                                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                                                      >
                                                        <span>Danh sách SV</span>
                                                        <ChevronRight className="w-3 h-3" />
                                                      </button>

                                                      {userRole === 'ADMIN' && (
                                                        <div className="flex items-center gap-1">
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              setEditingClassModal({
                                                                oldLopName: lopName,
                                                                lopName,
                                                                khoa: faculty,
                                                                nganh: major,
                                                                khoaHoc: cohort,
                                                              })
                                                            }
                                                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                                                            title="Chỉnh sửa lớp"
                                                            aria-label={`Chỉnh sửa lớp ${lopName}`}
                                                          >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                          </button>
                                                          <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteClass(lopName, e)}
                                                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                                                            title="Xóa danh sách sinh viên lớp"
                                                            aria-label={`Xóa lớp ${lopName}`}
                                                          >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                          </button>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* LEVEL 1B: TABULAR CLASS DIRECTORY                                         */}
          {/* ========================================================================= */}
          {viewMode === 'CLASSES' && selectedClass === null && (
            availableClasses.length === 0 ? (
              <EmptyState message="Chưa có dữ liệu." />
            ) : filteredClasses.length === 0 ? (
              <FilteredEmptyState onClearFilters={clearAllFilters} />
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-slate-500" />
                    <span>Danh mục Lớp học ({filteredClasses.length})</span>
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-800 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">STT</th>
                        <th className="py-2.5 px-3">Tên Lớp</th>
                        <th className="py-2.5 px-3">Khoa / Viện</th>
                        <th className="py-2.5 px-3">Ngành</th>
                        <th className="py-2.5 px-3">Khóa</th>
                        <th className="py-2.5 px-3 text-right">Sĩ Số</th>
                        <th className="py-2.5 px-3 text-right">Đang Học</th>
                        <th className="py-2.5 px-3 text-right">Hồ Sơ</th>
                        <th className="py-2.5 px-3 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {paginatedClasses.map((lopName, idx) => {
                        const studentsInLop = students.filter((s) => isSameClass(s.lop, lopName));
                        const activeCount = studentsInLop.filter((s) => s.trangThai === 'Đang học').length;
                        const hasScanCount = studentsInLop.reduce((acc, s) => acc + getStudentFiles(s).length, 0);
                        const faculty = getFacultyForClass(lopName);
                        const major = getMajorForClass(lopName);
                        const cohort = getCohortForClass(lopName);
                        const rowNumber = (classesPage - 1) * classesPageSize + idx + 1;

                        return (
                          <tr
                            key={lopName}
                            tabIndex={0}
                            onClick={() => handleSelectClass(lopName)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelectClass(lopName);
                              }
                            }}
                            className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer transition-colors focus:outline-none focus:bg-blue-50/50 dark:focus:bg-blue-950/30"
                          >
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                              {rowNumber}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {lopName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{faculty}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]">{major}</td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">{cohort}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium tabular-nums">
                              {studentsInLop.length}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                              {activeCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                              {hasScanCount}
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleSelectClass(lopName)}
                                className="px-2 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded border border-blue-200 dark:border-blue-900 transition-colors cursor-pointer"
                              >
                                Xem lớp
                              </button>
                              {userRole === 'ADMIN' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingClassModal({
                                        oldLopName: lopName,
                                        lopName,
                                        khoa: faculty,
                                        nganh: major,
                                        khoaHoc: cohort,
                                      });
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                                    title="Chỉnh sửa lớp"
                                    aria-label={`Chỉnh sửa lớp ${lopName}`}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteClass(lopName, e)}
                                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                                    title="Xóa danh sách sinh viên lớp"
                                    aria-label={`Xóa lớp ${lopName}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <PaginationBar
                  currentPage={classesPage}
                  pageSize={classesPageSize}
                  totalItems={filteredClasses.length}
                  onPageChange={setClassesPage}
                  onPageSizeChange={setClassesPageSize}
                />
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* LEVEL 2: STUDENT ROSTER TABLE                                             */}
          {/* ========================================================================= */}
          {(viewMode === 'STUDENTS' || selectedClass !== null) && (
            <div className="space-y-3">
              {selectedClass && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 px-3 bg-slate-100/70 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectClass(null);
                        setViewMode('HIERARCHY');
                      }}
                      className="inline-flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Cơ cấu tổ chức</span>
                    </button>
                    <span className="text-slate-400 dark:text-slate-600">/</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedKhoa(getFacultyForClass(selectedClass));
                        handleSelectClass(null);
                        setViewMode('CLASSES');
                      }}
                      className="text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
                    >
                      {getFacultyForClass(selectedClass)}
                    </button>
                    <span className="text-slate-400 dark:text-slate-600">/</span>
                    <span className="text-slate-600 dark:text-slate-400">{getMajorForClass(selectedClass)}</span>
                    <span className="text-slate-400 dark:text-slate-600">/</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">Lớp {selectedClass}</span>
                    <span className="text-[11px] text-slate-500 font-mono">({getCohortForClass(selectedClass)})</span>
                  </div>

                  {userRole === 'ADMIN' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingClassModal({
                            oldLopName: selectedClass,
                            lopName: selectedClass,
                            khoa: getFacultyForClass(selectedClass),
                            nganh: getMajorForClass(selectedClass),
                            khoaHoc: getCohortForClass(selectedClass),
                          })
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:text-blue-700 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Sửa Lớp / Khoa</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClass(selectedClass, e)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Xóa SV lớp</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {students.length === 0 ? (
                <EmptyState message="Chưa có dữ liệu." />
              ) : filteredStudents.length === 0 ? (
                <FilteredEmptyState onClearFilters={clearAllFilters} />
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 overflow-hidden">
                  <div className="overflow-x-auto max-h-[calc(100vh-270px)]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-800 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-12">STT</th>
                          <th className="py-2.5 px-3">Mã SV & Họ Tên</th>
                          <th className="py-2.5 px-3">Lớp / Khoa</th>
                          <th className="py-2.5 px-3">Ngày Sinh / GT</th>
                          <th className="py-2.5 px-3">Liên Hệ</th>
                          <th className="py-2.5 px-3">Hồ Sơ</th>
                          <th className="py-2.5 px-3">Trạng Thái</th>
                          <th className="py-2.5 px-3 text-right">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {paginatedStudents.map((s, index) => {
                          const files = getStudentFiles(s);
                          const rowNumber = (studentsPage - 1) * studentsPageSize + index + 1;
                          return (
                            <tr
                              key={s.maSV}
                              tabIndex={0}
                              onClick={() => setViewingDetailStudent(s)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  if (e.target !== e.currentTarget) return;
                                  e.preventDefault();
                                  setViewingDetailStudent(s);
                                }
                              }}
                              className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors cursor-pointer group focus:outline-none focus:bg-blue-50/50 dark:focus:bg-blue-950/30"
                            >
                              <td className="py-2.5 px-3 text-center font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                                {rowNumber}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={getStudentAvatarUrl(s)}
                                    alt={s.hoTen}
                                    className="w-7 h-7 rounded object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0"
                                    onError={(e) => {
                                      const clean = encodeURIComponent(s.hoTen || 'SV');
                                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${clean}&background=1d4ed8&color=fff&size=100&bold=true`;
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                                      {s.hoTen}
                                    </div>
                                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                                      {s.maSV}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-slate-800 dark:text-slate-200">{s.lop}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                                  {s.khoa}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums">
                                <div>{s.ngaySinh || '—'}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">{s.gioiTinh}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="truncate max-w-[170px] text-slate-800 dark:text-slate-200">
                                  {s.email || '—'}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                                  {s.soDienThoai || '—'}
                                </div>
                              </td>
                              <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                                {files.length > 0 ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setViewingDocumentStudent(s)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors cursor-pointer"
                                      title="Xem hồ sơ số hóa"
                                    >
                                      <Paperclip className="w-3 h-3" />
                                      <span>{files.length} tệp</span>
                                    </button>
                                    {canEditProfile && (
                                      <label
                                        className="inline-flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        title="Bổ sung tệp"
                                      >
                                        <Upload className="w-3 h-3" />
                                        <span>+</span>
                                        <input
                                          type="file"
                                          multiple
                                          accept=".pdf,.jpg,.jpeg,.png"
                                          className="hidden"
                                          onChange={(e) => handleDirectUploadSim(s, e)}
                                        />
                                      </label>
                                    )}
                                  </div>
                                ) : canEditProfile ? (
                                  <label className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 transition-colors">
                                    <Upload className="w-3 h-3 text-slate-400" />
                                    <span>Tải file</span>
                                    <input
                                      type="file"
                                      multiple
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      className="hidden"
                                      onChange={(e) => handleDirectUploadSim(s, e)}
                                    />
                                  </label>
                                ) : (
                                  <span className="text-[11px] text-slate-400">Chưa có</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                                {userRole === 'ADMIN' ? (
                                  <select
                                    value={s.trangThai || 'Đang học'}
                                    aria-label={`Trạng thái sinh viên ${s.hoTen}`}
                                    onChange={(e) => {
                                      const newStatus = e.target.value as SinhVien['trangThai'];
                                      onUpdateStudent(s.maSV, { trangThai: newStatus });
                                    }}
                                    className={`text-[11px] font-medium px-2 py-0.5 rounded border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors ${
                                      s.trangThai === 'Đang học'
                                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                                        : s.trangThai === 'Bảo lưu'
                                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                                        : s.trangThai === 'Tốt nghiệp'
                                        ? 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                                        : 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                                    }`}
                                  >
                                    <option value="Đang học">Đang học</option>
                                    <option value="Bảo lưu">Bảo lưu</option>
                                    <option value="Tốt nghiệp">Tốt nghiệp</option>
                                    <option value="Thôi học">Thôi học</option>
                                  </select>
                                ) : (
                                  <StatusBadge
                                    label={s.trangThai || 'Đang học'}
                                    variant={getStatusVariant(s.trangThai)}
                                    dot
                                  />
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setViewingDetailStudent(s)}
                                    className="p-1 text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                    title="Xem chi tiết"
                                    aria-label={`Xem chi tiết ${s.hoTen}`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {canEditProfile && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(s)}
                                      className="p-1 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                      title="Chỉnh sửa"
                                      aria-label={`Chỉnh sửa ${s.hoTen}`}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {userRole === 'ADMIN' && (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteStudent(s.maSV)}
                                      className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                      title="Xóa sinh viên"
                                      aria-label={`Xóa ${s.hoTen}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <PaginationBar
                    currentPage={studentsPage}
                    pageSize={studentsPageSize}
                    totalItems={filteredStudents.length}
                    onPageChange={setStudentsPage}
                    onPageSizeChange={setStudentsPageSize}
                    pageSizeOptions={[10, 20, 50]}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT STUDENT MODAL                                                  */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${formIdPrefix}-student-modal-title`}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-2xl w-full p-5 shadow-xl relative my-auto max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                <h3
                  id={`${formIdPrefix}-student-modal-title`}
                  className="text-sm font-bold text-slate-900 dark:text-slate-100"
                >
                  {editingStudent ? 'Cập nhật Hồ sơ Sinh viên' : 'Thêm Hồ sơ Sinh viên'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Đóng biểu mẫu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && <ErrorBanner message={formError} />}

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Section 1 */}
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>1. Thông tin định danh & Ảnh hồ sơ</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
                  <div className="relative shrink-0">
                    <img
                      src={getStudentAvatarUrl(formData)}
                      alt={formData.hoTen || 'Avatar'}
                      className="w-14 h-14 rounded object-cover border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.hoTen || 'SV')}&background=1d4ed8&color=fff&size=120`;
                      }}
                    />
                    <label
                      className="absolute -bottom-1 -right-1 p-1 bg-blue-700 hover:bg-blue-800 text-white rounded cursor-pointer transition-colors"
                      title="Tải ảnh thẻ"
                    >
                      <Camera className="w-3 h-3" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const localData = reader.result as string;
                            setFormData((prev) => ({ ...prev, avatar: localData }));
                            const targetMaSV = formData.maSV || editingStudent?.maSV;
                            if (targetMaSV) {
                              if (editingStudent) {
                                onUpdateStudent(targetMaSV, { avatar: localData });
                              }
                              apiService.uploadAvatar(targetMaSV, localData).then((res) => {
                                if (res.success && res.avatarUrl) {
                                  setFormData((prev) => ({ ...prev, avatar: res.avatarUrl }));
                                  if (editingStudent) {
                                    onUpdateStudent(targetMaSV, { avatar: res.avatarUrl });
                                  }
                                }
                              });
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">
                      Ảnh thẻ sinh viên
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-masv`}
                      className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      Mã Sinh viên (MSSV) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id={`${formIdPrefix}-masv`}
                      type="text"
                      disabled={!!editingStudent}
                      value={formData.maSV || ''}
                      onChange={(e) => setFormData({ ...formData, maSV: e.target.value })}
                      placeholder="Ví dụ: 25DDS0904188"
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-slate-100 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-hoten`}
                      className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      Họ và tên <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id={`${formIdPrefix}-hoten`}
                      type="text"
                      value={formData.hoTen || ''}
                      onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                      placeholder="Nhập họ và tên"
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>2. Thông tin đào tạo & Lớp sinh hoạt</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor={`${formIdPrefix}-lop`}
                        className="font-medium text-slate-700 dark:text-slate-300"
                      >
                        Lớp sinh hoạt <span className="text-rose-600">*</span>
                      </label>
                      {availableClasses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCustomClassInput((prev) => !prev)}
                          className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {isCustomClassInput ? 'Chọn từ danh mục' : 'Nhập lớp khác'}
                        </button>
                      )}
                    </div>
                    {availableClasses.length > 0 && !isCustomClassInput ? (
                      <select
                        id={`${formIdPrefix}-lop`}
                        value={formData.lop || ''}
                        onChange={(e) => {
                          const newLop = e.target.value;
                          setFormData({
                            ...formData,
                            lop: newLop,
                            khoa: newLop ? getFacultyForClass(newLop) : '',
                          });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                        required
                      >
                        <option value="" disabled>
                          -- Chọn lớp --
                        </option>
                        {availableClasses.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`${formIdPrefix}-lop`}
                        type="text"
                        value={formData.lop || ''}
                        onChange={(e) => {
                          const newLop = e.target.value;
                          setFormData({
                            ...formData,
                            lop: newLop,
                            khoa: formData.khoa || (newLop ? getFacultyFromHelper(newLop) : ''),
                          });
                        }}
                        placeholder="Nhập tên lớp sinh hoạt"
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-khoa`}
                      className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      Khoa / Viện
                    </label>
                    <input
                      id={`${formIdPrefix}-khoa`}
                      type="text"
                      value={formData.khoa || ''}
                      onChange={(e) => setFormData({ ...formData, khoa: e.target.value })}
                      placeholder="Nhập Khoa / Viện"
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-trangthai`}
                      className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      Trạng thái
                    </label>
                    <select
                      id={`${formIdPrefix}-trangthai`}
                      value={formData.trangThai || 'Đang học'}
                      onChange={(e) => setFormData({ ...formData, trangThai: e.target.value as SinhVien['trangThai'] })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                    >
                      <option value="Đang học">Đang học</option>
                      <option value="Bảo lưu">Bảo lưu</option>
                      <option value="Tốt nghiệp">Tốt nghiệp</option>
                      <option value="Thôi học">Thôi học</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-ngaynhaphoc`}
                      className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      Ngày nhập học
                    </label>
                    <input
                      id={`${formIdPrefix}-ngaynhaphoc`}
                      type="date"
                      value={formData.ngayNhapHoc || ''}
                      onChange={(e) => setFormData({ ...formData, ngayNhapHoc: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                  <span>3. Thông tin cá nhân & Liên lạc</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-ngaysinh`}
                      className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      Ngày sinh
                    </label>
                    <input
                      id={`${formIdPrefix}-ngaysinh`}
                      type="date"
                      value={formData.ngaySinh || ''}
                      onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-gioitinh`}
                      className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      Giới tính
                    </label>
                    <select
                      id={`${formIdPrefix}-gioitinh`}
                      value={formData.gioiTinh || 'Nam'}
                      onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value as 'Nam' | 'Nữ' })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-sdt`}
                      className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      Số điện thoại
                    </label>
                    <input
                      id={`${formIdPrefix}-sdt`}
                      type="text"
                      value={formData.soDienThoai || ''}
                      onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                      placeholder="09xxxxxxxx"
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${formIdPrefix}-email`}
                      className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                    >
                      Email trường
                    </label>
                    <input
                      id={`${formIdPrefix}-email`}
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="tensv@tdnu.edu.vn"
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor={`${formIdPrefix}-diachi`}
                    className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                  >
                    Địa chỉ thường trú
                  </label>
                  <input
                    id={`${formIdPrefix}-diachi`}
                    type="text"
                    value={formData.diaChi || ''}
                    onChange={(e) => setFormData({ ...formData, diaChi: e.target.value })}
                    placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Section 4 */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                    <span>4. Hồ sơ số hóa ({formData.hoSoFiles?.length || 0} tệp)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal normal-case">PDF, JPG, PNG</span>
                </div>

                {formData.hoSoFiles && formData.hoSoFiles.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {formData.hoSoFiles.map((file, idx) => (
                      <div
                        key={file.id || idx}
                        className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                            <div className="flex-1">
                              <label
                                htmlFor={`${formIdPrefix}-doc-${file.id}`}
                                className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mb-0.5"
                              >
                                Tên tài liệu #{idx + 1}
                              </label>
                              <input
                                id={`${formIdPrefix}-doc-${file.id}`}
                                type="text"
                                value={file.customName}
                                onChange={(e) => handleUpdateCustomName(file.id, e.target.value)}
                                className="w-full text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 self-end mb-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSinglePdf(file.fileUrl, file.customName || 'Hồ sơ', file.fileName, {
                                  hoTen: formData.hoTen || 'Sinh viên',
                                  maSV: formData.maSV || '',
                                  lop: formData.lop || '',
                                })
                              }
                              className="p-1 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors cursor-pointer"
                              title="Xem tài liệu"
                              aria-label="Xem tài liệu"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveFile(file.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-colors cursor-pointer"
                              title="Xóa tệp"
                              aria-label="Xóa tệp"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono pt-1 border-t border-slate-200 dark:border-slate-800">
                          <span className="truncate">{file.fileName}</span>
                          {file.uploadedAt && <span className="shrink-0 tabular-nums">{file.uploadedAt}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded hover:border-blue-600 dark:hover:border-blue-500 cursor-pointer bg-slate-50 dark:bg-slate-800/60 transition-colors text-center">
                  <Upload className="w-4 h-4 text-blue-700 dark:text-blue-400 mb-1" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Chọn tệp hồ sơ (PDF, JPG, PNG)
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    onChange={handleMultipleFilesUpload}
                  />
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer text-xs font-medium"
                >
                  {editingStudent ? 'Lưu cập nhật' : 'Tạo hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT LIST MODAL FOR A STUDENT                                         */}
      {/* ========================================================================= */}
      {viewingDocumentStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={() => setViewingDocumentStudent(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-2xl w-full p-5 shadow-xl relative my-auto max-h-[88vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Hồ sơ số hóa sinh viên</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    <strong className="text-slate-800 dark:text-slate-200">{viewingDocumentStudent.hoTen}</strong> (
                    <span className="font-mono">{viewingDocumentStudent.maSV}</span>) · {viewingDocumentStudent.lop}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDocumentStudent(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Đóng danh mục hồ sơ"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const studentFiles = getStudentFiles(viewingDocumentStudent);
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span>
                      Tổng: <strong className="font-mono text-slate-900 dark:text-slate-100">{studentFiles.length}</strong> tệp
                    </span>
                    {canEditProfile ? (
                      <label className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-400 hover:underline cursor-pointer font-medium">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm tệp</span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => handleDirectUploadSim(viewingDocumentStudent, e)}
                        />
                      </label>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Chỉ xem</span>
                      </span>
                    )}
                  </div>

                  {studentFiles.length > 0 ? (
                    <div className="space-y-2">
                      {studentFiles.map((file, idx) => (
                        <div
                          key={file.id || idx}
                          className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-blue-700 text-white text-[10px] font-mono font-medium flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                                {file.customName || file.fileName}
                              </h4>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono pl-7 flex items-center gap-2.5">
                              <span className="truncate">{file.fileName}</span>
                              {file.uploadedAt && (
                                <>
                                  <span>·</span>
                                  <span className="tabular-nums">{file.uploadedAt}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSinglePdf(
                                  file.fileUrl,
                                  file.customName || 'Hồ sơ',
                                  file.fileName,
                                  viewingDocumentStudent
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-medium transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Xem</span>
                            </button>

                            <a
                              href={file.fileUrl}
                              download={file.fileName}
                              className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer"
                              title="Tải về"
                              aria-label={`Tải về ${file.fileName}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="Chưa có dữ liệu." />
                  )}
                </div>
              );
            })()}

            <div className="pt-2 flex justify-end border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingDocumentStudent(null)}
                className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs font-medium cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-APP DOCUMENT PREVIEW MODAL (Replaces window.open)                      */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {previewDoc.customName}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                  {previewDoc.studentName} ({previewDoc.maSV}) · {previewDoc.fileName}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewDoc.fileUrl}
                  download={previewDoc.fileName}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải về</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Đóng trình xem"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-auto p-3 flex items-center justify-center min-h-[60vh]">
              {isImageFile(previewDoc.fileUrl, previewDoc.fileName) ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.customName}
                  className="max-w-full max-h-[75vh] object-contain rounded border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.customName}
                  className="w-full h-[75vh] bg-white rounded border border-slate-200 dark:border-slate-800"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIDE DRAWER */}
      <StudentDetailDrawer
        isOpen={Boolean(viewingDetailStudent)}
        student={viewingDetailStudent}
        grades={grades}
        trainingPoints={trainingPoints}
        retakes={retakes}
        activeSemester={activeSemester}
        onPreviewFile={handleOpenSinglePdf}
        onClose={() => setViewingDetailStudent(null)}
        onEdit={
          canEditProfile
            ? (st) => {
                setViewingDetailStudent(null);
                handleOpenEdit(st);
              }
            : undefined
        }
      />

      {/* MODAL IMPORT STUDENTS FROM EXCEL */}
      {isExcelImportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setIsExcelImportModalOpen(false);
            setPreviewExcelStudents([]);
            setExcelFileName('');
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-2xl w-full p-5 shadow-xl relative max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-900">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Import Danh sách Sinh viên từ Excel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsExcelImportModalOpen(false);
                  setPreviewExcelStudents([]);
                  setExcelFileName('');
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Đóng cửa sổ import"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                Bước 1: Tải tệp Excel mẫu
              </h4>
              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs font-medium transition-colors shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tải tệp mẫu (.xlsx)</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                Bước 2: Chọn tệp danh sách (.xlsx, .xls, .csv)
              </h4>

              <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded hover:border-emerald-600 cursor-pointer bg-slate-50 dark:bg-slate-800/60 transition-colors text-center">
                <FileUp className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  {excelFileName ? `Đã chọn: ${excelFileName}` : 'Chọn tệp Excel'}
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleExcelFileUpload}
                />
              </label>
            </div>

            {previewExcelStudents.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Xem trước ({previewExcelStudents.length} sinh viên)</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">{excelFileName}</span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold sticky top-0 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-1.5 px-2.5 w-10 text-center">STT</th>
                        <th className="py-1.5 px-2.5">Mã SV</th>
                        <th className="py-1.5 px-2.5">Họ và tên</th>
                        <th className="py-1.5 px-2.5">Lớp</th>
                        <th className="py-1.5 px-2.5">Khoa / Viện</th>
                        <th className="py-1.5 px-2.5">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {previewExcelStudents.map((st, idx) => (
                        <tr key={st.maSV || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-1 px-2.5 text-center font-mono text-slate-500 tabular-nums">{idx + 1}</td>
                          <td className="py-1 px-2.5 font-mono font-semibold text-blue-700 dark:text-blue-400">
                            {st.maSV}
                          </td>
                          <td className="py-1 px-2.5 font-medium">{st.hoTen}</td>
                          <td className="py-1 px-2.5">{st.lop}</td>
                          <td className="py-1 px-2.5 text-slate-500 dark:text-slate-400">{st.khoa}</td>
                          <td className="py-1 px-2.5 font-mono text-slate-500 dark:text-slate-400">{st.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsExcelImportModalOpen(false);
                  setPreviewExcelStudents([]);
                  setExcelFileName('');
                }}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={previewExcelStudents.length === 0}
                onClick={handleConfirmImportExcel}
                className="px-3.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xác nhận Import ({previewExcelStudents.length} SV)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CLASS & FACULTY */}
      {editingClassModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingClassModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-md w-full p-5 shadow-xl relative my-auto max-h-[88vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Chỉnh sửa Lớp học & Khoa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingClassModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Đóng hộp thoại"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditClass} className="space-y-3.5 text-xs">
              <div>
                <label
                  htmlFor={`${formIdPrefix}-edit-lop`}
                  className="font-medium block mb-1 text-slate-700 dark:text-slate-300"
                >
                  Tên Lớp Học <span className="text-rose-600">*</span>
                </label>
                <input
                  id={`${formIdPrefix}-edit-lop`}
                  type="text"
                  value={editingClassModal.lopName}
                  onChange={(e) =>
                    setEditingClassModal({ ...editingClassModal, lopName: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 font-medium"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`${formIdPrefix}-edit-khoa`}
                  className="font-medium block mb-1 text-slate-700 dark:text-slate-300"
                >
                  Khoa / Viện <span className="text-rose-600">*</span>
                </label>
                {uniqueFaculties.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      aria-label="Chọn Khoa"
                      value={uniqueFaculties.includes(editingClassModal.khoa) ? editingClassModal.khoa : 'OTHER'}
                      onChange={(e) => {
                        if (e.target.value !== 'OTHER') {
                          setEditingClassModal({ ...editingClassModal, khoa: e.target.value });
                        }
                      }}
                      className="w-1/2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 text-xs cursor-pointer"
                    >
                      {uniqueFaculties.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                      <option value="OTHER">Nhập khác...</option>
                    </select>
                    <input
                      id={`${formIdPrefix}-edit-khoa`}
                      type="text"
                      value={editingClassModal.khoa}
                      onChange={(e) =>
                        setEditingClassModal({ ...editingClassModal, khoa: e.target.value })
                      }
                      placeholder="Tên Khoa/Viện"
                      className="w-1/2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 text-xs font-medium"
                      required
                    />
                  </div>
                ) : (
                  <input
                    id={`${formIdPrefix}-edit-khoa`}
                    type="text"
                    value={editingClassModal.khoa}
                    onChange={(e) =>
                      setEditingClassModal({ ...editingClassModal, khoa: e.target.value })
                    }
                    placeholder="Nhập tên Khoa / Viện"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 text-xs font-medium"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium block mb-1 text-slate-700 dark:text-slate-300">Ngành Đào Tạo</span>
                  <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 text-xs">
                    {editingClassModal.nganh || getMajorForClass(editingClassModal.lopName)}
                  </div>
                </div>
                <div>
                  <span className="font-medium block mb-1 text-slate-700 dark:text-slate-300">Khóa Tuyển Sinh</span>
                  <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 text-xs font-mono">
                    {editingClassModal.khoaHoc || getCohortForClass(editingClassModal.lopName)}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingClassModal(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW CLASS */}
      {isAddClassModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsAddClassModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-md w-full p-5 shadow-xl relative my-auto max-h-[88vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Tạo Lớp Học Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Đóng hộp thoại"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewClass} className="space-y-3.5 text-xs">
              <div>
                <label
                  htmlFor={`${formIdPrefix}-new-lop`}
                  className="font-medium block mb-1 text-slate-700 dark:text-slate-300"
                >
                  Tên Lớp Học Mới <span className="text-rose-600">*</span>
                </label>
                <input
                  id={`${formIdPrefix}-new-lop`}
                  type="text"
                  value={newClassFormData.lopName}
                  onChange={(e) => setNewClassFormData({ ...newClassFormData, lopName: e.target.value })}
                  placeholder="Ví dụ: CNKT Cơ khí 25DDS09041"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 font-medium"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`${formIdPrefix}-new-khoa`}
                  className="font-medium block mb-1 text-slate-700 dark:text-slate-300"
                >
                  Khoa / Viện Quản Lý <span className="text-rose-600">*</span>
                </label>
                {uniqueFaculties.length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      aria-label="Chọn Khoa"
                      value={uniqueFaculties.includes(newClassFormData.khoa) ? newClassFormData.khoa : 'OTHER'}
                      onChange={(e) => {
                        if (e.target.value !== 'OTHER') {
                          setNewClassFormData({ ...newClassFormData, khoa: e.target.value });
                        }
                      }}
                      className="w-1/2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 text-xs cursor-pointer"
                    >
                      {uniqueFaculties.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                      <option value="OTHER">Nhập khác...</option>
                    </select>
                    <input
                      id={`${formIdPrefix}-new-khoa`}
                      type="text"
                      value={newClassFormData.khoa}
                      onChange={(e) => setNewClassFormData({ ...newClassFormData, khoa: e.target.value })}
                      placeholder="Tên Khoa/Viện"
                      className="w-1/2 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 text-xs font-medium"
                      required
                    />
                  </div>
                ) : (
                  <input
                    id={`${formIdPrefix}-new-khoa`}
                    type="text"
                    value={newClassFormData.khoa}
                    onChange={(e) => setNewClassFormData({ ...newClassFormData, khoa: e.target.value })}
                    placeholder="Nhập tên Khoa / Viện"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 text-xs font-medium"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor={`${formIdPrefix}-new-nganh`}
                    className="font-medium block mb-1 text-slate-700 dark:text-slate-300"
                  >
                    Ngành Đào Tạo
                  </label>
                  <input
                    id={`${formIdPrefix}-new-nganh`}
                    type="text"
                    list={`${formIdPrefix}-majors-list`}
                    value={newClassFormData.nganh}
                    onChange={(e) => setNewClassFormData({ ...newClassFormData, nganh: e.target.value })}
                    placeholder="Nhập ngành đào tạo"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 text-xs"
                  />
                  <datalist id={`${formIdPrefix}-majors-list`}>
                    {uniqueMajors.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label
                    htmlFor={`${formIdPrefix}-new-khoahoc`}
                    className="font-medium block mb-1 text-slate-700 dark:text-slate-300"
                  >
                    Khóa Tuyển Sinh
                  </label>
                  <input
                    id={`${formIdPrefix}-new-khoahoc`}
                    type="text"
                    list={`${formIdPrefix}-cohorts-list`}
                    value={newClassFormData.khoaHoc}
                    onChange={(e) => setNewClassFormData({ ...newClassFormData, khoaHoc: e.target.value })}
                    placeholder="Ví dụ: Khóa 2025 (K25)"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded focus:border-blue-600 focus:outline-none text-slate-900 dark:text-slate-100 text-xs font-mono"
                  />
                  <datalist id={`${formIdPrefix}-cohorts-list`}>
                    {uniqueCohorts.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Tạo lớp mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE CLASS DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(classToDeleteConfirm)}
        title="Xác nhận xóa sinh viên trong lớp"
        message="Bạn có chắc chắn muốn xóa toàn bộ sinh viên thuộc lớp học này không? Bản thân lớp học vẫn được giữ lại."
        confirmLabel="Xóa sinh viên lớp"
        variant="danger"
        isSubmitting={isDeletingClass}
        onCancel={() => setClassToDeleteConfirm(null)}
        onConfirm={handleExecuteDeleteClass}
        details={
          classToDeleteConfirm && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Lớp sinh hoạt:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {classToDeleteConfirm.lopName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Khoa / Viện:</span>
                <span className="text-slate-800 dark:text-slate-200">{classToDeleteConfirm.faculty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Số lượng xóa:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {classToDeleteConfirm.count} sinh viên
                </span>
              </div>
            </div>
          )
        }
      />
    </div>
  );
};
