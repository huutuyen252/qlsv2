// src/types/trainingPoint.ts
// Các định nghĩa TypeScript chuẩn cho Phân hệ Quản lý Điểm Rèn luyện Sinh viên

export type TrainingRole = 'SYSTEM_ADMIN' | 'TRAINING_ADMIN' | 'CLASS_ADVISOR' | 'CLASS_OFFICER' | 'STUDENT';
export type DataScope = 'SYSTEM' | 'FACULTY' | 'CLASS' | 'SELF';

export type MonthStatus = 'DRAFT' | 'OPEN' | 'REVIEWING' | 'PUBLISHED' | 'LOCKED';
export type TransactionStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type CalculationType = 'FIXED' | 'PER_OCCURRENCE' | 'SELECT_LEVEL' | 'MANUAL_RANGE';
export type ScoreDirection = 'ADD' | 'SUBTRACT';
export type AppealStatus = 'PENDING' | 'IN_REVIEW' | 'ACCEPTED' | 'REJECTED';

/**
 * Phiên bản quy chế rèn luyện
 */
export interface ScorePolicy {
  id: string;
  code: string;
  name: string;
  academicYearId: string;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string;
  isDefault: boolean;
  roundingPrecision: number; // 0, 1, 2
  officerBaseRule: 'FIRST_DAY_OF_MONTH' | 'LAST_DAY_OF_MONTH' | 'ANY_ACTIVE_DAY';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 3 Nhóm nội dung điểm rèn luyện (Học tập max 35, Kỷ luật max 35, Hoạt động max 30)
 */
export interface ScoreCategory {
  id: string;
  policyId: string;
  code: string; // 'CAT_STUDY', 'CAT_DISCIPLINE', 'CAT_ACTIVITY'
  name: string;
  maxPoints: number; // 35, 35, 30
  displayOrder: number;
  description?: string;
  isActive: boolean;
}

/**
 * Cấu hình điểm nền (Sinh viên thường: 70, Cán bộ lớp: 75)
 */
export interface BaseScoreConfig {
  id: string;
  policyId: string;
  categoryId: string;
  isOfficer: boolean; // false = thường, true = cán bộ lớp
  basePoints: number; // thường: 25, 25, 20. cán bộ: 25, 25, 25
  createdAt: string;
  updatedAt: string;
}

/**
 * Bảng mức xếp loại rèn luyện
 */
export interface ScoreClassification {
  id: string;
  policyId: string;
  code: string;
  name: string; // 'Xuất sắc', 'Tốt', 'Khá', 'Trung bình', 'Yếu', 'Kém'
  minScore: number; // 90, 80, 65, 50, 35, 0
  maxScore: number; // 100, 89.99, 79.99, etc.
  displayOrder: number;
  colorBadge: string;
}

/**
 * Danh mục chức vụ cán bộ lớp
 */
export interface ClassOfficerRole {
  id: string;
  code: string; // 'MONITOR', 'VICE_MONITOR', 'SECRETARY', etc.
  name: string;
  baseScoreBonus: number; // Thường nâng từ 70 lên 75
  isActive: boolean;
}

/**
 * Phân công cán bộ lớp cho từng sinh viên
 */
export interface ClassOfficerAssignment {
  id: string;
  studentCode: string;
  studentName?: string;
  classId: string;
  roleId: string;
  roleCode?: string;
  roleName?: string;
  academicYear: string;
  validFrom: string; // YYYY-MM-DD
  validTo?: string; // YYYY-MM-DD
  assignedBy: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tiêu chí cộng / trừ điểm
 */
export interface ScoreCriterion {
  id: string;
  policyId: string;
  categoryId: string;
  categoryCode?: string;
  categoryName?: string;
  code: string;
  name: string;
  direction: ScoreDirection;
  calculationType: CalculationType;
  defaultPoints: number;
  minPoints?: number;
  maxPoints?: number;
  maxOccurrencesPerDay?: number;
  maxOccurrencesPerMonth?: number;
  requireNote: boolean;
  requireEvidence: boolean;
  requireApproval: boolean;
  allowBatch: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  levels?: CriterionScoreLevel[];
}

/**
 * Các cấp độ cho tiêu chí SELECT_LEVEL
 */
export interface CriterionScoreLevel {
  id: string;
  criterionId: string;
  levelName: string; // e.g. 'Cấp Khoa', 'Cấp Trường', 'Cấp Thành phố'
  points: number;
  displayOrder: number;
}

/**
 * Tháng rèn luyện
 */
export interface TrainingMonth {
  id: string;
  month: number; // 1 - 12
  year: number; // e.g. 2026
  semester: string; // 'HK1', 'HK2', 'HK_HE'
  academicYear: string; // '2025-2026', '2026-2027'
  status: MonthStatus;
  openedAt?: string;
  publishedAt?: string;
  lockedAt?: string;
  lockedBy?: string;
  reopenReason?: string;
  isApplied: boolean; // false nếu tháng nghỉ hè không tính điểm
}

/**
 * Giao dịch điểm rèn luyện độc lập
 */
export interface ScoreTransaction {
  id: string;
  studentCode: string;
  studentName?: string;
  classId: string;
  monthId: string;
  month: number;
  year: number;
  semester: string;
  academicYear: string;
  categoryId: string;
  categoryCode?: string;
  categoryName?: string;
  criterionId: string;
  criterionCode?: string;
  criterionName?: string;
  occurredAt: string; // YYYY-MM-DD HH:mm
  occurrences: number; // số lần
  pointsPerOccurrence: number; // điểm mỗi lần (có dấu +/-)
  totalPointsDelta: number; // tổng điểm thay đổi (= occurrences * pointsPerOccurrence)
  note?: string;
  evidenceUrl?: string;
  evidenceFileName?: string;
  batchId?: string;
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  status: TransactionStatus;
  rejectionReason?: string;
  cancellationReason?: string;
  isReversal?: boolean;
  reversesTransactionId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lịch sử chỉnh sửa giao dịch (Audit & Revision tracking)
 */
export interface ScoreTransactionRevision {
  id: string;
  transactionId: string;
  revisedBy: string;
  action: 'CREATE' | 'SUBMIT' | 'APPROVE' | 'REJECT' | 'UPDATE' | 'CANCEL' | 'REVERSE';
  oldData?: any;
  newData?: any;
  reason?: string;
  timestamp: string;
}

/**
 * Bảng tổng hợp điểm rèn luyện tháng của một sinh viên
 */
export interface MonthlyScoreAccount {
  id: string;
  studentCode: string;
  studentName?: string;
  classId: string;
  monthId: string;
  month: number;
  year: number;
  semester: string;
  academicYear: string;
  isOfficer: boolean;
  officerRoleName?: string;
  
