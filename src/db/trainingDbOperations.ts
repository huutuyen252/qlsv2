// src/db/trainingDbOperations.ts
// Engine tính toán, cơ sở dữ liệu và nghiệp vụ Phân hệ Quản lý Điểm Rèn luyện

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import {
  ScorePolicy,
  ScoreCategory,
  BaseScoreConfig,
  ScoreClassification,
  ClassOfficerRole,
  ClassOfficerAssignment,
  ScoreCriterion,
  TrainingMonth,
  ScoreTransaction,
  ScoreTransactionRevision,
  MonthlyScoreAccount,
  ScoreAppeal,
  SemesterScoreSummary,
  YearScoreSummary,
  TransactionStatus,
  MonthStatus,
} from '../types/trainingPoint';

// Global Event Emitter cho Server-Sent Events (SSE) Realtime
export const trainingEventBus = new EventEmitter();

const TRAINING_STORE_PATH = path.join(process.cwd(), '.training_point_storage.json');

// Memory tables
let policies: ScorePolicy[] = [];
let categories: ScoreCategory[] = [];
let baseConfigs: BaseScoreConfig[] = [];
let classifications: ScoreClassification[] = [];
let officerRoles: ClassOfficerRole[] = [];
let officerAssignments: ClassOfficerAssignment[] = [];
let criteria: ScoreCriterion[] = [];
let trainingMonths: TrainingMonth[] = [];
let scoreTransactions: ScoreTransaction[] = [];
let transactionRevisions: ScoreTransactionRevision[] = [];
let monthlyAccounts: MonthlyScoreAccount[] = [];
let appeals: ScoreAppeal[] = [];
let semesterSummaries: SemesterScoreSummary[] = [];
let yearSummaries: YearScoreSummary[] = [];

