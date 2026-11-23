import * as dbModule from './index';
import fs from 'fs';
import path from 'path';

const db = (dbModule as any).db;
const pool = (dbModule as any).pool;
import {
  users,
  sinhVien,
  monHoc,
  diem,
  renLuyen,
  thoiKhoaBieu,
  thiLaiHocLai,
  namHoc,
  hocKy,
  lop,
  diemDanh,
  thongBaoKiemTra,
  nghiLe,
  auditLogs,
} from './schema';
import { eq, and, sql, ilike, or } from 'drizzle-orm';
import { INITIAL_USERS, INITIAL_SINH_VIEN } from '../data/initialData';
import { hashPassword, isBcryptHash, resolvePlainPassword } from '../utils/security';

// Persistent storage file for uninterrupted durability
const DATA_STORE_PATH = path.join(process.cwd(), '.app_data_storage.json');

// In-memory fallback repositories
let memoryUsers: any[] = INITIAL_USERS.map((u) => ({
  ...u,
  plainPassword: u.plainPassword || u.password,
  password: hashPassword(u.password || '123456'),
}));
let memorySinhVien: any[] = [...INITIAL_SINH_VIEN];
let memoryMonHoc: any[] = [];
let memoryDiem: any[] = [];
let memoryRenLuyen: any[] = [];
let memoryThoiKhoaBieu: any[] = [];
let memoryThiLaiHocLai: any[] = [];
let memoryNamHoc: any[] = [];
let memoryHocKy: any[] = [];
let memoryLop: any[] = [];
let memoryDiemDanh: any[] = [];
let memoryThongBaoKiemTra: any[] = [];
let memoryNghiLe: any[] = [];
let memoryAuditLogs: any[] = [];
let memoryIdMapping: any[] = [];
let memoryMigrationConflictLog: any[] = [];
let memorySystemConfig: Record<string, any> = {
  adminName: 'Dương Hữu Tuyến',
  adminUnit: 'Quản trị hệ thống · Phòng Đào tạo',
  hotline: '028.3894.1234',
  contactEmail: 'admin@tdnu.edu.vn',
  supportHours: 'Thứ 2 – Thứ 6 · 07:30 – 17:00',
  facebookUrl: 'https://www.facebook.com',
  tiktokUrl: 'https://www.tiktok.com',
  zaloUrl: 'https://zalo.me/02838941234',
  holidayThemeMode: 'AUTO',
  holidayBannerText: '',
};

export function saveToDisk() {
  try {
    const payload = {
      memoryUsers,
      memorySinhVien,
      memoryMonHoc,
      memoryDiem,
      memoryRenLuyen,
      memoryThoiKhoaBieu,
      memoryThiLaiHocLai,
      memoryNamHoc,
      memoryHocKy,
      memoryLop,
      memoryDiemDanh,
      memoryThongBaoKiemTra,
      memoryNghiLe,
      memoryAuditLogs,
      memoryIdMapping,
      memoryMigrationConflictLog,
      memorySystemConfig,
    };
    fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Storage] Error persisting data store to disk:', err);
  }
}

export function loadFromDisk() {
  try {
    if (fs.existsSync(DATA_STORE_PATH)) {
      const raw = fs.readFileSync(DATA_STORE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.memoryUsers) && data.memoryUsers.length > 0) {
        memoryUsers = data.memoryUsers.map((u: any) => ({
          ...u,
          plainPassword: u.plainPassword || resolvePlainPassword(u),
        }));
      }
      if (Array.isArray(data.memorySinhVien) && data.memorySinhVien.length > 0) {
        memorySinhVien = data.memorySinhVien;
      } else {
        memorySinhVien = [...INITIAL_SINH_VIEN];
      }
      if (Array.isArray(data.memoryMonHoc)) memoryMonHoc = data.memoryMonHoc;
      if (Array.isArray(data.memoryDiem)) memoryDiem = data.memoryDiem;
      if (Array.isArray(data.memoryRenLuyen)) memoryRenLuyen = data.memoryRenLuyen;
      if (Array.isArray(data.memoryThoiKhoaBieu)) memoryThoiKhoaBieu = data.memoryThoiKhoaBieu;
      if (Array.isArray(data.memoryThiLaiHocLai)) memoryThiLaiHocLai = data.memoryThiLaiHocLai;
      if (Array.isArray(data.memoryNamHoc)) memoryNamHoc = data.memoryNamHoc;
      if (Array.isArray(data.memoryHocKy)) memoryHocKy = data.memoryHocKy;
      if (Array.isArray(data.memoryLop)) memoryLop = data.memoryLop;
      if (Array.isArray(data.memoryDiemDanh)) memoryDiemDanh = data.memoryDiemDanh;
      if (Array.isArray(data.memoryThongBaoKiemTra)) memoryThongBaoKiemTra = data.memoryThongBaoKiemTra;
      if (Array.isArray(data.memoryNghiLe)) memoryNghiLe = data.memoryNghiLe;
      if (Array.isArray(data.memoryAuditLogs)) memoryAuditLogs = data.memoryAuditLogs;
      if (Array.isArray(data.memoryIdMapping)) memoryIdMapping = data.memoryIdMapping;
      if (Array.isArray(data.memoryMigrationConflictLog)) memoryMigrationConflictLog = data.memoryMigrationConflictLog;
      if (data.memorySystemConfig && typeof data.memorySystemConfig === 'object') {
        memorySystemConfig = { ...memorySystemConfig, ...data.memorySystemConfig };
      }
      console.log(`[Storage] Loaded persistent store: ${memorySinhVien.length} SV, ${memoryDiemDanh.length} điểm danh, ${memoryThongBaoKiemTra.length} thông báo KT, ${memoryAuditLogs.length} audit logs, ${memoryIdMapping.length} ID mappings`);
    }

    if (memoryAuditLogs.length === 0) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
      memoryAuditLogs = [
        {
          id: `LOG-INIT-${Date.now()}-1`,
          timestamp: formatTime(new Date(now.getTime() - 60000)),
          user: 'system',
          role: 'SYSTEM',
          action: 'LOGIN',
          target: 'Hệ thống Quản trị & CSDL',
          details: 'Khởi động máy chủ cơ sở dữ liệu TDNU EDU và nạp toàn bộ cấu hình hệ thống',
          status: 'SUCCESS',
          ip: '127.0.0.1',
          createdAt: new Date(now.getTime() - 60000).toISOString(),
        },
        {
          id: `LOG-INIT-${Date.now()}-2`,
          timestamp: formatTime(now),
          user: 'system',
          role: 'SYSTEM',
          action: 'RBAC',
          target: 'Phân quyền Role-Based Access Control',
          details: 'Kích hoạt chính sách bảo mật RBAC và xác thực quyền hạn tài khoản Quản trị viên',
          status: 'SUCCESS',
          ip: '127.0.0.1',
          createdAt: now.toISOString(),
        },
      ];
      saveToDisk();
    }
  } catch (err) {
    console.warn('[Storage] Error reading persistent store:', err);
  }
}

// Automatically load from disk on boot
loadFromDisk();

