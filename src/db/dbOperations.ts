import * as dbModule from './index.ts';

// Support the database export name used by the current database module while
// keeping this operations layer compatible with older builds.
const db = (dbModule as any).db ?? (dbModule as any).database;
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
} from './schema.ts';
import { eq, and, sql, ilike, or } from 'drizzle-orm';
import { INITIAL_USERS } from '../data/initialData.ts';

// In-memory fallback repositories
let memoryUsers: any[] = [...INITIAL_USERS];
let memorySinhVien: any[] = [];
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

        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "permissions" jsonb;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" text;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "student_code" text;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "faculty" text;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'ACTIVE';
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" text;

        ALTER TABLE "sinh_vien" ADD COLUMN IF NOT EXISTS "ho_so_file" text;
        ALTER TABLE "sinh_vien" ADD COLUMN IF NOT EXISTS "ho_so_file_name" text;
        ALTER TABLE "sinh_vien" ADD COLUMN IF NOT EXISTS "ho_so_files" jsonb;

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
      console.log('Seeding initial system users to PostgreSQL...');
      for (const u of INITIAL_USERS) {
        await db.insert(users).values({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          role: u.role,
          email: u.email,
          password: u.password || '123456',
          avatar: u.avatar,
          faculty: u.faculty,
          status: u.status || 'ACTIVE',
          permissions: u.permissions || {},
          createdAt: u.createdAt || new Date().toISOString().split('T')[0],
        }).onConflictDoNothing();
      }
      console.log('Initial users seeded successfully.');
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
    return memoryRenLuyen[idx];
  }
  memoryRenLuyen.push(record);
  return record;
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
      return res[0];
    } catch {
      // fallback
    }
  }
  const idx = memoryDiemDanh.findIndex((d) => d.id === item.id);
  if (idx !== -1) {
    memoryDiemDanh[idx] = { ...memoryDiemDanh[idx], ...item };
    return memoryDiemDanh[idx];
  }
  memoryDiemDanh.push(item);
  return item;
}

export async function deleteDiemDanh(id: string) {
  if (db) {
    try {
      await db.delete(diemDanh).where(eq(diemDanh.id, id));
      return true;
    } catch {
      // fallback
    }
  }
  memoryDiemDanh = memoryDiemDanh.filter((d) => d.id !== id);
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
      return res[0];
    } catch {
      // fallback
    }
  }
  memoryThongBaoKiemTra.push(item);
  return item;
}

export async function deleteThongBaoKiemTra(id: string) {
  if (db) {
    try {
      await db.delete(thongBaoKiemTra).where(eq(thongBaoKiemTra.id, id));
      return true;
    } catch {
      // fallback
    }
  }
  memoryThongBaoKiemTra = memoryThongBaoKiemTra.filter((t) => t.id !== id);
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
      return item;
    } catch {
      // fallback
    }
  }
  memoryNghiLe = [item, ...memoryNghiLe.filter((h) => h.id !== item.id)];
  return item;
}

export async function updateNghiLe(id: string, data: any) {
  if (db) {
    try {
      await db.update(nghiLe).set(data).where(eq(nghiLe.id, id));
      const found = await db.select().from(nghiLe).where(eq(nghiLe.id, id)).limit(1);
      return found[0] || null;
    } catch {
      // fallback
    }
  }
  const idx = memoryNghiLe.findIndex((h) => h.id === id);
  if (idx !== -1) {
    memoryNghiLe[idx] = { ...memoryNghiLe[idx], ...data };
    return memoryNghiLe[idx];
  }
  return null;
}

export async function deleteNghiLe(id: string) {
  if (db) {
    try {
      await db.delete(nghiLe).where(eq(nghiLe.id, id));
      return true;
    } catch {
      // fallback
    }
  }
  memoryNghiLe = memoryNghiLe.filter((h) => h.id !== id);
  return true;
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
  return true;
}