  // Điểm nhóm 1: Học tập (max 35)
  cat1BasePoints: number;
  cat1RawDelta: number;
  cat1Recognized: number;

  // Điểm nhóm 2: Kỷ luật (max 35)
  cat2BasePoints: number;
  cat2RawDelta: number;
  cat2Recognized: number;

  // Điểm nhóm 3: Hoạt động (max 30)
  cat3BasePoints: number;
  cat3RawDelta: number;
  cat3Recognized: number;

  // Tổng hợp tháng
  totalBasePoints: number; // 70 hoặc 75
  totalRawScore: number;
  totalOfficialScore: number; // MIN(100, Cat1 + Cat2 + Cat3)
  classification: string; // 'Xuất sắc', 'Tốt', 'Khá', v.v.
  pendingTransactionsCount: number;
  monthStatus: MonthStatus;
  lastCalculatedAt: string;
}

/**
 * Khiếu nại / Phản hồi điểm từ sinh viên
 */
export interface ScoreAppeal {
  id: string;
  studentCode: string;
  studentName?: string;
  transactionId?: string;
  monthId: string;
  month: number;
  year: number;
  title: string;
  reason: string;
  evidenceUrl?: string;
  status: AppealStatus;
  replyNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tổng hợp điểm học kỳ
 */
export interface SemesterScoreSummary {
  id: string;
  studentCode: string;
  studentName?: string;
  classId: string;
  semester: string;
  academicYear: string;
  monthsCount: number;
  averageScore: number;
  classification: string;
  isOfficial: boolean;
  updatedAt: string;
}

/**
 * Tổng hợp điểm năm học
 */
export interface YearScoreSummary {
  id: string;
  studentCode: string;
  studentName?: string;
  classId: string;
  academicYear: string;
  semestersCount: number;
  averageScore: number;
  classification: string;
  isOfficial: boolean;
  updatedAt: string;
}
