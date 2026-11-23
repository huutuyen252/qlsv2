import React, { useState, useMemo, useEffect, useId, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  AdministrativeUnit,
  SinhVien,
  UserRole,
  HoSoFile,
  User,
  Diem,
  RenLuyen,
  ThiLaiHocLai,
  FlatStudentFilterInput,
  SortDirection,
  StudentBuilderRow,
  StudentListSortBy,
  StudentFullProfileResponse,
} from '../../types';
import { apiService } from '../../services/apiService';
import { profileService, ProfileCatalogsBundle } from '../../services/profileService';
import { StudentDetailDrawer } from './StudentDetailDrawer';
import { StudentProfileForm } from './StudentProfileForm';
import type { ProfileTabKey } from './StudentFullProfileView';
import {
  PageHeader,
  StatusBadge,
  PaginationBar,
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
  FACULTY_KTCS,
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
  SlidersHorizontal,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

const EMPTY_FILTERS: FlatStudentFilterInput = {
  provinceUnitId: '',
  communeUnitId: '',
  ethnicityId: '',
  religionId: '',
};

function cloneFilters(f: FlatStudentFilterInput): FlatStudentFilterInput {
  return {
    ...EMPTY_FILTERS,
    ...f,
  };
}

function countActiveFilters(f: FlatStudentFilterInput): number {
  let n = 0;
  if (f.provinceUnitId) n++;
  if (f.communeUnitId) n++;
  if (f.ethnicityId) n++;
  if (f.religionId) n++;
  return n;
}

export const getStudentAvatarUrl = (student: Partial<SinhVien>): string => {
  if (student.avatar && student.avatar.trim()) {
    return student.avatar.trim();
  }
  const parts = (student.hoTen || student.maSV || 'SV').trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length === 0
      ? 'SV'
      : parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  const bg = student.gioiTinh === 'Nữ' ? '#be123c' : '#1d4ed8';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="20" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="48" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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

interface FilterChipItem {
  key: string;
  label: string;
  onRemove: () => void;
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
  onAddStudent: (student: SinhVien) => Promise<void> | void;
  onUpdateStudent: (maSV: string, student: Partial<SinhVien>) => Promise<void> | void;
  onDeleteStudent: (maSV: string) => void;
  onDeleteClassStudents?: (lop: string) => Promise<void> | void;
  onUploadHoSo: (maSV: string, fileName: string, fileData?: string) => void;
  onImportStudents?: (students: Partial<SinhVien>[]) => void;
  onSwitchView?: (view: string) => void;
  onOpenFullProfile?: (maSV: string, tab?: ProfileTabKey) => void;
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
  onUploadHoSo,
  onImportStudents,
  onSwitchView,
  onOpenFullProfile,
  isLoading = false,
  loadError = null,
  onRetryLoad,
}) => {
  const formIdPrefix = useId();
  const filterPopoverRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const isStudentRole = userRole === 'STUDENT';
  const canEditProfile =
    userRole === 'ADMIN' ||
    userRole === 'LECTURER' ||
    Boolean(currentUser?.permissions?.canEditHoSo) ||
    Boolean(currentUser?.permissions?.canManageStudents);
  const canExportProfiles =
    userRole === 'ADMIN' || Boolean(currentUser?.permissions?.canExportProfiles);

  // Search state (isolated from [Lọc] draftFilters)
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // Strict Draft vs Applied filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FlatStudentFilterInput>(() => cloneFilters(EMPTY_FILTERS));
  const [appliedFilters, setAppliedFilters] = useState<FlatStudentFilterInput>(() => cloneFilters(EMPTY_FILTERS));

  // Cascading communes state inside [Lọc] draft (fetched via /api/profile/communes)
  const [draftCommunes, setDraftCommunes] = useState<AdministrativeUnit[]>([]);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [communeError, setCommuneError] = useState<string | null>(null);

  // Server-side list state (sorting + pagination)
  const [sortBy, setSortBy] = useState<StudentListSortBy>('maSV');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsPageSize, setStudentsPageSize] = useState(20);
  const [rows, setRows] = useState<StudentBuilderRow[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Shared reference catalogs from API
  const [catalogs, setCatalogs] = useState<ProfileCatalogsBundle | null>(null);

  // In-app Toast & Preview/Modals state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 4000);
  };

  const [previewDoc, setPreviewDoc] = useState<PreviewDocState | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<SinhVien | null>(null);
  const [viewingDocumentStudent, setViewingDocumentStudent] = useState<SinhVien | null>(null);
  const [viewingDetailStudent, setViewingDetailStudent] = useState<SinhVien | null>(null);

  // Excel Import state
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [previewExcelStudents, setPreviewExcelStudents] = useState<Partial<SinhVien>[]>([]);
  const [excelFileName, setExcelFileName] = useState('');

  // Derived real faculties and classes from actual students in database
  const classMap = useMemo(() => {
    const merged: Record<string, string> = {};
    students.forEach((s) => {
      if (s.lop) {
        const normLop = normalizeClassName(s.lop);
        if (normLop && !merged[normLop]) {
          merged[normLop] = normalizeFacultyName(s.khoa, normLop);
        }
      }
    });
    return merged;
  }, [students]);

  const getFacultyForClass = useCallback(
    (lopName: string | undefined | null): string => {
      if (!lopName) return '';
      const norm = normalizeClassName(lopName);
      if (classMap[norm]) return classMap[norm];
      if (classMap[lopName]) return classMap[lopName];
      return getFacultyFromHelper(norm);
    },
    [classMap]
  );

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.lop) {
        const norm = normalizeClassName(s.lop);
        if (norm) set.add(norm);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [students]);

  // Keep detail/document modals synchronized with latest students prop
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

  // Global Esc handler for dialogs and filter popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (previewDoc) {
        setPreviewDoc(null);
      } else if (isExcelImportModalOpen) {
        setIsExcelImportModalOpen(false);
        setPreviewExcelStudents([]);
        setExcelFileName('');
      } else if (viewingDocumentStudent) {
        setViewingDocumentStudent(null);
      } else if (isAddModalOpen) {
        setIsAddModalOpen(false);
      } else if (isFilterOpen) {
        setIsFilterOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, isExcelImportModalOpen, viewingDocumentStudent, isAddModalOpen, isFilterOpen]);

  // Close desktop filter popover when clicking outside (discards unapplied draft)
  useEffect(() => {
    if (!isFilterOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        filterPopoverRef.current &&
        !filterPopoverRef.current.contains(target) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(target)
      ) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  // Load catalogs once for staff/admin
  useEffect(() => {
    if (isStudentRole) return;
    let active = true;
    profileService.getCatalogs().then((res) => {
      if (active && res.success && res.data) {
        setCatalogs(res.data);
      }
    });
    return () => {
      active = false;
    };
  }, [isStudentRole]);

  // Debounce searchInput -> appliedSearch cleanly without touching filter state
  useEffect(() => {
    if (isStudentRole) return;
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      setAppliedSearch((prev) => {
        if (prev !== trimmed) {
          setStudentsPage(1);
          return trimmed;
        }
        return prev;
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput, isStudentRole]);

  // Load communes ONLY for the [Lọc] dropdown cascade (NEVER runs student list query)
  const loadDraftCommunesForProvince = useCallback(async (provinceUnitId: string) => {
    if (!provinceUnitId) {
      setDraftCommunes([]);
      setCommuneError(null);
      return;
    }
    setLoadingCommunes(true);
    setCommuneError(null);
    const res = await profileService.getCommunesByProvince(provinceUnitId, 'ACTIVE');
    setLoadingCommunes(false);
    if (!res.success) {
      setDraftCommunes([]);
      setCommuneError(res.message || 'Không tải được danh sách Xã/Phường.');
      return;
    }
    setDraftCommunes(res.data || []);
  }, []);

  const handleToggleFilterPanel = () => {
    if (isFilterOpen) {
      // Closing without clicking [Áp dụng] discards draft edits
      setIsFilterOpen(false);
      return;
    }
    const synced = cloneFilters(appliedFilters);
    setDraftFilters(synced);
    setCommuneError(null);
    setIsFilterOpen(true);
    if (synced.provinceUnitId) {
      loadDraftCommunesForProvince(synced.provinceUnitId);
    } else {
      setDraftCommunes([]);
    }
  };

  const handleDraftProvinceChange = (provinceUnitId: string) => {
    setDraftFilters((prev) => ({
      ...prev,
      provinceUnitId,
      communeUnitId: '',
    }));
    loadDraftCommunesForProvince(provinceUnitId);
  };

  const handleClearDraftFiltersOnly = () => {
    setDraftFilters(cloneFilters(EMPTY_FILTERS));
    setDraftCommunes([]);
    setCommuneError(null);
  };

  const handleApplyDraftFilters = () => {
    setAppliedFilters(cloneFilters(draftFilters));
    setStudentsPage(1);
    setIsFilterOpen(false);
  };

  const activeProvinces = useMemo(
    () =>
      (catalogs?.provinces || [])
        .filter((p) => p.status === 'ACTIVE')
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    [catalogs]
  );

  const buildFlatFilterPayload = useCallback((f: FlatStudentFilterInput): FlatStudentFilterInput => {
    return {
      provinceUnitId: f.provinceUnitId || undefined,
      communeUnitId: f.communeUnitId || undefined,
      ethnicityId: f.ethnicityId || undefined,
      religionId: f.religionId || undefined,
    };
  }, []);

  const appliedFlatFilterPayload = useMemo(
    () => buildFlatFilterPayload(appliedFilters),
    [appliedFilters, buildFlatFilterPayload]
  );

  const fetchStudentList = useCallback(async () => {
    if (isStudentRole) return;
    setIsQuerying(true);
    setQueryError(null);
    try {
      const res = await profileService.queryStudentList({
        flatFilters: appliedFlatFilterPayload,
        search: appliedSearch,
        page: studentsPage,
        pageSize: studentsPageSize,
        sortBy,
        sortDir,
      });
      if (!res.success || !res.data) {
        setQueryError(res.message || 'Không thể tải danh sách sinh viên.');
        return;
      }
      setRows(res.data.rows || res.data.items || []);
      setTotalStudents(res.data.total ?? 0);
      if (res.data.page && res.data.page !== studentsPage) {
        setStudentsPage(res.data.page);
      }
      setHasLoadedOnce(true);
    } finally {
      setIsQuerying(false);
    }
  }, [
    isStudentRole,
    appliedFlatFilterPayload,
    appliedSearch,
    studentsPage,
    studentsPageSize,
    sortBy,
    sortDir,
  ]);

  // Trigger list query ONLY on committed applied state, search, sort, pagination, or students mutation
  useEffect(() => {
    if (isStudentRole) return;
    fetchStudentList();
  }, [isStudentRole, students, fetchStudentList]);

  const handleSortColumn = (col: StudentListSortBy) => {
    if (sortBy === col) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setStudentsPage(1);
  };

  // Lookup maps for chip labels
  const provinceNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (catalogs?.provinces || []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [catalogs]);

  const communeNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (catalogs?.communes || []).forEach((c) => m.set(c.id, c.name));
    draftCommunes.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [catalogs, draftCommunes]);

  const ethnicityNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (catalogs?.ethnicities || []).forEach((e) => m.set(e.id, e.name));
    return m;
  }, [catalogs]);

  const religionNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (catalogs?.religions || []).forEach((r) => m.set(r.id, r.name));
    return m;
  }, [catalogs]);

  const removeSingleAppliedFilter = useCallback((updater: (prev: FlatStudentFilterInput) => FlatStudentFilterInput) => {
    setAppliedFilters((prev) => updater(prev));
    setDraftFilters((prev) => updater(prev));
    setStudentsPage(1);
  }, []);

  const appliedFilterChips = useMemo<FilterChipItem[]>(() => {
    const chips: FilterChipItem[] = [];
    if (appliedFilters.provinceUnitId) {
      chips.push({
        key: 'province',
        label: `Tỉnh/TP: ${provinceNameMap.get(appliedFilters.provinceUnitId) || appliedFilters.provinceUnitId}`,
        onRemove: () =>
          removeSingleAppliedFilter((p) => ({ ...p, provinceUnitId: '', communeUnitId: '' })),
      });
    }
    if (appliedFilters.communeUnitId) {
      chips.push({
        key: 'commune',
        label: `Xã/Phường: ${communeNameMap.get(appliedFilters.communeUnitId) || appliedFilters.communeUnitId}`,
        onRemove: () => removeSingleAppliedFilter((p) => ({ ...p, communeUnitId: '' })),
      });
    }
    if (appliedFilters.ethnicityId) {
      chips.push({
        key: 'ethnicity',
        label: `Dân tộc: ${ethnicityNameMap.get(appliedFilters.ethnicityId) || appliedFilters.ethnicityId}`,
        onRemove: () => removeSingleAppliedFilter((p) => ({ ...p, ethnicityId: '' })),
      });
    }
    if (appliedFilters.religionId) {
      const relLabel =
        appliedFilters.religionId === '__NONE__'
          ? 'Không tôn giáo'
          : religionNameMap.get(appliedFilters.religionId) || appliedFilters.religionId;
      chips.push({
        key: 'religion',
        label: `Tôn giáo: ${relLabel}`,
        onRemove: () => removeSingleAppliedFilter((p) => ({ ...p, religionId: '' })),
      });
    }
    return chips;
  }, [
    appliedFilters,
    provinceNameMap,
    communeNameMap,
    ethnicityNameMap,
    religionNameMap,
    removeSingleAppliedFilter,
  ]);

  const appliedFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);

  const clearAllAppliedFilters = () => {
    setAppliedFilters(cloneFilters(EMPTY_FILTERS));
    setDraftFilters(cloneFilters(EMPTY_FILTERS));
    setDraftCommunes([]);
    setStudentsPage(1);
  };

  const clearAllSearchAndFilters = () => {
    setSearchInput('');
    setAppliedSearch('');
    clearAllAppliedFilters();
  };

  // Lookup student entity by maSV for row actions & avatar fallback
  const studentByMaSV = useMemo(() => {
    const map = new Map<string, SinhVien>();
    students.forEach((s) => map.set(s.maSV.toLowerCase(), s));
    return map;
  }, [students]);

  const toSinhVienFallback = (r: StudentBuilderRow): SinhVien => {
    const base = studentByMaSV.get(r.maSV.toLowerCase());
    if (base) return base;
    return {
      maSV: r.maSV,
      hoTen: r.hoTen,
      ngaySinh: r.ngaySinh,
      gioiTinh: (r.gioiTinh as 'Nam' | 'Nữ') || 'Nam',
      lop: r.lop,
      khoa: r.khoa,
      soDienThoai: r.soDienThoai,
      email: r.email,
      diaChi: r.currentAddressFull || '',
      ngayNhapHoc: '',
      trangThai: (r.trangThai as SinhVien['trangThai']) || 'Đang học',
      hoSoFiles: [],
    };
  };

  // Student Role self view
  const studentCodeLower = (currentStudentCode || currentUser?.studentCode || currentUser?.username || '').toLowerCase();
  const studentSelfList = useMemo(() => {
    return students.filter(
      (s) =>
        (studentCodeLower && s.maSV.toLowerCase() === studentCodeLower) ||
        (s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [students, studentCodeLower, currentUser?.email]);
  const myProfile = isStudentRole ? studentSelfList[0] || null : null;
  const [myFullProfile, setMyFullProfile] = useState<StudentFullProfileResponse | null>(null);

  useEffect(() => {
    let active = true;
    if (!isStudentRole || !myProfile?.maSV) {
      setMyFullProfile(null);
      return;
    }
    profileService.getFullProfile(myProfile.maSV).then((res) => {
      if (active && res.success && res.data) {
        setMyFullProfile(res.data);
      }
    });
    return () => {
      active = false;
    };
  }, [isStudentRole, myProfile?.maSV]);

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

  const getStatusVariant = (trangThai?: string) => {
    if (trangThai === 'Đang học') return 'success';
    if (trangThai === 'Bảo lưu') return 'warning';
    if (trangThai === 'Tốt nghiệp') return 'info';
    return 'danger';
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: SinhVien) => {
    setEditingStudent(student);
    setIsAddModalOpen(true);
  };

  const handleSaveStudentFromForm = async (payload: Partial<SinhVien>, currentEditing: SinhVien | null) => {
    if (currentEditing) {
      await onUpdateStudent(currentEditing.maSV, payload);
    } else {
      await onAddStudent(payload as SinhVien);
    }
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

  // Excel import handlers
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Mã SV': 'SV001',
        'Họ và tên': 'Nguyễn Văn Minh',
        'Lớp': 'ĐH Kỹ thuật cơ sở 1',
        'Mã Lớp': 'KTCS01',
        'Khoa / Viện': FACULTY_KTCS,
        'Ngày sinh': '2005-04-15',
        'Giới tính': 'Nam',
        'Số điện thoại': '0987654321',
        'Email': 'minh.nv@tdnu.edu.vn',
        'Địa chỉ': 'TP. Hồ Chí Minh',
        'Ngày nhập học': '2025-09-05',
        'Trạng thái': 'Đang học',
      },
      {
        'Mã SV': 'SV002',
        'Họ và tên': 'Lê Hoàng Nam',
        'Lớp': 'ĐH Ô tô 1',
        'Mã Lớp': 'OTO01',
        'Khoa / Viện': FACULTY_O_TO,
        'Ngày sinh': '2005-11-02',
        'Giới tính': 'Nam',
        'Số điện thoại': '0933445566',
        'Email': 'nam.lh@tdnu.edu.vn',
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
            const khoa = rawKhoa ? normalizeFacultyName(rawKhoa, lop) : lop ? getFacultyFromHelper(lop) : '';
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

  // Excel export for currently applied search & filters
  const handleExportFilteredExcel = async () => {
    if (!canExportProfiles) {
      showToast('Bạn chưa được cấp quyền xuất danh sách hồ sơ.', 'error');
      return;
    }
    setIsExportingExcel(true);
    try {
      const res = await profileService.exportBuilder({
        flatFilters: {
          ...appliedFlatFilterPayload,
          search: appliedSearch || undefined,
        },
        selectedColumns: [
          'identity',
          'lop',
          'currentLocality',
          'permanentLocality',
          'ethnicity',
          'religion',
        ],
        sortBy,
        sortDir,
      });
      if (!res.success || !res.data) {
        showToast(res.message || 'Không thể xuất Excel.', 'error');
        return;
      }

      const exportRows = res.data.rows || [];
      if (exportRows.length === 0) {
        showToast('Không có sinh viên nào khớp điều kiện lọc để xuất.', 'info');
        return;
      }

      const sheetData = exportRows.map((r, idx) => ({
        STT: idx + 1,
        MSSV: r.maSV,
        'Họ và tên': r.hoTen,
        Lớp: r.lop || '',
        'Khoa / Viện': r.khoa || '',
        'Nơi ở hiện tại': [r.currentCommuneName, r.currentProvinceName].filter(Boolean).join(', ') || 'Chưa có thông tin',
        'Địa chỉ thường trú':
          [r.permanentCommuneName, r.permanentProvinceName].filter(Boolean).join(', ') || 'Chưa có thông tin',
        'Dân tộc': r.ethnicityName || 'Chưa có thông tin',
        'Tôn giáo': r.religionName || 'Chưa có thông tin',
      }));

      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'HoSoSinhVien');
      const today = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `DanhSach_HoSo_SinhVien_${today}.xlsx`);
      showToast(`Đã xuất ${exportRows.length} hồ sơ sinh viên.`, 'success');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Loading & error gates on initial App load
  if (isLoading && students.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={isStudentRole ? 'Hồ sơ & Lý lịch Sinh viên' : 'Hồ sơ sinh viên'}
          icon={isStudentRole ? GraduationCap : Users}
        />
        <LoadingState rows={6} />
      </div>
    );
  }

  if (loadError && students.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={isStudentRole ? 'Hồ sơ & Lý lịch Sinh viên' : 'Hồ sơ sinh viên'}
          icon={isStudentRole ? GraduationCap : Users}
        />
        <ErrorState type="error" message={loadError} onRetry={onRetryLoad} />
      </div>
    );
  }

  const renderSortIcon = (col: StudentListSortBy) => {
    if (sortBy !== col) return <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-700 dark:text-blue-400 shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-700 dark:text-blue-400 shrink-0" />
    );
  };

  const renderFilterFormBody = () => (
    <div className="space-y-3.5 text-xs">
      {/* Nhóm 1: Địa chỉ (Nơi ở hiện tại 2 cấp) */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Địa chỉ
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label htmlFor={`${formIdPrefix}-f-province`} className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Tỉnh / Thành phố
            </label>
            <select
              id={`${formIdPrefix}-f-province`}
              value={draftFilters.provinceUnitId || ''}
              onChange={(e) => handleDraftProvinceChange(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-100"
            >
              <option value="">-- Tất cả Tỉnh/TP --</option>
              {activeProvinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${formIdPrefix}-f-commune`} className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Xã / Phường / Đặc khu
            </label>
            <select
              id={`${formIdPrefix}-f-commune`}
              disabled={!draftFilters.provinceUnitId || loadingCommunes}
              value={draftFilters.communeUnitId || ''}
              onChange={(e) => setDraftFilters((p) => ({ ...p, communeUnitId: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-100 disabled:opacity-50"
            >
              <option value="">
                {!draftFilters.provinceUnitId
                  ? '-- Chọn Tỉnh/TP trước --'
                  : loadingCommunes
                  ? '-- Đang tải... --'
                  : `-- Tất cả (${draftCommunes.length}) --`}
              </option>
              {draftCommunes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {communeError && (
              <p className="text-[11px] text-rose-600 mt-1">{communeError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Nhóm 2: Thông tin (Dân tộc, Tôn giáo) */}
      <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Thông tin
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label htmlFor={`${formIdPrefix}-f-ethnicity`} className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Dân tộc
            </label>
            <select
              id={`${formIdPrefix}-f-ethnicity`}
              value={draftFilters.ethnicityId || ''}
              onChange={(e) => setDraftFilters((p) => ({ ...p, ethnicityId: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-100"
            >
              <option value="">-- Tất cả --</option>
              {(catalogs?.ethnicities || [])
                .filter((e) => e.isActive)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor={`${formIdPrefix}-f-religion`} className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Tôn giáo
            </label>
            <select
              id={`${formIdPrefix}-f-religion`}
              value={draftFilters.religionId || ''}
              onChange={(e) => setDraftFilters((p) => ({ ...p, religionId: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-100"
            >
              <option value="">-- Tất cả --</option>
              <option value="__NONE__">Không tôn giáo</option>
              {(catalogs?.religions || [])
                .filter((r) => r.isActive)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Footer Actions inside [Lọc] */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleClearDraftFiltersOnly}
          className="px-2.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded cursor-pointer"
        >
          Xóa lọc
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFilterOpen(false)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-50 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleApplyDraftFilters}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded cursor-pointer"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {loadError && students.length > 0 && <ErrorBanner message={loadError} onRetry={onRetryLoad} />}

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
      {/* STUDENT ROLE SELF VIEW                                                    */}
      {/* ========================================================================= */}
      {isStudentRole ? (
        myProfile ? (
          <div className="space-y-4">
            <PageHeader
              title="Hồ sơ & Lý lịch Sinh viên"
              icon={GraduationCap}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  {onOpenFullProfile && (
                    <button
                      type="button"
                      onClick={() => onOpenFullProfile(myProfile.maSV, 'GENERAL')}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Chi tiết hồ sơ</span>
                    </button>
                  )}
                  {canEditProfile && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(myProfile)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Cập nhật lý lịch</span>
                    </button>
                  )}
                </div>
              }
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <a
                href="/grades"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchView?.('grades');
                }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500 transition-colors flex items-center gap-3 cursor-pointer group no-underline shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">
                  Bảng Điểm & GPA
                </span>
              </a>

              <a
                href="/schedule"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchView?.('schedule');
                }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 transition-colors flex items-center gap-3 cursor-pointer group no-underline shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                  Thời Khóa Biểu
                </span>
              </a>

              <a
                href="/retakes"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchView?.('retakes');
                }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-500 transition-colors flex items-center gap-3 cursor-pointer group no-underline shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-700 dark:group-hover:text-amber-400 truncate">
                  Thi Lại / Học Lại
                </span>
              </a>

              <a
                href="/training"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchView?.('training');
                }}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-500 transition-colors flex items-center gap-3 cursor-pointer group no-underline shadow-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 truncate">
                  Điểm Rèn Luyện
                </span>
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <img
                    src={getStudentAvatarUrl(myProfile)}
                    alt={myProfile.hoTen}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">
                        {myProfile.hoTen}
                      </h2>
                      <StatusBadge
                        label={myProfile.trangThai || 'Đang học'}
                        variant={getStatusVariant(myProfile.trangThai)}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {myProfile.maSV}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Lớp <strong className="text-slate-800 dark:text-slate-200">{myProfile.lop || 'Chưa cập nhật'}</strong>
                      </span>
                      {myProfile.khoa && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{myProfile.khoa}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Mã sinh viên</dt>
                    <dd className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{myProfile.maSV}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Họ và tên</dt>
                    <dd className="text-sm font-semibold text-slate-900 dark:text-slate-100">{myProfile.hoTen}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Lớp sinh hoạt</dt>
                    <dd className="text-sm font-medium text-blue-700 dark:text-blue-400">{myProfile.lop || 'Chưa cập nhật'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Khoa / Viện</dt>
                    <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">{myProfile.khoa || 'Chưa cập nhật'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ngày sinh & Giới tính</dt>
                    <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      {myProfile.ngaySinh || 'Chưa cập nhật'} <span className="font-sans">({myProfile.gioiTinh})</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Số điện thoại</dt>
                    <dd className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                      {myProfile.soDienThoai || 'Chưa cập nhật'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email sinh viên</dt>
                    <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {myProfile.email || 'Chưa cập nhật'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Ngày nhập học</dt>
                    <dd className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                      {myProfile.ngayNhapHoc || 'Chưa cập nhật'}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Địa chỉ thường trú</dt>
                    <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">{myProfile.diaChi || 'Chưa cập nhật'}</dd>
                  </div>
                  {myFullProfile && (
                    <div className="sm:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                      <div>
                        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dân tộc</dt>
                        <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {myFullProfile.demographics?.ethnicityStatus === 'DECLARED' && myFullProfile.demographics.ethnicityName
                            ? myFullProfile.demographics.ethnicityName
                            : 'Chưa có thông tin'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tôn giáo</dt>
                        <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {myFullProfile.demographics?.religionStatus === 'CONFIRMED_NONE'
                            ? 'Không tôn giáo'
                            : myFullProfile.demographics?.religionStatus === 'DECLARED' && myFullProfile.demographics.religionName
                            ? myFullProfile.demographics.religionName
                            : 'Chưa có thông tin'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nơi ở hiện tại (2 cấp)</dt>
                        <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {(() => {
                            const cur = myFullProfile.addresses.find((a) => a.addressType === 'CURRENT');
                            const parts = [cur?.addressDetail, cur?.communeName, cur?.provinceName].filter(Boolean);
                            return parts.length > 0 ? parts.join(', ') : 'Chưa có thông tin';
                          })()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Địa chỉ thường trú (2 cấp)</dt>
                        <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {(() => {
                            const perm = myFullProfile.addresses.find((a) => a.addressType === 'PERMANENT');
                            const parts = [perm?.addressDetail, perm?.communeName, perm?.provinceName].filter(Boolean);
                            return parts.length > 0 ? parts.join(', ') : 'Chưa có thông tin';
                          })()}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 flex flex-col justify-between space-y-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      <h3 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        Hồ sơ số hóa
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                      {getStudentFiles(myProfile).length} tệp
                    </span>
                  </div>

                  <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                    {getStudentFiles(myProfile).length > 0 ? (
                      getStudentFiles(myProfile).map((file, idx) => (
                        <div
                          key={file.id || idx}
                          className="py-3 space-y-1.5 first:pt-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                              <span className="font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                                {file.customName || file.fileName}
                              </span>
                            </div>
                            {file.uploadedAt && (
                              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                                {file.uploadedAt}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate pl-5">
                            {file.fileName}
                          </div>
                          <div className="pt-1 pl-5 flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSinglePdf(file.fileUrl, file.customName || 'Hồ sơ', file.fileName, myProfile)
                              }
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem</span>
                            </button>
                            <a
                              href={file.fileUrl}
                              download={file.fileName}
                              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" />
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
                  <label className="flex flex-col items-center justify-center p-3.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-blue-600 dark:hover:border-blue-500 cursor-pointer bg-slate-50/60 dark:bg-slate-800/40 transition-colors text-center">
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
        /* ADMIN & LECTURER VIEW — DIRECT STUDENT LIST                               */
        /* ========================================================================= */
        <>
          <PageHeader
            title="Hồ sơ sinh viên"
            icon={Users}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {canExportProfiles && (
                  <button
                    type="button"
                    disabled={isExportingExcel}
                    onClick={handleExportFilteredExcel}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>{isExportingExcel ? 'Đang xuất...' : 'Xuất Excel'}</span>
                  </button>
                )}

                {userRole === 'ADMIN' && (
                  <>
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
                  </>
                )}
              </div>
            }
          />

          {/* Compact Search + [Lọc] Toolbar */}
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <form
              className="relative flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = searchInput.trim();
                setAppliedSearch(trimmed);
                setStudentsPage(1);
              }}
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm MSSV hoặc họ tên..."
                aria-label="Tìm kiếm sinh viên theo MSSV hoặc họ tên"
                className="w-full h-10 pl-10 pr-9 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setAppliedSearch('');
                    setStudentsPage(1);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            <div className="relative flex items-center gap-2">
              <button
                ref={filterButtonRef}
                type="button"
                onClick={handleToggleFilterPanel}
                aria-expanded={isFilterOpen}
                aria-controls={`${formIdPrefix}-filter-panel`}
                className={`h-10 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  appliedFilterCount > 0 || isFilterOpen
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{appliedFilterCount > 0 ? `Lọc · ${appliedFilterCount}` : 'Lọc'}</span>
              </button>

              {/* Desktop Popover [Lọc] */}
              {isFilterOpen && (
                <div
                  id={`${formIdPrefix}-filter-panel`}
                  ref={filterPopoverRef}
                  className="hidden md:block absolute right-0 top-full mt-2 w-[560px] max-w-[92vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-5 z-40"
                >
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Bộ lọc hồ sơ sinh viên
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                      aria-label="Đóng bộ lọc"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {renderFilterFormBody()}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Drawer/Sheet [Lọc] */}
          {isFilterOpen && (
            <div
              className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60"
              role="dialog"
              aria-modal="true"
              onClick={() => setIsFilterOpen(false)}
            >
              <div
                className="w-full max-h-[88vh] overflow-y-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-md p-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Bộ lọc hồ sơ sinh viên
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                    aria-label="Đóng bộ lọc"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {renderFilterFormBody()}
              </div>
            </div>
          )}

          {/* Applied Filter Chips (shown ONLY when active appliedFilters exist) */}
          {appliedFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {appliedFilterChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 font-medium"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="text-blue-600 dark:text-blue-300 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                    aria-label={`Bỏ lọc ${chip.label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllAppliedFilters}
                className="px-2 py-1 text-xs font-medium text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>
          )}

          {queryError && <ErrorBanner message={queryError} onRetry={fetchStudentList} />}

          {/* Direct Student List Table */}
          {!hasLoadedOnce && isQuerying ? (
            <LoadingState rows={6} />
          ) : !queryError && totalStudents === 0 ? (
            appliedSearch || appliedFilterCount > 0 ? (
              <FilteredEmptyState onClearFilters={clearAllSearchAndFilters} />
            ) : (
              <EmptyState message="Chưa có dữ liệu." />
            )
          ) : (
            <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Danh sách:{' '}
                  <span className="font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                    {totalStudents}
                  </span>{' '}
                  sinh viên
                </span>
                {isQuerying && (
                  <span className="text-[11px] text-blue-700 dark:text-blue-400">Đang tải dữ liệu...</span>
                )}
              </div>

              <div className="overflow-x-auto max-h-[calc(100vh-290px)]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-800 font-semibold">
                    <tr>
                      <th
                        className="py-2.5 px-3 whitespace-nowrap"
                        aria-sort={sortBy === 'maSV' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button
                          type="button"
                          onClick={() => handleSortColumn('maSV')}
                          className="inline-flex items-center gap-1 uppercase font-semibold hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                        >
                          <span>MSSV</span>
                          {renderSortIcon('maSV')}
                        </button>
                      </th>
                      <th
                        className="py-2.5 px-3 whitespace-nowrap"
                        aria-sort={sortBy === 'hoTen' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button
                          type="button"
                          onClick={() => handleSortColumn('hoTen')}
                          className="inline-flex items-center gap-1 uppercase font-semibold hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                        >
                          <span>Họ tên</span>
                          {renderSortIcon('hoTen')}
                        </button>
                      </th>
                      <th
                        className="py-2.5 px-3 whitespace-nowrap"
                        aria-sort={sortBy === 'lop' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button
                          type="button"
                          onClick={() => handleSortColumn('lop')}
                          className="inline-flex items-center gap-1 uppercase font-semibold hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                        >
                          <span>Lớp</span>
                          {renderSortIcon('lop')}
                        </button>
                      </th>
                      <th
                        className="py-2.5 px-3 whitespace-nowrap"
                        aria-sort={sortBy === 'soDienThoai' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button
                          type="button"
                          onClick={() => handleSortColumn('soDienThoai')}
                          className="inline-flex items-center gap-1 uppercase font-semibold hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                        >
                          <span>SĐT</span>
                          {renderSortIcon('soDienThoai')}
                        </button>
                      </th>
                      <th
                        className="py-2.5 px-3 whitespace-nowrap"
                        aria-sort={sortBy === 'ngaySinh' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button
                          type="button"
                          onClick={() => handleSortColumn('ngaySinh')}
                          className="inline-flex items-center gap-1 uppercase font-semibold hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                        >
                          <span>Ngày sinh</span>
                          {renderSortIcon('ngaySinh')}
                        </button>
                      </th>
                      <th
                        className="py-2.5 px-3 whitespace-nowrap"
                        aria-sort={sortBy === 'email' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <button
                          type="button"
                          onClick={() => handleSortColumn('email')}
                          className="inline-flex items-center gap-1 uppercase font-semibold hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                        >
                          <span>Email</span>
                          {renderSortIcon('email')}
                        </button>
                      </th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {rows.map((r) => {
                      const svObj = toSinhVienFallback(r);
                      const phoneText = (r.soDienThoai || svObj.soDienThoai || '').trim();
                      const rawDob = (r.ngaySinh || svObj.ngaySinh || '').trim();
                      const dobMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(rawDob);
                      const dobText = dobMatch ? `${dobMatch[3]}/${dobMatch[2]}/${dobMatch[1]}` : rawDob;
                      const emailText = (r.email || svObj.email || '').trim();

                      return (
                        <tr
                          key={r.maSV}
                          tabIndex={0}
                          onClick={() =>
                            onOpenFullProfile ? onOpenFullProfile(r.maSV, 'GENERAL') : setViewingDetailStudent(svObj)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              if (e.target !== e.currentTarget) return;
                              e.preventDefault();
                              if (onOpenFullProfile) onOpenFullProfile(r.maSV, 'GENERAL');
                              else setViewingDetailStudent(svObj);
                            }
                          }}
                          className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors cursor-pointer group focus:outline-none focus:bg-blue-50/50 dark:focus:bg-blue-950/30"
                        >
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                            {r.maSV}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={getStudentAvatarUrl(svObj)}
                                alt={r.hoTen}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0"
                              />
                              <span className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                                {r.hoTen}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {r.lop || <span className="text-slate-400">Chưa có thông tin</span>}
                            </div>
                            {r.khoa && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                                {r.khoa}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                            {phoneText ? (
                              <span className="text-slate-800 dark:text-slate-200">{phoneText}</span>
                            ) : (
                              <span className="font-sans text-slate-400">Chưa có thông tin</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap">
                            {dobText ? (
                              <span className="text-slate-800 dark:text-slate-200">{dobText}</span>
                            ) : (
                              <span className="font-sans text-slate-400">Chưa có thông tin</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 max-w-[220px]">
                            <div className="truncate text-slate-800 dark:text-slate-200" title={emailText || undefined}>
                              {emailText || <span className="text-slate-400">Chưa có thông tin</span>}
                            </div>
                          </td>
                          <td
                            className="py-2.5 px-3 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1">
                              {onOpenFullProfile && (
                                <button
                                  type="button"
                                  onClick={() => onOpenFullProfile(r.maSV, 'GENERAL')}
                                  className="p-1 text-slate-500 hover:text-indigo-700 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                  title="Mở hồ sơ chi tiết"
                                  aria-label={`Mở hồ sơ chi tiết ${r.hoTen}`}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setViewingDetailStudent(svObj)}
                                className="p-1 text-slate-500 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Xem nhanh"
                                aria-label={`Xem nhanh ${r.hoTen}`}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {canEditProfile && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(svObj)}
                                  className="p-1 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                  title="Chỉnh sửa"
                                  aria-label={`Chỉnh sửa ${r.hoTen}`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {userRole === 'ADMIN' && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteStudent(r.maSV)}
                                  className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                  title="Xóa sinh viên"
                                  aria-label={`Xóa ${r.hoTen}`}
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
                totalItems={totalStudents}
                onPageChange={setStudentsPage}
                onPageSizeChange={setStudentsPageSize}
                pageSizeOptions={[10, 20, 50]}
              />
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT STUDENT MODAL                                                  */}
      {/* ========================================================================= */}
      <StudentProfileForm
        isOpen={isAddModalOpen}
        editingStudent={editingStudent}
        availableClasses={availableClasses}
        getFacultyForClass={getFacultyForClass}
        getStudentFiles={getStudentFiles}
        getStudentAvatarUrl={getStudentAvatarUrl}
        onClose={() => setIsAddModalOpen(false)}
        onSaveStudent={handleSaveStudentFromForm}
        onUpdateAvatarImmediate={(maSV, avatar) => onUpdateStudent(maSV, { avatar })}
        onPreviewDocument={handleOpenSinglePdf}
        onOpenFullProfile={onOpenFullProfile}
        onAfterParentInfoSaved={async () => {
          if (!isStudentRole) {
            await fetchStudentList();
          }
        }}
      />

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
      {/* IN-APP DOCUMENT PREVIEW MODAL                                             */}
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
        onOpenFullProfile={onOpenFullProfile}
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
    </div>
  );
};
