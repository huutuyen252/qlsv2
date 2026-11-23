import React, { useState, useEffect, useMemo, useCallback, useId } from 'react';
import * as XLSX from 'xlsx';
import {
  Award,
  X,
  Plus,
  Users,
  CheckCircle2,
  User as UserIcon,
  Trash2,
  AlertTriangle,
  Check,
  Clock,
  Shield,
  Eye,
  Sliders,
  Lock,
  Unlock,
  MessageSquare,
  ExternalLink,
  BarChart3,
  BookOpen,
  Download,
  Pencil,
} from 'lucide-react';

import { SinhVien, UserRole, User } from '../../types';
import {
  ScoreCategory,
  ClassOfficerRole,
  ClassOfficerAssignment,
  ScoreCriterion,
  TrainingMonth,
  ScoreTransaction,
  MonthlyScoreAccount,
  ScoreAppeal,
  MonthStatus,
  TransactionStatus,
  AppealStatus,
  CalculationType,
  ScoreDirection,
} from '../../types/trainingPoint';
import { trainingApiService } from '../../services/trainingApiService';
import {
  DataToolbar,
  EmptyState,
  ErrorBanner,
  ErrorState,
  FilteredEmptyState,
  LoadingState,
  MetricStrip,
  PageHeader,
  PaginationBar,
  StatusBadge,
  StatusVariant,
} from '../common';

interface TrainingPointModuleProps {
  students: SinhVien[];
  userRole: UserRole;
  currentStudentCode?: string;
  currentUser?: User | null;
  onRefreshData?: () => void;
  isLoading?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
  // Backward compatibility props
  trainingPoints?: unknown[];
  onSaveComment?: unknown;
  onImportExcel?: unknown;
  onUpdateTrainingPoint?: unknown;
  onDeleteTrainingPoint?: unknown;
  onDeleteClassTrainingPoints?: unknown;
}

interface ActionPromptModalState {
  isOpen: boolean;
  type: 'REJECT_TX' | 'CANCEL_TX' | 'ACCEPT_APPEAL' | 'REJECT_APPEAL';
  targetId: string;
  title: string;
  inputLabel: string;
  inputValue: string;
  showCheckbox?: boolean;
  checkboxLabel?: string;
  checkboxChecked?: boolean;
}

const getClassificationVariant = (cls: string): StatusVariant => {
  switch (cls) {
    case 'Xuất sắc':
    case 'Tốt':
      return 'success';
    case 'Khá':
      return 'info';
    case 'Trung bình':
      return 'warning';
    default:
      return 'danger';
  }
};

const getMonthStatusMeta = (st: MonthStatus): { label: string; variant: StatusVariant } => {
  switch (st) {
    case 'DRAFT':
      return { label: 'Bản nháp', variant: 'neutral' };
    case 'OPEN':
      return { label: 'Đang mở', variant: 'success' };
    case 'REVIEWING':
      return { label: 'Đang rà soát', variant: 'warning' };
    case 'PUBLISHED':
      return { label: 'Đã công bố', variant: 'info' };
    case 'LOCKED':
      return { label: 'Đã khóa sổ', variant: 'danger' };
  }
};

const getTransactionStatusMeta = (st: TransactionStatus): { label: string; variant: StatusVariant } => {
  switch (st) {
    case 'APPROVED':
      return { label: 'Đã duyệt', variant: 'success' };
    case 'SUBMITTED':
      return { label: 'Chờ duyệt', variant: 'warning' };
    case 'DRAFT':
      return { label: 'Bản nháp', variant: 'neutral' };
    case 'REJECTED':
      return { label: 'Từ chối', variant: 'danger' };
    case 'CANCELLED':
      return { label: 'Đã hủy', variant: 'neutral' };
  }
};

const getAppealStatusMeta = (st: AppealStatus): { label: string; variant: StatusVariant } => {
  switch (st) {
    case 'ACCEPTED':
      return { label: 'Chấp nhận', variant: 'success' };
    case 'REJECTED':
      return { label: 'Từ chối', variant: 'danger' };
    case 'IN_REVIEW':
      return { label: 'Đang xem xét', variant: 'info' };
    case 'PENDING':
    default:
      return { label: 'Chờ xử lý', variant: 'warning' };
  }
};