// Seed Data mẫu chuẩn mực
export function initSeedData() {
  const now = new Date().toISOString();

  // 1. Quy chế
  policies = [
    {
      id: 'POL-2025-2026',
      code: 'QC-TDN-2025',
      name: 'Quy chế Đánh giá Rèn luyện Sinh viên 2025-2026',
      academicYearId: '2025-2026',
      effectiveFrom: '2025-08-01',
      isDefault: true,
      roundingPrecision: 1,
      officerBaseRule: 'FIRST_DAY_OF_MONTH',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 2. 3 Nhóm nội dung (Học tập max 35, Kỷ luật max 35, Hoạt động max 30)
  categories = [
    {
      id: 'CAT_STUDY',
      policyId: 'POL-2025-2026',
      code: 'CAT_STUDY',
      name: 'Nội dung I: Học tập & Nghiên cứu khoa học',
      maxPoints: 35,
      displayOrder: 1,
      description: 'Ý thức, kết quả học tập, NCKH, tham gia câu lạc bộ học thuật',
      isActive: true,
    },
    {
      id: 'CAT_DISCIPLINE',
      policyId: 'POL-2025-2026',
      code: 'CAT_DISCIPLINE',
      name: 'Nội dung II: Kỷ luật & Ý thức chấp hành nội quy',
      maxPoints: 35,
      displayOrder: 2,
      description: 'Chấp hành nội quy trường lớp, pháp luật, đạo đức, lối sống',
      isActive: true,
    },
    {
      id: 'CAT_ACTIVITY',
      policyId: 'POL-2025-2026',
      code: 'CAT_ACTIVITY',
      name: 'Nội dung III: Hoạt động, cộng đồng & phong trào',
      maxPoints: 30,
      displayOrder: 3,
      description: 'Phong trào tình nguyện, văn thể mỹ, công tác xã hội, kỹ năng mềm',
      isActive: true,
    },
  ];

  // 3. Cấu hình điểm nền (Sinh viên thường: 70, Cán bộ lớp: 75)
  baseConfigs = [
    // Sinh viên thường: Tổng 70 (25 + 25 + 20)
    { id: 'BASE-REG-1', policyId: 'POL-2025-2026', categoryId: 'CAT_STUDY', isOfficer: false, basePoints: 25, createdAt: now, updatedAt: now },
    { id: 'BASE-REG-2', policyId: 'POL-2025-2026', categoryId: 'CAT_DISCIPLINE', isOfficer: false, basePoints: 25, createdAt: now, updatedAt: now },
    { id: 'BASE-REG-3', policyId: 'POL-2025-2026', categoryId: 'CAT_ACTIVITY', isOfficer: false, basePoints: 20, createdAt: now, updatedAt: now },

    // Cán bộ lớp: Tổng 75 (25 + 25 + 25)
    { id: 'BASE-OFF-1', policyId: 'POL-2025-2026', categoryId: 'CAT_STUDY', isOfficer: true, basePoints: 25, createdAt: now, updatedAt: now },
    { id: 'BASE-OFF-2', policyId: 'POL-2025-2026', categoryId: 'CAT_DISCIPLINE', isOfficer: true, basePoints: 25, createdAt: now, updatedAt: now },
    { id: 'BASE-OFF-3', policyId: 'POL-2025-2026', categoryId: 'CAT_ACTIVITY', isOfficer: true, basePoints: 25, createdAt: now, updatedAt: now },
  ];

  // 4. Xếp loại rèn luyện
  classifications = [
    { id: 'CLS-XS', policyId: 'POL-2025-2026', code: 'EXCELLENT', name: 'Xuất sắc', minScore: 90, maxScore: 100, displayOrder: 1, colorBadge: 'purple' },
    { id: 'CLS-TOT', policyId: 'POL-2025-2026', code: 'GOOD', name: 'Tốt', minScore: 80, maxScore: 89.99, displayOrder: 2, colorBadge: 'emerald' },
    { id: 'CLS-KHA', policyId: 'POL-2025-2026', code: 'FAIR', name: 'Khá', minScore: 65, maxScore: 79.99, displayOrder: 3, colorBadge: 'blue' },
    { id: 'CLS-TB', policyId: 'POL-2025-2026', code: 'AVERAGE', name: 'Trung bình', minScore: 50, maxScore: 64.99, displayOrder: 4, colorBadge: 'amber' },
    { id: 'CLS-YEU', policyId: 'POL-2025-2026', code: 'WEAK', name: 'Yếu', minScore: 35, maxScore: 49.99, displayOrder: 5, colorBadge: 'orange' },
    { id: 'CLS-KEM', policyId: 'POL-2025-2026', code: 'POOR', name: 'Kém', minScore: 0, maxScore: 34.99, displayOrder: 6, colorBadge: 'red' },
  ];

  // 5. Chức vụ cán bộ lớp
  officerRoles = [
    { id: 'ROLE-LT', code: 'MONITOR', name: 'Lớp trưởng', baseScoreBonus: 5, isActive: true },
    { id: 'ROLE-LP', code: 'VICE_MONITOR', name: 'Lớp phó học tập', baseScoreBonus: 5, isActive: true },
    { id: 'ROLE-BT', code: 'SECRETARY', name: 'Bí thư Chi đoàn', baseScoreBonus: 5, isActive: true },
    { id: 'ROLE-PBT', code: 'VICE_SECRETARY', name: 'Phó Bí thư Chi đoàn', baseScoreBonus: 5, isActive: true },
    { id: 'ROLE-UV', code: 'MEMBER', name: 'Ủy viên Ban cán sự', baseScoreBonus: 5, isActive: true },
  ];

  // 6. Tiêu chí cộng / trừ chuẩn mực (hỗ trợ cả 4 kiểu tính: FIXED, PER_OCCURRENCE, SELECT_LEVEL, MANUAL_RANGE)
  criteria = [
    // Nhóm I: Học tập
    {
      id: 'CRI-HT-01',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_STUDY',
      categoryCode: 'CAT_STUDY',
      categoryName: 'Học tập',
      code: 'HT_CLB',
      name: 'Thành viên tham gia tích cực Câu lạc bộ học thuật',
      direction: 'ADD',
      calculationType: 'FIXED',
      defaultPoints: 2,
      minPoints: 2,
      maxPoints: 2,
      requireNote: false,
      requireEvidence: false,
      requireApproval: true,
      allowBatch: true,
      effectiveFrom: '2025-08-01',
      isActive: true,
    },
    {
      id: 'CRI-HT-02',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_STUDY',
      categoryCode: 'CAT_STUDY',
      categoryName: 'Học tập',
      code: 'HT_NCKH',
      name: 'Đạt giải hoặc có báo cáo Nghiên cứu khoa học sinh viên',
      direction: 'ADD',
      calculationType: 'SELECT_LEVEL',
      defaultPoints: 5,
      requireNote: true,
      requireEvidence: true,
      requireApproval: true,
      allowBatch: false,
      effectiveFrom: '2025-08-01',
      isActive: true,
      levels: [
        { id: 'LV-NCKH-1', criterionId: 'CRI-HT-02', levelName: 'Cấp Khoa / Bộ môn', points: 3, displayOrder: 1 },
        { id: 'LV-NCKH-2', criterionId: 'CRI-HT-02', levelName: 'Cấp Trường', points: 5, displayOrder: 2 },
        { id: 'LV-NCKH-3', criterionId: 'CRI-HT-02', levelName: 'Cấp Bộ / Thành phố / Quốc gia', points: 8, displayOrder: 3 },
      ],
    },
    {
      id: 'CRI-HT-03',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_STUDY',
      categoryCode: 'CAT_STUDY',
      categoryName: 'Học tập',
      code: 'HT_HOITHAO',
      name: 'Tham gia hội thảo chuyên đề học thuật / Tọa đàm công nghệ',
      direction: 'ADD',
      calculationType: 'PER_OCCURRENCE',
      defaultPoints: 2,
      maxOccurrencesPerMonth: 3,
      requireNote: false,
      requireEvidence: true,
      requireApproval: true,
      allowBatch: true,
      effectiveFrom: '2025-08-01',
      isActive: true,
    },
    {
      id: 'CRI-HT-04',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_STUDY',
      categoryCode: 'CAT_STUDY',
      categoryName: 'Học tập',
      code: 'HT_MUON_BT',
      name: 'Nộp bài tập / đồ án muộn hạn',
      direction: 'SUBTRACT',
      calculationType: 'PER_OCCURRENCE',
      defaultPoints: -1,
      maxOccurrencesPerMonth: 5,
      requireNote: true,
      requireEvidence: false,
      requireApproval: false,
      allowBatch: true,
      effectiveFrom: '2025-08-01',
      isActive: true,
    },

    // Nhóm II: Kỷ luật
    {
      id: 'CRI-KL-01',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_DISCIPLINE',
      categoryCode: 'CAT_DISCIPLINE',
      categoryName: 'Kỷ luật',
      code: 'KL_DI_TRE',
      name: 'Đi học muộn / Ra về trước giờ quy định',
      direction: 'SUBTRACT',
      calculationType: 'PER_OCCURRENCE',
      defaultPoints: -1,
      maxOccurrencesPerMonth: 10,
      requireNote: false,
      requireEvidence: false,
      requireApproval: false,
      allowBatch: true,
      effectiveFrom: '2025-08-01',
      isActive: true,
    },
    {
      id: 'CRI-KL-02',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_DISCIPLINE',
      categoryCode: 'CAT_DISCIPLINE',
      categoryName: 'Kỷ luật',
      code: 'KL_VANG_KP',
      name: 'Vắng học không phép (Bỏ tiết / trốn điểm danh)',
      direction: 'SUBTRACT',
      calculationType: 'PER_OCCURRENCE',
      defaultPoints: -5,
      maxOccurrencesPerMonth: 6,
      requireNote: true,
      requireEvidence: false,
      requireApproval: true,
      allowBatch: true,
      effectiveFrom: '2025-08-01',
      isActive: true,
    },
    {
      id: 'CRI-KL-03',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_DISCIPLINE',
      categoryCode: 'CAT_DISCIPLINE',
      categoryName: 'Kỷ luật',
      code: 'KL_DONG_PHUC',
      name: 'Không đeo thẻ sinh viên / Vi phạm trang phục, tác phong',
      direction: 'SUBTRACT',
      calculationType: 'PER_OCCURRENCE',
      defaultPoints: -2,
      maxOccurrencesPerMonth: 5,
      requireNote: false,
      requireEvidence: false,
      requireApproval: false,
      allowBatch: true,
      effectiveFrom: '2025-08-01',
      isActive: true,
    },
    {
      id: 'CRI-KL-04',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_DISCIPLINE',
      categoryCode: 'CAT_DISCIPLINE',
      categoryName: 'Kỷ luật',
      code: 'KL_KHEN_THUONG',
      name: 'Gương người tốt việc tốt / Nhặt được của rơi trả người đánh mất',
      direction: 'ADD',
      calculationType: 'MANUAL_RANGE',
      defaultPoints: 3,
      minPoints: 2,
      maxPoints: 5,
      requireNote: true,
      requireEvidence: true,
      requireApproval: true,
      allowBatch: false,
      effectiveFrom: '2025-08-01',
      isActive: true,
    },

    // Nhóm III: Hoạt động, cộng đồng & phong trào
    {
      id: 'CRI-HD-01',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_ACTIVITY',
      categoryCode: 'CAT_ACTIVITY',
      categoryName: 'Hoạt động',
      code: 'HD_TINH_NGUYEN',
      name: 'Tham gia Chiến dịch Mùa hè xanh / Tiếp sức mùa thi / Hiến máu nhân đạo',
      direction: 'ADD',
      calculationType: 'PER_OCCURRENCE',
      defaultPoints: 4,
      maxOccurrencesPerMonth: 3,
      requireNote: false,
      requireEvidence: true,
      requireApproval: true,
      allowBatch: true,
      effectiveFrom: '2025-08-01',
      isActive: true,
    },
    {
      id: 'CRI-HD-02',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_ACTIVITY',
      categoryCode: 'CAT_ACTIVITY',
      categoryName: 'Hoạt động',
      code: 'HD_VAN_THE',
      name: 'Đạt giải Hội thao, Văn nghệ các cấp',
      direction: 'ADD',
      calculationType: 'SELECT_LEVEL',
      defaultPoints: 3,
      requireNote: true,
      requireEvidence: true,
      requireApproval: true,
      allowBatch: false,
      effectiveFrom: '2025-08-01',
      isActive: true,
      levels: [
        { id: 'LV-HD-1', criterionId: 'CRI-HD-02', levelName: 'Cấp Khoa', points: 2, displayOrder: 1 },
        { id: 'LV-HD-2', criterionId: 'CRI-HD-02', levelName: 'Cấp Trường', points: 4, displayOrder: 2 },
        { id: 'LV-HD-3', criterionId: 'CRI-HD-02', levelName: 'Cấp Thành phố / Toàn quốc', points: 6, displayOrder: 3 },
      ],
    },
    {
      id: 'CRI-HD-03',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_ACTIVITY',
      categoryCode: 'CAT_ACTIVITY',
      categoryName: 'Hoạt động',
      code: 'HD_CONG_TAC_TRUONG',
      name: 'Hỗ trợ công tác tổ chức sự kiện của Nhà trường / Khoa',
      direction: 'ADD',
      calculationType: 'MANUAL_RANGE',
      defaultPoints: 3,
      minPoints: 2,
      maxPoints: 5,
      requireNote: true,
      requireEvidence: false,
      requireApproval: true,
      allowBatch: true,
      effectiveFrom: '2025-08-01',
      isActive: true,
    },
    {
      id: 'CRI-HD-04',
      policyId: 'POL-2025-2026',
      categoryId: 'CAT_ACTIVITY',
      categoryCode: 'CAT_ACTIVITY',
      categoryName: 'Hoạt động',
      code: 'HD_KHONG_THAM_GIA',
      name: 'Vắng mặt không lý do các hoạt động tập thể bắt buộc',
      direction: 'SUBTRACT',
      calculationType: 'PER_OCCURRENCE',
      defaultPoints: -3,
      maxOccurrencesPerMonth: 4,
      requireNote: true,
      requireEvidence: false,
      requireApproval: true,
      allowBatch: true,
      effectiveFrom: '2025-08-01',
      isActive: true,
    },
  ];

  // 7. Kỳ đánh giá tháng khởi tạo trống (chỉ sinh khi người dùng/admin mở sổ tháng từ năm học & học kỳ thật)
  trainingMonths = [];

  // 8. Phân công Cán bộ lớp (khởi tạo trống - phân công chỉ thực hiện với sinh viên thật)
  officerAssignments = [];

  // 9. Giao dịch điểm (khởi tạo trống - chỉ ghi nhận từ giao dịch thực tế)
  scoreTransactions = [];
  transactionRevisions = [];

  // 10. Khiếu nại (khởi tạo trống)
  appeals = [];
  monthlyAccounts = [];
  semesterSummaries = [];
  yearSummaries = [];

  saveToDisk();
}

// Lưu trữ bền vững ra đĩa
export function saveToDisk() {
  try {
    const payload = {
      policies,
      categories,
      baseConfigs,
      classifications,
      officerRoles,
      officerAssignments,
      criteria,
      trainingMonths,
      scoreTransactions,
      transactionRevisions,
      monthlyAccounts,
      appeals,
      semesterSummaries,
      yearSummaries,
    };
    fs.writeFileSync(TRAINING_STORE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[TrainingStorage] Error writing storage:', err);
  }
}

// Tải dữ liệu từ đĩa
export function loadFromDisk() {
  try {
    if (fs.existsSync(TRAINING_STORE_PATH)) {
      const raw = fs.readFileSync(TRAINING_STORE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.policies) && data.policies.length > 0) policies = data.policies;
      if (Array.isArray(data.categories) && data.categories.length > 0) categories = data.categories;
      if (Array.isArray(data.baseConfigs) && data.baseConfigs.length > 0) baseConfigs = data.baseConfigs;
      if (Array.isArray(data.classifications) && data.classifications.length > 0) classifications = data.classifications;
      if (Array.isArray(data.officerRoles) && data.officerRoles.length > 0) officerRoles = data.officerRoles;
      if (Array.isArray(data.officerAssignments)) officerAssignments = data.officerAssignments;
      if (Array.isArray(data.criteria) && data.criteria.length > 0) criteria = data.criteria;
      if (Array.isArray(data.trainingMonths) && data.trainingMonths.length > 0) trainingMonths = data.trainingMonths;
      if (Array.isArray(data.scoreTransactions)) scoreTransactions = data.scoreTransactions;
      if (Array.isArray(data.transactionRevisions)) transactionRevisions = data.transactionRevisions;
      if (Array.isArray(data.monthlyAccounts)) monthlyAccounts = data.monthlyAccounts;
      if (Array.isArray(data.appeals)) appeals = data.appeals;
      if (Array.isArray(data.semesterSummaries)) semesterSummaries = data.semesterSummaries;
      if (Array.isArray(data.yearSummaries)) yearSummaries = data.yearSummaries;
      console.log(`[TrainingStorage] Loaded: ${policies.length} policies, ${criteria.length} criteria, ${scoreTransactions.length} transactions, ${trainingMonths.length} months`);
    } else {
      initSeedData();
    }
  } catch (err) {
    console.warn('[TrainingStorage] Error loading store, re-seeding:', err);
    initSeedData();
  }
}

// Khởi chạy khi nạp module
loadFromDisk();

// ==========================================
// THUẬT TOÁN TÍNH ĐIỂM CHUẨN MỰC
// ==========================================

/**
 * Kiểm tra xem sinh viên có đang giữ chức vụ cán bộ lớp trong tháng cụ thể hay không
 */
export function isStudentClassOfficerInMonth(studentCode: string, month: number, year: number): { isOfficer: boolean; roleName?: string } {
  const targetDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const activeAssignment = officerAssignments.find((a) => {
    if (a.studentCode.toLowerCase() !== studentCode.toLowerCase() || a.status !== 'ACTIVE') return false;
    if (a.validFrom && a.validFrom > targetDateStr) return false;
    if (a.validTo && a.validTo < targetDateStr) return false;
    return true;
  });

  if (activeAssignment) {
    return { isOfficer: true, roleName: activeAssignment.roleName || 'Cán bộ lớp' };
  }
  return { isOfficer: false };
}

/**
 * Lấy điểm nền theo quy chế cho sinh viên thường (70) hoặc cán bộ lớp (75)
 */
export function getBaseScoreConfig(isOfficer: boolean, policyId?: string): { cat1: number; cat2: number; cat3: number; total: number } {
  const pId = policyId || policies.find((p) => p.isDefault)?.id || 'POL-2025-2026';
  const c1 = baseConfigs.find((b) => b.policyId === pId && b.categoryId === 'CAT_STUDY' && b.isOfficer === isOfficer)?.basePoints ?? (isOfficer ? 25 : 25);
  const c2 = baseConfigs.find((b) => b.policyId === pId && b.categoryId === 'CAT_DISCIPLINE' && b.isOfficer === isOfficer)?.basePoints ?? (isOfficer ? 25 : 25);
  const c3 = baseConfigs.find((b) => b.policyId === pId && b.categoryId === 'CAT_ACTIVITY' && b.isOfficer === isOfficer)?.basePoints ?? (isOfficer ? 25 : 20);
  return {
    cat1: c1,
    cat2: c2,
    cat3: c3,
    total: c1 + c2 + c3,
  };
}

/**
 * Tìm mức xếp loại từ tổng điểm dựa trên bảng cấu hình trong DB
 */
export function getClassificationForScore(score: number, policyId?: string): string {
  const pId = policyId || policies.find((p) => p.isDefault)?.id || 'POL-2025-2026';
  const policyClasses = classifications.filter((c) => c.policyId === pId).sort((a, b) => b.minScore - a.minScore);
  const rounded = Math.round(score * 10) / 10;
  for (const c of policyClasses) {
    if (rounded >= c.minScore) {
      return c.name;
    }
  }
  return 'Kém';
}

/**
 * TÍNH TOÁN ĐIỂM RÈN LUYỆN THÁNG CHO MỘT SINH VIÊN
 * Công thức:
 * Điểm thô của nhóm = Điểm nền nhóm + Tổng các giao dịch APPROVED trong nhóm
 * Điểm được công nhận của nhóm = MIN(Điểm tối đa nhóm, MAX(0, Điểm thô của nhóm))
 * Tổng điểm tháng = MIN(100, Cat1_Recognized + Cat2_Recognized + Cat3_Recognized)
 */
export function calculateStudentMonthlyScore(
  studentCode: string,
  month: number,
  year: number,
  studentName?: string,
  classId?: string
): MonthlyScoreAccount {
  const monthStr = `M-${year}-${String(month).padStart(2, '0')}`;
  const tMonth = trainingMonths.find((m) => m.month === month && m.year === year) || {
    id: monthStr,
    month,
    year,
    semester: month >= 8 ? 'HK1' : 'HK2',
    academicYear: month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`,
    status: 'OPEN' as MonthStatus,
    isApplied: true,
  };

  // 1. Kiểm tra chức vụ cán bộ lớp
  const { isOfficer, roleName } = isStudentClassOfficerInMonth(studentCode, month, year);
  const base = getBaseScoreConfig(isOfficer);

  // 2. Tìm tất cả giao dịch của sinh viên trong tháng này
  const sCodeClean = studentCode.trim().toLowerCase();
  const txList = scoreTransactions.filter((tx) => {
    return tx.studentCode.trim().toLowerCase() === sCodeClean && tx.month === month && tx.year === year;
  });

  // Chỉ giao dịch APPROVED mới tính vào điểm chính thức
  const approvedTxs = txList.filter((tx) => tx.status === 'APPROVED');
  const pendingTxs = txList.filter((tx) => tx.status === 'SUBMITTED' || tx.status === 'DRAFT');

  let cat1Delta = 0;
  let cat2Delta = 0;
  let cat3Delta = 0;

  for (const tx of approvedTxs) {
    if (tx.categoryId === 'CAT_STUDY') cat1Delta += tx.totalPointsDelta;
    else if (tx.categoryId === 'CAT_DISCIPLINE') cat2Delta += tx.totalPointsDelta;
    else if (tx.categoryId === 'CAT_ACTIVITY') cat3Delta += tx.totalPointsDelta;
  }

  // Chặn giới hạn cho từng nhóm:
  // Cat 1: Max 35, Min 0
  const cat1Raw = base.cat1 + cat1Delta;
  const cat1Recognized = Math.min(35, Math.max(0, cat1Raw));

  // Cat 2: Max 35, Min 0
  const cat2Raw = base.cat2 + cat2Delta;
  const cat2Recognized = Math.min(35, Math.max(0, cat2Raw));

  // Cat 3: Max 30, Min 0
  const cat3Raw = base.cat3 + cat3Delta;
  const cat3Recognized = Math.min(30, Math.max(0, cat3Raw));

  // Tổng điểm tháng
  const totalOfficial = Math.min(100, Math.max(0, cat1Recognized + cat2Recognized + cat3Recognized));
  const classification = getClassificationForScore(totalOfficial);

  const accountId = `ACC-${studentCode}-${year}-${month}`;
  const existingAcc = monthlyAccounts.find((a) => a.id === accountId);

  const account: MonthlyScoreAccount = {
    id: accountId,
    studentCode,
    studentName: studentName || existingAcc?.studentName || studentCode,
    classId: classId || existingAcc?.classId || 'Chưa phân lớp',
    monthId: tMonth.id,
    month,
    year,
    semester: tMonth.semester,
    academicYear: tMonth.academicYear,
    isOfficer,
    officerRoleName: roleName,
    cat1BasePoints: base.cat1,
    cat1RawDelta: cat1Delta,
    cat1Recognized,
    cat2BasePoints: base.cat2,
    cat2RawDelta: cat2Delta,
    cat2Recognized,
    cat3BasePoints: base.cat3,
    cat3RawDelta: cat3Delta,
    cat3Recognized,
    totalBasePoints: base.total,
    totalRawScore: cat1Raw + cat2Raw + cat3Raw,
    totalOfficialScore: totalOfficial,
    classification,
    pendingTransactionsCount: pendingTxs.length,
    monthStatus: tMonth.status,
    lastCalculatedAt: new Date().toISOString(),
  };

  const idx = monthlyAccounts.findIndex((a) => a.id === accountId);
  if (idx >= 0) {
    monthlyAccounts[idx] = account;
  } else {
    monthlyAccounts.push(account);
  }

  saveToDisk();

  // Đồng bộ kết quả tính toán sang bảng ren_luyen truyền thống để tương thích ngược 100% với Dashboard & Báo cáo
  try {
    import('./dbOperations').then(({ upsertRenLuyen }) => {
      upsertRenLuyen({
        id: `rl-${studentCode}-${month}-${year}`,
        maSV: studentCode,
        hoTenSV: account.studentName,
        lop: account.classId,
        thang: month,
        nam: year,
        namHoc: account.academicYear,
        diemRL: account.totalOfficialScore,
        xepLoai: account.classification,
        nhanXet: `Đánh giá rèn luyện tự động theo quy chế 3 nhóm điểm (I: ${account.cat1Recognized}, II: ${account.cat2Recognized}, III: ${account.cat3Recognized})`,
        nguoiDanhGia: 'Hệ thống Quản lý Rèn luyện TDNU',
        ngayDanhGia: new Date().toISOString().split('T')[0],
        diemMuc1: account.cat1Recognized,
        diemMuc2: account.cat2Recognized,
        diemMuc3: account.cat3Recognized,
        hocKy: account.semester,
      }).catch(() => {});
    }).catch(() => {});
  } catch {}

  // Phát tín hiệu Realtime
  trainingEventBus.emit('score.monthly.updated', account);

  return account;
}

// ==========================================
// CÁC HÀM TRUY VẤN VÀ THAO TÁC NGHIỆP VỤ
// ==========================================

export function getPolicies(): ScorePolicy[] {
  return [...policies];
}

export function getCategories(policyId?: string): ScoreCategory[] {
  if (policyId) return categories.filter((c) => c.policyId === policyId);
  return [...categories];
}

export function getBaseConfigs(policyId?: string): BaseScoreConfig[] {
  if (policyId) return baseConfigs.filter((b) => b.policyId === policyId);
  return [...baseConfigs];
}

export function getClassifications(policyId?: string): ScoreClassification[] {
  if (policyId) return classifications.filter((c) => c.policyId === policyId);
  return [...classifications];
}

export function getOfficerRoles(): ClassOfficerRole[] {
  return [...officerRoles];
}

export function getOfficerAssignments(params?: { classId?: string; studentCode?: string; academicYear?: string }): ClassOfficerAssignment[] {
  let list = [...officerAssignments];
  if (params?.classId) list = list.filter((a) => a.classId.toLowerCase() === params.classId!.toLowerCase());
  if (params?.studentCode) list = list.filter((a) => a.studentCode.toLowerCase() === params.studentCode!.toLowerCase());
  if (params?.academicYear) list = list.filter((a) => a.academicYear === params.academicYear);
  return list;
}

export function createOfficerAssignment(data: Partial<ClassOfficerAssignment>): ClassOfficerAssignment {
  const role = officerRoles.find((r) => r.id === data.roleId || r.code === data.roleCode);
  const now = new Date().toISOString();
  const newAssignment: ClassOfficerAssignment = {
    id: `ASSIGN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentCode: data.studentCode!,
    studentName: data.studentName || data.studentCode,
    classId: data.classId || 'Chưa phân lớp',
    roleId: role?.id || 'ROLE-UV',
    roleCode: role?.code || 'MEMBER',
    roleName: role?.name || 'Ủy viên Ban cán sự',
    academicYear: data.academicYear || '2026-2027',
    validFrom: data.validFrom || new Date().toISOString().split('T')[0],
    validTo: data.validTo,
    assignedBy: data.assignedBy || 'admin',
    status: 'ACTIVE',
    note: data.note,
    createdAt: now,
    updatedAt: now,
  };
  officerAssignments.push(newAssignment);
  saveToDisk();
  return newAssignment;
}

export function getCriteria(params?: { categoryId?: string; activeOnly?: boolean }): ScoreCriterion[] {
  let list = [...criteria];
  if (params?.categoryId) list = list.filter((c) => c.categoryId === params.categoryId);
  if (params?.activeOnly) list = list.filter((c) => c.isActive);
  return list;
}

export interface UpsertCriterionInput {
  categoryId: string;
  code: string;
  name: string;
  direction: 'ADD' | 'SUBTRACT';
  calculationType: 'FIXED' | 'PER_OCCURRENCE' | 'SELECT_LEVEL' | 'MANUAL_RANGE';
  defaultPoints: number;
  minPoints?: number;
  maxPoints?: number;
  maxOccurrencesPerDay?: number;
  maxOccurrencesPerMonth?: number;
  requireNote?: boolean;
  requireEvidence?: boolean;
  requireApproval?: boolean;
  allowBatch?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
  levels?: Array<{ id?: string; levelName: string; points: number; displayOrder?: number }>;
}

function normalizeAndValidateCriterionInput(
  input: UpsertCriterionInput,
  existingId?: string
): Omit<ScoreCriterion, 'id'> {
  const category = categories.find((cat) => cat.id === input.categoryId);
  if (!category) {
    throw new Error('Nhóm nội dung rèn luyện không hợp lệ.');
  }

  const cleanCode = String(input.code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (!cleanCode || cleanCode.length > 40 || !/^[A-Z0-9_-]+$/.test(cleanCode)) {
    throw new Error('Mã tiêu chí chỉ gồm chữ cái không dấu, số, dấu gạch dưới (_) hoặc gạch nối (-), tối đa 40 ký tự.');
  }

  const duplicate = criteria.find(
    (c) => c.code.toUpperCase() === cleanCode && c.id !== existingId
  );
  if (duplicate) {
    throw new Error(`Mã tiêu chí "${cleanCode}" đã tồn tại. Vui lòng chọn mã khác.`);
  }

  const cleanName = String(input.name || '').trim();
  if (!cleanName || cleanName.length > 250) {
    throw new Error('Tên tiêu chí không được để trống và tối đa 250 ký tự.');
  }

  const direction = input.direction === 'SUBTRACT' ? 'SUBTRACT' : input.direction === 'ADD' ? 'ADD' : null;
  if (!direction) {
    throw new Error('Loại điểm phải là Cộng điểm (ADD) hoặc Trừ điểm (SUBTRACT).');
  }

  const allowedCalcTypes = ['FIXED', 'PER_OCCURRENCE', 'SELECT_LEVEL', 'MANUAL_RANGE'] as const;
  if (!allowedCalcTypes.includes(input.calculationType)) {
    throw new Error('Kiểu tính điểm không hợp lệ.');
  }

  const rawDefaultMag = Math.abs(Number(input.defaultPoints));
  if (!Number.isFinite(rawDefaultMag) || rawDefaultMag <= 0 || rawDefaultMag > 100) {
    throw new Error('Điểm mặc định phải lớn hơn 0 và không vượt quá 100.');
  }

  const signedDefaultPoints = direction === 'SUBTRACT' ? -rawDefaultMag : rawDefaultMag;

  let minPoints: number | undefined;
  let maxPoints: number | undefined;
  if (input.calculationType === 'MANUAL_RANGE') {
    const minMag = Math.abs(Number(input.minPoints));
    const maxMag = Math.abs(Number(input.maxPoints));
    if (!Number.isFinite(minMag) || !Number.isFinite(maxMag) || minMag <= 0 || maxMag > 100 || minMag > maxMag) {
      throw new Error('Khoảng điểm phải hợp lệ (0 < Điểm tối thiểu <= Điểm tối đa <= 100).');
    }
    minPoints = minMag;
    maxPoints = maxMag;
  } else if (input.calculationType === 'FIXED') {
    minPoints = rawDefaultMag;
    maxPoints = rawDefaultMag;
  }

  let maxOccurrencesPerMonth: number | undefined;
  if (input.maxOccurrencesPerMonth !== undefined && input.maxOccurrencesPerMonth !== null && String(input.maxOccurrencesPerMonth) !== '') {
    const cap = Math.floor(Number(input.maxOccurrencesPerMonth));
    if (!Number.isFinite(cap) || cap < 1 || cap > 100) {
      throw new Error('Số lần tối đa/tháng phải từ 1 đến 100.');
    }
    maxOccurrencesPerMonth = cap;
  }

  let maxOccurrencesPerDay: number | undefined;
  if (input.maxOccurrencesPerDay !== undefined && input.maxOccurrencesPerDay !== null && String(input.maxOccurrencesPerDay) !== '') {
    const capDay = Math.floor(Number(input.maxOccurrencesPerDay));
    if (!Number.isFinite(capDay) || capDay < 1 || capDay > 50) {
      throw new Error('Số lần tối đa/ngày phải từ 1 đến 50.');
    }
    maxOccurrencesPerDay = capDay;
  }

  let normalizedLevels: ScoreCriterion['levels'];
  if (input.calculationType === 'SELECT_LEVEL') {
    if (!Array.isArray(input.levels) || input.levels.length === 0) {
      throw new Error('Tiêu chí chọn theo cấp độ cần ít nhất 1 mức điểm.');
    }
    const targetCriterionId = existingId || 'PENDING';
    normalizedLevels = input.levels.map((lv, idx) => {
      const lvName = String(lv.levelName || '').trim();
      const lvPoints = Math.abs(Number(lv.points));
      if (!lvName || lvName.length > 120) {
        throw new Error(`Tên cấp độ thứ ${idx + 1} không hợp lệ.`);
      }
      if (!Number.isFinite(lvPoints) || lvPoints <= 0 || lvPoints > 100) {
        throw new Error(`Điểm của cấp độ "${lvName}" phải từ 0.5 đến 100.`);
      }
      return {
        id: lv.id && String(lv.id).trim() ? String(lv.id).trim() : `LV-${Date.now()}-${idx + 1}`,
        criterionId: targetCriterionId,
        levelName: lvName,
        points: lvPoints,
        displayOrder: idx + 1,
      };
    });
  }

  const shortCategoryName =
    category.id === 'CAT_STUDY'
      ? 'Học tập'
      : category.id === 'CAT_DISCIPLINE'
        ? 'Kỷ luật'
        : category.id === 'CAT_ACTIVITY'
          ? 'Hoạt động'
          : category.name;

  return {
    policyId: category.policyId || policies.find((p) => p.isDefault)?.id || 'POL-2025-2026',
    categoryId: category.id,
    categoryCode: category.code,
    categoryName: shortCategoryName,
    code: cleanCode,
    name: cleanName,
    direction,
    calculationType: input.calculationType,
    defaultPoints: signedDefaultPoints,
    minPoints,
    maxPoints,
    maxOccurrencesPerDay,
    maxOccurrencesPerMonth,
    requireNote: Boolean(input.requireNote),
    requireEvidence: Boolean(input.requireEvidence),
    requireApproval: input.requireApproval !== undefined ? Boolean(input.requireApproval) : true,
    allowBatch: Boolean(input.allowBatch),
    effectiveFrom: input.effectiveFrom || new Date().toISOString().split('T')[0],
    effectiveTo: input.effectiveTo || undefined,
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    levels: normalizedLevels,
  };
}

export function createCriterion(input: UpsertCriterionInput): ScoreCriterion {
  const validated = normalizeAndValidateCriterionInput(input);
  const id = `CRI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newCriterion: ScoreCriterion = {
    id,
    ...validated,
    levels: validated.levels?.map((lv, idx) => ({
      ...lv,
      id: `LV-${id}-${idx + 1}`,
      criterionId: id,
    })),
  };

  criteria.push(newCriterion);
  saveToDisk();
  trainingEventBus.emit('score.criteria.updated', { action: 'CREATE', criterion: newCriterion });
  return newCriterion;
}

export function updateCriterion(id: string, input: UpsertCriterionInput): ScoreCriterion {
  const idx = criteria.findIndex((c) => c.id === id);
  if (idx === -1) {
    throw new Error('Không tìm thấy tiêu chí rèn luyện cần chỉnh sửa.');
  }

  const validated = normalizeAndValidateCriterionInput(input, id);
  const updated: ScoreCriterion = {
    id,
    ...validated,
    effectiveFrom: input.effectiveFrom || criteria[idx].effectiveFrom,
    levels: validated.levels?.map((lv, lIdx) => ({
      ...lv,
      id: lv.id || `LV-${id}-${lIdx + 1}`,
      criterionId: id,
    })),
  };

  criteria[idx] = updated;
  saveToDisk();
  trainingEventBus.emit('score.criteria.updated', { action: 'UPDATE', criterion: updated });
  return updated;
}

export function deleteCriterion(id: string): { deleted: ScoreCriterion } {
  const idx = criteria.findIndex((c) => c.id === id);
  if (idx === -1) {
    throw new Error('Không tìm thấy tiêu chí rèn luyện cần xóa.');
  }

  const isUsedInTransactions = scoreTransactions.some((tx) => tx.criterionId === id);
  if (isUsedInTransactions) {
    throw new Error(
      'Tiêu chí này đã phát sinh giao dịch điểm của sinh viên nên không thể xóa. Vui lòng chỉnh sửa và tắt trạng thái "Đang áp dụng".'
    );
  }

  const [deleted] = criteria.splice(idx, 1);
  saveToDisk();
  trainingEventBus.emit('score.criteria.updated', { action: 'DELETE', criterionId: id });
  return { deleted };
}

export function getTrainingMonths(academicYear?: string): TrainingMonth[] {
  if (academicYear) return trainingMonths.filter((m) => m.academicYear === academicYear);
  return [...trainingMonths];
}

export function getTransactions(params?: {
  studentCode?: string;
  classId?: string;
  month?: number;
  year?: number;
  status?: TransactionStatus;
}): ScoreTransaction[] {
  let list = [...scoreTransactions];
  if (params?.studentCode) {
    const clean = params.studentCode.trim().toLowerCase();
    list = list.filter((t) => t.studentCode.toLowerCase() === clean);
  }
  if (params?.classId) {
    const clean = params.classId.trim().toLowerCase();
    list = list.filter((t) => t.classId.toLowerCase() === clean);
  }
  if (params?.month !== undefined) {
    list = list.filter((t) => t.month === Number(params.month));
  }
  if (params?.year !== undefined) {
    list = list.filter((t) => t.year === Number(params.year));
  }
  if (params?.status) {
    list = list.filter((t) => t.status === params.status);
  }
  // Sắp xếp thời gian mới nhất lên đầu
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function createTransaction(data: {
  studentCode: string;
  studentName?: string;
  classId: string;
  month: number;
  year: number;
  semester?: string;
  academicYear?: string;
  criterionId: string;
  occurredAt?: string;
  occurrences?: number;
  pointsPerOccurrence?: number;
  selectedLevelId?: string;
  note?: string;
  evidenceUrl?: string;
  evidenceFileName?: string;
  createdBy: string;
  createdByName?: string;
  autoSubmit?: boolean;
}): ScoreTransaction {
  const criterion = criteria.find((c) => c.id === data.criterionId);
  if (!criterion || !criterion.isActive) {
    throw new Error('Tiêu chí rèn luyện không tồn tại hoặc đã bị ngừng sử dụng');
  }

  // Kiểm tra tháng có đang bị khóa không
  const tMonth = trainingMonths.find((m) => m.month === data.month && m.year === data.year);
  if (tMonth && tMonth.status === 'LOCKED') {
    throw new Error(`Tháng ${data.month}/${data.year} đã được Khóa sổ (LOCKED). Không thể tạo giao dịch mới!`);
  }

  const occurrences = data.occurrences && data.occurrences > 0 ? Number(data.occurrences) : 1;
  let pointsPerOccurrence = criterion.defaultPoints;

  // Xử lý theo kiểu tính toán
  if (criterion.calculationType === 'SELECT_LEVEL' && data.selectedLevelId && criterion.levels) {
    const level = criterion.levels.find((l) => l.id === data.selectedLevelId);
    if (level) {
      pointsPerOccurrence = criterion.direction === 'SUBTRACT' ? -Math.abs(level.points) : Math.abs(level.points);
    }
  } else if (criterion.calculationType === 'MANUAL_RANGE' && data.pointsPerOccurrence !== undefined) {
    const rawVal = Number(data.pointsPerOccurrence);
    const minVal = criterion.minPoints !== undefined ? criterion.minPoints : -100;
    const maxVal = criterion.maxPoints !== undefined ? criterion.maxPoints : 100;
    const clamped = Math.min(maxVal, Math.max(minVal, rawVal));
    pointsPerOccurrence = criterion.direction === 'SUBTRACT' ? -Math.abs(clamped) : Math.abs(clamped);
  } else {
    // Đảm bảo dấu chính xác theo direction
    pointsPerOccurrence = criterion.direction === 'SUBTRACT' ? -Math.abs(pointsPerOccurrence) : Math.abs(pointsPerOccurrence);
  }

  const totalPointsDelta = occurrences * pointsPerOccurrence;
  const now = new Date().toISOString();

  // Kiểm tra yêu cầu duyệt
  const initialStatus: TransactionStatus = criterion.requireApproval
    ? data.autoSubmit
      ? 'SUBMITTED'
      : 'DRAFT'
    : 'APPROVED';

  const newTx: ScoreTransaction = {
    id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentCode: data.studentCode.trim(),
    studentName: data.studentName || data.studentCode,
    classId: data.classId,
    monthId: `M-${data.year}-${String(data.month).padStart(2, '0')}`,
    month: data.month,
    year: data.year,
    semester: data.semester || (data.month >= 8 ? 'HK1' : 'HK2'),
    academicYear: data.academicYear || (data.month >= 8 ? `${data.year}-${data.year + 1}` : `${data.year - 1}-${data.year}`),
    categoryId: criterion.categoryId,
    categoryCode: criterion.categoryCode,
    categoryName: criterion.categoryName,
    criterionId: criterion.id,
    criterionCode: criterion.code,
    criterionName: criterion.name,
    occurredAt: data.occurredAt || now.replace('T', ' ').substring(0, 16),
    occurrences,
    pointsPerOccurrence,
    totalPointsDelta,
    note: data.note,
    evidenceUrl: data.evidenceUrl,
    evidenceFileName: data.evidenceFileName,
    createdBy: data.createdBy,
    createdByName: data.createdByName || data.createdBy,
    status: initialStatus,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  scoreTransactions.push(newTx);

  // Ghi lịch sử sửa đổi (Revision)
  transactionRevisions.push({
    id: `REV-${Date.now()}`,
    transactionId: newTx.id,
    revisedBy: data.createdBy,
    action: 'CREATE',
    newData: newTx,
    timestamp: now,
  });

  saveToDisk();

  // Nếu giao dịch được tự động duyệt, tính lại điểm ngay
  if (initialStatus === 'APPROVED') {
    calculateStudentMonthlyScore(newTx.studentCode, newTx.month, newTx.year, newTx.studentName, newTx.classId);
  }

  trainingEventBus.emit('score.transaction.created', newTx);

  return newTx;
}

export function approveTransaction(transactionId: string, approvedBy: string, approvedByName?: string): ScoreTransaction {
  const tx = scoreTransactions.find((t) => t.id === transactionId);
  if (!tx) throw new Error('Không tìm thấy giao dịch');
  if (tx.status === 'APPROVED') throw new Error('Giao dịch đã được duyệt trước đó');
  if (tx.status === 'CANCELLED') throw new Error('Không thể duyệt giao dịch đã bị hủy');

  const now = new Date().toISOString();
  tx.status = 'APPROVED';
  tx.approvedBy = approvedBy;
  tx.approvedByName = approvedByName || approvedBy;
  tx.approvedAt = now;
  tx.updatedAt = now;
  tx.version += 1;

  transactionRevisions.push({
    id: `REV-${Date.now()}`,
    transactionId: tx.id,
    revisedBy: approvedBy,
    action: 'APPROVE',
    newData: tx,
    timestamp: now,
  });

  saveToDisk();

  // TÍNH LẠI ĐIỂM NGAY LẬP TỨC
  calculateStudentMonthlyScore(tx.studentCode, tx.month, tx.year, tx.studentName, tx.classId);

  trainingEventBus.emit('score.transaction.approved', tx);

  return tx;
}

export function rejectTransaction(transactionId: string, rejectedBy: string, reason: string): ScoreTransaction {
  const tx = scoreTransactions.find((t) => t.id === transactionId);
  if (!tx) throw new Error('Không tìm thấy giao dịch');

  const now = new Date().toISOString();
  tx.status = 'REJECTED';
  tx.rejectionReason = reason;
  tx.updatedAt = now;
  tx.version += 1;

  transactionRevisions.push({
    id: `REV-${Date.now()}`,
    transactionId: tx.id,
    revisedBy: rejectedBy,
    action: 'REJECT',
    reason,
    timestamp: now,
  });

  saveToDisk();

  // Nếu trước đó giao dịch này là APPROVED thì tính lại điểm
  calculateStudentMonthlyScore(tx.studentCode, tx.month, tx.year, tx.studentName, tx.classId);

  trainingEventBus.emit('score.transaction.rejected', tx);

  return tx;
}

export function cancelTransaction(transactionId: string, cancelledBy: string, reason: string, createReversal: boolean = false): { transaction: ScoreTransaction; reversal?: ScoreTransaction } {
  const tx = scoreTransactions.find((t) => t.id === transactionId);
  if (!tx) throw new Error('Không tìm thấy giao dịch');

  const wasApproved = tx.status === 'APPROVED';
  const now = new Date().toISOString();

  tx.status = 'CANCELLED';
  tx.cancellationReason = reason;
  tx.updatedAt = now;
  tx.version += 1;

  transactionRevisions.push({
    id: `REV-${Date.now()}`,
    transactionId: tx.id,
    revisedBy: cancelledBy,
    action: 'CANCEL',
    reason,
    timestamp: now,
  });

  let reversalTx: ScoreTransaction | undefined;

  // Nếu yêu cầu tạo giao dịch đảo (Reversal transaction)
  if (createReversal && wasApproved) {
    reversalTx = {
      id: `TX-REV-${Date.now()}`,
      studentCode: tx.studentCode,
      studentName: tx.studentName,
      classId: tx.classId,
      monthId: tx.monthId,
      month: tx.month,
      year: tx.year,
      semester: tx.semester,
      academicYear: tx.academicYear,
      categoryId: tx.categoryId,
      categoryCode: tx.categoryCode,
      categoryName: tx.categoryName,
      criterionId: tx.criterionId,
      criterionCode: tx.criterionCode,
      criterionName: `[Giao dịch đảo] ${tx.criterionName}`,
      occurredAt: now.replace('T', ' ').substring(0, 16),
      occurrences: tx.occurrences,
      pointsPerOccurrence: -tx.pointsPerOccurrence,
      totalPointsDelta: -tx.totalPointsDelta,
      note: `Đảo giao dịch #${tx.id}: ${reason}`,
      createdBy: cancelledBy,
      approvedBy: cancelledBy,
      approvedAt: now,
      status: 'APPROVED',
      isReversal: true,
      reversesTransactionId: tx.id,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    scoreTransactions.push(reversalTx);
  }

  saveToDisk();

  // Tính lại điểm ngay
  calculateStudentMonthlyScore(tx.studentCode, tx.month, tx.year, tx.studentName, tx.classId);

  trainingEventBus.emit('score.transaction.cancelled', { original: tx, reversal: reversalTx });

  return { transaction: tx, reversal: reversalTx };
}

export function updateMonthStatus(month: number, year: number, status: MonthStatus, user: string, reopenReason?: string): TrainingMonth {
  let mObj = trainingMonths.find((m) => m.month === month && m.year === year);
  const now = new Date().toISOString();

  if (!mObj) {
    mObj = {
      id: `M-${year}-${String(month).padStart(2, '0')}`,
      month,
      year,
      semester: month >= 8 ? 'HK1' : 'HK2',
      academicYear: month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`,
      status,
      isApplied: true,
    };
    trainingMonths.push(mObj);
  }

  mObj.status = status;
  if (status === 'PUBLISHED') mObj.publishedAt = now;
  if (status === 'LOCKED') {
    mObj.lockedAt = now;
    mObj.lockedBy = user;
  }
  if (reopenReason) {
    mObj.reopenReason = reopenReason;
  }

  saveToDisk();

  trainingEventBus.emit(status === 'LOCKED' ? 'score.month.locked' : 'score.month.published', mObj);

  return mObj;
}

export function getAppeals(params?: { studentCode?: string; status?: string }): ScoreAppeal[] {
  let list = [...appeals];
  if (params?.studentCode) {
    const clean = params.studentCode.trim().toLowerCase();
    list = list.filter((a) => a.studentCode.toLowerCase() === clean);
  }
  if (params?.status) {
    list = list.filter((a) => a.status === params.status);
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createAppeal(data: Partial<ScoreAppeal>): ScoreAppeal {
  const now = new Date().toISOString();
  const appeal: ScoreAppeal = {
    id: `APP-${Date.now()}`,
    studentCode: data.studentCode!,
    studentName: data.studentName || data.studentCode,
    transactionId: data.transactionId,
    monthId: data.monthId || `M-${data.year || 2026}-${String(data.month || 11).padStart(2, '0')}`,
    month: data.month || 11,
    year: data.year || 2026,
    title: data.title || 'Khiếu nại điểm rèn luyện',
    reason: data.reason || '',
    evidenceUrl: data.evidenceUrl,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
  appeals.push(appeal);
  saveToDisk();

  trainingEventBus.emit('score.appeal.updated', appeal);

  return appeal;
}

export function resolveAppeal(appealId: string, status: 'ACCEPTED' | 'REJECTED', replyNote: string, reviewedBy: string): ScoreAppeal {
  const app = appeals.find((a) => a.id === appealId);
  if (!app) throw new Error('Không tìm thấy khiếu nại');

  const now = new Date().toISOString();
  app.status = status;
  app.replyNote = replyNote;
  app.reviewedBy = reviewedBy;
  app.reviewedAt = now;
  app.updatedAt = now;

  saveToDisk();

  trainingEventBus.emit('score.appeal.updated', app);

  return app;
}