export async function ensureDatabaseSchema() {
  if (!pool) return;
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" text PRIMARY KEY NOT NULL,
          "username" text NOT NULL UNIQUE,
          "full_name" text NOT NULL,
          "role" text NOT NULL,
          "email" text NOT NULL,
          "password" text,
          "plain_password" text,
          "avatar" text,
          "student_code" text,
          "faculty" text,
          "status" text DEFAULT 'ACTIVE',
          "permissions" jsonb,
          "created_at" text
        );

        CREATE TABLE IF NOT EXISTS "sinh_vien" (
          "ma_sv" text PRIMARY KEY NOT NULL,
          "ho_ten" text NOT NULL,
          "avatar" text,
          "ngay_sinh" text NOT NULL,
          "gioi_tinh" text NOT NULL,
          "lop" text NOT NULL,
          "khoa" text NOT NULL,
          "so_dien_thoai" text NOT NULL,
          "email" text NOT NULL,
          "dia_chi" text NOT NULL,
          "ho_so_file" text,
          "ho_so_file_name" text,
          "ho_so_files" jsonb,
          "ngay_nhap_hoc" text NOT NULL,
          "trang_thai" text NOT NULL DEFAULT 'Đang học'
        );

        CREATE TABLE IF NOT EXISTS "mon_hoc" (
          "ma_mh" text PRIMARY KEY NOT NULL,
          "ten_mh" text NOT NULL,
          "so_tin_chi" integer NOT NULL,
          "khoa_phu_trach" text,
          "khoa" text,
          "loai_mon" text,
          "hoc_ky" text,
          "nam_hoc" text,
          "lop" text,
          "le_phi_thi_lai" integer,
          "le_phi_hoc_lai" integer
        );

        CREATE TABLE IF NOT EXISTS "diem" (
          "id" text PRIMARY KEY NOT NULL,
          "ma_sv" text NOT NULL,
          "ho_ten_sv" text,
          "ma_mh" text NOT NULL,
          "ten_mh" text,
          "so_tin_chi" integer,
          "hoc_ky" text NOT NULL,
          "nam_hoc" text NOT NULL,
          "diem_chuyen_can" double precision NOT NULL DEFAULT 0,
          "diem_giua_ky" double precision NOT NULL DEFAULT 0,
          "diem_cuoi_ky" double precision NOT NULL DEFAULT 0,
          "diem_tong_ket_10" double precision NOT NULL DEFAULT 0,
          "diem_thang_4" double precision NOT NULL DEFAULT 0,
          "diem_chu" text NOT NULL DEFAULT 'F',
          "trang_thai" text NOT NULL DEFAULT 'FAILED'
        );

        CREATE TABLE IF NOT EXISTS "ren_luyen" (
          "id" text PRIMARY KEY NOT NULL,
          "ma_sv" text NOT NULL,
          "ho_ten_sv" text,
          "lop" text,
          "thang" integer NOT NULL,
          "nam" integer NOT NULL,
          "diem_rl" integer NOT NULL DEFAULT 0,
          "xep_loai" text NOT NULL,
          "nhan_xet" text,
          "nguoi_danh_gia" text,
          "ngay_danh_gia" text,
          "diem_muc_1" integer,
          "diem_muc_2" integer,
          "diem_muc_3" integer,
          "hoc_ky" text
        );

        CREATE TABLE IF NOT EXISTS "thoi_khoa_bieu" (
          "id" text PRIMARY KEY NOT NULL,
          "tkb_id" text,
          "ma_sv" text NOT NULL,
          "lop" text,
          "lop_id" text,
          "hoc_ky" text NOT NULL,
          "hoc_ky_id" text,
          "nam_hoc" text NOT NULL,
          "nam_hoc_id" text,
          "tuan_tu" integer DEFAULT 1,
          "tuan_den" integer DEFAULT 15,
          "tuan" integer DEFAULT 1,
          "danh_sach_tuan" jsonb,
          "ma_mh" text NOT NULL,
          "ten_mh" text NOT NULL,
          "so_tin_chi" integer NOT NULL DEFAULT 0,
          "giang_vien" text,
          "phong_hoc" text,
          "lich_hoc" jsonb NOT NULL,
          "thong_bao_kiem_tra" jsonb
        );

        CREATE TABLE IF NOT EXISTS "thi_lai_hoc_lai" (
          "id" text PRIMARY KEY NOT NULL,
          "ma_sv" text NOT NULL,
          "ho_ten_sv" text,
          "ma_mh" text NOT NULL,
          "ten_mh" text NOT NULL,
          "so_tin_chi" integer NOT NULL,
          "loai_dang_ky" text NOT NULL,
          "lan_thi" integer NOT NULL DEFAULT 1,
          "hoc_ky" text NOT NULL,
          "nam_hoc" text NOT NULL,
          "phi_diem" integer NOT NULL DEFAULT 0,
          "trang_thai" text NOT NULL DEFAULT 'CHO_DUYET',
          "ket_qua" text DEFAULT 'CHUA_CO_DIEM',
          "ngay_dang_ky" text NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "nam_hoc" (
          "nam_hoc_id" text PRIMARY KEY NOT NULL,
          "ten_nam_hoc" text NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "hoc_ky" (
          "hoc_ky_id" text PRIMARY KEY NOT NULL,
          "ten_hoc_ky" text NOT NULL,
          "nam_hoc_id" text NOT NULL,
          "ngay_bat_dau" text,
          "ngay_ket_thuc" text
        );

        CREATE TABLE IF NOT EXISTS "lop" (
          "lop_id" text PRIMARY KEY NOT NULL,
          "ten_lop" text NOT NULL,
          "khoa" text NOT NULL,
          "nam_nhap_hoc" integer NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "diem_danh" (
          "id" text PRIMARY KEY NOT NULL,
          "ma_sv" text NOT NULL,
          "ho_ten_sv" text,
          "ma_mh" text NOT NULL,
          "ten_mh" text,
          "lop" text,
          "ngay" text NOT NULL,
          "so_tiet_nghi" integer NOT NULL DEFAULT 0,
          "co_phep" boolean NOT NULL DEFAULT false,
          "ghi_chu" text,
          "nguoi_diem_danh" text,
          "created_at" text
        );

        CREATE TABLE IF NOT EXISTS "thong_bao_kiem_tra" (
          "id" text PRIMARY KEY NOT NULL,
          "ma_mh" text NOT NULL,
          "ten_mh" text,
          "loai" text NOT NULL,
          "tieu_de" text NOT NULL,
          "noi_dung" text NOT NULL,
          "ngay_kiem_tra" text,
          "tuan_kiem_tra" integer,
          "giang_vien_tao" text,
          "created_at" text
        );

        CREATE TABLE IF NOT EXISTS "nghi_le" (
          "id" text PRIMARY KEY NOT NULL,
          "dip_le" text NOT NULL,
          "tu_ngay" text NOT NULL,
          "den_ngay" text NOT NULL,
          "ghi_chu" text,
          "lop" text,
          "hoc_ky" text,
          "nam_hoc" text,
          "created_at" text
        );

        CREATE TABLE IF NOT EXISTS "audit_logs" (
          "id" text PRIMARY KEY NOT NULL,
          "timestamp" text NOT NULL,
          "user" text NOT NULL,
          "role" text NOT NULL,
          "action" text NOT NULL,
          "target" text NOT NULL,
          "details" text NOT NULL,
          "status" text NOT NULL DEFAULT 'SUCCESS',
          "ip" text,
          "created_at" text
        );

        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" jsonb;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" text;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "student_code" text;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "faculty" text;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE';
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" text;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plain_password" text;

        ALTER TABLE "sinh_vien" ADD COLUMN IF NOT EXISTS "avatar" text;
        ALTER TABLE "sinh_vien" ADD COLUMN IF NOT EXISTS "lop_id" text;
        ALTER TABLE "sinh_vien" ADD COLUMN IF NOT EXISTS "ho_so_file" text;
        ALTER TABLE "sinh_vien" ADD COLUMN IF NOT EXISTS "ho_so_file_name" text;
        ALTER TABLE "sinh_vien" ADD COLUMN IF NOT EXISTS "ho_so_files" jsonb;

        ALTER TABLE "diem" ADD COLUMN IF NOT EXISTS "hoc_ky_id" text;
        ALTER TABLE "diem" ADD COLUMN IF NOT EXISTS "nam_hoc_id" text;
        ALTER TABLE "diem" ADD COLUMN IF NOT EXISTS "diem_chuyen_can_num" double precision;
        ALTER TABLE "diem" ADD COLUMN IF NOT EXISTS "diem_giua_ky_num" double precision;
        ALTER TABLE "diem" ADD COLUMN IF NOT EXISTS "diem_cuoi_ky_num" double precision;
        ALTER TABLE "diem" ADD COLUMN IF NOT EXISTS "diem_tong_ket_10_num" double precision;
        ALTER TABLE "diem" ADD COLUMN IF NOT EXISTS "diem_thang_4_num" double precision;

        ALTER TABLE "thi_lai_hoc_lai" ADD COLUMN IF NOT EXISTS "hoc_ky_id" text;
        ALTER TABLE "thi_lai_hoc_lai" ADD COLUMN IF NOT EXISTS "nam_hoc_id" text;

        CREATE TABLE IF NOT EXISTS "id_mapping" (
          "id" text PRIMARY KEY NOT NULL,
          "entity_type" text NOT NULL,
          "source_table" text NOT NULL,
          "source_id" text NOT NULL,
          "canonical_table" text NOT NULL,
          "canonical_id" text NOT NULL,
          "mapping_reason" text NOT NULL,
          "migration_status" text DEFAULT 'MIGRATED',
          "conflict_details" text,
          "migrated_at" text
        );

        CREATE TABLE IF NOT EXISTS "migration_conflict_log" (
          "id" text PRIMARY KEY NOT NULL,
          "migration_batch" text NOT NULL,
          "table_name" text NOT NULL,
          "record_id" text NOT NULL,
          "column_name" text NOT NULL,
          "conflict_type" text NOT NULL,
          "raw_value" text,
          "expected_reference" text,
          "notes" text,
          "created_at" text
        );

        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "tkb_id" text;
        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "lop_id" text;
        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "hoc_ky_id" text;
        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "nam_hoc_id" text;
        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "tuan_tu" integer DEFAULT 1;
        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "tuan_den" integer DEFAULT 15;
        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "tuan" integer DEFAULT 1;
        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "danh_sach_tuan" jsonb;
        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "giang_vien" text;
        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "phong_hoc" text;
        ALTER TABLE "thoi_khoa_bieu" ADD COLUMN IF NOT EXISTS "thong_bao_kiem_tra" jsonb;

        CREATE TABLE IF NOT EXISTS "score_policies" (
          "id" text PRIMARY KEY NOT NULL,
          "code" text NOT NULL UNIQUE,
          "name" text NOT NULL,
          "academic_year_id" text NOT NULL,
          "effective_from" text NOT NULL,
          "effective_to" text,
          "is_default" boolean DEFAULT false,
          "rounding_precision" integer DEFAULT 1,
          "officer_base_rule" text DEFAULT 'FIRST_DAY_OF_MONTH',
          "is_active" boolean DEFAULT true,
          "created_at" text,
          "updated_at" text
        );

        CREATE TABLE IF NOT EXISTS "score_categories" (
          "id" text PRIMARY KEY NOT NULL,
          "policy_id" text NOT NULL,
          "code" text NOT NULL,
          "name" text NOT NULL,
          "max_points" double precision NOT NULL,
          "display_order" integer DEFAULT 1,
          "description" text,
          "is_active" boolean DEFAULT true,
          "created_at" text,
          "updated_at" text
        );

        CREATE TABLE IF NOT EXISTS "base_score_configs" (
          "id" text PRIMARY KEY NOT NULL,
          "policy_id" text NOT NULL,
          "category_id" text NOT NULL,
          "is_officer" boolean DEFAULT false,
          "base_points" double precision NOT NULL,
          "created_at" text,
          "updated_at" text
        );

        CREATE TABLE IF NOT EXISTS "score_classifications" (
          "id" text PRIMARY KEY NOT NULL,
          "policy_id" text NOT NULL,
          "code" text NOT NULL,
          "name" text NOT NULL,
          "min_score" double precision NOT NULL,
          "max_score" double precision NOT NULL,
          "display_order" integer DEFAULT 1,
          "color_badge" text DEFAULT 'blue',
          "created_at" text,
          "updated_at" text
        );

        CREATE TABLE IF NOT EXISTS "class_officer_roles" (
          "id" text PRIMARY KEY NOT NULL,
          "code" text NOT NULL UNIQUE,
          "name" text NOT NULL,
          "base_score_bonus" double precision DEFAULT 5,
          "is_active" boolean DEFAULT true,
          "created_at" text,
          "updated_at" text
        );

        CREATE TABLE IF NOT EXISTS "class_officer_assignments" (
          "id" text PRIMARY KEY NOT NULL,
          "student_code" text NOT NULL,
          "student_name" text,
          "class_id" text NOT NULL,
          "role_id" text NOT NULL,
          "academic_year" text NOT NULL,
          "valid_from" text NOT NULL,
          "valid_to" text,
          "assigned_by" text NOT NULL,
          "status" text DEFAULT 'ACTIVE',
          "note" text,
          "created_at" text,
          "updated_at" text
        );

        CREATE TABLE IF NOT EXISTS "score_criteria" (
          "id" text PRIMARY KEY NOT NULL,
          "policy_id" text NOT NULL,
          "category_id" text NOT NULL,
          "code" text NOT NULL,
          "name" text NOT NULL,
          "direction" text NOT NULL,
          "calculation_type" text NOT NULL,
          "default_points" double precision NOT NULL,
          "min_points" double precision,
          "max_points" double precision,
          "max_occurrences_per_day" integer,
          "max_occurrences_per_month" integer,
          "require_note" boolean DEFAULT false,
          "require_evidence" boolean DEFAULT false,
          "require_approval" boolean DEFAULT true,
          "allow_batch" boolean DEFAULT true,
          "effective_from" text NOT NULL,
          "effective_to" text,
          "is_active" boolean DEFAULT true,
          "created_at" text,
          "updated_at" text
        );

        CREATE TABLE IF NOT EXISTS "training_months" (
          "id" text PRIMARY KEY NOT NULL,
          "month" integer NOT NULL,
          "year" integer NOT NULL,
          "semester" text NOT NULL,
          "academic_year" text NOT NULL,
          "status" text DEFAULT 'DRAFT',
          "opened_at" text,
          "published_at" text,
          "locked_at" text,
          "locked_by" text,
          "reopen_reason" text,
          "is_applied" boolean DEFAULT true,
          "created_at" text,
          "updated_at" text
        );

        CREATE TABLE IF NOT EXISTS "score_transactions" (
          "id" text PRIMARY KEY NOT NULL,
          "student_code" text NOT NULL,
          "student_name" text,
          "class_id" text NOT NULL,
          "month_id" text NOT NULL,
          "month" integer NOT NULL,
          "year" integer NOT NULL,
          "semester" text NOT NULL,
          "academic_year" text NOT NULL,
          "category_id" text NOT NULL,
          "criterion_id" text NOT NULL,
          "occurred_at" text NOT NULL,
          "occurrences" integer DEFAULT 1,
          "points_per_occurrence" double precision NOT NULL,
          "total_points_delta" double precision NOT NULL,
          "note" text,
          "evidence_url" text,
          "evidence_file_name" text,
          "batch_id" text,
          "created_by" text NOT NULL,
          "approved_by" text,
          "approved_at" text,
          "status" text DEFAULT 'DRAFT',
          "rejection_reason" text,
          "cancellation_reason" text,
          "is_reversal" boolean DEFAULT false,
          "reverses_transaction_id" text,
          "version" integer DEFAULT 1,
          "created_at" text,
          "updated_at" text
        );

        CREATE TABLE IF NOT EXISTS "score_appeals" (
          "id" text PRIMARY KEY NOT NULL,
          "student_code" text NOT NULL,
          "student_name" text,
          "transaction_id" text,
          "month_id" text NOT NULL,
          "month" integer NOT NULL,
          "year" integer NOT NULL,
          "title" text NOT NULL,
          "reason" text NOT NULL,
          "evidence_url" text,
          "status" text DEFAULT 'PENDING',
          "reply_note" text,
          "reviewed_by" text,
          "reviewed_at" text,
          "created_at" text,
          "updated_at" text
        );
      `);
      console.log('[DB] PostgreSQL schema checked & initialized successfully.');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[DB] Auto-migration check:', err?.message);
  }
}

export async function seedInitialDataIfNeeded() {
  if (!db) {
    if (memoryUsers.length === 0) {
      memoryUsers = [...INITIAL_USERS];
    }
    return;
  }
  try {
    await ensureDatabaseSchema();
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length === 0) {
      console.log('Seeding initial system users to PostgreSQL with Bcrypt encryption...');
      for (const u of INITIAL_USERS) {
        await db.insert(users).values({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          role: u.role,
          email: u.email,
          password: hashPassword(u.password || '123456'),
          plainPassword: u.plainPassword || u.password,
          avatar: u.avatar,
          faculty: u.faculty,
          status: u.status || 'ACTIVE',
          permissions: u.permissions || {},
          createdAt: u.createdAt || new Date().toISOString().split('T')[0],
        }).onConflictDoNothing();
      }
      console.log('Initial users seeded with Bcrypt hash successfully.');
    } else {
      // Tự động quét và nâng cấp mật khẩu của người dùng hiện có trong PostgreSQL sang Bcrypt hash
      try {
        const allCurrentUsers = await db.select().from(users);
        for (const u of allCurrentUsers) {
          if (u.password && !isBcryptHash(u.password)) {
            const hashed = hashPassword(u.password);
            await db.update(users).set({ password: hashed }).where(eq(users.id, u.id));
            console.log(`[Security] Đã mã hóa Bcrypt cho tài khoản [${u.username}] trong PostgreSQL.`);
          }
        }
      } catch (migErr) {
        console.warn('[Security] Không thể quét nâng cấp bcrypt trong CSDL:', (migErr as any)?.message);
      }
    }
  } catch (error) {
    console.warn('[DB] Fallback in-memory state will be used:', (error as any)?.message);
  }
}

export async function getAllUsers() {
  if (db) {
    try {
      return await db.select().from(users);
    } catch {
      // fallback
    }
  }
  return [...memoryUsers];
}

export async function getUserById(id: string) {
  if (db) {
    try {
      const res = await db.select().from(users).where(eq(users.id, id));
      return res[0] || null;
    } catch {
      // fallback
    }
  }
  return memoryUsers.find((u) => u.id === id) || null;
}

export async function getUserByUsername(username: string) {
  const clean = username.trim().toLowerCase();
  if (db) {
    try {
      const res = await db.select().from(users).where(ilike(users.username, clean));
      return res[0] || null;
    } catch {
      // fallback
    }
  }
  return memoryUsers.find((u) => u.username?.toLowerCase() === clean) || null;
}

export async function createUser(userData: any) {
  if (db) {
    try {
      const res = await db.insert(users).values(userData).returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  const newUser = { ...userData, id: userData.id || `u-${Date.now()}` };
  memoryUsers.push(newUser);
  return newUser;
}

export async function updateUser(id: string, updateData: any) {
  if (db) {
    try {
      const res = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
      return res[0] || null;
    } catch {
      // fallback
    }
  }
  const idx = memoryUsers.findIndex((u) => u.id === id || u.username === id);
  if (idx !== -1) {
    memoryUsers[idx] = { ...memoryUsers[idx], ...updateData };
    return memoryUsers[idx];
  }
  return null;
}

export async function deleteUser(id: string) {
  if (db) {
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch {
      // fallback
    }
  }
  memoryUsers = memoryUsers.filter((u) => u.id !== id);
  return true;
}

export async function getAllSinhVien(search?: string, khoaFilter?: string, lopFilter?: string) {
  if (db) {
    try {
      let query = db.select().from(sinhVien);
      const conditions = [];
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        conditions.push(or(ilike(sinhVien.maSV, q), ilike(sinhVien.hoTen, q)));
      }
      if (khoaFilter && khoaFilter.trim()) {
        conditions.push(eq(sinhVien.khoa, khoaFilter.trim()));
      }
      if (lopFilter && lopFilter.trim()) {
        conditions.push(eq(sinhVien.lop, lopFilter.trim()));
      }
      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }
      return await query;
    } catch {
      // fallback
    }
  }
  return memorySinhVien.filter((sv) => {
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      const match = sv.maSV?.toLowerCase().includes(s) || sv.hoTen?.toLowerCase().includes(s);
      if (!match) return false;
    }
    if (khoaFilter && khoaFilter.trim() && sv.khoa !== khoaFilter.trim()) return false;
    if (lopFilter && lopFilter.trim() && sv.lop !== lopFilter.trim()) return false;
    return true;
  });
}

export async function getSinhVienByMaSV(maSV: string) {
  const clean = maSV.trim().toLowerCase();
  if (db) {
    try {
      const res = await db.select().from(sinhVien).where(ilike(sinhVien.maSV, clean));
      return res[0] || null;
    } catch {
      // fallback
    }
  }
  return memorySinhVien.find((sv) => sv.maSV?.toLowerCase() === clean) || null;
}

export async function createSinhVien(data: any) {
  if (db) {
    try {
      const res = await db.insert(sinhVien).values(data).returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  const idx = memorySinhVien.findIndex((s) => s.maSV?.toLowerCase() === data.maSV?.toLowerCase());
  if (idx !== -1) {
    memorySinhVien[idx] = { ...memorySinhVien[idx], ...data };
    return memorySinhVien[idx];
  }
  memorySinhVien.push(data);
  return data;
}

export async function updateSinhVien(maSV: string, data: any) {
  const clean = maSV.trim().toLowerCase();
  if (db) {
    try {
      const res = await db.update(sinhVien).set(data).where(ilike(sinhVien.maSV, clean)).returning();
      return res[0] || null;
    } catch {
      // fallback
    }
  }
  const idx = memorySinhVien.findIndex((s) => s.maSV?.toLowerCase() === clean);
  if (idx !== -1) {
    memorySinhVien[idx] = { ...memorySinhVien[idx], ...data };
    return memorySinhVien[idx];
  }
  return null;
}

export async function deleteSinhVien(maSV: string) {
  const clean = maSV.trim().toLowerCase();
  if (db) {
    try {
      await db.delete(sinhVien).where(ilike(sinhVien.maSV, clean));
      return true;
    } catch {
      // fallback
    }
  }
  memorySinhVien = memorySinhVien.filter((s) => s.maSV?.toLowerCase() !== clean);
  return true;
}

export async function upsertSinhVien(data: any) {
  if (db) {
    try {
      const res = await db.insert(sinhVien)
        .values(data)
        .onConflictDoUpdate({ target: sinhVien.maSV, set: data })
        .returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  return createSinhVien(data);
}

export async function getAllMonHoc(khoa?: string, lop?: string, hocKy?: string, namHoc?: string) {
  if (db) {
    try {
      let query = db.select().from(monHoc);
      const conditions = [];
      if (khoa && khoa.trim()) conditions.push(eq(monHoc.khoa, khoa.trim()));
      if (lop && lop.trim()) conditions.push(eq(monHoc.lop, lop.trim()));
      if (hocKy && hocKy.trim()) conditions.push(eq(monHoc.hocKy, hocKy.trim()));
      if (namHoc && namHoc.trim()) conditions.push(eq(monHoc.namHoc, namHoc.trim()));
      if (conditions.length > 0) return await query.where(and(...conditions));
      return await query;
    } catch {
      // fallback
    }
  }
  return memoryMonHoc.filter((m) => {
    if (khoa && khoa.trim() && m.khoa !== khoa.trim()) return false;
    if (lop && lop.trim() && m.lop !== lop.trim()) return false;
    if (hocKy && hocKy.trim() && m.hocKy !== hocKy.trim()) return false;
    if (namHoc && namHoc.trim() && m.namHoc !== namHoc.trim()) return false;
    return true;
  });
}

export async function getMonHocByMaMH(maMH: string) {
  const clean = maMH.trim().toLowerCase();
  if (db) {
    try {
      const res = await db.select().from(monHoc).where(ilike(monHoc.maMH, clean));
      return res[0] || null;
    } catch {
      // fallback
    }
  }
  return memoryMonHoc.find((m) => m.maMH?.toLowerCase() === clean) || null;
}

export async function upsertMonHoc(data: any) {
  if (db) {
    try {
      const res = await db.insert(monHoc)
        .values(data)
        .onConflictDoUpdate({ target: monHoc.maMH, set: data })
        .returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  const idx = memoryMonHoc.findIndex((m) => m.maMH?.toLowerCase() === data.maMH?.toLowerCase());
  if (idx !== -1) {
    memoryMonHoc[idx] = { ...memoryMonHoc[idx], ...data };
    return memoryMonHoc[idx];
  }
  memoryMonHoc.push(data);
  return data;
}

export async function deleteMonHoc(maMH: string) {
  const clean = maMH.trim().toLowerCase();
  if (db) {
    try {
      await db.delete(monHoc).where(ilike(monHoc.maMH, clean));
      return true;
    } catch {
      // fallback
    }
  }
  memoryMonHoc = memoryMonHoc.filter((m) => m.maMH?.toLowerCase() !== clean);
  return true;
}

export async function getAllDiem(maSV?: string, hocKy?: string, namHoc?: string) {
  if (db) {
    try {
      let query = db.select().from(diem);
      const conditions = [];
      if (maSV && maSV.trim()) conditions.push(ilike(diem.maSV, maSV.trim()));
      if (hocKy && hocKy.trim()) conditions.push(eq(diem.hocKy, hocKy.trim()));
      if (namHoc && namHoc.trim()) conditions.push(eq(diem.namHoc, namHoc.trim()));
      if (conditions.length > 0) return await query.where(and(...conditions));
      return await query;
    } catch {
      // fallback
    }
  }
  return memoryDiem.filter((d) => {
    if (maSV && maSV.trim() && d.maSV?.toLowerCase() !== maSV.trim().toLowerCase()) return false;
    if (hocKy && hocKy.trim() && d.hocKy !== hocKy.trim()) return false;
    if (namHoc && namHoc.trim() && d.namHoc !== namHoc.trim()) return false;
    return true;
  });
}

export async function upsertDiem(data: any) {
  const recordId = data.id || `diem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record = { ...data, id: recordId };
  if (db) {
    try {
      const res = await db.insert(diem)
        .values(record)
        .onConflictDoUpdate({ target: diem.id, set: record })
        .returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  const idx = memoryDiem.findIndex((d) => d.id === record.id);
  if (idx !== -1) {
    memoryDiem[idx] = { ...memoryDiem[idx], ...record };
    return memoryDiem[idx];
  }
  memoryDiem.push(record);
  return record;
}

export async function deleteDiem(id: string) {
  if (db) {
    try {
      await db.delete(diem).where(eq(diem.id, id));
      return true;
    } catch {
      // fallback
    }
  }
  memoryDiem = memoryDiem.filter((d) => d.id !== id);
  return true;
}

export async function getAllRenLuyen(maSV?: string, thang?: number, nam?: number) {
  if (db) {
    try {
      let query = db.select().from(renLuyen);
      const conditions = [];
      if (maSV && maSV.trim()) conditions.push(ilike(renLuyen.maSV, maSV.trim()));
      if (thang !== undefined && !isNaN(thang)) conditions.push(eq(renLuyen.thang, thang));
      if (nam !== undefined && !isNaN(nam)) conditions.push(eq(renLuyen.nam, nam));
      if (conditions.length > 0) return await query.where(and(...conditions));
      return await query;
    } catch {
      // fallback
    }
  }
  return memoryRenLuyen.filter((r) => {
    if (maSV && maSV.trim() && r.maSV?.toLowerCase() !== maSV.trim().toLowerCase()) return false;
    if (thang !== undefined && !isNaN(thang) && r.thang !== thang) return false;
    if (nam !== undefined && !isNaN(nam) && r.nam !== nam) return false;
    return true;
  });
}

export async function upsertRenLuyen(data: any) {
  const recordId = data.id || `rl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record = { ...data, id: recordId };
  if (db) {
    try {
      const res = await db.insert(renLuyen)
        .values(record)
        .onConflictDoUpdate({ target: renLuyen.id, set: record })
        .returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  const idx = memoryRenLuyen.findIndex((r) => r.id === record.id);
  if (idx !== -1) {
    memoryRenLuyen[idx] = { ...memoryRenLuyen[idx], ...record };
    saveToDisk();
    return memoryRenLuyen[idx];
  }
  memoryRenLuyen.push(record);
  saveToDisk();
  return record;
}

export async function deleteRenLuyen(id: string): Promise<boolean> {
  if (db) {
    try {
      await db.delete(renLuyen).where(eq(renLuyen.id, id));
    } catch {
      // fallback
    }
  }
  const initialLen = memoryRenLuyen.length;
  memoryRenLuyen = memoryRenLuyen.filter((r) => r.id !== id);
  saveToDisk();
  return true;
}

export async function deleteClassRenLuyen(
  lop: string,
  thang?: number,
  nam?: number,
  hocKy?: string
): Promise<number> {
  const normLop = lop.trim().toLowerCase();
  let deletedCount = 0;
  if (db) {
    try {
      const conditions = [ilike(renLuyen.lop, `%${normLop}%`)];
      if (thang !== undefined && !isNaN(thang)) conditions.push(eq(renLuyen.thang, thang));
      if (nam !== undefined && !isNaN(nam)) conditions.push(eq(renLuyen.nam, nam));
      if (hocKy && hocKy.trim() && hocKy !== 'ALL') conditions.push(eq(renLuyen.hocKy, hocKy.trim()));
      await db.delete(renLuyen).where(and(...conditions));
    } catch {
      // fallback
    }
  }
  const prevCount = memoryRenLuyen.length;
  memoryRenLuyen = memoryRenLuyen.filter((r) => {
    const matchLop = !lop || (r.lop && r.lop.toLowerCase().includes(normLop));
    const matchThang = thang === undefined || isNaN(thang) || r.thang === thang;
    const matchNam = nam === undefined || isNaN(nam) || r.nam === nam;
    const matchHocKy = !hocKy || hocKy === 'ALL' || r.hocKy === hocKy;
    if (matchLop && matchThang && matchNam && matchHocKy) {
      deletedCount++;
      return false;
    }
    return true;
  });
  return Math.max(deletedCount, prevCount - memoryRenLuyen.length);
}

export async function getAllThoiKhoaBieu(maSV?: string, lop?: string, hocKy?: string, namHoc?: string) {
  if (db) {
    try {
      let query = db.select().from(thoiKhoaBieu);
      const conditions = [];
      if (maSV && maSV.trim()) {
        conditions.push(or(ilike(thoiKhoaBieu.maSV, maSV.trim()), lop ? ilike(thoiKhoaBieu.lop, lop.trim()) : sql`FALSE`));
      } else if (lop && lop.trim()) {
        conditions.push(ilike(thoiKhoaBieu.lop, lop.trim()));
      }
      if (hocKy && hocKy.trim()) conditions.push(eq(thoiKhoaBieu.hocKy, hocKy.trim()));
      if (namHoc && namHoc.trim()) conditions.push(eq(thoiKhoaBieu.namHoc, namHoc.trim()));
      if (conditions.length > 0) return await query.where(and(...conditions));
      return await query;
    } catch {
      // fallback
    }
  }
  return memoryThoiKhoaBieu.filter((tkb) => {
    if (maSV && maSV.trim()) {
      const match = tkb.maSV?.toLowerCase() === maSV.trim().toLowerCase() || (lop && tkb.lop?.toLowerCase() === lop.trim().toLowerCase());
      if (!match) return false;
    } else if (lop && lop.trim() && tkb.lop?.toLowerCase() !== lop.trim().toLowerCase()) {
      return false;
    }
    if (hocKy && hocKy.trim() && tkb.hocKy !== hocKy.trim()) return false;
    if (namHoc && namHoc.trim() && tkb.namHoc !== namHoc.trim()) return false;
    return true;
  });
}

export async function createThoiKhoaBieu(data: any) {
  const item = { ...data, id: data.id || `tkb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
  if (db) {
    try {
      const res = await db.insert(thoiKhoaBieu).values(item).returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  memoryThoiKhoaBieu.push(item);
  return item;
}

export async function updateThoiKhoaBieu(id: string, data: any) {
  if (db) {
    try {
      const res = await db.update(thoiKhoaBieu).set(data).where(eq(thoiKhoaBieu.id, id)).returning();
      return res[0] || null;
    } catch {
      // fallback
    }
  }
  const idx = memoryThoiKhoaBieu.findIndex((t) => t.id === id);
  if (idx !== -1) {
    memoryThoiKhoaBieu[idx] = { ...memoryThoiKhoaBieu[idx], ...data };
    return memoryThoiKhoaBieu[idx];
  }
  return null;
}

export async function deleteThoiKhoaBieu(id: string, maMH?: string) {
  if (db) {
    try {
      const matchConditions = [
        eq(thoiKhoaBieu.id, id),
        eq(thoiKhoaBieu.tkbID, id),
      ];
      if (maMH && maMH.trim()) {
        matchConditions.push(eq(thoiKhoaBieu.maMH, maMH.trim()));
      } else {
        matchConditions.push(eq(thoiKhoaBieu.maMH, id));
      }
      await db.delete(thoiKhoaBieu).where(or(...matchConditions));
      return true;
    } catch {
      // fallback
    }
  }
  memoryThoiKhoaBieu = memoryThoiKhoaBieu.filter(
    (t) =>
      t.id !== id &&
      t.tkbID !== id &&
      t.maMH !== id &&
      (!maMH || t.maMH !== maMH)
  );
  return true;
}

export async function deleteThoiKhoaBieuByYear(namHoc?: string, hocKy?: string, lop?: string) {
  const isAllYears = !namHoc || namHoc === 'ALL';
  const normYear = (!isAllYears && namHoc)
    ? namHoc
        .replace(/^Năm\s*học\s*/i, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*-\s*/g, '-')
        .trim()
    : '';

  let deletedCount = 0;

  if (db) {
    try {
      const conditions: any[] = [];

      if (!isAllYears && namHoc) {
        const yearConditions = [
          eq(thoiKhoaBieu.namHoc, namHoc),
          eq(thoiKhoaBieu.namHoc, normYear),
          eq(thoiKhoaBieu.namHocID, namHoc),
          eq(thoiKhoaBieu.namHocID, normYear),
        ];
        if (normYear) {
          yearConditions.push(ilike(thoiKhoaBieu.namHoc, `%${normYear}%`));
        }
        conditions.push(or(...yearConditions));
      }

      if (hocKy && hocKy !== 'ALL') {
        conditions.push(
          or(
            eq(thoiKhoaBieu.hocKy, hocKy),
            eq(thoiKhoaBieu.hocKyID, hocKy),
            ilike(thoiKhoaBieu.hocKy, `%${hocKy}%`)
          )
        );
      }
      if (lop && lop !== 'ALL') {
        conditions.push(
          or(
            eq(thoiKhoaBieu.lop, lop),
            eq(thoiKhoaBieu.lopID, lop)
          )
        );
      }

      let res;
      if (conditions.length > 0) {
        res = await db.delete(thoiKhoaBieu).where(and(...conditions)).returning();
      } else {
        res = await db.delete(thoiKhoaBieu).returning();
      }
      deletedCount = res.length;
    } catch (err) {
      console.error('Error deleting schedule from PostgreSQL by year/semester:', err);
    }
  }

  const beforeLen = memoryThoiKhoaBieu.length;
  memoryThoiKhoaBieu = memoryThoiKhoaBieu.filter((t) => {
    const tYear = (t.namHoc || '')
      .replace(/^Năm\s*học\s*/i, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*-\s*/g, '-')
      .trim();
    const matchYear =
      isAllYears ||
      tYear === normYear ||
      t.namHoc === namHoc ||
      t.namHocID === namHoc ||
      t.namHocID === normYear;
    const matchSemester =
      !hocKy ||
      hocKy === 'ALL' ||
      t.hocKy === hocKy ||
      t.hocKyID === hocKy;
    const matchLop =
      !lop ||
      lop === 'ALL' ||
      t.lop === lop ||
      t.lopID === lop;

    if (matchYear && matchSemester && matchLop) {
      return false; // delete this item
    }
    return true; // keep
  });

  const memoryDeleted = beforeLen - memoryThoiKhoaBieu.length;
  return { success: true, count: deletedCount || memoryDeleted };
}

export async function getAllThiLaiHocLai(maSV?: string) {
  if (db) {
    try {
      if (maSV && maSV.trim()) {
        return await db.select().from(thiLaiHocLai).where(ilike(thiLaiHocLai.maSV, maSV.trim()));
      }
      return await db.select().from(thiLaiHocLai);
    } catch {
      // fallback
    }
  }
  if (maSV && maSV.trim()) {
    return memoryThiLaiHocLai.filter((t) => t.maSV?.toLowerCase() === maSV.trim().toLowerCase());
  }
  return [...memoryThiLaiHocLai];
}

export async function createThiLaiHocLai(data: any) {
  const item = { ...data, id: data.id || `tl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
  if (db) {
    try {
      const res = await db.insert(thiLaiHocLai).values(item).returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  memoryThiLaiHocLai.push(item);
  return item;
}

export async function updateThiLaiHocLai(id: string, data: any) {
  if (db) {
    try {
      const res = await db.update(thiLaiHocLai).set(data).where(eq(thiLaiHocLai.id, id)).returning();
      return res[0] || null;
    } catch {
      // fallback
    }
  }
  const idx = memoryThiLaiHocLai.findIndex((t) => t.id === id);
  if (idx !== -1) {
    memoryThiLaiHocLai[idx] = { ...memoryThiLaiHocLai[idx], ...data };
    return memoryThiLaiHocLai[idx];
  }
  return null;
}

export async function deleteThiLaiHocLai(id: string) {
  if (db) {
    try {
      await db.delete(thiLaiHocLai).where(eq(thiLaiHocLai.id, id));
      return true;
    } catch {
      // fallback
    }
  }
  memoryThiLaiHocLai = memoryThiLaiHocLai.filter((t) => t.id !== id);
  return true;
}

export async function getAllNamHoc() {
  if (db) {
    try {
      return await db.select().from(namHoc);
    } catch {
      // fallback
    }
  }
  return [...memoryNamHoc];
}

export async function upsertNamHoc(data: any) {
  if (db) {
    try {
      const res = await db.insert(namHoc)
        .values(data)
        .onConflictDoUpdate({ target: namHoc.namHocID, set: data })
        .returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  const idx = memoryNamHoc.findIndex((n) => n.namHocID === data.namHocID);
  if (idx !== -1) {
    memoryNamHoc[idx] = { ...memoryNamHoc[idx], ...data };
    return memoryNamHoc[idx];
  }
  memoryNamHoc.push(data);
  return data;
}

export async function deleteNamHoc(namHocID: string) {
  if (db) {
    try {
      await db.delete(namHoc).where(eq(namHoc.namHocID, namHocID));
      return true;
    } catch {
      // fallback
    }
  }
  memoryNamHoc = memoryNamHoc.filter((n) => n.namHocID !== namHocID);
  return true;
}

export async function getAllHocKy() {
  if (db) {
    try {
      return await db.select().from(hocKy);
    } catch {
      // fallback
    }
  }
  return [...memoryHocKy];
}

export async function upsertHocKy(data: any) {
  if (db) {
    try {
      const res = await db.insert(hocKy)
        .values(data)
        .onConflictDoUpdate({ target: hocKy.hocKyID, set: data })
        .returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  const idx = memoryHocKy.findIndex((h) => h.hocKyID === data.hocKyID);
  if (idx !== -1) {
    memoryHocKy[idx] = { ...memoryHocKy[idx], ...data };
    return memoryHocKy[idx];
  }
  memoryHocKy.push(data);
  return data;
}

export async function deleteHocKy(hocKyID: string) {
  if (db) {
    try {
      await db.delete(hocKy).where(eq(hocKy.hocKyID, hocKyID));
      return true;
    } catch {
      // fallback
    }
  }
  memoryHocKy = memoryHocKy.filter((h) => h.hocKyID !== hocKyID);
  return true;
}

export async function getAllLop() {
  if (db) {
    try {
      return await db.select().from(lop);
    } catch {
      // fallback
    }
  }
  return [...memoryLop];
}

export async function upsertLop(data: any) {
  if (db) {
    try {
      const res = await db.insert(lop)
        .values(data)
        .onConflictDoUpdate({ target: lop.lopID, set: data })
        .returning();
      return res[0];
    } catch {
      // fallback
    }
  }
  const idx = memoryLop.findIndex((l) => l.lopID === data.lopID);
  if (idx !== -1) {
    memoryLop[idx] = { ...memoryLop[idx], ...data };
    return memoryLop[idx];
  }
  memoryLop.push(data);
  return data;
}

export async function deleteLop(lopID: string) {
  if (db) {
    try {
      await db.delete(lop).where(eq(lop.lopID, lopID));
      return true;
    } catch {
      // fallback
    }
  }
  memoryLop = memoryLop.filter((l) => l.lopID !== lopID);
  return true;
}

export async function getAllDiemDanh(maSV?: string, maMH?: string) {
  if (db) {
    try {
      let query = db.select().from(diemDanh);
      const conditions = [];
      if (maSV) conditions.push(ilike(diemDanh.maSV, maSV.trim()));
      if (maMH) conditions.push(ilike(diemDanh.maMH, maMH.trim()));
      if (conditions.length > 0) return await query.where(and(...conditions));
      return await query;
    } catch {
      // fallback
    }
  }
  return memoryDiemDanh.filter((d) => {
    if (maSV && d.maSV?.toLowerCase() !== maSV.trim().toLowerCase()) return false;
    if (maMH && d.maMH?.toLowerCase() !== maMH.trim().toLowerCase()) return false;
    return true;
  });
}

export async function createDiemDanh(data: any) {
  const item = { ...data, id: data.id || `dd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
  if (db) {
    try {
      const res = await db.insert(diemDanh)
        .values(item)
        .onConflictDoUpdate({ target: diemDanh.id, set: item })
        .returning();
      saveToDisk();
      return res[0];
    } catch {
      // fallback
    }
  }
  const idx = memoryDiemDanh.findIndex((d) => d.id === item.id);
  if (idx !== -1) {
    memoryDiemDanh[idx] = { ...memoryDiemDanh[idx], ...item };
    saveToDisk();
    return memoryDiemDanh[idx];
  }
  memoryDiemDanh.push(item);
  saveToDisk();
  return item;
}

export async function deleteDiemDanh(id: string) {
  if (db) {
    try {
      await db.delete(diemDanh).where(eq(diemDanh.id, id));
    } catch {
      // fallback
    }
  }
  memoryDiemDanh = memoryDiemDanh.filter((d) => d.id !== id);
  saveToDisk();
  return true;
}

export async function getAllThongBaoKiemTra(maMH?: string) {
  if (db) {
    try {
      if (maMH) return await db.select().from(thongBaoKiemTra).where(ilike(thongBaoKiemTra.maMH, maMH.trim()));
      return await db.select().from(thongBaoKiemTra);
    } catch {
      // fallback
    }
  }
  if (maMH) {
    return memoryThongBaoKiemTra.filter((t) => t.maMH?.toLowerCase() === maMH.trim().toLowerCase());
  }
  return [...memoryThongBaoKiemTra];
}

export async function createThongBaoKiemTra(data: any) {
  const item = { ...data, id: data.id || `tb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` };
  if (db) {
    try {
      const res = await db.insert(thongBaoKiemTra).values(item).returning();
      saveToDisk();
      return res[0];
    } catch {
      // fallback
    }
  }
  memoryThongBaoKiemTra.push(item);
  saveToDisk();
  return item;
}

export async function deleteThongBaoKiemTra(id: string) {
  if (db) {
    try {
      await db.delete(thongBaoKiemTra).where(eq(thongBaoKiemTra.id, id));
    } catch {
      // fallback
    }
  }
  memoryThongBaoKiemTra = memoryThongBaoKiemTra.filter((t) => t.id !== id);
  saveToDisk();
  return true;
}

export async function getAllNghiLe() {
  if (db) {
    try {
      const rows = await db.select().from(nghiLe);
      return rows;
    } catch {
      // fallback
    }
  }
  return memoryNghiLe;
}

export async function createNghiLe(data: any) {
  const item = {
    id: data.id || `holiday_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dipLe: data.dipLe || '',
    tuNgay: data.tuNgay || '',
    denNgay: data.denNgay || '',
    ghiChu: data.ghiChu || '',
    lop: data.lop || 'ALL',
    hocKy: data.hocKy || 'ALL',
    namHoc: data.namHoc || 'ALL',
    createdAt: data.createdAt || new Date().toISOString(),
  };
  if (db) {
    try {
      await db.insert(nghiLe).values(item);
      saveToDisk();
      return item;
    } catch {
      // fallback
    }
  }
  memoryNghiLe = [item, ...memoryNghiLe.filter((h) => h.id !== item.id)];
  saveToDisk();
  return item;
}

export async function updateNghiLe(id: string, data: any) {
  if (db) {
    try {
      await db.update(nghiLe).set(data).where(eq(nghiLe.id, id));
      const found = await db.select().from(nghiLe).where(eq(nghiLe.id, id)).limit(1);
      saveToDisk();
      return found[0] || null;
    } catch {
      // fallback
    }
  }
  const idx = memoryNghiLe.findIndex((h) => h.id === id);
  if (idx !== -1) {
    memoryNghiLe[idx] = { ...memoryNghiLe[idx], ...data };
    saveToDisk();
    return memoryNghiLe[idx];
  }
  return null;
}

export async function deleteNghiLe(id: string) {
  if (db) {
    try {
      await db.delete(nghiLe).where(eq(nghiLe.id, id));
    } catch {
      // fallback
    }
  }
  memoryNghiLe = memoryNghiLe.filter((h) => h.id !== id);
  saveToDisk();
  return true;
}

// Automatically sync and calculate training points (Mục I: Ý thức học tập & kỷ luật chuyên cần) from attendance
export async function syncTrainingPointFromAttendance(maSV: string, lop?: string, dateStr?: string) {
  if (!maSV) return null;
  try {
    const studentRecords = await getAllDiemDanh(maSV);
    const date = dateStr ? new Date(dateStr) : new Date();
    const thang = isNaN(date.getTime()) ? new Date().getMonth() + 1 : date.getMonth() + 1;
    const nam = isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
    const namHoc = thang >= 8 ? `${nam}-${nam + 1}` : `${nam - 1}-${nam}`;
    const hocKy = (thang >= 8 || thang <= 1) ? 'HK1' : 'HK2';

    // Filter attendance records for this month
    const monthRecords = studentRecords.filter((r) => {
      if (!r.ngay) return false;
      const d = new Date(r.ngay);
      return d.getMonth() + 1 === thang && d.getFullYear() === nam;
    });

    const targetRecords = monthRecords.length > 0 ? monthRecords : studentRecords;
    let unexcusedCount = 0;
    let excusedCount = 0;
    let totalMissedPeriods = 0;

    targetRecords.forEach((r) => {
      const missed = Number(r.soTietNghi) || 0;
      totalMissedPeriods += missed;
      if (missed > 0) {
        if (r.coPhep) {
          excusedCount += 1;
        } else {
          unexcusedCount += 1;
        }
      }
    });

    // Muc 1: Ý thức học tập & kỷ luật chuyên cần (Tối đa 40 điểm)
    // Chuẩn: 40 điểm nếu không vắng. Trừ 4 điểm mỗi lần vắng không phép, trừ 1.5 điểm mỗi lần vắng có phép
    let diemMuc1 = 40 - (unexcusedCount * 4 + excusedCount * 1.5);
    diemMuc1 = Math.max(10, Math.min(40, Math.round(diemMuc1)));

    // Look for existing training point record for this student and month
    const existingList = await getAllRenLuyen(maSV, thang, nam);
    const existing = existingList && existingList.length > 0 ? existingList[0] : null;

    const diemMuc2 = existing?.diemMuc2 !== undefined ? Number(existing.diemMuc2) : 30; // Max 35
    const diemMuc3 = existing?.diemMuc3 !== undefined ? Number(existing.diemMuc3) : 20; // Max 25
    const diemRL = Math.min(100, Math.max(0, diemMuc1 + diemMuc2 + diemMuc3));

    let xepLoai = 'Xuất sắc';
    if (diemRL < 35) xepLoai = 'Kém';
    else if (diemRL < 50) xepLoai = 'Yếu';
    else if (diemRL < 65) xepLoai = 'Trung bình';
    else if (diemRL < 80) xepLoai = 'Khá';
    else if (diemRL < 90) xepLoai = 'Tốt';

    const note = totalMissedPeriods === 0
      ? 'Chuyên cần tốt, tham gia đầy đủ các buổi học theo TKB (Điểm chuyên cần: 40/40).'
      : `Điểm danh: Vắng ${totalMissedPeriods} tiết (${excusedCount} có phép, ${unexcusedCount} không phép). Điểm ý thức học tập & chuyên cần: ${diemMuc1}/40.`;

    const payload = {
      id: existing?.id || `rl-att-${maSV}-${thang}-${nam}`,
      maSV,
      lop: lop || existing?.lop || '',
      thang,
      nam,
      namHoc: existing?.namHoc || namHoc,
      hocKy: existing?.hocKy || hocKy,
      diemMuc1,
      diemMuc2,
      diemMuc3,
      diemRL,
      xepLoai,
      nhanXet: note,
      nguoiDanhGia: existing?.nguoiDanhGia || 'Hệ thống Điểm danh (Tự động)',
      ngayDanhGia: new Date().toISOString().split('T')[0],
    };

    const saved = await upsertRenLuyen(payload);
    saveToDisk();
    return saved;
  } catch (err) {
    console.warn('[SyncTrainingPoint] Error:', err);
    return null;
  }
}

export async function syncAllTrainingPointsFromAttendance() {
  const allAtt = await getAllDiemDanh();
  const studentsWithAtt = Array.from(new Set(allAtt.map((a) => String(a.maSV)))) as string[];
  const results = [];
  for (const maSV of studentsWithAtt) {
    const studentRecords = allAtt.filter((a) => a.maSV === maSV);
    const first = studentRecords[0];
    const synced = await syncTrainingPointFromAttendance(
      maSV,
      first?.lop ? String(first.lop) : undefined,
      first?.ngay ? String(first.ngay) : undefined
    );
    if (synced) results.push(synced);
  }
  saveToDisk();
  return results;
}

export async function clearAllOperationalData() {
  if (db) {
    try {
      await db.delete(diem);
      await db.delete(renLuyen);
      await db.delete(thoiKhoaBieu);
      await db.delete(thiLaiHocLai);
      await db.delete(diemDanh);
      await db.delete(thongBaoKiemTra);
      await db.delete(monHoc);
      await db.delete(sinhVien);
      await db.delete(hocKy);
      await db.delete(namHoc);
      await db.delete(lop);
      await db.delete(users).where(sql`${users.role} != 'ADMIN'`);
    } catch {
      // fallback
    }
  }
  memoryDiem = [];
  memoryRenLuyen = [];
  memoryThoiKhoaBieu = [];
  memoryThiLaiHocLai = [];
  memoryDiemDanh = [];
  memoryThongBaoKiemTra = [];
  memoryMonHoc = [];
  memorySinhVien = [];
  memoryHocKy = [];
  memoryNamHoc = [];
  memoryLop = [];
  memoryUsers = memoryUsers.filter((u) => u.role === 'ADMIN');
  saveToDisk();
  return true;
}

export async function getAllAuditLogs(limit: number = 300): Promise<any[]> {
  if (pool) {
    try {
      const res = await pool.query(`SELECT * FROM "audit_logs" ORDER BY "created_at" DESC LIMIT $1`, [limit]);
      if (res && res.rows && res.rows.length > 0) {
        return res.rows.map((row: any) => ({
          id: row.id,
          timestamp: row.timestamp,
          user: row.user,
          role: row.role,
          action: row.action,
          target: row.target,
          details: row.details,
          status: row.status,
          ip: row.ip,
          createdAt: row.created_at,
          actorUserId: row.actor_user_id,
          entityType: row.entity_type,
          entityId: row.entity_id,
          beforeJson: row.before_json,
          afterJson: row.after_json,
          reason: row.reason,
        }));
      }
    } catch (e) {
      console.warn('[DB] Could not fetch audit_logs from postgres, using memory fallback:', e);
    }
  }
  return [...memoryAuditLogs].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit);
}

export async function createAuditLog(entry: {
  id?: string;
  user?: string;
  role?: string;
  action: string;
  target: string;
  details: string;
  status?: string;
  ip?: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  beforeJson?: any;
  afterJson?: any;
  reason?: string;
}): Promise<any> {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const formattedTime = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;

  const newLog = {
    id: entry.id || `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: formattedTime,
    user: entry.user || 'system',
    role: entry.role || 'SYSTEM',
    action: entry.action || 'OPERATION',
    target: entry.target || 'Hệ thống',
    details: entry.details || '',
    status: entry.status || 'SUCCESS',
    ip: entry.ip || '127.0.0.1',
    createdAt: now.toISOString(),
    actorUserId: entry.actorUserId || null,
    entityType: entry.entityType || null,
    entityId: entry.entityId || null,
    beforeJson: entry.beforeJson ?? null,
    afterJson: entry.afterJson ?? null,
    reason: entry.reason || null,
  };

  memoryAuditLogs.unshift(newLog);
  if (memoryAuditLogs.length > 1000) {
    memoryAuditLogs = memoryAuditLogs.slice(0, 1000);
  }
  saveToDisk();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO "audit_logs" (
           "id", "timestamp", "user", "role", "action", "target", "details", "status", "ip", "created_at",
           "actor_user_id", "entity_type", "entity_id", "before_json", "after_json", "reason"
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, $16)
         ON CONFLICT ("id") DO NOTHING`,
        [
          newLog.id,
          newLog.timestamp,
          newLog.user,
          newLog.role,
          newLog.action,
          newLog.target,
          newLog.details,
          newLog.status,
          newLog.ip,
          newLog.createdAt,
          newLog.actorUserId,
          newLog.entityType,
          newLog.entityId,
          newLog.beforeJson !== null ? JSON.stringify(newLog.beforeJson) : null,
          newLog.afterJson !== null ? JSON.stringify(newLog.afterJson) : null,
          newLog.reason,
        ]
      );
    } catch (e) {
      console.warn('[DB] Error writing audit log to postgres:', e);
    }
  }

  return newLog;
}

export async function clearAuditLogs(): Promise<void> {
  memoryAuditLogs = [];
  saveToDisk();
  if (pool) {
    try {
      await pool.query(`DELETE FROM "audit_logs"`);
    } catch (e) {
      console.warn('[DB] Error clearing audit logs:', e);
    }
  }
}

// ============================================================================
// CHUẨN HÓA DỮ LIỆU & MIGRATION EXPAND-AND-CONTRACT OPERATIONS
// ============================================================================

export async function getAllIdMappings() {
  if (pool) {
    try {
      const res = await pool.query(`SELECT * FROM "id_mapping" ORDER BY "migrated_at" DESC`);
      return res.rows;
    } catch {
      // fallback
    }
  }
  return [...memoryIdMapping];
}

export async function createIdMapping(entry: {
  entityType: string;
  sourceTable: string;
  sourceId: string;
  canonicalTable: string;
  canonicalId: string;
  mappingReason: string;
  migrationStatus?: string;
  conflictDetails?: string;
}) {
  const newMapping = {
    id: `map-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    entityType: entry.entityType,
    sourceTable: entry.sourceTable,
    sourceId: entry.sourceId,
    canonicalTable: entry.canonicalTable,
    canonicalId: entry.canonicalId,
    mappingReason: entry.mappingReason,
    migrationStatus: entry.migrationStatus || 'MIGRATED',
    conflictDetails: entry.conflictDetails || null,
    migratedAt: new Date().toISOString(),
  };

  const existingIdx = memoryIdMapping.findIndex(
    (m) => m.entityType === entry.entityType && m.sourceTable === entry.sourceTable && m.sourceId === entry.sourceId
  );
  if (existingIdx !== -1) {
    memoryIdMapping[existingIdx] = { ...memoryIdMapping[existingIdx], ...newMapping };
  } else {
    memoryIdMapping.push(newMapping);
  }
  saveToDisk();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO "id_mapping" ("id", "entity_type", "source_table", "source_id", "canonical_table", "canonical_id", "mapping_reason", "migration_status", "conflict_details", "migrated_at")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT ("entity_type", "source_table", "source_id") DO UPDATE
         SET "canonical_id" = EXCLUDED."canonical_id", "migrated_at" = EXCLUDED."migrated_at"`,
        [newMapping.id, newMapping.entityType, newMapping.sourceTable, newMapping.sourceId, newMapping.canonicalTable, newMapping.canonicalId, newMapping.mappingReason, newMapping.migrationStatus, newMapping.conflictDetails, newMapping.migratedAt]
      );
    } catch (e) {
      console.warn('[DB] Error writing id_mapping to postgres:', e);
    }
  }
  return newMapping;
}

export async function getAllMigrationConflicts() {
  if (pool) {
    try {
      const res = await pool.query(`SELECT * FROM "migration_conflict_log" ORDER BY "created_at" DESC`);
      return res.rows;
    } catch {
      // fallback
    }
  }
  return [...memoryMigrationConflictLog];
}

export async function logMigrationConflict(conflict: {
  migrationBatch: string;
  tableName: string;
  recordId: string;
  columnName: string;
  conflictType: string;
  rawValue?: string;
  expectedReference?: string;
  notes?: string;
}) {
  const newLog = {
    id: `conf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    migrationBatch: conflict.migrationBatch,
    tableName: conflict.tableName,
    recordId: conflict.recordId,
    columnName: conflict.columnName,
    conflictType: conflict.conflictType,
    rawValue: conflict.rawValue || '',
    expectedReference: conflict.expectedReference || '',
    notes: conflict.notes || '',
    createdAt: new Date().toISOString(),
  };

  memoryMigrationConflictLog.push(newLog);
  saveToDisk();

  if (pool) {
    try {
      await pool.query(
        `INSERT INTO "migration_conflict_log" ("id", "migration_batch", "table_name", "record_id", "column_name", "conflict_type", "raw_value", "expected_reference", "notes", "created_at")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [newLog.id, newLog.migrationBatch, newLog.tableName, newLog.recordId, newLog.columnName, newLog.conflictType, newLog.rawValue, newLog.expectedReference, newLog.notes, newLog.createdAt]
      );
    } catch (e) {
      console.warn('[DB] Error writing conflict log to postgres:', e);
    }
  }
  return newLog;
}

export async function executeDataBackfill(batchTag: string = 'BATCH_20261108_APPLET') {
  let mappedStudents = 0;
  let unmappedStudents = 0;
  let mappedGrades = 0;
  let unmappedGrades = 0;
  let mappedRenLuyen = 0;

  // 1. Backfill sinh_vien -> lop_id
  for (const sv of memorySinhVien) {
    const matchedLop = memoryLop.find((l) => l.tenLop === sv.lop || l.lopID === sv.lop);
    if (matchedLop) {
      sv.lopId = matchedLop.lopID;
      await createIdMapping({
        entityType: 'CLASS_REFERENCE',
        sourceTable: 'sinh_vien',
        sourceId: `${sv.maSV}::${sv.lop}`,
        canonicalTable: 'lop',
        canonicalId: matchedLop.lopID,
        mappingReason: 'Tự động ánh xạ tên chuỗi lớp sang canonical lop_id',
      });
      mappedStudents++;
    } else {
      unmappedStudents++;
      await logMigrationConflict({
        migrationBatch: batchTag,
        tableName: 'sinh_vien',
        recordId: sv.maSV,
        columnName: 'lop',
        conflictType: 'UNRESOLVED_FOREIGN_KEY',
        rawValue: sv.lop,
        expectedReference: 'lop.lop_id',
        notes: `Lớp "${sv.lop}" của sinh viên ${sv.hoTen} (${sv.maSV}) chưa có bản ghi trong bảng danh mục lop`,
      });
    }
  }

  // 2. Backfill diem -> hocKyId, namHocId, numeric scores
  for (const d of memoryDiem) {
    const matchedYear = memoryNamHoc.find((y) => y.tenNamHoc === d.namHoc || y.namHocID === d.namHoc);
    const matchedSem = memoryHocKy.find((s) => s.tenHocKy === d.hocKy || s.hocKyID === d.hocKy);

    if (matchedYear) d.namHocId = matchedYear.namHocID;
    if (matchedSem) d.hocKyId = matchedSem.hocKyID;

    d.diemChuyenCanNum = Number(Number(d.diemChuyenCan || 0).toFixed(2));
    d.diemGiuaKyNum = Number(Number(d.diemGiuaKy || 0).toFixed(2));
    d.diemCuoiKyNum = Number(Number(d.diemCuoiKy || 0).toFixed(2));
    d.diemTongKet10Num = Number(Number(d.diemTongKet10 || 0).toFixed(2));
    d.diemThang4Num = Number(Number(d.diemThang4 || 0).toFixed(2));

    if (matchedYear && matchedSem) {
      mappedGrades++;
    } else {
      unmappedGrades++;
      await logMigrationConflict({
        migrationBatch: batchTag,
        tableName: 'diem',
        recordId: d.id,
        columnName: 'hoc_ky_nam_hoc',
        conflictType: 'UNRESOLVED_FOREIGN_KEY',
        rawValue: `${d.namHoc} / ${d.hocKy}`,
        expectedReference: 'nam_hoc.nam_hoc_id / hoc_ky.hoc_ky_id',
        notes: `Bản ghi điểm môn ${d.maMH} của SV ${d.maSV} chứa chuỗi năm/kỳ chưa đăng ký trong danh mục`,
      });
    }
  }

  // 3. Sáp nhập ren_luyen cũ sang id_mapping
  for (const rl of memoryRenLuyen) {
    const canonicalAccId = `acc-${rl.maSV}-${rl.thang}-${rl.nam}`;
    await createIdMapping({
      entityType: 'TRAINING_SCORE',
      sourceTable: 'ren_luyen',
      sourceId: rl.id,
      canonicalTable: 'monthly_score_accounts',
      canonicalId: canonicalAccId,
      mappingReason: 'Sáp nhập bản ghi điểm rèn luyện cũ sang tài khoản điểm tháng chuẩn',
    });
    mappedRenLuyen++;
  }

  saveToDisk();

  return {
    success: true,
    batchTag,
    students: { total: memorySinhVien.length, mapped: mappedStudents, unmapped: unmappedStudents },
    grades: { total: memoryDiem.length, mapped: mappedGrades, unmapped: unmappedGrades },
    renLuyen: { total: memoryRenLuyen.length, mapped: mappedRenLuyen },
    conflictsLogged: memoryMigrationConflictLog.length,
    idMappingsCount: memoryIdMapping.length,
  };
}

export function getSystemConfig(): Record<string, any> {
  return { ...memorySystemConfig };
}

export function updateSystemConfig(partial: Record<string, any>): Record<string, any> {
  memorySystemConfig = { ...memorySystemConfig, ...partial };
  saveToDisk();
  return { ...memorySystemConfig };
}