export const TrainingPointModule: React.FC<TrainingPointModuleProps> = ({
  students,
  userRole,
  currentStudentCode,
  currentUser,
  isLoading: externalLoading = false,
  loadError = null,
  onRetryLoad,
}) => {
  type TabKey = 'CLASS_BOARD' | 'STUDENT_PORTAL' | 'APPROVAL' | 'OFFICERS' | 'POLICY' | 'APPEALS';
  const isStudentRole = userRole === 'STUDENT';
  const isAdmin = userRole === 'ADMIN';
  const isAdminOrLecturer = userRole === 'ADMIN' || userRole === 'LECTURER';

  const [activeTab, setActiveTab] = useState<TabKey>(isStudentRole ? 'STUDENT_PORTAL' : 'CLASS_BOARD');

  useEffect(() => {
    if (isStudentRole && (activeTab === 'CLASS_BOARD' || activeTab === 'APPROVAL' || activeTab === 'OFFICERS')) {
      setActiveTab('STUDENT_PORTAL');
    }
  }, [isStudentRole, activeTab]);

  const now = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => now.getFullYear());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [boardPage, setBoardPage] = useState(1);
  const [boardPageSize, setBoardPageSize] = useState(20);
  const [approvalPage, setApprovalPage] = useState(1);
  const [approvalPageSize, setApprovalPageSize] = useState(20);

  // Core Data States from Backend
  const [accounts, setAccounts] = useState<MonthlyScoreAccount[]>([]);
  const [transactions, setTransactions] = useState<ScoreTransaction[]>([]);
  const [criteria, setCriteria] = useState<ScoreCriterion[]>([]);
  const [categories, setCategories] = useState<ScoreCategory[]>([]);
  const [officerRoles, setOfficerRoles] = useState<ClassOfficerRole[]>([]);
  const [officerAssignments, setOfficerAssignments] = useState<ClassOfficerAssignment[]>([]);
  const [trainingMonths, setTrainingMonths] = useState<TrainingMonth[]>([]);
  const [appeals, setAppeals] = useState<ScoreAppeal[]>([]);

  // UI / Interaction States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState<boolean>(false);
  const [isBatchEntryOpen, setIsBatchEntryOpen] = useState<boolean>(false);
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState<boolean>(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState<boolean>(false);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState<boolean>(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<SinhVien | null>(null);

  // Admin Criterion Create/Edit/Delete States
  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState<boolean>(false);
  const [editingCriterion, setEditingCriterion] = useState<ScoreCriterion | null>(null);
  const [criterionForm, setCriterionForm] = useState<{
    categoryId: string;
    code: string;
    name: string;
    direction: ScoreDirection;
    calculationType: CalculationType;
    defaultPoints: number;
    minPoints: number;
    maxPoints: number;
    maxOccurrencesPerMonth: string;
    requireNote: boolean;
    requireEvidence: boolean;
    requireApproval: boolean;
    allowBatch: boolean;
    isActive: boolean;
    levels: Array<{ id?: string; levelName: string; points: number }>;
  }>({
    categoryId: 'CAT_STUDY',
    code: '',
    name: '',
    direction: 'ADD',
    calculationType: 'FIXED',
    defaultPoints: 2,
    minPoints: 1,
    maxPoints: 5,
    maxOccurrencesPerMonth: '',
    requireNote: false,
    requireEvidence: false,
    requireApproval: true,
    allowBatch: true,
    isActive: true,
    levels: [
      { levelName: 'Cấp Khoa', points: 2 },
      { levelName: 'Cấp Trường', points: 4 },
    ],
  });
  const [criterionFormError, setCriterionFormError] = useState<string | null>(null);
  const [isSavingCriterion, setIsSavingCriterion] = useState<boolean>(false);
  const [deletingCriterion, setDeletingCriterion] = useState<ScoreCriterion | null>(null);
  const [isDeletingCriterion, setIsDeletingCriterion] = useState<boolean>(false);

  const [actionPrompt, setActionPrompt] = useState<ActionPromptModalState>({
    isOpen: false,
    type: 'REJECT_TX',
    targetId: '',
    title: '',
    inputLabel: '',
    inputValue: '',
    showCheckbox: false,
    checkboxLabel: '',
    checkboxChecked: false,
  });

  // Quick Entry Form
  const [entryStudentCode, setEntryStudentCode] = useState<string>('');
  const [entryCriterionId, setEntryCriterionId] = useState<string>('');
  const [entryOccurrences, setEntryOccurrences] = useState<number>(1);
  const [entryPointsPerOccurrence, setEntryPointsPerOccurrence] = useState<number>(0);
  const [entrySelectedLevelId, setEntrySelectedLevelId] = useState<string>('');
  const [entryNote, setEntryNote] = useState<string>('');
  const [entryEvidenceUrl, setEntryEvidenceUrl] = useState<string>('');
  const [entryOccurredAt, setEntryOccurredAt] = useState<string>(() => new Date().toISOString().substring(0, 10));

  // Batch Entry Form
  const [batchClassId, setBatchClassId] = useState<string>('');
  const [batchSelectedStudents, setBatchSelectedStudents] = useState<string[]>([]);
  const [batchCriterionId, setBatchCriterionId] = useState<string>('');
  const [batchNote, setBatchNote] = useState<string>('');

  // Lock Month Form
  const [lockTargetStatus, setLockTargetStatus] = useState<MonthStatus>('LOCKED');
  const [reopenReason, setReopenReason] = useState<string>('');

  // Appeal Form
  const [appealTitle, setAppealTitle] = useState<string>('');
  const [appealReason, setAppealReason] = useState<string>('');
  const [appealEvidenceUrl, setAppealEvidenceUrl] = useState<string>('');

  // Officer Assignment Form
  const [newOfficerStudentCode, setNewOfficerStudentCode] = useState<string>('');
  const [newOfficerRoleId, setNewOfficerRoleId] = useState<string>('');
  const [newOfficerClassId, setNewOfficerClassId] = useState<string>('');

  // Accessibility IDs
  const filterMonthId = useId();
  const filterYearId = useId();
  const filterClassId = useId();
  const portalStudentSelectId = useId();
  const quickEntryTitleId = useId();
  const quickStudentId = useId();
  const quickCriterionId = useId();
  const quickLevelId = useId();
  const quickOccId = useId();
  const quickRangeId = useId();
  const quickDateId = useId();
  const quickUrlId = useId();
  const quickNoteId = useId();
  const batchTitleId = useId();
  const batchClassSelectId = useId();
  const batchCriterionSelectId = useId();
  const batchNoteInputId = useId();
  const lockTitleId = useId();
  const lockStatusSelectId = useId();
  const lockReasonId = useId();
  const officerTitleId = useId();
  const officerStudentSelectId = useId();
  const officerRoleSelectId = useId();
  const appealModalTitleId = useId();
  const appealTitleInputId = useId();
  const appealReasonInputId = useId();
  const appealUrlInputId = useId();
  const actionPromptTitleId = useId();
  const actionPromptInputId = useId();
  const criterionModalTitleId = useId();
  const criterionDeleteTitleId = useId();

  // Escape handler for all modals
  useEffect(() => {
    const anyModalOpen =
      isQuickEntryOpen ||
      isBatchEntryOpen ||
      isLockModalOpen ||
      isOfficerModalOpen ||
      isAppealModalOpen ||
      isCriterionModalOpen ||
      Boolean(deletingCriterion) ||
      actionPrompt.isOpen;

    if (!anyModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deletingCriterion) {
          setDeletingCriterion(null);
        } else if (isCriterionModalOpen) {
          setIsCriterionModalOpen(false);
        } else if (actionPrompt.isOpen) {
          setActionPrompt((prev) => ({ ...prev, isOpen: false }));
        } else if (isAppealModalOpen) {
          setIsAppealModalOpen(false);
        } else if (isOfficerModalOpen) {
          setIsOfficerModalOpen(false);
        } else if (isLockModalOpen) {
          setIsLockModalOpen(false);
        } else if (isBatchEntryOpen) {
          setIsBatchEntryOpen(false);
        } else if (isQuickEntryOpen) {
          setIsQuickEntryOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isQuickEntryOpen,
    isBatchEntryOpen,
    isLockModalOpen,
    isOfficerModalOpen,
    isAppealModalOpen,
    isCriterionModalOpen,
    deletingCriterion,
    actionPrompt.isOpen,
  ]);

  const activeStudentCode = useMemo(() => {
    return (currentStudentCode || currentUser?.studentCode || currentUser?.username || '')
      .trim()
      .toLowerCase();
  }, [currentStudentCode, currentUser]);

  const availableClasses = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.lop).filter(Boolean))).sort();
  }, [students]);

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>([now.getFullYear(), selectedYear]);
    trainingMonths.forEach((m) => {
      if (m.year) yearSet.add(m.year);
    });
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [trainingMonths, selectedYear, now]);

  const currentMonthObj = useMemo(() => {
    return (
      trainingMonths.find((m) => m.month === selectedMonth && m.year === selectedYear) || {
        id: `M-${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
        month: selectedMonth,
        year: selectedYear,
        semester: selectedMonth >= 8 ? 'HK1' : 'HK2',
        academicYear:
          selectedMonth >= 8 ? `${selectedYear}-${selectedYear + 1}` : `${selectedYear - 1}-${selectedYear}`,
        status: 'OPEN' as MonthStatus,
        isApplied: true,
      }
    );
  }, [trainingMonths, selectedMonth, selectedYear]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [
        categoriesRes,
        rolesRes,
        assignmentsRes,
        criteriaRes,
        monthsRes,
        accountsRes,
        txsRes,
        appealsRes,
      ] = await Promise.all([
        trainingApiService.getCategories(),
        trainingApiService.getOfficerRoles(),
        trainingApiService.getOfficerAssignments(),
        trainingApiService.getCriteria(),
        trainingApiService.getMonths(),
        trainingApiService.getMonthlyAccounts({
          month: selectedMonth,
          year: selectedYear,
          classId: selectedClass || undefined,
          studentCode: isStudentRole && activeStudentCode ? activeStudentCode : undefined,
        }),
        trainingApiService.getTransactions({
          month: selectedMonth,
          year: selectedYear,
          classId: selectedClass || undefined,
          studentCode: isStudentRole && activeStudentCode ? activeStudentCode : undefined,
        }),
        trainingApiService.getAppeals(
          isStudentRole && activeStudentCode ? { studentCode: activeStudentCode } : undefined
        ),
      ]);

      if (categoriesRes.success) setCategories(categoriesRes.data);
      if (rolesRes.success) setOfficerRoles(rolesRes.data);
      if (assignmentsRes.success) setOfficerAssignments(assignmentsRes.data);
      if (criteriaRes.success) setCriteria(criteriaRes.data);
      if (monthsRes.success) setTrainingMonths(monthsRes.data);
      if (accountsRes.success) setAccounts(accountsRes.data);
      if (txsRes.success) setTransactions(txsRes.data);
      if (appealsRes.success) setAppeals(appealsRes.data);

      if (!accountsRes.success && !txsRes.success) {
        setApiError('Không thể tải dữ liệu điểm rèn luyện từ máy chủ.');
      }
    } catch {
      setApiError('Lỗi kết nối khi tải dữ liệu điểm rèn luyện.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedClass, isStudentRole, activeStudentCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = trainingApiService.subscribeToEvents((event) => {
      if (
        event.type === 'TRANSACTION_CREATED' ||
        event.type === 'TRANSACTION_APPROVED' ||
        event.type === 'TRANSACTION_REJECTED' ||
        event.type === 'TRANSACTION_CANCELLED' ||
        event.type === 'MONTHLY_UPDATED' ||
        event.type === 'MONTH_LOCKED' ||
        event.type === 'APPEAL_UPDATED' ||
        event.type === 'CRITERIA_UPDATED'
      ) {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  // Admin Criterion CRUD Handlers
  const getCalculationTypeLabel = (calcType: CalculationType): string => {
    switch (calcType) {
      case 'FIXED':
        return 'Cố định';
      case 'PER_OCCURRENCE':
        return 'Theo số lần';
      case 'SELECT_LEVEL':
        return 'Theo cấp độ';
      case 'MANUAL_RANGE':
        return 'Trong khoảng điểm';
      default:
        return calcType;
    }
  };

  const openCreateCriterionModal = (defaultCategoryId?: string) => {
    setEditingCriterion(null);
    setCriterionFormError(null);
    setCriterionForm({
      categoryId: defaultCategoryId || categories[0]?.id || 'CAT_STUDY',
      code: '',
      name: '',
      direction: 'ADD',
      calculationType: 'FIXED',
      defaultPoints: 2,
      minPoints: 1,
      maxPoints: 5,
      maxOccurrencesPerMonth: '',
      requireNote: false,
      requireEvidence: false,
      requireApproval: true,
      allowBatch: true,
      isActive: true,
      levels: [
        { levelName: 'Cấp Khoa', points: 2 },
        { levelName: 'Cấp Trường', points: 4 },
      ],
    });
    setIsCriterionModalOpen(true);
  };

  const openEditCriterionModal = (c: ScoreCriterion) => {
    setEditingCriterion(c);
    setCriterionFormError(null);
    const absDefault = Math.abs(c.defaultPoints || 1);
    setCriterionForm({
      categoryId: c.categoryId,
      code: c.code,
      name: c.name,
      direction: c.direction,
      calculationType: c.calculationType,
      defaultPoints: absDefault,
      minPoints: c.minPoints !== undefined ? Math.abs(c.minPoints) : Math.max(1, absDefault - 1),
      maxPoints: c.maxPoints !== undefined ? Math.abs(c.maxPoints) : absDefault + 2,
      maxOccurrencesPerMonth: c.maxOccurrencesPerMonth ? String(c.maxOccurrencesPerMonth) : '',
      requireNote: Boolean(c.requireNote),
      requireEvidence: Boolean(c.requireEvidence),
      requireApproval: Boolean(c.requireApproval),
      allowBatch: Boolean(c.allowBatch),
      isActive: c.isActive !== false,
      levels:
        c.levels && c.levels.length > 0
          ? c.levels.map((lv) => ({
              id: lv.id,
              levelName: lv.levelName,
              points: Math.abs(lv.points),
            }))
          : [
              { levelName: 'Cấp Khoa', points: 2 },
              { levelName: 'Cấp Trường', points: 4 },
            ],
    });
    setIsCriterionModalOpen(true);
  };

  const handleSaveCriterion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setCriterionFormError(null);

    const trimmedCode = criterionForm.code.trim().toUpperCase().replace(/\s+/g, '_');
    const trimmedName = criterionForm.name.trim();
    if (!trimmedCode || !/^[A-Z0-9_-]+$/.test(trimmedCode)) {
      setCriterionFormError('Mã tiêu chí chỉ gồm chữ cái không dấu, số, dấu gạch dưới (_) hoặc gạch nối (-).');
      return;
    }
    if (!trimmedName) {
      setCriterionFormError('Vui lòng nhập tên tiêu chí.');
      return;
    }
    const ptsMag = Math.abs(Number(criterionForm.defaultPoints));
    if (!Number.isFinite(ptsMag) || ptsMag <= 0 || ptsMag > 100) {
      setCriterionFormError('Điểm mặc định phải lớn hơn 0 và không vượt quá 100.');
      return;
    }

    const payload: Partial<ScoreCriterion> = {
      categoryId: criterionForm.categoryId,
      code: trimmedCode,
      name: trimmedName,
      direction: criterionForm.direction,
      calculationType: criterionForm.calculationType,
      defaultPoints: criterionForm.direction === 'SUBTRACT' ? -ptsMag : ptsMag,
      requireNote: criterionForm.requireNote,
      requireEvidence: criterionForm.requireEvidence,
      requireApproval: criterionForm.requireApproval,
      allowBatch: criterionForm.allowBatch,
      isActive: criterionForm.isActive,
    };

    if (criterionForm.calculationType === 'MANUAL_RANGE') {
      const minMag = Math.abs(Number(criterionForm.minPoints));
      const maxMag = Math.abs(Number(criterionForm.maxPoints));
      if (!Number.isFinite(minMag) || !Number.isFinite(maxMag) || minMag <= 0 || minMag > maxMag || maxMag > 100) {
        setCriterionFormError('Khoảng điểm không hợp lệ (0 < Điểm tối thiểu <= Điểm tối đa <= 100).');
        return;
      }
      payload.minPoints = minMag;
      payload.maxPoints = maxMag;
    }

    if (criterionForm.calculationType === 'PER_OCCURRENCE' && criterionForm.maxOccurrencesPerMonth.trim() !== '') {
      const cap = Math.floor(Number(criterionForm.maxOccurrencesPerMonth));
      if (!Number.isFinite(cap) || cap < 1 || cap > 100) {
        setCriterionFormError('Số lần tối đa/tháng phải từ 1 đến 100.');
        return;
      }
      payload.maxOccurrencesPerMonth = cap;
    }

    if (criterionForm.calculationType === 'SELECT_LEVEL') {
      const cleanedLevels = criterionForm.levels
        .map((lv, idx) => ({
          id: lv.id || `LV-TMP-${idx + 1}`,
          criterionId: editingCriterion?.id || 'NEW',
          levelName: lv.levelName.trim(),
          points: Math.abs(Number(lv.points)),
          displayOrder: idx + 1,
        }))
        .filter((lv) => lv.levelName.length > 0);
      if (cleanedLevels.length === 0 || cleanedLevels.some((lv) => !Number.isFinite(lv.points) || lv.points <= 0 || lv.points > 100)) {
        setCriterionFormError('Vui lòng nhập ít nhất 1 cấp độ với tên và mức điểm hợp lệ (0 < điểm <= 100).');
        return;
      }
      payload.levels = cleanedLevels;
    }

    setIsSavingCriterion(true);
    try {
      const res = editingCriterion
        ? await trainingApiService.updateCriterion(editingCriterion.id, payload)
        : await trainingApiService.createCriterion(payload);

      if (res.success) {
        showToast(res.message || (editingCriterion ? 'Đã cập nhật tiêu chí.' : 'Đã thêm tiêu chí mới.'));
        setIsCriterionModalOpen(false);
        setEditingCriterion(null);
        await loadData();
      } else {
        setCriterionFormError(res.message || 'Không thể lưu tiêu chí rèn luyện.');
      }
    } finally {
      setIsSavingCriterion(false);
    }
  };

  const handleConfirmDeleteCriterion = async () => {
    if (!deletingCriterion || !isAdmin) return;
    setIsDeletingCriterion(true);
    try {
      const res = await trainingApiService.deleteCriterion(deletingCriterion.id);
      if (res.success) {
        showToast(res.message || 'Đã xóa tiêu chí rèn luyện.');
        setDeletingCriterion(null);
        await loadData();
      } else {
        setApiError(res.message || 'Không thể xóa tiêu chí rèn luyện.');
        setDeletingCriterion(null);
      }
    } finally {
      setIsDeletingCriterion(false);
    }
  };

  const selectedCriterionObj = useMemo(() => {
    return criteria.find((c) => c.id === entryCriterionId) || null;
  }, [criteria, entryCriterionId]);

  useEffect(() => {
    if (selectedCriterionObj) {
      if (selectedCriterionObj.calculationType === 'SELECT_LEVEL' && selectedCriterionObj.levels?.length) {
        setEntrySelectedLevelId(selectedCriterionObj.levels[0].id);
        setEntryPointsPerOccurrence(selectedCriterionObj.levels[0].points);
      } else {
        setEntryPointsPerOccurrence(selectedCriterionObj.defaultPoints);
      }
    }
  }, [selectedCriterionObj]);

  useEffect(() => {
    setBoardPage(1);
    setApprovalPage(1);
  }, [selectedMonth, selectedYear, selectedClass, searchTerm]);

  const filteredAccounts = useMemo(() => {
    let list = accounts;
    if (isStudentRole) {
      list = activeStudentCode
        ? list.filter((a) => a.studentCode.toLowerCase() === activeStudentCode)
        : [];
    }
    if (selectedClass) {
      list = list.filter((a) => a.classId.toLowerCase() === selectedClass.toLowerCase());
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.studentCode.toLowerCase().includes(q) ||
          (a.studentName && a.studentName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [accounts, isStudentRole, activeStudentCode, selectedClass, searchTerm]);

  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (isStudentRole) {
      list = activeStudentCode
        ? list.filter((t) => t.studentCode.toLowerCase() === activeStudentCode)
        : [];
    }
    if (selectedClass) {
      list = list.filter((t) => t.classId.toLowerCase() === selectedClass.toLowerCase());
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.studentCode.toLowerCase().includes(q) ||
          (t.studentName && t.studentName.toLowerCase().includes(q)) ||
          (t.criterionName && t.criterionName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [transactions, isStudentRole, activeStudentCode, selectedClass, searchTerm]);

  const visibleAppeals = useMemo(() => {
    if (isStudentRole) {
      return activeStudentCode
        ? appeals.filter((a) => a.studentCode.toLowerCase() === activeStudentCode)
        : [];
    }
    return appeals;
  }, [appeals, isStudentRole, activeStudentCode]);

  const viewedStudentCode = useMemo(() => {
    if (isStudentRole) return activeStudentCode;
    if (selectedStudentForDetail?.maSV) return selectedStudentForDetail.maSV.toLowerCase();
    return '';
  }, [isStudentRole, activeStudentCode, selectedStudentForDetail]);

  const studentSelfAccount = useMemo(() => {
    if (!viewedStudentCode) return null;
    return accounts.find((a) => a.studentCode.toLowerCase() === viewedStudentCode) || null;
  }, [accounts, viewedStudentCode]);

  const studentPortalTransactions = useMemo(() => {
    if (!viewedStudentCode) return filteredTransactions;
    return filteredTransactions.filter(
      (t) => t.studentCode.toLowerCase() === viewedStudentCode
    );
  }, [filteredTransactions, viewedStudentCode]);

  const kpis = useMemo(() => {
    const totalCount = filteredAccounts.length;
    const pendingCount = filteredTransactions.filter((t) => t.status === 'SUBMITTED').length;
    if (totalCount === 0) {
      return { totalCount: 0, avgScore: 0, goodOrExcellentRate: 0, pendingCount };
    }
    const sumScore = filteredAccounts.reduce((acc, a) => acc + a.totalOfficialScore, 0);
    const highCount = filteredAccounts.filter(
      (a) => a.classification === 'Xuất sắc' || a.classification === 'Tốt'
    ).length;
    return {
      totalCount,
      avgScore: Math.round((sumScore / totalCount) * 10) / 10,
      goodOrExcellentRate: Math.round((highCount / totalCount) * 100),
      pendingCount,
    };
  }, [filteredAccounts, filteredTransactions]);

  const paginatedAccounts = useMemo(() => {
    const start = (boardPage - 1) * boardPageSize;
    return filteredAccounts.slice(start, start + boardPageSize);
  }, [filteredAccounts, boardPage, boardPageSize]);

  const paginatedTransactions = useMemo(() => {
    const start = (approvalPage - 1) * approvalPageSize;
    return filteredTransactions.slice(start, start + approvalPageSize);
  }, [filteredTransactions, approvalPage, approvalPageSize]);

  const hasActiveFilters = Boolean(searchTerm.trim() || selectedClass);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedClass('');
  };

  // Action Handlers
  const handleCreateQuickTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryStudentCode || !entryCriterionId) {
      showToast('Vui lòng chọn sinh viên và tiêu chí rèn luyện.');
      return;
    }

    const student = students.find((s) => s.maSV.toLowerCase() === entryStudentCode.toLowerCase());
    const res = await trainingApiService.createTransaction({
      studentCode: entryStudentCode,
      studentName: student?.hoTen,
      classId: student?.lop || selectedClass || '',
      month: selectedMonth,
      year: selectedYear,
      criterionId: entryCriterionId,
      occurredAt: `${entryOccurredAt} 08:00`,
      occurrences: entryOccurrences,
      pointsPerOccurrence: entryPointsPerOccurrence,
      selectedLevelId: entrySelectedLevelId,
      note: entryNote,
      evidenceUrl: entryEvidenceUrl,
      createdBy: currentUser?.username || '',
      createdByName: currentUser?.fullName || currentUser?.username || '',
      autoSubmit: true,
    });

    showToast(res.message);
    if (res.success) {
      setIsQuickEntryOpen(false);
      setEntryNote('');
      setEntryEvidenceUrl('');
      loadData();
    }
  };

  const handleApproveTransaction = async (txId: string) => {
    const res = await trainingApiService.approveTransaction(
      txId,
      currentUser?.username || '',
      currentUser?.fullName || currentUser?.username || ''
    );
    showToast(res.message);
    if (res.success) {
      loadData();
    }
  };

  const openRejectTxModal = (txId: string) => {
    setActionPrompt({
      isOpen: true,
      type: 'REJECT_TX',
      targetId: txId,
      title: 'Từ chối giao dịch điểm',
      inputLabel: 'Lý do từ chối *',
      inputValue: '',
      showCheckbox: false,
    });
  };

  const openCancelTxModal = (txId: string) => {
    setActionPrompt({
      isOpen: true,
      type: 'CANCEL_TX',
      targetId: txId,
      title: 'Hủy giao dịch điểm',
      inputLabel: 'Lý do hủy *',
      inputValue: '',
      showCheckbox: true,
      checkboxLabel: 'Tạo giao dịch đảo để lưu lịch sử bù trừ',
      checkboxChecked: true,
    });
  };

  const openAcceptAppealModal = (appealId: string) => {
    setActionPrompt({
      isOpen: true,
      type: 'ACCEPT_APPEAL',
      targetId: appealId,
      title: 'Chấp nhận khiếu nại',
      inputLabel: 'Nội dung phản hồi *',
      inputValue: '',
      showCheckbox: false,
    });
  };

  const openRejectAppealModal = (appealId: string) => {
    setActionPrompt({
      isOpen: true,
      type: 'REJECT_APPEAL',
      targetId: appealId,
      title: 'Từ chối khiếu nại',
      inputLabel: 'Lý do từ chối *',
      inputValue: '',
      showCheckbox: false,
    });
  };

  const handleExecuteActionPrompt = async () => {
    const { type, targetId, inputValue, checkboxChecked } = actionPrompt;
    if (!inputValue.trim()) {
      showToast('Vui lòng nhập đầy đủ nội dung.');
      return;
    }

    const actor = currentUser?.username || '';

    if (type === 'REJECT_TX') {
      const res = await trainingApiService.rejectTransaction(targetId, actor, inputValue.trim());
      showToast(res.message);
      setActionPrompt((prev) => ({ ...prev, isOpen: false }));
      loadData();
    } else if (type === 'CANCEL_TX') {
      const res = await trainingApiService.cancelTransaction(
        targetId,
        actor,
        inputValue.trim(),
        Boolean(checkboxChecked)
      );
      showToast(res.message);
      setActionPrompt((prev) => ({ ...prev, isOpen: false }));
      loadData();
    } else if (type === 'ACCEPT_APPEAL') {
      const res = await trainingApiService.resolveAppeal(targetId, 'ACCEPTED', inputValue.trim(), actor);
      showToast(res.message || 'Đã chấp nhận khiếu nại.');
      setActionPrompt((prev) => ({ ...prev, isOpen: false }));
      loadData();
    } else if (type === 'REJECT_APPEAL') {
      const res = await trainingApiService.resolveAppeal(targetId, 'REJECTED', inputValue.trim(), actor);
      showToast(res.message || 'Đã từ chối khiếu nại.');
      setActionPrompt((prev) => ({ ...prev, isOpen: false }));
      loadData();
    }
  };

  const handleUpdateMonthStatus = async () => {
    if (currentMonthObj.status === 'LOCKED' && lockTargetStatus !== 'LOCKED' && !reopenReason.trim()) {
      showToast('Vui lòng nhập lý do mở lại tháng đã khóa.');
      return;
    }
    const res = await trainingApiService.updateMonthStatus(
      selectedMonth,
      selectedYear,
      lockTargetStatus,
      currentUser?.username || '',
      reopenReason
    );
    showToast(res.message);
    if (res.success) {
      setIsLockModalOpen(false);
      setReopenReason('');
      loadData();
    }
  };

  const handleCreateAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) {
      showToast('Vui lòng nhập lý do khiếu nại.');
      return;
    }
    const res = await trainingApiService.createAppeal({
      studentCode: activeStudentCode,
      title: appealTitle || 'Khiếu nại điểm rèn luyện',
      reason: appealReason,
      month: selectedMonth,
      year: selectedYear,
      evidenceUrl: appealEvidenceUrl || undefined,
    });
    showToast(res.message);
    if (res.success) {
      setIsAppealModalOpen(false);
      setAppealTitle('');
      setAppealReason('');
      setAppealEvidenceUrl('');
      loadData();
    }
  };

  const handleExportExcel = () => {
    if (filteredAccounts.length === 0) {
      showToast('Chưa có dữ liệu để xuất Excel.');
      return;
    }

    const exportData = filteredAccounts.map((a, idx) => ({
      STT: idx + 1,
      'Mã Sinh Viên': a.studentCode,
      'Họ và Tên': a.studentName || '',
      Lớp: a.classId,
      'Chức vụ': a.isOfficer ? a.officerRoleName || 'Cán bộ lớp' : 'Sinh viên',
      'Điểm Nền': a.totalBasePoints,
      'Nội dung I: Học tập (/35)': a.cat1Recognized,
      'Nội dung II: Kỷ luật (/35)': a.cat2Recognized,
      'Nội dung III: Hoạt động (/30)': a.cat3Recognized,
      'Tổng điểm tháng (/100)': a.totalOfficialScore,
      'Xếp loại': a.classification,
      'Trạng thái tháng': a.monthStatus,
      'Ngày tính toán': a.lastCalculatedAt ? a.lastCalculatedAt.substring(0, 10) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `DRL_T${selectedMonth}_${selectedYear}`);
    XLSX.writeFile(
      wb,
      `BangDiemRenLuyen_Thang${selectedMonth}_${selectedYear}_${selectedClass || 'ToanTruong'}.xlsx`
    );
    showToast('Đã xuất tệp Excel bảng điểm rèn luyện.');
  };

  const monthStatusMeta = getMonthStatusMeta(currentMonthObj.status);
  const combinedLoadError = loadError || apiError;
  const isInitialLoading = (isLoading || externalLoading) && accounts.length === 0 && criteria.length === 0;

  return (
    <div className="space-y-4">
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 text-white rounded border border-slate-700 text-xs font-medium shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <PageHeader
        title="Điểm rèn luyện"
        icon={Award}
        actions={
          <>
            {isAdminOrLecturer ? (
              <button
                type="button"
                onClick={() => setIsLockModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
                title="Cập nhật trạng thái tháng"
              >
                {currentMonthObj.status === 'LOCKED' ? (
                  <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>
                  Tháng <span className="font-mono">{selectedMonth}/{selectedYear}</span>: {monthStatusMeta.label}
                </span>
                <Sliders className="w-3 h-3 text-slate-400" />
              </button>
            ) : (
              <StatusBadge
                label={`Tháng ${selectedMonth}/${selectedYear}: ${monthStatusMeta.label}`}
                variant={monthStatusMeta.variant}
                dot
              />
            )}

            {isAdminOrLecturer && (
              <>
                <button
                  type="button"
                  onClick={() => setIsQuickEntryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cộng / Trừ điểm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBatchEntryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Nhập hàng loạt</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredAccounts.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-medium border border-slate-300 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Xuất Excel</span>
            </button>
          </>
        }
      />

      {combinedLoadError && (
        <ErrorBanner
          message={combinedLoadError}
          onRetry={() => {
            if (onRetryLoad) onRetryLoad();
            loadData();
          }}
        />
      )}

      {/* Filter & Sub-tab Container */}
      <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-3.5 space-y-3">
        <DataToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Tìm theo mã SV, họ tên, tiêu chí..."
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
          filters={
            <>
              <div>
                <label htmlFor={filterMonthId} className="sr-only">
                  Tháng đánh giá
                </label>
                <select
                  id={filterMonthId}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer font-mono"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      Tháng {m} ({m >= 8 ? 'HK1' : 'HK2'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={filterYearId} className="sr-only">
                  Năm đánh giá
                </label>
                <select
                  id={filterYearId}
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer font-mono"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>

              {isAdminOrLecturer && (
                <div>
                  <label htmlFor={filterClassId} className="sr-only">
                    Lớp sinh viên
                  </label>
                  <select
                    id={filterClassId}
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="">Tất cả lớp</option>
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          }
        />

        <div
          role="tablist"
          aria-label="Phân mục điểm rèn luyện"
          className="flex items-center gap-1 pt-2.5 border-t border-slate-200 dark:border-slate-800 overflow-x-auto"
        >
          {isAdminOrLecturer && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'CLASS_BOARD'}
              onClick={() => setActiveTab('CLASS_BOARD')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'CLASS_BOARD'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bảng điểm lớp ({filteredAccounts.length})</span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'STUDENT_PORTAL'}
            onClick={() => setActiveTab('STUDENT_PORTAL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'STUDENT_PORTAL'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{isStudentRole ? 'Điểm rèn luyện cá nhân' : 'Chi tiết cá nhân'}</span>
          </button>

          {isAdminOrLecturer && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'APPROVAL'}
              onClick={() => setActiveTab('APPROVAL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'APPROVAL'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Duyệt đơn ({kpis.pendingCount})</span>
            </button>
          )}

          {isAdminOrLecturer && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'OFFICERS'}
              onClick={() => setActiveTab('OFFICERS')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'OFFICERS'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Cán bộ lớp ({officerAssignments.length})</span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'POLICY'}
            onClick={() => setActiveTab('POLICY')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'POLICY'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Quy chế & Tiêu chí ({criteria.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'APPEALS'}
            onClick={() => setActiveTab('APPEALS')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'APPEALS'
                ? 'bg-blue-700 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Khiếu nại ({visibleAppeals.length})</span>
          </button>
        </div>
      </div>

      {/* RBAC Safety Fallback */}
      {isStudentRole && (activeTab === 'CLASS_BOARD' || activeTab === 'APPROVAL' || activeTab === 'OFFICERS') ? (
        <ErrorState type="403" onGoBack={() => setActiveTab('STUDENT_PORTAL')} />
      ) : isInitialLoading ? (
        <LoadingState rows={6} />
      ) : (
        <>
          {/* TAB 1: CLASS BOARD */}
          {isAdminOrLecturer && activeTab === 'CLASS_BOARD' && (
            <div className="space-y-3">
              <MetricStrip
                metrics={[
                  { label: 'Sĩ số đánh giá', value: kpis.totalCount, dotColor: 'blue' },
                  { label: 'Điểm trung bình', value: `${kpis.avgScore} / 100`, dotColor: 'blue' },
                  { label: 'Tỷ lệ Xuất sắc & Tốt', value: `${kpis.goodOrExcellentRate}%`, dotColor: 'emerald' },
                  { label: 'Chờ duyệt', value: kpis.pendingCount, dotColor: kpis.pendingCount > 0 ? 'amber' : 'slate' },
                ]}
              />

              {accounts.length === 0 && !isLoading ? (
                <EmptyState message="Chưa có dữ liệu." />
              ) : filteredAccounts.length === 0 ? (
                <FilteredEmptyState onClearFilters={handleClearFilters} />
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Sinh viên</th>
                          <th className="py-2.5 px-3">Lớp & Vai trò</th>
                          <th className="py-2.5 px-3 text-center">Nền</th>
                          <th className="py-2.5 px-3">I: Học tập (/35)</th>
                          <th className="py-2.5 px-3">II: Kỷ luật (/35)</th>
                          <th className="py-2.5 px-3">III: Hoạt động (/30)</th>
                          <th className="py-2.5 px-3 text-center">Tổng điểm</th>
                          <th className="py-2.5 px-3 text-center">Xếp loại</th>
                          <th className="py-2.5 px-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {paginatedAccounts.map((acc) => (
                          <tr
                            key={acc.id}
                            className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {acc.studentName || acc.studentCode}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-blue-700 dark:text-blue-400">
                                {acc.studentCode}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {acc.classId}
                              </div>
                              {acc.isOfficer ? (
                                <StatusBadge
                                  label={`${acc.officerRoleName || 'Cán bộ'} (75)`}
                                  variant="info"
                                  className="mt-0.5"
                                />
                              ) : (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Sinh viên
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                              {acc.totalBasePoints}
                            </td>
                            <td className="py-2.5 px-3 min-w-[120px]">
                              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {acc.cat1Recognized}/35
                                </span>
                                <span className={acc.cat1RawDelta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                                  {acc.cat1RawDelta > 0 ? `+${acc.cat1RawDelta}` : acc.cat1RawDelta}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded overflow-hidden">
                                <div
                                  className="bg-blue-700 h-full"
                                  style={{ width: `${Math.min(100, (acc.cat1Recognized / 35) * 100)}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 min-w-[120px]">
                              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {acc.cat2Recognized}/35
                                </span>
                                <span className={acc.cat2RawDelta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                                  {acc.cat2RawDelta > 0 ? `+${acc.cat2RawDelta}` : acc.cat2RawDelta}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full"
                                  style={{ width: `${Math.min(100, (acc.cat2Recognized / 35) * 100)}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 min-w-[120px]">
                              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {acc.cat3Recognized}/30
                                </span>
                                <span className={acc.cat3RawDelta >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                                  {acc.cat3RawDelta > 0 ? `+${acc.cat3RawDelta}` : acc.cat3RawDelta}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded overflow-hidden">
                                <div
                                  className="bg-amber-600 h-full"
                                  style={{ width: `${Math.min(100, (acc.cat3Recognized / 30) * 100)}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-sm text-slate-900 dark:text-slate-100">
                              {acc.totalOfficialScore}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <StatusBadge
                                label={acc.classification}
                                variant={getClassificationVariant(acc.classification)}
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEntryStudentCode(acc.studentCode);
                                    setIsQuickEntryOpen(true);
                                  }}
                                  aria-label={`Cộng trừ điểm ${acc.studentName || acc.studentCode}`}
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                  title="Cộng / Trừ điểm"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const st = students.find(
                                      (s) => s.maSV.toLowerCase() === acc.studentCode.toLowerCase()
                                    );
                                    if (st) {
                                      setSelectedStudentForDetail(st);
                                      setActiveTab('STUDENT_PORTAL');
                                    }
                                  }}
                                  aria-label={`Xem chi tiết ${acc.studentName || acc.studentCode}`}
                                  className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                  title="Xem lịch sử chi tiết"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    currentPage={boardPage}
                    pageSize={boardPageSize}
                    totalItems={filteredAccounts.length}
                    onPageChange={setBoardPage}
                    onPageSizeChange={setBoardPageSize}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STUDENT PORTAL */}
          {activeTab === 'STUDENT_PORTAL' && (
            <div className="space-y-4">
              {isAdminOrLecturer && (
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label
                    htmlFor={portalStudentSelectId}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Sinh viên đang xem:
                  </label>
                  <select
                    id={portalStudentSelectId}
                    value={selectedStudentForDetail?.maSV || ''}
                    onChange={(e) => {
                      const st = students.find((s) => s.maSV === e.target.value) || null;
                      setSelectedStudentForDetail(st);
                    }}
                    className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 cursor-pointer min-w-[260px]"
                  >
                    <option value="">-- Chọn sinh viên để xem chi tiết --</option>
                    {students.map((s) => (
                      <option key={s.maSV} value={s.maSV}>
                        {s.maSV} - {s.hoTen} ({s.lop})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {studentSelfAccount ? (
                <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {studentSelfAccount.studentName || studentSelfAccount.studentCode}
                        </h2>
                        {studentSelfAccount.isOfficer && (
                          <StatusBadge
                            label={`${studentSelfAccount.officerRoleName || 'Cán bộ lớp'} (Nền 75)`}
                            variant="info"
                          />
                        )}
                      </div>
                      <div className="flex items-center flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
                        <span>
                          Mã SV: <strong className="font-mono text-slate-900 dark:text-slate-100">{studentSelfAccount.studentCode}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Lớp: <strong className="text-slate-900 dark:text-slate-100">{studentSelfAccount.classId}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Tháng {studentSelfAccount.month}/{studentSelfAccount.year}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/70 px-4 py-2.5 rounded border border-slate-200 dark:border-slate-700">
                      <div className="text-center">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                          Tổng điểm
                        </span>
                        <div className="text-xl font-mono tabular-nums font-bold text-blue-700 dark:text-blue-400">
                          {studentSelfAccount.totalOfficialScore}
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal"> / 100</span>
                        </div>
                      </div>
                      <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                      <div className="text-center">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                          Xếp loại
                        </span>
                        <StatusBadge
                          label={studentSelfAccount.classification}
                          variant={getClassificationVariant(studentSelfAccount.classification)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <span>I. Học tập & NCKH</span>
                        <span className="font-mono tabular-nums">Tối đa 35</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1 font-mono tabular-nums">
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {studentSelfAccount.cat1Recognized}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Nền {studentSelfAccount.cat1BasePoints} ·{' '}
                          {studentSelfAccount.cat1RawDelta >= 0
                            ? `+${studentSelfAccount.cat1RawDelta}`
                            : studentSelfAccount.cat1RawDelta}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded mt-2 overflow-hidden">
                        <div
                          className="bg-blue-700 h-full"
                          style={{ width: `${Math.min(100, (studentSelfAccount.cat1Recognized / 35) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <span>II. Kỷ luật & Nội quy</span>
                        <span className="font-mono tabular-nums">Tối đa 35</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1 font-mono tabular-nums">
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {studentSelfAccount.cat2Recognized}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Nền {studentSelfAccount.cat2BasePoints} ·{' '}
                          {studentSelfAccount.cat2RawDelta >= 0
                            ? `+${studentSelfAccount.cat2RawDelta}`
                            : studentSelfAccount.cat2RawDelta}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full"
                          style={{ width: `${Math.min(100, (studentSelfAccount.cat2Recognized / 35) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        <span>III. Hoạt động & Phong trào</span>
                        <span className="font-mono tabular-nums">Tối đa 30</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1 font-mono tabular-nums">
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {studentSelfAccount.cat3Recognized}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Nền {studentSelfAccount.cat3BasePoints} ·{' '}
                          {studentSelfAccount.cat3RawDelta >= 0
                            ? `+${studentSelfAccount.cat3RawDelta}`
                            : studentSelfAccount.cat3RawDelta}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded mt-2 overflow-hidden">
                        <div
                          className="bg-amber-600 h-full"
                          style={{ width: `${Math.min(100, (studentSelfAccount.cat3Recognized / 30) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState message="Chưa có dữ liệu." />
              )}

              {/* Transaction History */}
              <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Lịch sử giao dịch điểm tháng {selectedMonth}/{selectedYear}
                    </h3>
                  </div>
                  {isStudentRole && (
                    <button
                      type="button"
                      onClick={() => setIsAppealModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Gửi khiếu nại</span>
                    </button>
                  )}
                </div>

                {studentPortalTransactions.length === 0 ? (
                  <EmptyState message="Chưa có dữ liệu." />
                ) : (
                  <div className="space-y-2">
                    {studentPortalTransactions.map((tx) => {
                      const statusMeta = getTransactionStatusMeta(tx.status);
                      return (
                        <div
                          key={tx.id}
                          className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`px-2 py-1 rounded font-mono tabular-nums font-bold text-xs shrink-0 border ${
                                tx.totalPointsDelta >= 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {tx.totalPointsDelta > 0 ? `+${tx.totalPointsDelta}` : tx.totalPointsDelta}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {tx.criterionName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                                {tx.categoryName} · {tx.occurredAt} · {tx.createdByName || tx.createdBy}
                              </div>
                              {tx.note && (
                                <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">
                                  {tx.note}
                                </div>
                              )}
                              {tx.evidenceUrl && (
                                <a
                                  href={tx.evidenceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-400 hover:underline mt-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Minh chứng</span>
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center">
                            <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
                            {isAdminOrLecturer && tx.status === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => openCancelTxModal(tx.id)}
                                aria-label="Hủy giao dịch"
                                className="p-1 text-slate-500 hover:text-rose-700 dark:hover:text-rose-400 rounded cursor-pointer transition-colors"
                                title="Hủy giao dịch"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: APPROVAL */}
          {isAdminOrLecturer && activeTab === 'APPROVAL' && (
            transactions.length === 0 ? (
              <EmptyState message="Chưa có dữ liệu." />
            ) : filteredTransactions.length === 0 ? (
              <FilteredEmptyState onClearFilters={handleClearFilters} />
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Mã & Thời gian</th>
                        <th className="py-2.5 px-3">Sinh viên</th>
                        <th className="py-2.5 px-3">Tiêu chí</th>
                        <th className="py-2.5 px-3 text-center">Điểm</th>
                        <th className="py-2.5 px-3">Ghi chú & Minh chứng</th>
                        <th className="py-2.5 px-3">Người gửi</th>
                        <th className="py-2.5 px-3 text-center">Trạng thái</th>
                        <th className="py-2.5 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {paginatedTransactions.map((tx) => {
                        const statusMeta = getTransactionStatusMeta(tx.status);
                        return (
                          <tr
                            key={tx.id}
                            className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                          >
                            <td className="py-2.5 px-3 font-mono tabular-nums">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">#{tx.id}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{tx.occurredAt}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {tx.studentName || tx.studentCode}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                {tx.studentCode} ({tx.classId})
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-900 dark:text-slate-100">{tx.criterionName}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{tx.categoryName}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold">
                              <span
                                className={
                                  tx.totalPointsDelta >= 0
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400'
                                }
                              >
                                {tx.totalPointsDelta > 0 ? `+${tx.totalPointsDelta}` : tx.totalPointsDelta}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[11px]">
                              {tx.note && <p className="text-slate-700 dark:text-slate-300 max-w-xs truncate">{tx.note}</p>}
                              {tx.evidenceUrl && (
                                <a
                                  href={tx.evidenceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-medium mt-0.5"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Minh chứng</span>
                                </a>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                              {tx.createdByName || tx.createdBy}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <StatusBadge label={statusMeta.label} variant={statusMeta.variant} />
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              {tx.status === 'SUBMITTED' ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveTransaction(tx.id)}
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Duyệt</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openRejectTxModal(tx.id)}
                                    className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Từ chối</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">Đã xử lý</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  currentPage={approvalPage}
                  pageSize={approvalPageSize}
                  totalItems={filteredTransactions.length}
                  onPageChange={setApprovalPage}
                  onPageSizeChange={setApprovalPageSize}
                />
              </div>
            )
          )}

          {/* TAB 4: OFFICERS */}
          {isAdminOrLecturer && activeTab === 'OFFICERS' && (
            <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Danh sách cán bộ lớp (Nền 75)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOfficerModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Phân công cán bộ</span>
                </button>
              </div>

              {officerAssignments.length === 0 ? (
                <EmptyState message="Chưa có dữ liệu." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {officerAssignments.map((oa) => (
                    <div
                      key={oa.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                            {oa.studentName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            ({oa.studentCode})
                          </span>
                        </div>
                        <div className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold mt-0.5">
                          {oa.roleName || 'Cán bộ'} · Lớp {oa.classId}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-1">
                          {oa.academicYear} · Từ {oa.validFrom}
                        </div>
                      </div>
                      <StatusBadge label="Đang hiệu lực" variant="info" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: POLICY */}
          {activeTab === 'POLICY' && (
            <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Danh mục tiêu chí đánh giá
                  </h2>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    ({criteria.length} tiêu chí)
                  </span>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => openCreateCriterionModal()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm tiêu chí mới</span>
                  </button>
                )}
              </div>

              {categories.length === 0 ? (
                <EmptyState message="Chưa có dữ liệu." />
              ) : (
                <div className="space-y-3">
                  {categories.map((cat) => {
                    const catCriteria = criteria.filter((c) => c.categoryId === cat.id);
                    return (
                      <div
                        key={cat.id}
                        className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden"
                      >
                        <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {cat.name}{' '}
                            <span className="font-mono font-normal text-slate-600 dark:text-slate-400 ml-1.5">
                              (Trần {cat.maxPoints}đ)
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                              {catCriteria.length} tiêu chí
                            </span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => openCreateCriterionModal(cat.id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Thêm vào nhóm</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {catCriteria.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                            Chưa có tiêu chí nào trong nhóm này.
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-200 dark:divide-slate-800">
                            {catCriteria.map((c) => {
                              const absDefault = Math.abs(c.defaultPoints);
                              const signPrefix = c.direction === 'ADD' ? '+' : '-';
                              const pointLabel =
                                c.calculationType === 'MANUAL_RANGE' &&
                                c.minPoints !== undefined &&
                                c.maxPoints !== undefined
                                  ? `${signPrefix}${Math.abs(c.minPoints)}–${Math.abs(c.maxPoints)}đ`
                                  : `${signPrefix}${absDefault}đ`;

                              return (
                                <div
                                  key={c.id}
                                  className={`p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors ${
                                    !c.isActive ? 'opacity-60 bg-slate-50/60 dark:bg-slate-900/60' : ''
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <StatusBadge
                                        label={pointLabel}
                                        variant={c.direction === 'ADD' ? 'success' : 'danger'}
                                        className="font-mono font-bold tabular-nums"
                                      />
                                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                                        {c.name}
                                      </span>
                                      {!c.isActive && (
                                        <StatusBadge label="Ngừng áp dụng" variant="neutral" />
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center flex-wrap gap-x-2 gap-y-0.5 font-mono">
                                      <span>{c.code}</span>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-sans">{getCalculationTypeLabel(c.calculationType)}</span>
                                      {c.maxOccurrencesPerMonth && (
                                        <>
                                          <span aria-hidden="true">·</span>
                                          <span className="font-sans">Tối đa {c.maxOccurrencesPerMonth} lần/tháng</span>
                                        </>
                                      )}
                                      {c.requireApproval && (
                                        <>
                                          <span aria-hidden="true">·</span>
                                          <span className="font-sans text-amber-700 dark:text-amber-400">Cần duyệt</span>
                                        </>
                                      )}
                                      {c.allowBatch && (
                                        <>
                                          <span aria-hidden="true">·</span>
                                          <span className="font-sans text-blue-700 dark:text-blue-400 font-medium">
                                            Nhập hàng loạt
                                          </span>
                                        </>
                                      )}
                                    </div>
                                    {c.calculationType === 'SELECT_LEVEL' && c.levels && c.levels.length > 0 && (
                                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1">
                                        {c.levels.map((lv) => (
                                          <span key={lv.id} className="inline-flex items-center gap-1">
                                            <span>{lv.levelName}:</span>
                                            <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                                              {signPrefix}
                                              {Math.abs(lv.points)}đ
                                            </span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isAdmin && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openEditCriterionModal(c)}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 transition-colors font-medium cursor-pointer whitespace-nowrap"
                                          title="Chỉnh sửa tiêu chí và mức điểm"
                                        >
                                          <Pencil className="w-3 h-3" />
                                          <span>Tùy chỉnh</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDeletingCriterion(c)}
                                          className="inline-flex items-center justify-center p-1.5 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                                          aria-label={`Xóa tiêu chí ${c.name}`}
                                          title="Xóa tiêu chí"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                    {isAdminOrLecturer && c.isActive && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEntryCriterionId(c.id);
                                          setIsQuickEntryOpen(true);
                                        }}
                                        className="px-2.5 py-1 text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800 transition-colors font-semibold cursor-pointer whitespace-nowrap"
                                      >
                                        Áp dụng
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: APPEALS */}
          {activeTab === 'APPEALS' && (
            <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Phúc khảo & Khiếu nại điểm
                  </h2>
                </div>
                {isStudentRole && (
                  <button
                    type="button"
                    onClick={() => setIsAppealModalOpen(true)}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Gửi khiếu nại</span>
                  </button>
                )}
              </div>

              {visibleAppeals.length === 0 ? (
                <EmptyState message="Chưa có dữ liệu." />
              ) : (
                <div className="space-y-2.5">
                  {visibleAppeals.map((app) => {
                    const appealMeta = getAppealStatusMeta(app.status);
                    return (
                      <div
                        key={app.id}
                        className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{app.title}</span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              ({app.studentCode})
                            </span>
                          </div>
                          <StatusBadge label={appealMeta.label} variant={appealMeta.variant} dot />
                        </div>

                        <p className="text-slate-700 dark:text-slate-300">{app.reason}</p>

                        {app.evidenceUrl && (
                          <a
                            href={app.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-700 dark:text-blue-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Minh chứng</span>
                          </a>
                        )}

                        {app.replyNote && (
                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
                            <strong className="text-slate-900 dark:text-slate-100">Phản hồi:</strong> {app.replyNote}
                          </div>
                        )}

                        {isAdminOrLecturer && app.status === 'PENDING' && (
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => openAcceptAppealModal(app.id)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Chấp nhận
                            </button>
                            <button
                              type="button"
                              onClick={() => openRejectAppealModal(app.id)}
                              className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: QUICK ENTRY */}
      {isQuickEntryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby={quickEntryTitleId}
          onClick={() => setIsQuickEntryOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <h3 id={quickEntryTitleId} className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Ghi nhận giao dịch điểm rèn luyện
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickEntryOpen(false)}
                aria-label="Đóng biểu mẫu"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickTransaction} className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              <div>
                <label htmlFor={quickStudentId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Sinh viên <span className="text-rose-600">*</span>
                </label>
                <select
                  id={quickStudentId}
                  value={entryStudentCode}
                  onChange={(e) => setEntryStudentCode(e.target.value)}
                  required
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">-- Chọn sinh viên --</option>
                  {students.map((s) => (
                    <option key={s.maSV} value={s.maSV}>
                      {s.hoTen} ({s.maSV}) - {s.lop}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={quickCriterionId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Tiêu chí cộng / trừ <span className="text-rose-600">*</span>
                </label>
                <select
                  id={quickCriterionId}
                  value={entryCriterionId}
                  onChange={(e) => setEntryCriterionId(e.target.value)}
                  required
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">-- Chọn tiêu chí --</option>
                  {criteria
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.direction === 'ADD' ? '+' : '-'}{Math.abs(c.defaultPoints)}đ] [{c.categoryName}] {c.name}
                      </option>
                    ))}
                </select>
              </div>

              {selectedCriterionObj && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded border border-slate-200 dark:border-slate-700 space-y-2.5">
                  {selectedCriterionObj.calculationType === 'SELECT_LEVEL' && selectedCriterionObj.levels && (
                    <div>
                      <label htmlFor={quickLevelId} className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Cấp bậc khen thưởng / vi phạm
                      </label>
                      <select
                        id={quickLevelId}
                        value={entrySelectedLevelId}
                        onChange={(e) => {
                          setEntrySelectedLevelId(e.target.value);
                          const lvl = selectedCriterionObj.levels?.find((l) => l.id === e.target.value);
                          if (lvl) setEntryPointsPerOccurrence(lvl.points);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                      >
                        {selectedCriterionObj.levels.map((lvl) => (
                          <option key={lvl.id} value={lvl.id}>
                            {lvl.levelName} ({lvl.points > 0 ? `+${lvl.points}` : lvl.points} điểm)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedCriterionObj.calculationType === 'PER_OCCURRENCE' && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label htmlFor={quickOccId} className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          Số lần phát sinh
                        </label>
                        <input
                          id={quickOccId}
                          type="number"
                          min="1"
                          max="20"
                          value={entryOccurrences}
                          onChange={(e) => setEntryOccurrences(Math.max(1, Number(e.target.value)))}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          Điểm mỗi lần
                        </span>
                        <div className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                          {entryPointsPerOccurrence > 0 ? `+${entryPointsPerOccurrence}` : entryPointsPerOccurrence} đ
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCriterionObj.calculationType === 'MANUAL_RANGE' && (
                    <div>
                      <label htmlFor={quickRangeId} className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Điểm ({selectedCriterionObj.minPoints} đến {selectedCriterionObj.maxPoints})
                      </label>
                      <input
                        id={quickRangeId}
                        type="number"
                        min={selectedCriterionObj.minPoints || 0}
                        max={selectedCriterionObj.maxPoints || 10}
                        value={entryPointsPerOccurrence}
                        onChange={(e) => setEntryPointsPerOccurrence(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>Tổng điểm thay đổi:</span>
                    <span
                      className={`text-sm font-mono tabular-nums ${
                        entryOccurrences * entryPointsPerOccurrence >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {entryOccurrences * entryPointsPerOccurrence > 0
                        ? `+${entryOccurrences * entryPointsPerOccurrence}`
                        : entryOccurrences * entryPointsPerOccurrence}{' '}
                      điểm
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor={quickDateId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Ngày phát sinh
                  </label>
                  <input
                    id={quickDateId}
                    type="date"
                    value={entryOccurredAt}
                    onChange={(e) => setEntryOccurredAt(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor={quickUrlId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Liên kết minh chứng
                  </label>
                  <input
                    id={quickUrlId}
                    type="url"
                    placeholder="https://..."
                    value={entryEvidenceUrl}
                    onChange={(e) => setEntryEvidenceUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor={quickNoteId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Ghi chú lý do
                </label>
                <textarea
                  id={quickNoteId}
                  rows={2}
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuickEntryOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Lưu giao dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BATCH EVENT ENTRY */}
      {isBatchEntryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby={batchTitleId}
          onClick={() => setIsBatchEntryOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h3 id={batchTitleId} className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Nhập điểm sự kiện hàng loạt
              </h3>
              <button
                type="button"
                onClick={() => setIsBatchEntryOpen(false)}
                aria-label="Đóng biểu mẫu"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label htmlFor={batchClassSelectId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Lớp sinh viên <span className="text-rose-600">*</span>
                </label>
                <select
                  id={batchClassSelectId}
                  value={batchClassId}
                  onChange={(e) => {
                    const c = e.target.value;
                    setBatchClassId(c);
                    if (c) {
                      const classMates = students
                        .filter((s) => s.lop.toLowerCase() === c.toLowerCase())
                        .map((s) => s.maSV);
                      setBatchSelectedStudents(classMates);
                    } else {
                      setBatchSelectedStudents([]);
                    }
                  }}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Chọn lớp sinh viên --</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={batchCriterionSelectId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Tiêu chí áp dụng <span className="text-rose-600">*</span>
                </label>
                <select
                  id={batchCriterionSelectId}
                  value={batchCriterionId}
                  onChange={(e) => setBatchCriterionId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Chọn tiêu chí --</option>
                  {criteria
                    .filter((c) => c.isActive && c.allowBatch)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.direction === 'ADD' ? '+' : '-'}{Math.abs(c.defaultPoints)}đ] {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor={batchNoteInputId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Ghi chú sự kiện
                </label>
                <input
                  id={batchNoteInputId}
                  type="text"
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono tabular-nums">
                Số sinh viên được áp dụng: <strong>{batchSelectedStudents.length}</strong>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchEntryOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (batchSelectedStudents.length === 0 || !batchCriterionId) {
                      showToast('Vui lòng chọn lớp và tiêu chí sự kiện.');
                      return;
                    }
                    const payload = {
                      students: batchSelectedStudents.map((code) => {
                        const st = students.find((s) => s.maSV.toLowerCase() === code.toLowerCase());
                        return { studentCode: code, studentName: st?.hoTen, classId: st?.lop };
                      }),
                      criterionId: batchCriterionId,
                      month: selectedMonth,
                      year: selectedYear,
                      note: batchNote || 'Hoạt động tập thể',
                      createdBy: currentUser?.username || '',
                      createdByName: currentUser?.fullName || currentUser?.username || '',
                      autoSubmit: true,
                    };
                    const res = await trainingApiService.createBatchTransactions(payload);
                    showToast(res.message);
                    if (res.success) {
                      setIsBatchEntryOpen(false);
                      loadData();
                    }
                  }}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LOCK / STATUS WORKFLOW */}
      {isLockModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby={lockTitleId}
          onClick={() => setIsLockModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h3 id={lockTitleId} className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Trạng thái tháng {selectedMonth}/{selectedYear}
              </h3>
              <button
                type="button"
                onClick={() => setIsLockModalOpen(false)}
                aria-label="Đóng hộp thoại"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label htmlFor={lockStatusSelectId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Trạng thái mới
                </label>
                <select
                  id={lockStatusSelectId}
                  value={lockTargetStatus}
                  onChange={(e) => setLockTargetStatus(e.target.value as MonthStatus)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="OPEN">Đang mở (Nhập điểm)</option>
                  <option value="REVIEWING">Đang rà soát</option>
                  <option value="PUBLISHED">Đã công bố tạm thời</option>
                  <option value="LOCKED">Đã khóa sổ chính thức</option>
                  <option value="DRAFT">Bản nháp</option>
                </select>
              </div>

              {currentMonthObj.status === 'LOCKED' && lockTargetStatus !== 'LOCKED' && (
                <div>
                  <label htmlFor={lockReasonId} className="block font-semibold text-rose-700 dark:text-rose-400 mb-1">
                    Lý do mở lại tháng đã khóa <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    id={lockReasonId}
                    rows={2}
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLockModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleUpdateMonthStatus}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cập nhật
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: OFFICER ASSIGNMENT */}
      {isOfficerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby={officerTitleId}
          onClick={() => setIsOfficerModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h3 id={officerTitleId} className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Phân công cán bộ lớp
              </h3>
              <button
                type="button"
                onClick={() => setIsOfficerModalOpen(false)}
                aria-label="Đóng biểu mẫu"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label htmlFor={officerStudentSelectId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Sinh viên <span className="text-rose-600">*</span>
                </label>
                <select
                  id={officerStudentSelectId}
                  value={newOfficerStudentCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setNewOfficerStudentCode(code);
                    const st = students.find((s) => s.maSV.toLowerCase() === code.toLowerCase());
                    if (st) setNewOfficerClassId(st.lop);
                  }}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Chọn sinh viên --</option>
                  {students.map((s) => (
                    <option key={s.maSV} value={s.maSV}>
                      {s.hoTen} ({s.maSV}) - {s.lop}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={officerRoleSelectId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Chức vụ <span className="text-rose-600">*</span>
                </label>
                <select
                  id={officerRoleSelectId}
                  value={newOfficerRoleId}
                  onChange={(e) => setNewOfficerRoleId(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Chọn chức vụ --</option>
                  {officerRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Nền 75đ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOfficerModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newOfficerStudentCode || !newOfficerRoleId) {
                      showToast('Vui lòng chọn sinh viên và chức vụ.');
                      return;
                    }
                    const st = students.find(
                      (s) => s.maSV.toLowerCase() === newOfficerStudentCode.toLowerCase()
                    );
                    const res = await trainingApiService.createOfficerAssignment({
                      studentCode: newOfficerStudentCode,
                      studentName: st?.hoTen,
                      classId: newOfficerClassId || st?.lop,
                      roleId: newOfficerRoleId,
                      academicYear: `${selectedYear}-${selectedYear + 1}`,
                      assignedBy: currentUser?.username || '',
                    });
                    showToast(res.message);
                    if (res.success) {
                      setIsOfficerModalOpen(false);
                      loadData();
                    }
                  }}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Lưu phân công
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: STUDENT APPEAL */}
      {isAppealModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby={appealModalTitleId}
          onClick={() => setIsAppealModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h3 id={appealModalTitleId} className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Gửi khiếu nại điểm rèn luyện
              </h3>
              <button
                type="button"
                onClick={() => setIsAppealModalOpen(false)}
                aria-label="Đóng biểu mẫu"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppeal} className="p-4 space-y-3 text-xs">
              <div>
                <label htmlFor={appealTitleInputId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Tiêu đề <span className="text-rose-600">*</span>
                </label>
                <input
                  id={appealTitleInputId}
                  type="text"
                  value={appealTitle}
                  onChange={(e) => setAppealTitle(e.target.value)}
                  required
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor={appealReasonInputId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Nội dung giải trình <span className="text-rose-600">*</span>
                </label>
                <textarea
                  id={appealReasonInputId}
                  rows={3}
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  required
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label htmlFor={appealUrlInputId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Liên kết minh chứng
                </label>
                <input
                  id={appealUrlInputId}
                  type="url"
                  placeholder="https://..."
                  value={appealEvidenceUrl}
                  onChange={(e) => setAppealEvidenceUrl(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAppealModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Gửi khiếu nại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ACTION PROMPT */}
      {actionPrompt.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby={actionPromptTitleId}
          onClick={() => setActionPrompt((prev) => ({ ...prev, isOpen: false }))}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h3 id={actionPromptTitleId} className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{actionPrompt.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setActionPrompt((prev) => ({ ...prev, isOpen: false }))}
                aria-label="Đóng hộp thoại"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label htmlFor={actionPromptInputId} className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  {actionPrompt.inputLabel}
                </label>
                <textarea
                  id={actionPromptInputId}
                  rows={3}
                  value={actionPrompt.inputValue}
                  onChange={(e) => setActionPrompt((prev) => ({ ...prev, inputValue: e.target.value }))}
                  required
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              {actionPrompt.showCheckbox && (
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(actionPrompt.checkboxChecked)}
                    onChange={(e) =>
                      setActionPrompt((prev) => ({ ...prev, checkboxChecked: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>{actionPrompt.checkboxLabel}</span>
                </label>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActionPrompt((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleExecuteActionPrompt}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: ADMIN CREATE / EDIT CRITERION */}
      {isAdmin && isCriterionModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby={criterionModalTitleId}
          onClick={() => setIsCriterionModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md max-w-xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
              <h3 id={criterionModalTitleId} className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {editingCriterion ? 'Tùy chỉnh tiêu chí đánh giá' : 'Thêm tiêu chí đánh giá mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCriterionModalOpen(false)}
                aria-label="Đóng biểu mẫu tiêu chí"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCriterion} className="p-4 space-y-3.5 text-xs overflow-y-auto">
              {criterionFormError && (
                <div className="p-2.5 rounded border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium">
                  {criterionFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Nhóm nội dung <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={criterionForm.categoryId}
                    onChange={(e) => setCriterionForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                    required
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} (Trần {cat.maxPoints}đ)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Mã tiêu chí <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={criterionForm.code}
                    onChange={(e) =>
                      setCriterionForm((prev) => ({
                        ...prev,
                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                      }))
                    }
                    placeholder="VD: HT_OLYMPIC"
                    maxLength={40}
                    required
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Tên tiêu chí <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={criterionForm.name}
                  onChange={(e) => setCriterionForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập mô tả rõ ràng cho tiêu chí cộng/trừ điểm..."
                  maxLength={250}
                  required
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Loại điểm <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={criterionForm.direction}
                    onChange={(e) =>
                      setCriterionForm((prev) => ({
                        ...prev,
                        direction: e.target.value as ScoreDirection,
                      }))
                    }
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="ADD">Cộng điểm (+)</option>
                    <option value="SUBTRACT">Trừ điểm (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Kiểu tính điểm <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={criterionForm.calculationType}
                    onChange={(e) =>
                      setCriterionForm((prev) => ({
                        ...prev,
                        calculationType: e.target.value as CalculationType,
                      }))
                    }
                    className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="FIXED">Cố định</option>
                    <option value="PER_OCCURRENCE">Theo số lần</option>
                    <option value="MANUAL_RANGE">Trong khoảng điểm</option>
                    <option value="SELECT_LEVEL">Chọn theo cấp độ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Mức điểm mặc định <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 font-mono font-bold text-slate-500">
                      {criterionForm.direction === 'ADD' ? '+' : '-'}
                    </span>
                    <input
                      type="number"
                      min={0.5}
                      max={100}
                      step={0.5}
                      value={criterionForm.defaultPoints}
                      onChange={(e) =>
                        setCriterionForm((prev) => ({
                          ...prev,
                          defaultPoints: Math.abs(Number(e.target.value) || 0),
                        }))
                      }
                      required
                      className="w-full pl-6 pr-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {criterionForm.calculationType === 'PER_OCCURRENCE' && (
                <div className="p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Số lần tối đa mỗi tháng (không bắt buộc)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={criterionForm.maxOccurrencesPerMonth}
                    onChange={(e) =>
                      setCriterionForm((prev) => ({ ...prev, maxOccurrencesPerMonth: e.target.value }))
                    }
                    placeholder="VD: 5"
                    className="w-40 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {criterionForm.calculationType === 'MANUAL_RANGE' && (
                <div className="p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Điểm tối thiểu <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      max={100}
                      step={0.5}
                      value={criterionForm.minPoints}
                      onChange={(e) =>
                        setCriterionForm((prev) => ({
                          ...prev,
                          minPoints: Math.abs(Number(e.target.value) || 0),
                        }))
                      }
                      required
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Điểm tối đa <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min={0.5}
                      max={100}
                      step={0.5}
                      value={criterionForm.maxPoints}
                      onChange={(e) =>
                        setCriterionForm((prev) => ({
                          ...prev,
                          maxPoints: Math.abs(Number(e.target.value) || 0),
                        }))
                      }
                      required
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              )}

              {criterionForm.calculationType === 'SELECT_LEVEL' && (
                <div className="p-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Danh sách cấp độ điểm <span className="text-rose-600">*</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCriterionForm((prev) => ({
                          ...prev,
                          levels: [...prev.levels, { levelName: '', points: prev.defaultPoints || 2 }],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm cấp độ</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {criterionForm.levels.map((lv, idx) => (
                      <div key={lv.id || idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={lv.levelName}
                          onChange={(e) =>
                            setCriterionForm((prev) => ({
                              ...prev,
                              levels: prev.levels.map((item, i) =>
                                i === idx ? { ...item, levelName: e.target.value } : item
                              ),
                            }))
                          }
                          placeholder={`Tên cấp độ ${idx + 1} (VD: Cấp Trường)`}
                          className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="number"
                          min={0.5}
                          max={100}
                          step={0.5}
                          value={lv.points}
                          onChange={(e) =>
                            setCriterionForm((prev) => ({
                              ...prev,
                              levels: prev.levels.map((item, i) =>
                                i === idx ? { ...item, points: Math.abs(Number(e.target.value) || 0) } : item
                              ),
                            }))
                          }
                          className="w-20 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100"
                        />
                        {criterionForm.levels.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setCriterionForm((prev) => ({
                                ...prev,
                                levels: prev.levels.filter((_, i) => i !== idx),
                              }))
                            }
                            aria-label="Xóa cấp độ"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criterionForm.requireApproval}
                    onChange={(e) =>
                      setCriterionForm((prev) => ({ ...prev, requireApproval: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>Yêu cầu duyệt trước khi tính điểm</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criterionForm.allowBatch}
                    onChange={(e) =>
                      setCriterionForm((prev) => ({ ...prev, allowBatch: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>Hỗ trợ nhập hàng loạt</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criterionForm.requireNote}
                    onChange={(e) =>
                      setCriterionForm((prev) => ({ ...prev, requireNote: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>Bắt buộc ghi chú lý do</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={criterionForm.requireEvidence}
                    onChange={(e) =>
                      setCriterionForm((prev) => ({ ...prev, requireEvidence: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>Bắt buộc đính kèm minh chứng</span>
                </label>
                {editingCriterion && (
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer sm:col-span-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <input
                      type="checkbox"
                      checked={criterionForm.isActive}
                      onChange={(e) =>
                        setCriterionForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    <span className="font-semibold">Đang áp dụng tiêu chí này</span>
                  </label>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCriterionModalOpen(false)}
                  disabled={isSavingCriterion}
                  className="px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingCriterion}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isSavingCriterion
                    ? 'Đang lưu...'
                    : editingCriterion
                      ? 'Lưu thay đổi'
                      : 'Thêm tiêu chí'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: ADMIN DELETE CRITERION CONFIRMATION */}
      {isAdmin && deletingCriterion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby={criterionDeleteTitleId}
          onClick={() => !isDeletingCriterion && setDeletingCriterion(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-md max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h3 id={criterionDeleteTitleId} className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Xác nhận xóa tiêu chí</span>
              </h3>
              <button
                type="button"
                onClick={() => !isDeletingCriterion && setDeletingCriterion(null)}
                aria-label="Đóng hộp thoại"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <p>
                Bạn có chắc chắn muốn xóa tiêu chí{' '}
                <strong className="text-slate-900 dark:text-slate-100">{deletingCriterion.name}</strong>{' '}
                (<span className="font-mono">{deletingCriterion.code}</span>)?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lưu ý: Các tiêu chí đã từng phát sinh giao dịch điểm sinh viên sẽ được bảo vệ khỏi việc xóa; khi đó bạn có thể chọn Tùy chỉnh và tắt trạng thái áp dụng.
              </p>
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingCriterion(null)}
                  disabled={isDeletingCriterion}
                  className="px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCriterion}
                  disabled={isDeletingCriterion}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-60 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                  {isDeletingCriterion ? 'Đang xóa...' : 'Xóa tiêu chí'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
