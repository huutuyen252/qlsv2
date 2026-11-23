import fs from 'fs';
import path from 'path';
import * as dbModule from './index';
import {
  AdministrativeUnit,
  AdministrativeUnitHistory,
  AddressType,
  DataQualityIssue,
  EthnicityCatalog,
  FamilyMemberContact,
  FlatStudentFilterInput,
  InlineAddressEntryInput,
  InlineAddressesPayload,
  InlineFamilyPayload,
  InlineOrganizationsPayload,
  OrganizationCatalog,
  RelationshipTypeCatalog,
  ReligionCatalog,
  SortDirection,
  StudentAddress,
  StudentBuilderRow,
  StudentDemographics,
  StudentFamilyMember,
  StudentFamilyProfile,
  StudentListSortBy,
  StudentOrganizationMembership,
  UnifiedProfileUpdatePayload,
  User,
} from '../types';
import {
  getAllAuditLogs,
  getAllMigrationConflicts,
  getAllSinhVien,
  getAllUsers,
  getSinhVienByMaSV,
  updateSinhVien,
  updateUser,
} from './dbOperations';

const pool = (dbModule as any).pool;
const EXPANSION_STORE_PATH = path.join(process.cwd(), '.profile_expansion_storage.json');

interface ExpansionStoreData {
  administrativeUnits: AdministrativeUnit[];
  administrativeUnitHistory: AdministrativeUnitHistory[];
  studentAddresses: StudentAddress[];
  ethnicities: EthnicityCatalog[];
  religions: ReligionCatalog[];
  studentDemographics: StudentDemographics[];
  relationshipTypes: RelationshipTypeCatalog[];
  studentFamilyProfiles: StudentFamilyProfile[];
  studentFamilyMembers: StudentFamilyMember[];
  familyMemberContacts: FamilyMemberContact[];
  organizations: OrganizationCatalog[];
  studentOrganizationMemberships: StudentOrganizationMembership[];
}

const emptyStore = (): ExpansionStoreData => ({
  administrativeUnits: [],
  administrativeUnitHistory: [],
  studentAddresses: [],
  ethnicities: [],
  religions: [],
  studentDemographics: [],
  relationshipTypes: [],
  studentFamilyProfiles: [],
  studentFamilyMembers: [],
  familyMemberContacts: [],
  organizations: [],
  studentOrganizationMemberships: [],
});

let memoryStore: ExpansionStoreData = emptyStore();

function loadExpansionFromDisk() {
  try {
    if (fs.existsSync(EXPANSION_STORE_PATH)) {
      const raw = fs.readFileSync(EXPANSION_STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryStore = {
        ...emptyStore(),
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('[ProfileExpansion] Không thể đọc file store:', err);
  }
}

function saveExpansionToDisk() {
  try {
    fs.writeFileSync(EXPANSION_STORE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[ProfileExpansion] Không thể ghi file store:', err);
  }
}

loadExpansionFromDisk();

const SYSTEM_RELATIONSHIP_TYPES: Record<'FATHER' | 'MOTHER' | 'GUARDIAN', RelationshipTypeCatalog> = {
  FATHER: {
    id: 'sys-rel-father',
    code: 'FATHER',
    labelVi: 'Bố',
    isParental: true,
    isActive: true,
    sortOrder: 1,
  },
  MOTHER: {
    id: 'sys-rel-mother',
    code: 'MOTHER',
    labelVi: 'Mẹ',
    isParental: true,
    isActive: true,
    sortOrder: 2,
  },
  GUARDIAN: {
    id: 'sys-rel-guardian',
    code: 'GUARDIAN',
    labelVi: 'Người giám hộ',
    isParental: false,
    isActive: true,
    sortOrder: 3,
  },
};

const SYSTEM_ORGANIZATIONS: Record<'DOAN_TNCS' | 'DANG_CSVN', OrganizationCatalog> = {
  DOAN_TNCS: {
    id: 'sys-org-doan',
    code: 'DOAN_TNCS',
    name: 'Đoàn TNCS Hồ Chí Minh',
    isActive: true,
  },
  DANG_CSVN: {
    id: 'sys-org-dang',
    code: 'DANG_CSVN',
    name: 'Đảng Cộng sản Việt Nam',
    isActive: true,
  },
};

export async function ensureProfileExpansionSchema(): Promise<void> {
  if (!pool) return;
  const migrationFiles = [
    '06_profile_expansion.sql',
    '11_profile_inline_indexes.sql',
    '12_student_list_sort_indexes.sql',
  ];
  const client = await pool.connect();
  try {
    for (const fileName of migrationFiles) {
      const migrationPath = path.join(process.cwd(), 'scripts', 'migration', fileName);
      if (!fs.existsSync(migrationPath)) continue;
      const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
      await client.query(sqlContent);
    }

    // Ensure fixed structural enum rows exist so FK constraints remain valid without admin catalog setup
    for (const rt of Object.values(SYSTEM_RELATIONSHIP_TYPES)) {
      await client.query(
        `INSERT INTO relationship_types (id, code, label_vi, is_parental, is_active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT DO NOTHING`,
        [rt.id, rt.code, rt.labelVi, rt.isParental, rt.isActive, rt.sortOrder]
      );
    }
    for (const org of Object.values(SYSTEM_ORGANIZATIONS)) {
      await client.query(
        `INSERT INTO organizations (id, code, name, is_active)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [org.id, org.code, org.name, org.isActive]
      );
    }
  } finally {
    client.release();
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ==================== HELPER MAPPERS (PG <-> TS) ====================

function mapAdminUnitRow(r: any): AdministrativeUnit {
  return {
    id: r.id,
    officialCode: r.official_code ?? r.officialCode,
    unitLevel: r.unit_level ?? r.unitLevel,
    name: r.name,
    shortName: r.short_name ?? r.shortName ?? undefined,
    unitType: r.unit_type ?? r.unitType,
    parentId: r.parent_id ?? r.parentId ?? null,
    effectiveFrom: r.effective_from ?? r.effectiveFrom,
    effectiveTo: r.effective_to ?? r.effectiveTo ?? null,
    status: r.status ?? 'ACTIVE',
    successorUnitId: r.successor_unit_id ?? r.successorUnitId ?? null,
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
  };
}

function mapAdminHistoryRow(r: any): AdministrativeUnitHistory {
  return {
    id: r.id,
    sourceUnitId: r.source_unit_id ?? r.sourceUnitId,
    targetUnitId: r.target_unit_id ?? r.targetUnitId ?? null,
    changeType: r.change_type ?? r.changeType,
    resolutionNo: r.resolution_no ?? r.resolutionNo ?? undefined,
    effectiveDate: r.effective_date ?? r.effectiveDate,
    notes: r.notes ?? undefined,
    createdBy: r.created_by ?? r.createdBy ?? undefined,
    createdAt: r.created_at ?? r.createdAt,
  };
}

function mapAddressRow(r: any): StudentAddress {
  return {
    id: r.id,
    maSV: r.ma_sv ?? r.maSV,
    addressType: r.address_type ?? r.addressType,
    provinceUnitId: r.province_unit_id ?? r.provinceUnitId,
    communeUnitId: r.commune_unit_id ?? r.communeUnitId,
    addressDetail: r.address_detail ?? r.addressDetail ?? '',
    isPrimary: Boolean(r.is_primary ?? r.isPrimary),
    validFrom: r.valid_from ?? r.validFrom,
    validTo: r.valid_to ?? r.validTo ?? null,
    verificationStatus: r.verification_status ?? r.verificationStatus ?? 'UNVERIFIED',
    verifiedBy: r.verified_by ?? r.verifiedBy ?? null,
    verifiedAt: r.verified_at ?? r.verifiedAt ?? null,
    source: r.source ?? 'STAFF_ENTRY',
    createdBy: r.created_by ?? r.createdBy,
    updatedBy: r.updated_by ?? r.updatedBy,
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
  };
}

// ==================== 1. CATALOG QUERIES ====================

export async function getAllAdministrativeUnits(filter?: {
  unitLevel?: 'PROVINCE' | 'COMMUNE';
  parentId?: string;
  status?: string;
}): Promise<AdministrativeUnit[]> {
  let items: AdministrativeUnit[];
  if (pool) {
    const res = await pool.query('SELECT * FROM administrative_units ORDER BY unit_level ASC, name ASC');
    items = res.rows.map(mapAdminUnitRow);
  } else {
    items = [...memoryStore.administrativeUnits];
  }
  return items.filter((u) => {
    if (filter?.unitLevel && u.unitLevel !== filter.unitLevel) return false;
    if (filter?.parentId && u.parentId !== filter.parentId) return false;
    if (filter?.status && u.status !== filter.status) return false;
    return true;
  });
}

export async function getCommunesByProvince(
  provinceUnitId: string,
  status: string = 'ACTIVE'
): Promise<AdministrativeUnit[]> {
  const cleanProvId = (provinceUnitId || '').trim();
  if (!cleanProvId) {
    throw new Error('Vui lòng chọn Tỉnh/Thành phố (provinceUnitId).');
  }
  const allUnits = await getAllAdministrativeUnits();
  const province = allUnits.find((u) => u.id === cleanProvId && u.unitLevel === 'PROVINCE');
  if (!province) {
    throw new Error('Tỉnh/Thành phố không tồn tại trong danh mục hành chính.');
  }
  const upperStatus = (status || 'ACTIVE').trim().toUpperCase();
  return allUnits
    .filter(
      (u) =>
        u.unitLevel === 'COMMUNE' &&
        u.parentId === province.id &&
        (upperStatus === 'ALL' || u.status === upperStatus)
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export async function getAllAdministrativeUnitHistory(): Promise<AdministrativeUnitHistory[]> {
  if (pool) {
    const res = await pool.query('SELECT * FROM administrative_unit_history ORDER BY effective_date DESC, created_at DESC');
    return res.rows.map(mapAdminHistoryRow);
  }
  return [...memoryStore.administrativeUnitHistory].sort((a, b) =>
    (b.effectiveDate || '').localeCompare(a.effectiveDate || '')
  );
}

export async function upsertAdministrativeUnit(input: Partial<AdministrativeUnit> & {
  officialCode: string;
  unitLevel: 'PROVINCE' | 'COMMUNE';
  name: string;
  unitType: string;
}): Promise<AdministrativeUnit> {
  if (input.unitLevel !== 'PROVINCE' && input.unitLevel !== 'COMMUNE') {
    throw new Error('Mô hình hai cấp chỉ chấp nhận PROVINCE hoặc COMMUNE (không có cấp huyện).');
  }
  if (!input.officialCode?.trim() || !input.name?.trim() || !input.unitType?.trim()) {
    throw new Error('Mã hành chính (officialCode), tên đơn vị và loại đơn vị là bắt buộc.');
  }

  const allUnits = await getAllAdministrativeUnits();
  if (input.unitLevel === 'PROVINCE' && input.parentId) {
    throw new Error('Đơn vị cấp Tỉnh/Thành phố trực thuộc TW không được có parentId.');
  }
  if (input.unitLevel === 'COMMUNE') {
    if (!input.parentId) {
      throw new Error('Đơn vị cấp Xã/Phường/Đặc khu bắt buộc phải chọn Tỉnh/Thành phố trực thuộc (parentId).');
    }
    const parent = allUnits.find((u) => u.id === input.parentId);
    if (!parent || parent.unitLevel !== 'PROVINCE') {
      throw new Error('Tỉnh/Thành phố cha (parentId) không tồn tại hoặc không phải cấp PROVINCE.');
    }
  }
  if (input.successorUnitId) {
    const succ = allUnits.find((u) => u.id === input.successorUnitId);
    if (!succ) {
      throw new Error('Đơn vị kế nhiệm (successorUnitId) không tồn tại.');
    }
  }

  const now = nowIso();
  const existing = input.id ? allUnits.find((u) => u.id === input.id) : undefined;
  const record: AdministrativeUnit = {
    id: existing?.id || input.id || makeId(input.unitLevel === 'PROVINCE' ? 'prov' : 'comm'),
    officialCode: input.officialCode.trim(),
    unitLevel: input.unitLevel,
    name: input.name.trim(),
    shortName: input.shortName?.trim() || undefined,
    unitType: input.unitType.trim(),
    parentId: input.unitLevel === 'COMMUNE' ? input.parentId || null : null,
    effectiveFrom: input.effectiveFrom || now.split('T')[0],
    effectiveTo: input.effectiveTo || null,
    status: input.status || 'ACTIVE',
    successorUnitId: input.successorUnitId || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (pool) {
    await pool.query(
      `INSERT INTO administrative_units (
        id, official_code, unit_level, name, short_name, unit_type, parent_id,
        effective_from, effective_to, status, successor_unit_id, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO UPDATE SET
        official_code = EXCLUDED.official_code,
        unit_level = EXCLUDED.unit_level,
        name = EXCLUDED.name,
        short_name = EXCLUDED.short_name,
        unit_type = EXCLUDED.unit_type,
        parent_id = EXCLUDED.parent_id,
        effective_from = EXCLUDED.effective_from,
        effective_to = EXCLUDED.effective_to,
        status = EXCLUDED.status,
        successor_unit_id = EXCLUDED.successor_unit_id,
        updated_at = EXCLUDED.updated_at`,
      [
        record.id,
        record.officialCode,
        record.unitLevel,
        record.name,
        record.shortName || null,
        record.unitType,
        record.parentId,
        record.effectiveFrom,
        record.effectiveTo,
        record.status,
        record.successorUnitId,
        record.createdAt,
        record.updatedAt,
      ]
    );
  } else {
    const idx = memoryStore.administrativeUnits.findIndex((u) => u.id === record.id);
    if (idx >= 0) memoryStore.administrativeUnits[idx] = record;
    else memoryStore.administrativeUnits.push(record);
    saveExpansionToDisk();
  }
  return record;
}

export async function bulkImportAdministrativeUnits(rows: Array<{
  id?: string;
  officialCode: string;
  unitLevel: 'PROVINCE' | 'COMMUNE';
  name: string;
  shortName?: string;
  unitType: string;
  parentOfficialCode?: string;
  parentId?: string;
  effectiveFrom?: string;
  status?: 'ACTIVE' | 'MERGED' | 'INACTIVE';
}>): Promise<{ imported: number; errors: Array<{ row: number; message: string }> }> {
  const errors: Array<{ row: number; message: string }> = [];
  let imported = 0;

  // Import provinces first, then communes so parent lookups succeed without inventing parents
  const indexed = rows.map((r, idx) => ({ r, rowNum: idx + 1 }));
  const ordered = [
    ...indexed.filter((x) => x.r.unitLevel === 'PROVINCE'),
    ...indexed.filter((x) => x.r.unitLevel !== 'PROVINCE'),
  ];

  for (const { r, rowNum } of ordered) {
    try {
      let resolvedParentId = r.parentId;
      if (r.unitLevel === 'COMMUNE' && !resolvedParentId && r.parentOfficialCode) {
        const allProvs = await getAllAdministrativeUnits({ unitLevel: 'PROVINCE' });
        const matched = allProvs.find(
          (p) => p.officialCode.toLowerCase() === r.parentOfficialCode!.trim().toLowerCase()
        );
        if (!matched) {
          throw new Error(
            `Không tìm thấy Tỉnh/TP cha với mã chính thức "${r.parentOfficialCode}". Hệ thống không tự tạo đơn vị cha.`
          );
        }
        resolvedParentId = matched.id;
      }
      const existingAll = await getAllAdministrativeUnits();
      const existingByCode = existingAll.find(
        (u) =>
          u.officialCode.toLowerCase() === r.officialCode.trim().toLowerCase() &&
          u.unitLevel === r.unitLevel
      );
      await upsertAdministrativeUnit({
        id: r.id || existingByCode?.id,
        officialCode: r.officialCode,
        unitLevel: r.unitLevel,
        name: r.name,
        shortName: r.shortName,
        unitType: r.unitType,
        parentId: resolvedParentId,
        effectiveFrom: r.effectiveFrom || new Date().toISOString().split('T')[0],
        status: r.status || 'ACTIVE',
      });
      imported++;
    } catch (err: any) {
      errors.push({ row: rowNum, message: err?.message || 'Dữ liệu không hợp lệ' });
    }
  }

  return { imported, errors };
}

export async function mergeAdministrativeUnit(params: {
  sourceUnitId: string;
  targetUnitId: string;
  resolutionNo?: string;
  effectiveDate: string;
  notes?: string;
  actorUsername: string;
}): Promise<{ source: AdministrativeUnit; history: AdministrativeUnitHistory }> {
  const units = await getAllAdministrativeUnits();
  const source = units.find((u) => u.id === params.sourceUnitId);
  const target = units.find((u) => u.id === params.targetUnitId);
  if (!source) throw new Error('Không tìm thấy đơn vị hành chính nguồn.');
  if (!target) throw new Error('Không tìm thấy đơn vị hành chính kế nhiệm.');
  if (source.id === target.id) throw new Error('Đơn vị nguồn và đơn vị kế nhiệm không được trùng nhau.');
  if (source.unitLevel !== target.unitLevel) {
    throw new Error('Đơn vị nguồn và đơn vị kế nhiệm phải cùng cấp (PROVINCE hoặc COMMUNE).');
  }

  const updatedSource = await upsertAdministrativeUnit({
    ...source,
    status: 'MERGED',
    effectiveTo: params.effectiveDate,
    successorUnitId: target.id,
  });

  const hist: AdministrativeUnitHistory = {
    id: makeId('auh'),
    sourceUnitId: source.id,
    targetUnitId: target.id,
    changeType: 'MERGED',
    resolutionNo: params.resolutionNo?.trim() || undefined,
    effectiveDate: params.effectiveDate,
    notes: params.notes?.trim() || undefined,
    createdBy: params.actorUsername,
    createdAt: nowIso(),
  };

  if (pool) {
    await pool.query(
      `INSERT INTO administrative_unit_history (
        id, source_unit_id, target_unit_id, change_type, resolution_no, effective_date, notes, created_by, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        hist.id,
        hist.sourceUnitId,
        hist.targetUnitId,
        hist.changeType,
        hist.resolutionNo || null,
        hist.effectiveDate,
        hist.notes || null,
        hist.createdBy || null,
        hist.createdAt,
      ]
    );
  } else {
    memoryStore.administrativeUnitHistory.push(hist);
    saveExpansionToDisk();
  }

  return { source: updatedSource, history: hist };
}

export async function deleteAdministrativeUnit(id: string): Promise<void> {
  const allUnits = await getAllAdministrativeUnits();
  const target = allUnits.find((u) => u.id === id);
  if (!target) throw new Error('Không tìm thấy đơn vị hành chính.');

  const hasChildren = allUnits.some((u) => u.parentId === id || u.successorUnitId === id);
  if (hasChildren) {
    throw new Error('Không thể xóa đơn vị hành chính đang có đơn vị trực thuộc hoặc đơn vị kế nhiệm.');
  }

  const addresses = await getAllStudentAddresses();
  const members = await getAllFamilyMembersRaw();
  const isReferenced =
    addresses.some((a) => a.provinceUnitId === id || a.communeUnitId === id) ||
    members.some((m) => m.provinceUnitId === id || m.communeUnitId === id);
  if (isReferenced) {
    throw new Error(
      'Không thể xóa đơn vị hành chính đã được hồ sơ sinh viên hoặc gia đình sử dụng. Hãy dùng chức năng Sáp nhập hoặc Ngừng hiệu lực.'
    );
  }

  if (pool) {
    await pool.query('DELETE FROM administrative_units WHERE id = $1', [id]);
  } else {
    memoryStore.administrativeUnits = memoryStore.administrativeUnits.filter((u) => u.id !== id);
    saveExpansionToDisk();
  }
}

// Ethnicities & Religions & Relationship Types & Organizations

export async function getAllEthnicities(): Promise<EthnicityCatalog[]> {
  if (pool) {
    const res = await pool.query('SELECT * FROM ethnicities ORDER BY sort_order ASC, name ASC');
    return res.rows.map((r: any) => ({
      id: r.id,
      officialCode: r.official_code,
      name: r.name,
      isActive: Boolean(r.is_active),
      sortOrder: Number(r.sort_order ?? 0),
    }));
  }
  return [...memoryStore.ethnicities].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'));
}

export async function upsertEthnicity(input: Partial<EthnicityCatalog> & { officialCode: string; name: string }): Promise<EthnicityCatalog> {
  if (!input.officialCode?.trim() || !input.name?.trim()) {
    throw new Error('Mã chính thức và tên dân tộc là bắt buộc.');
  }
  const existing = await getAllEthnicities();
  const matched = input.id
    ? existing.find((e) => e.id === input.id)
    : existing.find((e) => e.officialCode.toLowerCase() === input.officialCode.trim().toLowerCase());
  const record: EthnicityCatalog = {
    id: matched?.id || input.id || makeId('eth'),
    officialCode: input.officialCode.trim(),
    name: input.name.trim(),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    sortOrder: Number(input.sortOrder ?? matched?.sortOrder ?? existing.length + 1),
  };

  if (pool) {
    await pool.query(
      `INSERT INTO ethnicities (id, official_code, name, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET
         official_code = EXCLUDED.official_code,
         name = EXCLUDED.name,
         is_active = EXCLUDED.is_active,
         sort_order = EXCLUDED.sort_order`,
      [record.id, record.officialCode, record.name, record.isActive, record.sortOrder]
    );
  } else {
    const idx = memoryStore.ethnicities.findIndex((e) => e.id === record.id);
    if (idx >= 0) memoryStore.ethnicities[idx] = record;
    else memoryStore.ethnicities.push(record);
    saveExpansionToDisk();
  }
  return record;
}

export async function deleteEthnicity(id: string): Promise<void> {
  const demos = await getAllDemographicsRaw();
  if (demos.some((d) => d.ethnicityId === id)) {
    throw new Error('Không thể xóa dân tộc đã được hồ sơ sinh viên sử dụng.');
  }
  if (pool) {
    await pool.query('DELETE FROM ethnicities WHERE id = $1', [id]);
  } else {
    memoryStore.ethnicities = memoryStore.ethnicities.filter((e) => e.id !== id);
    saveExpansionToDisk();
  }
}

export async function getAllReligions(): Promise<ReligionCatalog[]> {
  if (pool) {
    const res = await pool.query('SELECT * FROM religions ORDER BY sort_order ASC, name ASC');
    return res.rows.map((r: any) => ({
      id: r.id,
      officialCode: r.official_code,
      name: r.name,
      isActive: Boolean(r.is_active),
      sortOrder: Number(r.sort_order ?? 0),
    }));
  }
  return [...memoryStore.religions].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi'));
}

export async function upsertReligion(input: Partial<ReligionCatalog> & { officialCode: string; name: string }): Promise<ReligionCatalog> {
  if (!input.officialCode?.trim() || !input.name?.trim()) {
    throw new Error('Mã chính thức và tên tôn giáo là bắt buộc.');
  }
  const existing = await getAllReligions();
  const matched = input.id
    ? existing.find((e) => e.id === input.id)
    : existing.find((e) => e.officialCode.toLowerCase() === input.officialCode.trim().toLowerCase());
  const record: ReligionCatalog = {
    id: matched?.id || input.id || makeId('rel'),
    officialCode: input.officialCode.trim(),
    name: input.name.trim(),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    sortOrder: Number(input.sortOrder ?? matched?.sortOrder ?? existing.length + 1),
  };

  if (pool) {
    await pool.query(
      `INSERT INTO religions (id, official_code, name, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET
         official_code = EXCLUDED.official_code,
         name = EXCLUDED.name,
         is_active = EXCLUDED.is_active,
         sort_order = EXCLUDED.sort_order`,
      [record.id, record.officialCode, record.name, record.isActive, record.sortOrder]
    );
  } else {
    const idx = memoryStore.religions.findIndex((e) => e.id === record.id);
    if (idx >= 0) memoryStore.religions[idx] = record;
    else memoryStore.religions.push(record);
    saveExpansionToDisk();
  }
  return record;
}

export async function deleteReligion(id: string): Promise<void> {
  const demos = await getAllDemographicsRaw();
  if (demos.some((d) => d.religionId === id)) {
    throw new Error('Không thể xóa tôn giáo đã được hồ sơ sinh viên sử dụng.');
  }
  if (pool) {
    await pool.query('DELETE FROM religions WHERE id = $1', [id]);
  } else {
    memoryStore.religions = memoryStore.religions.filter((e) => e.id !== id);
    saveExpansionToDisk();
  }
}

export async function getAllRelationshipTypes(): Promise<RelationshipTypeCatalog[]> {
  if (pool) {
    const res = await pool.query('SELECT * FROM relationship_types ORDER BY sort_order ASC, label_vi ASC');
    return res.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      labelVi: r.label_vi,
      isParental: Boolean(r.is_parental),
      isActive: Boolean(r.is_active),
      sortOrder: Number(r.sort_order ?? 0),
    }));
  }
  return [...memoryStore.relationshipTypes].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function upsertRelationshipType(
  input: Partial<RelationshipTypeCatalog> & { code: string; labelVi: string }
): Promise<RelationshipTypeCatalog> {
  if (!input.code?.trim() || !input.labelVi?.trim()) {
    throw new Error('Mã quan hệ và nhãn tiếng Việt là bắt buộc.');
  }
  const existing = await getAllRelationshipTypes();
  const matched = input.id
    ? existing.find((e) => e.id === input.id)
    : existing.find((e) => e.code.toUpperCase() === input.code.trim().toUpperCase());
  const record: RelationshipTypeCatalog = {
    id: matched?.id || input.id || makeId('reltype'),
    code: input.code.trim().toUpperCase(),
    labelVi: input.labelVi.trim(),
    isParental: Boolean(input.isParental),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
    sortOrder: Number(input.sortOrder ?? matched?.sortOrder ?? existing.length + 1),
  };

  if (pool) {
    await pool.query(
      `INSERT INTO relationship_types (id, code, label_vi, is_parental, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         label_vi = EXCLUDED.label_vi,
         is_parental = EXCLUDED.is_parental,
         is_active = EXCLUDED.is_active,
         sort_order = EXCLUDED.sort_order`,
      [record.id, record.code, record.labelVi, record.isParental, record.isActive, record.sortOrder]
    );
  } else {
    const idx = memoryStore.relationshipTypes.findIndex((e) => e.id === record.id);
    if (idx >= 0) memoryStore.relationshipTypes[idx] = record;
    else memoryStore.relationshipTypes.push(record);
    saveExpansionToDisk();
  }
  return record;
}

export async function deleteRelationshipType(id: string): Promise<void> {
  const members = await getAllFamilyMembersRaw();
  if (members.some((m) => m.relationshipTypeId === id)) {
    throw new Error('Không thể xóa loại quan hệ đang được thành viên gia đình sử dụng.');
  }
  if (pool) {
    await pool.query('DELETE FROM relationship_types WHERE id = $1', [id]);
  } else {
    memoryStore.relationshipTypes = memoryStore.relationshipTypes.filter((e) => e.id !== id);
    saveExpansionToDisk();
  }
}

export async function getAllOrganizations(): Promise<OrganizationCatalog[]> {
  if (pool) {
    const res = await pool.query('SELECT * FROM organizations ORDER BY name ASC');
    return res.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      isActive: Boolean(r.is_active),
    }));
  }
  return [...memoryStore.organizations].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

export async function upsertOrganization(
  input: Partial<OrganizationCatalog> & { code: string; name: string }
): Promise<OrganizationCatalog> {
  if (!input.code?.trim() || !input.name?.trim()) {
    throw new Error('Mã tổ chức và tên tổ chức là bắt buộc.');
  }
  const existing = await getAllOrganizations();
  const matched = input.id
    ? existing.find((e) => e.id === input.id)
    : existing.find((e) => e.code.toUpperCase() === input.code.trim().toUpperCase());
  const record: OrganizationCatalog = {
    id: matched?.id || input.id || makeId('org'),
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
  };

  if (pool) {
    await pool.query(
      `INSERT INTO organizations (id, code, name, is_active)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         name = EXCLUDED.name,
         is_active = EXCLUDED.is_active`,
      [record.id, record.code, record.name, record.isActive]
    );
  } else {
    const idx = memoryStore.organizations.findIndex((e) => e.id === record.id);
    if (idx >= 0) memoryStore.organizations[idx] = record;
    else memoryStore.organizations.push(record);
    saveExpansionToDisk();
  }
  return record;
}

export async function deleteOrganization(id: string): Promise<void> {
  const memberships = await getAllOrganizationMembershipsRaw();
  if (memberships.some((m) => m.organizationId === id)) {
    throw new Error('Không thể xóa tổ chức đã có hồ sơ sinh viên tham gia.');
  }
  if (pool) {
    await pool.query('DELETE FROM organizations WHERE id = $1', [id]);
  } else {
    memoryStore.organizations = memoryStore.organizations.filter((e) => e.id !== id);
    saveExpansionToDisk();
  }
}

async function resolveOrEnsureSystemRelationshipType(
  code: 'FATHER' | 'MOTHER' | 'GUARDIAN'
): Promise<RelationshipTypeCatalog> {
  const existing = await getAllRelationshipTypes();
  const matched = existing.find((r) => r.code.toUpperCase() === code);
  if (matched) return matched;

  const def = SYSTEM_RELATIONSHIP_TYPES[code];
  if (pool) {
    await pool.query(
      `INSERT INTO relationship_types (id, code, label_vi, is_parental, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING`,
      [def.id, def.code, def.labelVi, def.isParental, def.isActive, def.sortOrder]
    );
    const refreshed = await getAllRelationshipTypes();
    return refreshed.find((r) => r.code.toUpperCase() === code) || def;
  }

  memoryStore.relationshipTypes.push(def);
  saveExpansionToDisk();
  return def;
}

async function resolveOrEnsureSystemOrganization(
  code: 'DOAN_TNCS' | 'DANG_CSVN'
): Promise<OrganizationCatalog> {
  const existing = await getAllOrganizations();
  const matchedByCode = existing.find((o) => o.code.toUpperCase() === code);
  if (matchedByCode) return matchedByCode;

  const def = SYSTEM_ORGANIZATIONS[code];
  const matchedByName = existing.find((o) => o.name.trim().toLowerCase() === def.name.toLowerCase());
  if (matchedByName) return matchedByName;

  if (pool) {
    await pool.query(
      `INSERT INTO organizations (id, code, name, is_active)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING`,
      [def.id, def.code, def.name, def.isActive]
    );
    const refreshed = await getAllOrganizations();
    return (
      refreshed.find((o) => o.code.toUpperCase() === code) ||
      refreshed.find((o) => o.name.trim().toLowerCase() === def.name.toLowerCase()) ||
      def
    );
  }

  memoryStore.organizations.push(def);
  saveExpansionToDisk();
  return def;
}

// ==================== 2. STUDENT ADDRESSES (2-TIER) ====================

export async function getAllStudentAddresses(maSV?: string): Promise<StudentAddress[]> {
  const [units, raw] = await Promise.all([
    getAllAdministrativeUnits(),
    (async () => {
      if (pool) {
        const res = maSV
          ? await pool.query('SELECT * FROM student_addresses WHERE LOWER(ma_sv) = LOWER($1) ORDER BY created_at DESC', [maSV])
          : await pool.query('SELECT * FROM student_addresses ORDER BY created_at DESC');
        return res.rows.map(mapAddressRow);
      }
      return maSV
        ? memoryStore.studentAddresses.filter((a) => a.maSV.toLowerCase() === maSV.toLowerCase())
        : [...memoryStore.studentAddresses];
    })(),
  ]);

  const unitMap = new Map(units.map((u) => [u.id, u]));
  return raw.map((a) => {
    const prov = unitMap.get(a.provinceUnitId);
    const comm = unitMap.get(a.communeUnitId);
    return {
      ...a,
      provinceName: prov?.name,
      provinceOfficialCode: prov?.officialCode,
      provinceStatus: prov?.status,
      communeName: comm?.name,
      communeOfficialCode: comm?.officialCode,
      communeStatus: comm?.status,
      communeSuccessorId: comm?.successorUnitId ?? null,
    };
  });
}

export async function upsertStudentAddress(
  input: Partial<StudentAddress> & {
    maSV: string;
    addressType: AddressType;
    provinceUnitId: string;
    communeUnitId: string;
  },
  actorUsername: string
): Promise<StudentAddress> {
  const student = await getSinhVienByMaSV(input.maSV);
  if (!student) {
    throw new Error(`Không tìm thấy sinh viên mã ${input.maSV}. Không thể lưu địa chỉ.`);
  }
  if (!['PERMANENT', 'CURRENT', 'TEMPORARY'].includes(input.addressType)) {
    throw new Error('Loại địa chỉ không hợp lệ (PERMANENT | CURRENT | TEMPORARY).');
  }
  const units = await getAllAdministrativeUnits();
  const province = units.find((u) => u.id === input.provinceUnitId);
  if (!province || province.unitLevel !== 'PROVINCE') {
    throw new Error('Đơn vị cấp Tỉnh/Thành phố trực thuộc TW không tồn tại hoặc không hợp lệ.');
  }
  const commune = units.find((u) => u.id === input.communeUnitId);
  if (!commune || commune.unitLevel !== 'COMMUNE') {
    throw new Error('Đơn vị cấp Xã/Phường/Đặc khu không tồn tại hoặc không hợp lệ.');
  }
  if (commune.parentId !== province.id) {
    throw new Error(
      `Xã/Phường "${commune.name}" không trực thuộc Tỉnh/TP "${province.name}". Vi phạm toàn vẹn phân cấp 2 cấp.`
    );
  }

  const now = nowIso();
  const existingAll = await getAllStudentAddresses(student.maSV);
  const existing = input.id ? existingAll.find((a) => a.id === input.id) : undefined;

  const record: StudentAddress = {
    id: existing?.id || input.id || makeId('addr'),
    maSV: student.maSV,
    addressType: input.addressType,
    provinceUnitId: province.id,
    communeUnitId: commune.id,
    addressDetail: (input.addressDetail || '').trim(),
    isPrimary: input.isPrimary !== undefined ? Boolean(input.isPrimary) : input.addressType === 'CURRENT',
    validFrom: input.validFrom || now.split('T')[0],
    validTo: input.validTo || null,
    verificationStatus: input.verificationStatus || existing?.verificationStatus || 'UNVERIFIED',
    verifiedBy:
      input.verificationStatus === 'VERIFIED'
        ? input.verifiedBy || actorUsername
        : existing?.verifiedBy || null,
    verifiedAt:
      input.verificationStatus === 'VERIFIED'
        ? input.verifiedAt || now
        : existing?.verifiedAt || null,
    source: input.source || existing?.source || 'STAFF_ENTRY',
    createdBy: existing?.createdBy || actorUsername,
    updatedBy: actorUsername,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (pool) {
    await pool.query(
      `INSERT INTO student_addresses (
        id, ma_sv, address_type, province_unit_id, commune_unit_id, address_detail,
        is_primary, valid_from, valid_to, verification_status, verified_by, verified_at,
        source, created_by, updated_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      ON CONFLICT (id) DO UPDATE SET
        address_type = EXCLUDED.address_type,
        province_unit_id = EXCLUDED.province_unit_id,
        commune_unit_id = EXCLUDED.commune_unit_id,
        address_detail = EXCLUDED.address_detail,
        is_primary = EXCLUDED.is_primary,
        valid_from = EXCLUDED.valid_from,
        valid_to = EXCLUDED.valid_to,
        verification_status = EXCLUDED.verification_status,
        verified_by = EXCLUDED.verified_by,
        verified_at = EXCLUDED.verified_at,
        source = EXCLUDED.source,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at`,
      [
        record.id,
        record.maSV,
        record.addressType,
        record.provinceUnitId,
        record.communeUnitId,
        record.addressDetail,
        record.isPrimary,
        record.validFrom,
        record.validTo,
        record.verificationStatus,
        record.verifiedBy,
        record.verifiedAt,
        record.source,
        record.createdBy,
        record.updatedBy,
        record.createdAt,
        record.updatedAt,
      ]
    );
  } else {
    const idx = memoryStore.studentAddresses.findIndex((a) => a.id === record.id);
    if (idx >= 0) memoryStore.studentAddresses[idx] = record;
    else memoryStore.studentAddresses.push(record);
    saveExpansionToDisk();
  }

  return {
    ...record,
    provinceName: province.name,
    provinceOfficialCode: province.officialCode,
    provinceStatus: province.status,
    communeName: commune.name,
    communeOfficialCode: commune.officialCode,
    communeStatus: commune.status,
    communeSuccessorId: commune.successorUnitId ?? null,
  };
}

export async function deleteStudentAddress(id: string): Promise<void> {
  if (pool) {
    await pool.query('DELETE FROM student_addresses WHERE id = $1', [id]);
  } else {
    memoryStore.studentAddresses = memoryStore.studentAddresses.filter((a) => a.id !== id);
    saveExpansionToDisk();
  }
}

// ==================== 3. DEMOGRAPHICS (ETHNICITIES & RELIGIONS) ====================

async function getAllDemographicsRaw(): Promise<StudentDemographics[]> {
  if (pool) {
    const res = await pool.query('SELECT * FROM student_demographics');
    return res.rows.map((r: any) => ({
      maSV: r.ma_sv,
      ethnicityId: r.ethnicity_id,
      ethnicityStatus: r.ethnicity_status,
      religionId: r.religion_id,
      religionStatus: r.religion_status,
      verificationStatus: r.verification_status,
      verifiedBy: r.verified_by,
      verifiedAt: r.verified_at,
      source: r.source,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
  return [...memoryStore.studentDemographics];
}

export async function getStudentDemographics(maSV: string): Promise<StudentDemographics | null> {
  const [raw, eths, rels] = await Promise.all([
    getAllDemographicsRaw(),
    getAllEthnicities(),
    getAllReligions(),
  ]);
  const found = raw.find((d) => d.maSV.toLowerCase() === maSV.toLowerCase());
  if (!found) return null;
  const eth = found.ethnicityId ? eths.find((e) => e.id === found.ethnicityId) : undefined;
  const rel = found.religionId ? rels.find((r) => r.id === found.religionId) : undefined;
  return {
    ...found,
    ethnicityName: eth?.name || null,
    ethnicityCode: eth?.officialCode || null,
    religionName: rel?.name || null,
    religionCode: rel?.officialCode || null,
  };
}

export async function upsertStudentDemographics(
  maSV: string,
  input: Partial<StudentDemographics>,
  actorUsername: string
): Promise<StudentDemographics> {
  const student = await getSinhVienByMaSV(maSV);
  if (!student) throw new Error(`Không tìm thấy sinh viên mã ${maSV}.`);

  const ethStatus = input.ethnicityStatus || (input.ethnicityId ? 'DECLARED' : 'NOT_DECLARED');
  const relStatus = input.religionStatus || (input.religionId ? 'DECLARED' : 'NOT_DECLARED');

  const [eths, rels] = await Promise.all([getAllEthnicities(), getAllReligions()]);
  let ethnicityId: string | null = null;
  if (ethStatus === 'DECLARED') {
    if (!input.ethnicityId) throw new Error('Vui lòng chọn dân tộc từ danh mục chuẩn.');
    const foundEth = eths.find((e) => e.id === input.ethnicityId);
    if (!foundEth) throw new Error('Dân tộc được chọn không tồn tại trong danh mục chuẩn.');
    ethnicityId = foundEth.id;
  }

  let religionId: string | null = null;
  if (relStatus === 'DECLARED') {
    if (!input.religionId) throw new Error('Vui lòng chọn tôn giáo từ danh mục chuẩn.');
    const foundRel = rels.find((r) => r.id === input.religionId);
    if (!foundRel) throw new Error('Tôn giáo được chọn không tồn tại trong danh mục chuẩn.');
    religionId = foundRel.id;
  }

  const existing = await getStudentDemographics(student.maSV);
  const now = nowIso();
  const record: StudentDemographics = {
    maSV: student.maSV,
    ethnicityId,
    ethnicityStatus: ethStatus,
    religionId,
    religionStatus: relStatus,
    verificationStatus: input.verificationStatus || existing?.verificationStatus || 'UNVERIFIED',
    verifiedBy:
      input.verificationStatus === 'VERIFIED'
        ? input.verifiedBy || actorUsername
        : existing?.verifiedBy || null,
    verifiedAt:
      input.verificationStatus === 'VERIFIED'
        ? input.verifiedAt || now
        : existing?.verifiedAt || null,
    source: input.source || existing?.source || 'STAFF_ENTRY',
    createdBy: existing?.createdBy || actorUsername,
    updatedBy: actorUsername,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (pool) {
    await pool.query(
      `INSERT INTO student_demographics (
        ma_sv, ethnicity_id, ethnicity_status, religion_id, religion_status,
        verification_status, verified_by, verified_at, source, created_by, updated_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (ma_sv) DO UPDATE SET
        ethnicity_id = EXCLUDED.ethnicity_id,
        ethnicity_status = EXCLUDED.ethnicity_status,
        religion_id = EXCLUDED.religion_id,
        religion_status = EXCLUDED.religion_status,
        verification_status = EXCLUDED.verification_status,
        verified_by = EXCLUDED.verified_by,
        verified_at = EXCLUDED.verified_at,
        source = EXCLUDED.source,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at`,
      [
        record.maSV,
        record.ethnicityId,
        record.ethnicityStatus,
        record.religionId,
        record.religionStatus,
        record.verificationStatus,
        record.verifiedBy,
        record.verifiedAt,
        record.source,
        record.createdBy,
        record.updatedBy,
        record.createdAt,
        record.updatedAt,
      ]
    );
  } else {
    const idx = memoryStore.studentDemographics.findIndex(
      (d) => d.maSV.toLowerCase() === record.maSV.toLowerCase()
    );
    if (idx >= 0) memoryStore.studentDemographics[idx] = record;
    else memoryStore.studentDemographics.push(record);
    saveExpansionToDisk();
  }

  return (await getStudentDemographics(student.maSV))!;
}

// ==================== 4. FAMILY PROFILES, MEMBERS & CONTACTS ====================

async function getAllFamilyProfilesRaw(): Promise<StudentFamilyProfile[]> {
  if (pool) {
    const res = await pool.query('SELECT * FROM student_family_profiles');
    return res.rows.map((r: any) => ({
      id: r.id,
      maSV: r.ma_sv,
      familyStructureStatus: r.family_structure_status,
      dataCompletenessState: r.data_completeness_state,
      verificationStatus: r.verification_status,
      verifiedBy: r.verified_by,
      verifiedAt: r.verified_at,
      notes: r.notes,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
  return [...memoryStore.studentFamilyProfiles];
}

async function getAllFamilyMembersRaw(): Promise<StudentFamilyMember[]> {
  if (pool) {
    const [mRes, cRes] = await Promise.all([
      pool.query('SELECT * FROM student_family_members ORDER BY is_emergency_contact DESC, is_primary_contact DESC, created_at ASC'),
      pool.query('SELECT * FROM family_member_contacts ORDER BY is_emergency DESC, is_primary DESC, created_at ASC'),
    ]);
    const contactsByMember = new Map<string, FamilyMemberContact[]>();
    for (const c of cRes.rows) {
      const mapped: FamilyMemberContact = {
        id: c.id,
        familyMemberId: c.family_member_id,
        contactType: c.contact_type,
        contactValue: c.contact_value,
        isPrimary: Boolean(c.is_primary),
        isEmergency: Boolean(c.is_emergency),
        canReceiveSms: Boolean(c.can_receive_sms),
        verificationStatus: c.verification_status,
        createdBy: c.created_by,
        updatedBy: c.updated_by,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      };
      const arr = contactsByMember.get(mapped.familyMemberId) || [];
      arr.push(mapped);
      contactsByMember.set(mapped.familyMemberId, arr);
    }
    return mRes.rows.map((r: any) => ({
      id: r.id,
      familyProfileId: r.family_profile_id,
      maSV: r.ma_sv,
      relationshipTypeId: r.relationship_type_id,
      fullName: r.full_name,
      birthYear: r.birth_year ?? null,
      isDeceased: Boolean(r.is_deceased),
      occupation: r.occupation ?? null,
      workplace: r.workplace ?? null,
      provinceUnitId: r.province_unit_id ?? null,
      communeUnitId: r.commune_unit_id ?? null,
      addressDetail: r.address_detail ?? null,
      isGuardian: Boolean(r.is_guardian),
      isPrimaryContact: Boolean(r.is_primary_contact),
      isEmergencyContact: Boolean(r.is_emergency_contact),
      notes: r.notes ?? null,
      contacts: contactsByMember.get(r.id) || [],
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  return memoryStore.studentFamilyMembers.map((m) => ({
    ...m,
    contacts: memoryStore.familyMemberContacts.filter((c) => c.familyMemberId === m.id),
  }));
}

export async function getStudentFamilyData(maSV: string): Promise<{
  profile: StudentFamilyProfile | null;
  members: StudentFamilyMember[];
}> {
  const [profiles, members, relTypes, units] = await Promise.all([
    getAllFamilyProfilesRaw(),
    getAllFamilyMembersRaw(),
    getAllRelationshipTypes(),
    getAllAdministrativeUnits(),
  ]);
  const profile = profiles.find((p) => p.maSV.toLowerCase() === maSV.toLowerCase()) || null;
  const relMap = new Map(relTypes.map((r) => [r.id, r]));
  const unitMap = new Map(units.map((u) => [u.id, u]));

  const svMembers = members
    .filter((m) => m.maSV.toLowerCase() === maSV.toLowerCase())
    .map((m) => {
      const rt = relMap.get(m.relationshipTypeId);
      return {
        ...m,
        relationshipCode: rt?.code,
        relationshipLabel: rt?.labelVi,
        provinceName: m.provinceUnitId ? unitMap.get(m.provinceUnitId)?.name || null : null,
        communeName: m.communeUnitId ? unitMap.get(m.communeUnitId)?.name || null : null,
      };
    });

  return { profile, members: svMembers };
}

export async function upsertStudentFamilyProfile(
  maSV: string,
  input: Partial<StudentFamilyProfile>,
  actorUsername: string
): Promise<StudentFamilyProfile> {
  const student = await getSinhVienByMaSV(maSV);
  if (!student) throw new Error(`Không tìm thấy sinh viên mã ${maSV}.`);

  const validStructures = [
    'BOTH_PARENTS',
    'FATHER_ONLY',
    'MOTHER_ONLY',
    'GUARDIAN_ONLY',
    'OTHER',
    'NOT_DECLARED',
  ];
  const structure = input.familyStructureStatus || 'NOT_DECLARED';
  if (!validStructures.includes(structure)) {
    throw new Error('Trạng thái cấu trúc gia đình không hợp lệ.');
  }

  const validStates = ['NOT_ENTERED', 'PARTIAL', 'CONFIRMED_NO_INFO', 'COMPLETE'];
  const existing = (await getStudentFamilyData(student.maSV)).profile;
  const completeness =
    input.dataCompletenessState && validStates.includes(input.dataCompletenessState)
      ? input.dataCompletenessState
      : existing?.dataCompletenessState || (structure === 'NOT_DECLARED' ? 'NOT_ENTERED' : 'PARTIAL');

  const now = nowIso();
  const record: StudentFamilyProfile = {
    id: existing?.id || makeId('fam'),
    maSV: student.maSV,
    familyStructureStatus: structure,
    dataCompletenessState: completeness,
    verificationStatus: input.verificationStatus || existing?.verificationStatus || 'UNVERIFIED',
    verifiedBy:
      input.verificationStatus === 'VERIFIED'
        ? input.verifiedBy || actorUsername
        : existing?.verifiedBy || null,
    verifiedAt:
      input.verificationStatus === 'VERIFIED'
        ? input.verifiedAt || now
        : existing?.verifiedAt || null,
    notes: input.notes !== undefined ? input.notes : existing?.notes || null,
    createdBy: existing?.createdBy || actorUsername,
    updatedBy: actorUsername,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (pool) {
    await pool.query(
      `INSERT INTO student_family_profiles (
        id, ma_sv, family_structure_status, data_completeness_state, verification_status,
        verified_by, verified_at, notes, created_by, updated_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (ma_sv) DO UPDATE SET
        family_structure_status = EXCLUDED.family_structure_status,
        data_completeness_state = EXCLUDED.data_completeness_state,
        verification_status = EXCLUDED.verification_status,
        verified_by = EXCLUDED.verified_by,
        verified_at = EXCLUDED.verified_at,
        notes = EXCLUDED.notes,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at`,
      [
        record.id,
        record.maSV,
        record.familyStructureStatus,
        record.dataCompletenessState,
        record.verificationStatus,
        record.verifiedBy,
        record.verifiedAt,
        record.notes,
        record.createdBy,
        record.updatedBy,
        record.createdAt,
        record.updatedAt,
      ]
    );
  } else {
    const idx = memoryStore.studentFamilyProfiles.findIndex(
      (p) => p.maSV.toLowerCase() === record.maSV.toLowerCase()
    );
    if (idx >= 0) memoryStore.studentFamilyProfiles[idx] = record;
    else memoryStore.studentFamilyProfiles.push(record);
    saveExpansionToDisk();
  }
  return record;
}

export async function upsertStudentFamilyMember(
  maSV: string,
  input: Omit<Partial<StudentFamilyMember>, 'contacts'> & {
    relationshipTypeId: string;
    fullName: string;
    contacts?: Array<Partial<FamilyMemberContact>>;
  },
  actorUsername: string
): Promise<StudentFamilyMember> {
  const student = await getSinhVienByMaSV(maSV);
  if (!student) throw new Error(`Không tìm thấy sinh viên mã ${maSV}.`);
  if (!input.fullName?.trim()) throw new Error('Họ và tên thành viên gia đình là bắt buộc.');

  const relTypes = await getAllRelationshipTypes();
  const relType = relTypes.find((r) => r.id === input.relationshipTypeId);
  if (!relType) {
    throw new Error('Loại quan hệ gia đình không tồn tại trong danh mục relationship_types.');
  }

  if (input.provinceUnitId || input.communeUnitId) {
    const units = await getAllAdministrativeUnits();
    const prov = input.provinceUnitId ? units.find((u) => u.id === input.provinceUnitId) : null;
    const comm = input.communeUnitId ? units.find((u) => u.id === input.communeUnitId) : null;
    if (input.provinceUnitId && (!prov || prov.unitLevel !== 'PROVINCE')) {
      throw new Error('Tỉnh/TP của thành viên gia đình không hợp lệ.');
    }
    if (input.communeUnitId && (!comm || comm.unitLevel !== 'COMMUNE')) {
      throw new Error('Xã/Phường của thành viên gia đình không hợp lệ.');
    }
    if (prov && comm && comm.parentId !== prov.id) {
      throw new Error('Xã/Phường của thành viên gia đình không thuộc Tỉnh/TP đã chọn.');
    }
  }

  let { profile } = await getStudentFamilyData(student.maSV);
  if (!profile) {
    profile = await upsertStudentFamilyProfile(
      student.maSV,
      {
        familyStructureStatus: 'NOT_DECLARED',
        dataCompletenessState: 'PARTIAL',
      },
      actorUsername
    );
  }

  const allMembers = await getAllFamilyMembersRaw();
  const existing = input.id ? allMembers.find((m) => m.id === input.id) : undefined;
  const now = nowIso();
  const memberId = existing?.id || input.id || makeId('fmem');

  const rawContacts = Array.isArray(input.contacts) ? input.contacts : existing?.contacts || [];
  const contacts: FamilyMemberContact[] = rawContacts
    .filter((c) => c.contactValue && String(c.contactValue).trim())
    .map((c, idx) => ({
      id: c.id || makeId(`fmc${idx}`),
      familyMemberId: memberId,
      contactType: (c.contactType as any) || 'PHONE',
      contactValue: String(c.contactValue).trim(),
      isPrimary: Boolean(c.isPrimary ?? idx === 0),
      isEmergency: Boolean(c.isEmergency ?? input.isEmergencyContact),
      canReceiveSms: c.canReceiveSms !== undefined ? Boolean(c.canReceiveSms) : true,
      verificationStatus: (c.verificationStatus as any) || 'UNVERIFIED',
      createdBy: c.createdBy || actorUsername,
      updatedBy: actorUsername,
      createdAt: c.createdAt || now,
      updatedAt: now,
    }));

  const memberRecord: StudentFamilyMember = {
    id: memberId,
    familyProfileId: profile.id,
    maSV: student.maSV,
    relationshipTypeId: relType.id,
    relationshipCode: relType.code,
    relationshipLabel: relType.labelVi,
    fullName: input.fullName.trim(),
    birthYear: input.birthYear ? Number(input.birthYear) : null,
    isDeceased: Boolean(input.isDeceased),
    occupation: input.occupation?.trim() || null,
    workplace: input.workplace?.trim() || null,
    provinceUnitId: input.provinceUnitId || null,
    communeUnitId: input.communeUnitId || null,
    addressDetail: input.addressDetail?.trim() || null,
    isGuardian: Boolean(input.isGuardian || relType.code === 'GUARDIAN'),
    isPrimaryContact: Boolean(input.isPrimaryContact),
    isEmergencyContact: Boolean(input.isEmergencyContact),
    notes: input.notes?.trim() || null,
    contacts,
    createdBy: existing?.createdBy || actorUsername,
    updatedBy: actorUsername,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (pool) {
    await pool.query(
      `INSERT INTO student_family_members (
        id, family_profile_id, ma_sv, relationship_type_id, full_name, birth_year,
        is_deceased, occupation, workplace, province_unit_id, commune_unit_id, address_detail,
        is_guardian, is_primary_contact, is_emergency_contact, notes, created_by, updated_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT (id) DO UPDATE SET
        relationship_type_id = EXCLUDED.relationship_type_id,
        full_name = EXCLUDED.full_name,
        birth_year = EXCLUDED.birth_year,
        is_deceased = EXCLUDED.is_deceased,
        occupation = EXCLUDED.occupation,
        workplace = EXCLUDED.workplace,
        province_unit_id = EXCLUDED.province_unit_id,
        commune_unit_id = EXCLUDED.commune_unit_id,
        address_detail = EXCLUDED.address_detail,
        is_guardian = EXCLUDED.is_guardian,
        is_primary_contact = EXCLUDED.is_primary_contact,
        is_emergency_contact = EXCLUDED.is_emergency_contact,
        notes = EXCLUDED.notes,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at`,
      [
        memberRecord.id,
        memberRecord.familyProfileId,
        memberRecord.maSV,
        memberRecord.relationshipTypeId,
        memberRecord.fullName,
        memberRecord.birthYear,
        memberRecord.isDeceased,
        memberRecord.occupation,
        memberRecord.workplace,
        memberRecord.provinceUnitId,
        memberRecord.communeUnitId,
        memberRecord.addressDetail,
        memberRecord.isGuardian,
        memberRecord.isPrimaryContact,
        memberRecord.isEmergencyContact,
        memberRecord.notes,
        memberRecord.createdBy,
        memberRecord.updatedBy,
        memberRecord.createdAt,
        memberRecord.updatedAt,
      ]
    );
    await pool.query('DELETE FROM family_member_contacts WHERE family_member_id = $1', [memberRecord.id]);
    for (const c of contacts) {
      await pool.query(
        `INSERT INTO family_member_contacts (
          id, family_member_id, contact_type, contact_value, is_primary, is_emergency,
          can_receive_sms, verification_status, created_by, updated_by, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          c.id,
          c.familyMemberId,
          c.contactType,
          c.contactValue,
          c.isPrimary,
          c.isEmergency,
          c.canReceiveSms,
          c.verificationStatus,
          c.createdBy,
          c.updatedBy,
          c.createdAt,
          c.updatedAt,
        ]
      );
    }
  } else {
    const idx = memoryStore.studentFamilyMembers.findIndex((m) => m.id === memberRecord.id);
    const storedMember = { ...memberRecord, contacts: [] };
    if (idx >= 0) memoryStore.studentFamilyMembers[idx] = storedMember;
    else memoryStore.studentFamilyMembers.push(storedMember);
    memoryStore.familyMemberContacts = [
      ...memoryStore.familyMemberContacts.filter((c) => c.familyMemberId !== memberRecord.id),
      ...contacts,
    ];
    saveExpansionToDisk();
  }

  return memberRecord;
}

export async function deleteStudentFamilyMember(memberId: string): Promise<void> {
  if (pool) {
    await pool.query('DELETE FROM student_family_members WHERE id = $1', [memberId]);
  } else {
    memoryStore.studentFamilyMembers = memoryStore.studentFamilyMembers.filter((m) => m.id !== memberId);
    memoryStore.familyMemberContacts = memoryStore.familyMemberContacts.filter(
      (c) => c.familyMemberId !== memberId
    );
    saveExpansionToDisk();
  }
}

// ==================== 5. ORGANIZATIONS (ĐOÀN / ĐẢNG) ====================

async function getAllOrganizationMembershipsRaw(): Promise<StudentOrganizationMembership[]> {
  if (pool) {
    const res = await pool.query('SELECT * FROM student_organization_memberships ORDER BY created_at ASC');
    return res.rows.map((r: any) => ({
      id: r.id,
      maSV: r.ma_sv,
      organizationId: r.organization_id,
      membershipStatus: r.membership_status,
      joinDate: r.join_date ?? null,
      officialDate: r.official_date ?? null,
      membershipCode: r.membership_code ?? null,
      unitName: r.unit_name ?? null,
      evidenceFileUrl: r.evidence_file_url ?? null,
      verificationStatus: r.verification_status,
      verifiedBy: r.verified_by ?? null,
      verifiedAt: r.verified_at ?? null,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
  return [...memoryStore.studentOrganizationMemberships];
}

export async function getStudentOrganizationMemberships(maSV?: string): Promise<StudentOrganizationMembership[]> {
  const [orgs, raw] = await Promise.all([
    getAllOrganizations(),
    getAllOrganizationMembershipsRaw(),
  ]);
  const orgMap = new Map(orgs.map((o) => [o.id, o]));
  return raw
    .filter((m) => !maSV || m.maSV.toLowerCase() === maSV.toLowerCase())
    .map((m) => {
      const o = orgMap.get(m.organizationId);
      return {
        ...m,
        organizationCode: o?.code,
        organizationName: o?.name,
      };
    });
}

export async function upsertStudentOrganizationMembership(
  maSV: string,
  input: Partial<StudentOrganizationMembership> & { organizationId: string },
  actorUsername: string
): Promise<StudentOrganizationMembership> {
  const student = await getSinhVienByMaSV(maSV);
  if (!student) throw new Error(`Không tìm thấy sinh viên mã ${maSV}.`);

  const orgs = await getAllOrganizations();
  const org = orgs.find((o) => o.id === input.organizationId);
  if (!org) throw new Error('Tổ chức không tồn tại trong danh mục organizations.');

  if (input.joinDate && input.officialDate && input.officialDate < input.joinDate) {
    throw new Error('Ngày chính thức không thể sớm hơn ngày vào/kết nạp.');
  }

  const all = await getAllOrganizationMembershipsRaw();
  const existing = all.find(
    (m) =>
      (input.id && m.id === input.id) ||
      (m.maSV.toLowerCase() === student.maSV.toLowerCase() && m.organizationId === org.id)
  );
  const now = nowIso();
  const record: StudentOrganizationMembership = {
    id: existing?.id || input.id || makeId('svorg'),
    maSV: student.maSV,
    organizationId: org.id,
    organizationCode: org.code,
    organizationName: org.name,
    membershipStatus: input.membershipStatus || existing?.membershipStatus || 'NOT_MEMBER',
    joinDate: input.joinDate !== undefined ? input.joinDate || null : existing?.joinDate || null,
    officialDate:
      input.officialDate !== undefined ? input.officialDate || null : existing?.officialDate || null,
    membershipCode:
      input.membershipCode !== undefined ? input.membershipCode?.trim() || null : existing?.membershipCode || null,
    unitName: input.unitName !== undefined ? input.unitName?.trim() || null : existing?.unitName || null,
    evidenceFileUrl:
      input.evidenceFileUrl !== undefined
        ? input.evidenceFileUrl?.trim() || null
        : existing?.evidenceFileUrl || null,
    verificationStatus: input.verificationStatus || existing?.verificationStatus || 'UNVERIFIED',
    verifiedBy:
      input.verificationStatus === 'VERIFIED'
        ? input.verifiedBy || actorUsername
        : existing?.verifiedBy || null,
    verifiedAt:
      input.verificationStatus === 'VERIFIED'
        ? input.verifiedAt || now
        : existing?.verifiedAt || null,
    createdBy: existing?.createdBy || actorUsername,
    updatedBy: actorUsername,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  if (pool) {
    await pool.query(
      `INSERT INTO student_organization_memberships (
        id, ma_sv, organization_id, membership_status, join_date, official_date,
        membership_code, unit_name, evidence_file_url, verification_status, verified_by, verified_at,
        created_by, updated_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (ma_sv, organization_id) DO UPDATE SET
        membership_status = EXCLUDED.membership_status,
        join_date = EXCLUDED.join_date,
        official_date = EXCLUDED.official_date,
        membership_code = EXCLUDED.membership_code,
        unit_name = EXCLUDED.unit_name,
        evidence_file_url = EXCLUDED.evidence_file_url,
        verification_status = EXCLUDED.verification_status,
        verified_by = EXCLUDED.verified_by,
        verified_at = EXCLUDED.verified_at,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at`,
      [
        record.id,
        record.maSV,
        record.organizationId,
        record.membershipStatus,
        record.joinDate,
        record.officialDate,
        record.membershipCode,
        record.unitName,
        record.evidenceFileUrl,
        record.verificationStatus,
        record.verifiedBy,
        record.verifiedAt,
        record.createdBy,
        record.updatedBy,
        record.createdAt,
        record.updatedAt,
      ]
    );
  } else {
    const idx = memoryStore.studentOrganizationMemberships.findIndex((m) => m.id === record.id);
    if (idx >= 0) memoryStore.studentOrganizationMemberships[idx] = record;
    else memoryStore.studentOrganizationMemberships.push(record);
    saveExpansionToDisk();
  }
  return record;
}

export async function deleteStudentOrganizationMembership(id: string): Promise<void> {
  if (pool) {
    await pool.query('DELETE FROM student_organization_memberships WHERE id = $1', [id]);
  } else {
    memoryStore.studentOrganizationMemberships = memoryStore.studentOrganizationMemberships.filter(
      (m) => m.id !== id
    );
    saveExpansionToDisk();
  }
}

// ==================== 6. DATA QUALITY ANALYZER ====================

export async function analyzeDataQuality(scopedMaSVs?: Set<string>): Promise<{
  issues: DataQualityIssue[];
  summary: {
    totalStudents: number;
    missingCurrentAddress: number;
    missingPermanentAddress: number;
    unverifiedAddresses: number;
    expiredAdminUnits: number;
    familyNotDeclared: number;
    missingEmergencyContact: number;
    incompleteOrganization: number;
    unresolvedClassMapping: number;
  };
}> {
  const [students, addresses, familyProfiles, familyMembers, orgMemberships, conflicts] =
    await Promise.all([
      getAllSinhVien(),
      getAllStudentAddresses(),
      getAllFamilyProfilesRaw(),
      getAllFamilyMembersRaw(),
      getStudentOrganizationMemberships(),
      getAllMigrationConflicts(),
    ]);

  const targetStudents = scopedMaSVs
    ? students.filter((s) => scopedMaSVs.has(s.maSV.toLowerCase()))
    : students;

  const issues: DataQualityIssue[] = [];
  const addrBySv = new Map<string, StudentAddress[]>();
  for (const a of addresses) {
    const k = a.maSV.toLowerCase();
    const list = addrBySv.get(k) || [];
    list.push(a);
    addrBySv.set(k, list);
  }

  const famProfBySv = new Map(familyProfiles.map((f) => [f.maSV.toLowerCase(), f]));
  const famMemBySv = new Map<string, StudentFamilyMember[]>();
  for (const m of familyMembers) {
    const k = m.maSV.toLowerCase();
    const list = famMemBySv.get(k) || [];
    list.push(m);
    famMemBySv.set(k, list);
  }
  const orgBySv = new Map<string, StudentOrganizationMembership[]>();
  for (const o of orgMemberships) {
    const k = o.maSV.toLowerCase();
    const list = orgBySv.get(k) || [];
    list.push(o);
    orgBySv.set(k, list);
  }
  const conflictSvIds = new Set(
    conflicts.filter((c) => c.tableName === 'sinh_vien').map((c) => c.recordId.toLowerCase())
  );

  let missingCurrentAddress = 0;
  let missingPermanentAddress = 0;
  let unverifiedAddresses = 0;
  let expiredAdminUnits = 0;
  let familyNotDeclared = 0;
  let missingEmergencyContact = 0;
  let incompleteOrganization = 0;
  let unresolvedClassMapping = 0;

  for (const sv of targetStudents) {
    const k = sv.maSV.toLowerCase();
    const svAddrs = addrBySv.get(k) || [];

    if (!svAddrs.some((a) => a.addressType === 'CURRENT')) {
      missingCurrentAddress++;
      issues.push({
        id: `dq-cur-${sv.maSV}`,
        maSV: sv.maSV,
        hoTen: sv.hoTen,
        lop: sv.lop,
        khoa: sv.khoa,
        category: 'MISSING_CURRENT_ADDRESS',
        severity: 'HIGH',
        targetTab: 'ADDRESS',
        description: 'Chưa khai báo nơi ở hiện tại theo mô hình hành chính 2 cấp.',
      });
    }

    if (!svAddrs.some((a) => a.addressType === 'PERMANENT')) {
      missingPermanentAddress++;
      issues.push({
        id: `dq-perm-${sv.maSV}`,
        maSV: sv.maSV,
        hoTen: sv.hoTen,
        lop: sv.lop,
        khoa: sv.khoa,
        category: 'MISSING_PERMANENT_ADDRESS',
        severity: 'MEDIUM',
        targetTab: 'ADDRESS',
        description: 'Chưa khai báo địa chỉ thường trú theo mô hình hành chính 2 cấp.',
      });
    }

    const hasUnverified = svAddrs.some(
      (a) => a.verificationStatus === 'UNVERIFIED' || a.verificationStatus === 'PENDING_REVIEW'
    );
    if (hasUnverified) {
      unverifiedAddresses++;
      issues.push({
        id: `dq-ver-${sv.maSV}`,
        maSV: sv.maSV,
        hoTen: sv.hoTen,
        lop: sv.lop,
        khoa: sv.khoa,
        category: 'UNVERIFIED_ADDRESS',
        severity: 'LOW',
        targetTab: 'ADDRESS',
        description: 'Có địa chỉ sinh viên đang chờ xác minh hoặc chưa xác minh.',
      });
    }

    const hasExpiredUnit = svAddrs.some(
      (a) =>
        (a.provinceStatus && a.provinceStatus !== 'ACTIVE') ||
        (a.communeStatus && a.communeStatus !== 'ACTIVE')
    );
    if (hasExpiredUnit) {
      expiredAdminUnits++;
      issues.push({
        id: `dq-exp-${sv.maSV}`,
        maSV: sv.maSV,
        hoTen: sv.hoTen,
        lop: sv.lop,
        khoa: sv.khoa,
        category: 'EXPIRED_OR_MERGED_ADMIN_UNIT',
        severity: 'HIGH',
        targetTab: 'ADDRESS',
        description: 'Địa chỉ đang trỏ đến đơn vị hành chính đã sáp nhập hoặc ngừng hiệu lực.',
      });
    }

    const famProf = famProfBySv.get(k);
    const svMembers = famMemBySv.get(k) || [];
    if (!famProf || famProf.familyStructureStatus === 'NOT_DECLARED') {
      familyNotDeclared++;
      issues.push({
        id: `dq-fam-${sv.maSV}`,
        maSV: sv.maSV,
        hoTen: sv.hoTen,
        lop: sv.lop,
        khoa: sv.khoa,
        category: 'FAMILY_NOT_DECLARED',
        severity: 'MEDIUM',
        targetTab: 'FAMILY',
        description: 'Chưa xác nhận cấu trúc gia đình (family_structure_status = NOT_DECLARED).',
      });
    }

    const hasEmergency = svMembers.some(
      (m) =>
        m.isEmergencyContact &&
        m.contacts.some((c) => c.contactValue && c.contactValue.trim().length > 0)
    );
    if (!hasEmergency && famProf?.dataCompletenessState !== 'CONFIRMED_NO_INFO') {
      missingEmergencyContact++;
      issues.push({
        id: `dq-emc-${sv.maSV}`,
        maSV: sv.maSV,
        hoTen: sv.hoTen,
        lop: sv.lop,
        khoa: sv.khoa,
        category: 'MISSING_EMERGENCY_CONTACT',
        severity: 'HIGH',
        targetTab: 'FAMILY',
        description: 'Thiếu người liên hệ khẩn cấp kèm số điện thoại / phương thức liên hệ.',
      });
    }

    const svOrgs = orgBySv.get(k) || [];
    const badOrg = svOrgs.some(
      (o) =>
        (o.membershipStatus === 'OFFICIAL' || o.membershipStatus === 'PROBATIONARY') &&
        !o.joinDate
    );
    if (badOrg) {
      incompleteOrganization++;
      issues.push({
        id: `dq-org-${sv.maSV}`,
        maSV: sv.maSV,
        hoTen: sv.hoTen,
        lop: sv.lop,
        khoa: sv.khoa,
        category: 'INCOMPLETE_ORGANIZATION_INFO',
        severity: 'MEDIUM',
        targetTab: 'ORGANIZATION',
        description: 'Đã khai là Đoàn viên/Đảng viên nhưng chưa có ngày vào/kết nạp.',
      });
    }

    if (!sv.lopId || conflictSvIds.has(k)) {
      unresolvedClassMapping++;
      issues.push({
        id: `dq-cls-${sv.maSV}`,
        maSV: sv.maSV,
        hoTen: sv.hoTen,
        lop: sv.lop,
        khoa: sv.khoa,
        category: 'UNRESOLVED_CLASS_MAPPING',
        severity: 'LOW',
        targetTab: 'OVERVIEW',
        description: 'Hồ sơ chưa ánh xạ khóa ngoại lớp học chuẩn (lop_id).',
      });
    }
  }

  return {
    issues,
    summary: {
      totalStudents: targetStudents.length,
      missingCurrentAddress,
      missingPermanentAddress,
      unverifiedAddresses,
      expiredAdminUnits,
      familyNotDeclared,
      missingEmergencyContact,
      incompleteOrganization,
      unresolvedClassMapping,
    },
  };
}

// ==================== 7. STUDENT LIST QUERY ENGINE & UNIFIED PROFILE HELPERS ====================

export type { StudentBuilderRow };

export async function upsertStudentAddressesInline(
  maSV: string,
  payload: InlineAddressesPayload,
  actorUsername: string,
  options?: { source?: StudentAddress['source']; verificationStatus?: StudentAddress['verificationStatus'] }
): Promise<StudentAddress[]> {
  const student = await getSinhVienByMaSV(maSV);
  if (!student) throw new Error(`Không tìm thấy sinh viên mã ${maSV}.`);

  const existingAll = await getAllStudentAddresses(student.maSV);
  const items: Array<{ type: AddressType; label: string; entry?: InlineAddressEntryInput | null }> = [
    { type: 'CURRENT', label: 'Nơi ở hiện tại', entry: payload.current },
    { type: 'PERMANENT', label: 'Địa chỉ thường trú', entry: payload.permanent },
    { type: 'TEMPORARY', label: 'Địa chỉ tạm trú', entry: payload.temporary },
  ];

  const saved: StudentAddress[] = [];
  for (const item of items) {
    if (!item.entry) continue;
    const { id, provinceUnitId, communeUnitId, addressDetail, validFrom, clear } = item.entry;
    const existingForType = existingAll.filter((a) => a.addressType === item.type);

    if (clear) {
      for (const old of existingForType) {
        await deleteStudentAddress(old.id);
      }
      continue;
    }

    const hasProvince = Boolean(provinceUnitId?.trim());
    const hasCommune = Boolean(communeUnitId?.trim());
    const hasDetail = Boolean(addressDetail?.trim());

    if (!hasProvince && !hasCommune && !hasDetail) {
      continue;
    }
    if (!hasProvince || !hasCommune) {
      throw new Error(`${item.label}: Vui lòng chọn đầy đủ Tỉnh/Thành phố và Xã/Phường/Đặc khu.`);
    }

    const targetExisting = id
      ? existingForType.find((a) => a.id === id)
      : existingForType[0];

    const record = await upsertStudentAddress(
      {
        id: targetExisting?.id,
        maSV: student.maSV,
        addressType: item.type,
        provinceUnitId: provinceUnitId!.trim(),
        communeUnitId: communeUnitId!.trim(),
        addressDetail: addressDetail?.trim() || '',
        validFrom: validFrom || targetExisting?.validFrom || new Date().toISOString().split('T')[0],
        source: options?.source || 'STAFF_ENTRY',
        verificationStatus: options?.verificationStatus || targetExisting?.verificationStatus || 'UNVERIFIED',
      },
      actorUsername
    );
    saved.push(record);
  }

  return saved;
}

export async function upsertStudentFamilyInline(
  maSV: string,
  payload: InlineFamilyPayload,
  actorUsername: string
): Promise<{ profile: StudentFamilyProfile; members: StudentFamilyMember[] }> {
  const student = await getSinhVienByMaSV(maSV);
  if (!student) throw new Error(`Không tìm thấy sinh viên mã ${maSV}.`);

  const profile = await upsertStudentFamilyProfile(
    student.maSV,
    {
      familyStructureStatus: payload.familyStructureStatus || 'NOT_DECLARED',
      dataCompletenessState: payload.dataCompletenessState,
      notes: payload.notes,
    },
    actorUsername
  );

  const [relTypes, existingData] = await Promise.all([
    getAllRelationshipTypes(),
    getStudentFamilyData(student.maSV),
  ]);

  const upsertRoleMember = async (
    roleCode: 'FATHER' | 'MOTHER' | 'GUARDIAN',
    roleLabelVi: string,
    entry?: InlineFamilyPayload['father']
  ) => {
    if (!entry) return;
    const existingMember = existingData.members.find((m) =>
      entry.id ? m.id === entry.id : (m.relationshipCode || '').toUpperCase() === roleCode
    );

    if (entry.clear) {
      if (existingMember) await deleteStudentFamilyMember(existingMember.id);
      return;
    }

    const fullName = entry.fullName?.trim() || '';
    const phone = entry.phone !== undefined ? entry.phone.trim() : '';

    if (!fullName && !phone && !entry.occupation?.trim()) {
      return;
    }
    if (!fullName) {
      throw new Error(`Vui lòng nhập Họ và tên ${roleLabelVi}.`);
    }

    const rel = entry.relationshipTypeId
      ? relTypes.find((r) => r.id === entry.relationshipTypeId) || (await resolveOrEnsureSystemRelationshipType(roleCode))
      : await resolveOrEnsureSystemRelationshipType(roleCode);

    const existingOtherContacts = (existingMember?.contacts || []).filter((c) => c.contactType !== 'PHONE');
    const existingPrimaryPhone = (existingMember?.contacts || []).find((c) => c.contactType === 'PHONE');
    const nextContacts: Array<Partial<FamilyMemberContact>> =
      entry.phone === undefined
        ? existingMember?.contacts || []
        : phone
        ? [
            {
              id: existingPrimaryPhone?.id,
              contactType: 'PHONE',
              contactValue: phone,
              isPrimary: true,
              isEmergency: Boolean(entry.isEmergencyContact ?? existingMember?.isEmergencyContact),
            },
            ...existingOtherContacts,
          ]
        : existingOtherContacts;

    await upsertStudentFamilyMember(
      student.maSV,
      {
        id: existingMember?.id,
        relationshipTypeId: rel.id,
        fullName,
        occupation: entry.occupation !== undefined ? entry.occupation : existingMember?.occupation || null,
        isDeceased: entry.isDeceased !== undefined ? Boolean(entry.isDeceased) : Boolean(existingMember?.isDeceased),
        isGuardian:
          entry.isGuardian !== undefined
            ? Boolean(entry.isGuardian)
            : roleCode === 'GUARDIAN' || Boolean(existingMember?.isGuardian),
        isEmergencyContact:
          entry.isEmergencyContact !== undefined
            ? Boolean(entry.isEmergencyContact)
            : Boolean(existingMember?.isEmergencyContact),
        isPrimaryContact: existingMember?.isPrimaryContact ?? true,
        contacts: nextContacts,
      },
      actorUsername
    );
  };

  await upsertRoleMember('FATHER', 'bố', payload.father);
  await upsertRoleMember('MOTHER', 'mẹ', payload.mother);
  await upsertRoleMember('GUARDIAN', 'người giám hộ', payload.guardian);

  return getStudentFamilyData(student.maSV);
}

export async function upsertStudentOrganizationsInline(
  maSV: string,
  payload: InlineOrganizationsPayload,
  actorUsername: string
): Promise<StudentOrganizationMembership[]> {
  const student = await getSinhVienByMaSV(maSV);
  if (!student) throw new Error(`Không tìm thấy sinh viên mã ${maSV}.`);

  const existing = await getStudentOrganizationMemberships(student.maSV);

  const handleOrg = async (
    code: 'DOAN_TNCS' | 'DANG_CSVN',
    joinDate?: string | null,
    officialDate?: string | null
  ) => {
    if (joinDate === undefined && officialDate === undefined) return;
    const cleanJoin = joinDate?.trim() || null;
    const cleanOfficial = officialDate?.trim() || null;
    const current = existing.find((m) => (m.organizationCode || '').toUpperCase() === code);

    if (!cleanJoin && !cleanOfficial) {
      if (current) {
        await upsertStudentOrganizationMembership(
          student.maSV,
          {
            id: current.id,
            organizationId: current.organizationId,
            membershipStatus: 'NOT_MEMBER',
            joinDate: null,
            officialDate: null,
          },
          actorUsername
        );
      }
      return;
    }

    const org = await resolveOrEnsureSystemOrganization(code);

    await upsertStudentOrganizationMembership(
      student.maSV,
      {
        id: current?.id,
        organizationId: org.id,
        membershipStatus:
          code === 'DANG_CSVN'
            ? cleanOfficial
              ? 'OFFICIAL'
              : 'PROBATIONARY'
            : 'OFFICIAL',
        joinDate: cleanJoin,
        officialDate: cleanOfficial,
      },
      actorUsername
    );
  };

  await handleOrg('DOAN_TNCS', payload.doanJoinDate, undefined);
  await handleOrg('DANG_CSVN', payload.dangJoinDate, payload.dangOfficialDate);

  return getStudentOrganizationMemberships(student.maSV);
}

export async function upsertStudentFullProfileUnified(
  maSV: string,
  payload: UnifiedProfileUpdatePayload,
  actorUser: User,
  permissions: {
    canEditCore: boolean;
    canEditContact: boolean;
    canEditAddress: boolean;
    canEditDemographics: boolean;
    canEditFamily: boolean;
    canEditOrganizations: boolean;
    canVerifyProfiles: boolean;
  }
): Promise<void> {
  const student = await getSinhVienByMaSV(maSV);
  if (!student) throw new Error(`Không tìm thấy sinh viên mã ${maSV}.`);

  const [adminUnits, ethnicities, religions] = await Promise.all([
    getAllAdministrativeUnits(),
    getAllEthnicities(),
    getAllReligions(),
  ]);

  // 1. Pre-validate all sections BEFORE mutating any record so validation errors never cause partial saves
  if (payload.core) {
    if (permissions.canEditCore && payload.core.hoTen !== undefined && !payload.core.hoTen.trim()) {
      throw new Error('Họ và tên không được để trống.');
    }
    if (permissions.canEditCore && payload.core.gioiTinh !== undefined && !['Nam', 'Nữ'].includes(payload.core.gioiTinh)) {
      throw new Error('Giới tính không hợp lệ.');
    }
    if (
      (permissions.canEditCore || permissions.canEditContact) &&
      payload.core.email !== undefined &&
      payload.core.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.core.email.trim())
    ) {
      throw new Error('Email không đúng định dạng.');
    }
  }

  if (payload.demographics && permissions.canEditDemographics) {
    if (payload.demographics.ethnicityStatus === 'DECLARED') {
      if (!payload.demographics.ethnicityId) {
        throw new Error('Vui lòng chọn dân tộc từ danh mục chuẩn.');
      }
      if (!ethnicities.some((e) => e.id === payload.demographics!.ethnicityId)) {
        throw new Error('Dân tộc được chọn không tồn tại trong danh mục chuẩn.');
      }
    }
    if (payload.demographics.religionStatus === 'DECLARED') {
      if (!payload.demographics.religionId) {
        throw new Error('Vui lòng chọn tôn giáo từ danh mục chuẩn.');
      }
      if (!religions.some((r) => r.id === payload.demographics!.religionId)) {
        throw new Error('Tôn giáo được chọn không tồn tại trong danh mục chuẩn.');
      }
    }
  }

  if (payload.addresses && permissions.canEditAddress) {
    const unitMap = new Map(adminUnits.map((u) => [u.id, u]));
    const checkAddr = (label: string, entry?: InlineAddressEntryInput | null) => {
      if (!entry || entry.clear) return;
      const hasProvince = Boolean(entry.provinceUnitId?.trim());
      const hasCommune = Boolean(entry.communeUnitId?.trim());
      const hasDetail = Boolean(entry.addressDetail?.trim());
      if (!hasProvince && !hasCommune && !hasDetail) return;
      if (!hasProvince || !hasCommune) {
        throw new Error(`${label}: Vui lòng chọn đầy đủ Tỉnh/Thành phố và Xã/Phường/Đặc khu.`);
      }
      const prov = unitMap.get(entry.provinceUnitId!.trim());
      if (!prov || prov.unitLevel !== 'PROVINCE') {
        throw new Error(`${label}: Tỉnh/Thành phố không tồn tại trong danh mục hành chính.`);
      }
      const comm = unitMap.get(entry.communeUnitId!.trim());
      if (!comm || comm.unitLevel !== 'COMMUNE') {
        throw new Error(`${label}: Xã/Phường/Đặc khu không tồn tại trong danh mục hành chính.`);
      }
      if (comm.parentId !== prov.id) {
        throw new Error(`${label}: Xã/Phường "${comm.name}" không trực thuộc Tỉnh/TP "${prov.name}".`);
      }
    };
    checkAddr('Nơi ở hiện tại', payload.addresses.current);
    checkAddr('Địa chỉ thường trú', payload.addresses.permanent);
  }

  if (payload.family && permissions.canEditFamily) {
    const validStructures = new Set([
      'BOTH_PARENTS',
      'FATHER_ONLY',
      'MOTHER_ONLY',
      'GUARDIAN_ONLY',
      'OTHER',
      'NOT_DECLARED',
    ]);
    const st = payload.family.familyStructureStatus || 'NOT_DECLARED';
    if (!validStructures.has(st)) {
      throw new Error('Hoàn cảnh gia đình không hợp lệ.');
    }
    const checkMember = (
      roleLabelVi: string,
      entry?: InlineFamilyPayload['father']
    ) => {
      if (!entry || entry.clear) return;
      const fullName = entry.fullName?.trim() || '';
      const phone = entry.phone?.trim() || '';
      const occupation = entry.occupation?.trim() || '';
      if (!fullName && !phone && !occupation) return;
      if (!fullName) {
        throw new Error(`Vui lòng nhập Họ và tên ${roleLabelVi}.`);
      }
    };
    checkMember('bố', payload.family.father);
    checkMember('mẹ', payload.family.mother);
  }

  if (payload.organizations && permissions.canEditOrganizations) {
    const cleanDangJoin = payload.organizations.dangJoinDate?.trim() || '';
    const cleanDangOfficial = payload.organizations.dangOfficialDate?.trim() || '';

    if (cleanDangJoin && cleanDangOfficial && cleanDangOfficial < cleanDangJoin) {
      throw new Error('Ngày chính thức vào Đảng không thể sớm hơn ngày vào Đảng.');
    }
  }

  // 2. Commit validated updates
  if (payload.core && (permissions.canEditCore || permissions.canEditContact)) {
    const coreUpdate: Record<string, any> = {};
    if (permissions.canEditCore) {
      if (payload.core.hoTen !== undefined) coreUpdate.hoTen = payload.core.hoTen.trim();
      if (payload.core.ngaySinh !== undefined) coreUpdate.ngaySinh = payload.core.ngaySinh;
      if (payload.core.gioiTinh !== undefined) coreUpdate.gioiTinh = payload.core.gioiTinh;
      if (payload.core.trangThai !== undefined) coreUpdate.trangThai = payload.core.trangThai;
    }
    if (permissions.canEditCore || permissions.canEditContact) {
      if (payload.core.soDienThoai !== undefined) coreUpdate.soDienThoai = payload.core.soDienThoai.trim();
      if (payload.core.email !== undefined) coreUpdate.email = payload.core.email.trim();
    }

    if (Object.keys(coreUpdate).length > 0) {
      await updateSinhVien(student.maSV, coreUpdate);
      const allUsers = await getAllUsers();
      const matchedUser = allUsers.find(
        (u: any) =>
          u.username?.toLowerCase() === student.maSV.toLowerCase() ||
          u.studentCode?.toLowerCase() === student.maSV.toLowerCase()
      );
      if (matchedUser) {
        const userPatch: Record<string, any> = {};
        if (coreUpdate.hoTen) userPatch.fullName = coreUpdate.hoTen;
        if (coreUpdate.email !== undefined) userPatch.email = coreUpdate.email;
        if (Object.keys(userPatch).length > 0) {
          await updateUser(matchedUser.id, userPatch);
        }
      }
    }
  }

  if (payload.demographics && permissions.canEditDemographics) {
    await upsertStudentDemographics(
      student.maSV,
      {
        ...payload.demographics,
        source: actorUser.role === 'STUDENT' ? 'STUDENT_SELF' : 'STAFF_ENTRY',
      },
      actorUser.username
    );
  }

  if (payload.addresses && permissions.canEditAddress) {
    const isSelf = actorUser.role === 'STUDENT';
    await upsertStudentAddressesInline(student.maSV, payload.addresses, actorUser.username, {
      source: isSelf ? 'STUDENT_SELF' : 'STAFF_ENTRY',
      verificationStatus:
        isSelf || !permissions.canVerifyProfiles ? 'PENDING_REVIEW' : 'VERIFIED',
    });
  }

  if (payload.family && permissions.canEditFamily) {
    await upsertStudentFamilyInline(student.maSV, payload.family, actorUser.username);
  }

  if (payload.organizations && permissions.canEditOrganizations) {
    await upsertStudentOrganizationsInline(student.maSV, payload.organizations, actorUser.username);
  }
}

export async function runStudentListBuilder(params: {
  actorUser: User;
  flatFilters?: FlatStudentFilterInput;
  aggregateBy?: 'NONE' | 'PROVINCE' | 'COMMUNE';
  aggregateAddressType?: AddressType;
  page?: number;
  pageSize?: number;
  sortBy?: StudentListSortBy;
  sortDir?: SortDirection;
  all?: boolean;
}): Promise<{
  rows: StudentBuilderRow[];
  items: StudentBuilderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  aggregation: Array<{
    unitId: string;
    officialCode: string;
    unitName: string;
    parentName?: string;
    status: string;
    count: number;
  }>;
}> {
  const [
    allStudents,
    adminUnits,
    allAddresses,
    allDemographics,
    ethnicities,
    religions,
    allFamProfiles,
    allFamMembers,
    allOrgMemberships,
  ] = await Promise.all([
    getAllSinhVien(),
    getAllAdministrativeUnits(),
    getAllStudentAddresses(),
    getAllDemographicsRaw(),
    getAllEthnicities(),
    getAllReligions(),
    getAllFamilyProfilesRaw(),
    getAllFamilyMembersRaw(),
    getStudentOrganizationMemberships(),
  ]);

  const unitMap = new Map(adminUnits.map((u) => [u.id, u]));
  const ethMap = new Map(ethnicities.map((e) => [e.id, e]));
  const relMap = new Map(religions.map((r) => [r.id, r]));

  const validFamilyStructures = new Set([
    'BOTH_PARENTS',
    'FATHER_ONLY',
    'MOTHER_ONLY',
    'GUARDIAN_ONLY',
    'OTHER',
    'NOT_DECLARED',
  ]);

  // Strict reference ID validation for flatFilters (no guessing, no silent creation)
  const f = params.flatFilters || {};
  if (f.provinceUnitId) {
    const prov = unitMap.get(f.provinceUnitId);
    if (!prov || prov.unitLevel !== 'PROVINCE') {
      throw new Error('Tỉnh/Thành phố lọc không tồn tại trong danh mục hành chính.');
    }
  }
  if (f.communeUnitId) {
    const comm = unitMap.get(f.communeUnitId);
    if (!comm || comm.unitLevel !== 'COMMUNE') {
      throw new Error('Xã/Phường/Đặc khu lọc không tồn tại trong danh mục hành chính.');
    }
    if (f.provinceUnitId && comm.parentId !== f.provinceUnitId) {
      throw new Error('Xã/Phường/Đặc khu lọc không trực thuộc Tỉnh/Thành phố đã chọn.');
    }
  }
  if (f.ethnicityId && !ethMap.has(f.ethnicityId)) {
    throw new Error('Dân tộc lọc không tồn tại trong danh mục.');
  }
  if (f.religionId && f.religionId !== '__NONE__' && !relMap.has(f.religionId)) {
    throw new Error('Tôn giáo lọc không tồn tại trong danh mục.');
  }
  if (f.familyStructureStatus && !validFamilyStructures.has(f.familyStructureStatus)) {
    throw new Error('Hoàn cảnh gia đình lọc không hợp lệ.');
  }

  // Scope strictly by user role
  let scopedStudents = allStudents;
  if (params.actorUser.role === 'STUDENT') {
    const ownCode = (params.actorUser.studentCode || params.actorUser.username || '').toLowerCase();
    scopedStudents = allStudents.filter((s) => s.maSV.toLowerCase() === ownCode);
  }

  const addrBySv = new Map<string, StudentAddress[]>();
  for (const a of allAddresses) {
    const k = a.maSV.toLowerCase();
    const list = addrBySv.get(k) || [];
    list.push(a);
    addrBySv.set(k, list);
  }
  const demoBySv = new Map(allDemographics.map((d) => [d.maSV.toLowerCase(), d]));
  const famProfBySv = new Map(allFamProfiles.map((fp) => [fp.maSV.toLowerCase(), fp]));
  const famMemBySv = new Map<string, StudentFamilyMember[]>();
  for (const m of allFamMembers) {
    const k = m.maSV.toLowerCase();
    const list = famMemBySv.get(k) || [];
    list.push(m);
    famMemBySv.set(k, list);
  }
  const orgBySv = new Map<string, StudentOrganizationMembership[]>();
  for (const o of allOrgMemberships) {
    const k = o.maSV.toLowerCase();
    const list = orgBySv.get(k) || [];
    list.push(o);
    orgBySv.set(k, list);
  }

  const searchLower = f.search?.trim().toLowerCase() || '';

  const matched = scopedStudents.filter((sv) => {
    const k = sv.maSV.toLowerCase();
    if (searchLower) {
      const hit =
        sv.maSV.toLowerCase().includes(searchLower) ||
        sv.hoTen.toLowerCase().includes(searchLower) ||
        (sv.lop || '').toLowerCase().includes(searchLower) ||
        (sv.email || '').toLowerCase().includes(searchLower) ||
        (sv.soDienThoai || '').toLowerCase().includes(searchLower);
      if (!hit) return false;
    }
    if (f.khoa?.trim() && sv.khoa !== f.khoa.trim()) return false;
    if (f.lop?.trim() && sv.lop !== f.lop.trim()) return false;
    if (f.trangThai?.trim() && sv.trangThai !== f.trangThai.trim()) return false;
    if (f.gioiTinh?.trim() && sv.gioiTinh !== f.gioiTinh.trim()) return false;

    const svAddrs = addrBySv.get(k) || [];
    if (f.provinceUnitId) {
      const hasProv = svAddrs.some(
        (a) => a.addressType === 'CURRENT' && a.provinceUnitId === f.provinceUnitId
      );
      if (!hasProv) return false;
    }
    if (f.communeUnitId) {
      const hasComm = svAddrs.some(
        (a) =>
          a.addressType === 'CURRENT' &&
          (!f.provinceUnitId || a.provinceUnitId === f.provinceUnitId) &&
          a.communeUnitId === f.communeUnitId
      );
      if (!hasComm) return false;
    }

    const demo = demoBySv.get(k);
    if (f.ethnicityId) {
      if (!demo?.ethnicityId || demo.ethnicityId !== f.ethnicityId) return false;
    }
    if (f.religionId) {
      if (f.religionId === '__NONE__') {
        if (demo?.religionStatus !== 'CONFIRMED_NONE') return false;
      } else if (!demo?.religionId || demo.religionId !== f.religionId) {
        return false;
      }
    }

    if (f.familyStructureStatus) {
      const rawFam = famProfBySv.get(k)?.familyStructureStatus || 'NOT_DECLARED';
      const normalizedFam = rawFam === 'GUARDIAN_ONLY' ? 'OTHER' : rawFam;
      const targetFam = f.familyStructureStatus === 'GUARDIAN_ONLY' ? 'OTHER' : f.familyStructureStatus;
      if (normalizedFam !== targetFam) return false;
    }

    return true;
  });

  const rows: StudentBuilderRow[] = matched.map((sv) => {
    const k = sv.maSV.toLowerCase();
    const svAddrs = addrBySv.get(k) || [];
    const curAddr = svAddrs.find((a) => a.addressType === 'CURRENT');
    const permAddr = svAddrs.find((a) => a.addressType === 'PERMANENT');
    const demo = demoBySv.get(k);
    const famProf = famProfBySv.get(k);
    const svMembers = famMemBySv.get(k) || [];
    const svOrgs = orgBySv.get(k) || [];

    const fatherMem = svMembers.find((m) => (m.relationshipCode || '').toUpperCase() === 'FATHER');
    const motherMem = svMembers.find((m) => (m.relationshipCode || '').toUpperCase() === 'MOTHER');
    const getFirstPhone = (m?: StudentFamilyMember): string => {
      if (!m) return '';
      const ct = m.contacts.find((c) => c.contactType === 'PHONE') || m.contacts[0];
      return ct?.contactValue || '';
    };

    const doan = svOrgs.find((o) => (o.organizationCode || '').toUpperCase() === 'DOAN_TNCS');
    const dang = svOrgs.find((o) => (o.organizationCode || '').toUpperCase() === 'DANG_CSVN');
    const rawFamStatus = famProf?.familyStructureStatus || 'NOT_DECLARED';

    return {
      maSV: sv.maSV,
      hoTen: sv.hoTen,
      ngaySinh: sv.ngaySinh,
      gioiTinh: sv.gioiTinh,
      lop: sv.lop,
      khoa: sv.khoa,
      soDienThoai: sv.soDienThoai,
      email: sv.email,
      trangThai: sv.trangThai,
      currentProvinceId: curAddr?.provinceUnitId || '',
      currentCommuneId: curAddr?.communeUnitId || '',
      currentProvinceName: curAddr?.provinceName || '',
      currentCommuneName: curAddr?.communeName || '',
      currentAddressFull: curAddr
        ? [curAddr.addressDetail, curAddr.communeName, curAddr.provinceName].filter(Boolean).join(', ')
        : '',
      currentAddressStatus: curAddr?.verificationStatus || 'CHƯA KHAI BÁO',
      permanentProvinceId: permAddr?.provinceUnitId || '',
      permanentCommuneId: permAddr?.communeUnitId || '',
      permanentProvinceName: permAddr?.provinceName || '',
      permanentCommuneName: permAddr?.communeName || '',
      ethnicityId: demo?.ethnicityId || '',
      ethnicityName: demo?.ethnicityId ? ethMap.get(demo.ethnicityId)?.name || '' : '',
      religionId: demo?.religionId || '',
      religionName:
        demo?.religionStatus === 'CONFIRMED_NONE'
          ? 'Không tôn giáo'
          : demo?.religionId
          ? relMap.get(demo.religionId)?.name || ''
          : '',
      familyStructureStatus: rawFamStatus === 'GUARDIAN_ONLY' ? 'OTHER' : rawFamStatus,
      fatherName: fatherMem?.fullName || '',
      fatherPhone: getFirstPhone(fatherMem),
      motherName: motherMem?.fullName || '',
      motherPhone: getFirstPhone(motherMem),
      doanJoinDate: doan?.joinDate || '',
      dangJoinDate: dang?.joinDate || '',
    };
  });

  // Server-side sorting
  const sortBy: StudentListSortBy = params.sortBy || 'maSV';
  const sortDir: SortDirection = params.sortDir === 'desc' ? 'desc' : 'asc';
  const cmpText = (a: string, b: string) =>
    a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' });

  rows.sort((a, b) => {
    let valA = a.maSV;
    let valB = b.maSV;
    switch (sortBy) {
      case 'hoTen':
        valA = a.hoTen || '';
        valB = b.hoTen || '';
        break;
      case 'lop':
        valA = a.lop || '';
        valB = b.lop || '';
        break;
      case 'soDienThoai':
        valA = a.soDienThoai || '';
        valB = b.soDienThoai || '';
        break;
      case 'ngaySinh':
        valA = a.ngaySinh || '';
        valB = b.ngaySinh || '';
        break;
      case 'email':
        valA = a.email || '';
        valB = b.email || '';
        break;
      case 'locality':
        valA = [a.currentCommuneName, a.currentProvinceName].filter(Boolean).join(', ');
        valB = [b.currentCommuneName, b.currentProvinceName].filter(Boolean).join(', ');
        break;
      case 'ethnicity':
        valA = a.ethnicityName || '';
        valB = b.ethnicityName || '';
        break;
      case 'religion':
        valA = a.religionName || '';
        valB = b.religionName || '';
        break;
      case 'maSV':
      default:
        valA = a.maSV || '';
        valB = b.maSV || '';
        break;
    }
    let cmp = cmpText(valA, valB);
    if (cmp === 0 && sortBy !== 'maSV') {
      cmp = cmpText(a.maSV, b.maSV);
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  // Locality aggregation (when explicitly requested)
  const aggregationMap = new Map<
    string,
    {
      unitId: string;
      officialCode: string;
      unitName: string;
      parentName?: string;
      status: string;
      count: number;
    }
  >();

  if (params.aggregateBy && params.aggregateBy !== 'NONE') {
    const addrType = params.aggregateAddressType || 'CURRENT';
    for (const sv of matched) {
      const svAddrs = addrBySv.get(sv.maSV.toLowerCase()) || [];
      const addr = svAddrs.find((a) => a.addressType === addrType);
      if (!addr) {
        const key = '__MISSING__';
        const cur = aggregationMap.get(key) || {
          unitId: key,
          officialCode: '-',
          unitName: 'Chưa khai báo địa chỉ',
          status: 'MISSING',
          count: 0,
        };
        cur.count++;
        aggregationMap.set(key, cur);
        continue;
      }
      if (params.aggregateBy === 'PROVINCE') {
        const key = addr.provinceUnitId;
        const cur = aggregationMap.get(key) || {
          unitId: key,
          officialCode: addr.provinceOfficialCode || '',
          unitName: addr.provinceName || '',
          status: addr.provinceStatus || 'ACTIVE',
          count: 0,
        };
        cur.count++;
        aggregationMap.set(key, cur);
      } else {
        const key = addr.communeUnitId;
        const cur = aggregationMap.get(key) || {
          unitId: key,
          officialCode: addr.communeOfficialCode || '',
          unitName: addr.communeName || '',
          parentName: addr.provinceName || '',
          status: addr.communeStatus || 'ACTIVE',
          count: 0,
        };
        cur.count++;
        aggregationMap.set(key, cur);
      }
    }
  }

  // Server-side pagination
  const total = rows.length;
  const useAll = Boolean(params.all);
  const safePageSize = useAll
    ? Math.max(total, 1)
    : Math.min(Math.max(Math.floor(Number(params.pageSize) || 20), 1), 200);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = useAll
    ? 1
    : Math.min(Math.max(Math.floor(Number(params.page) || 1), 1), totalPages);
  const startIdx = (safePage - 1) * safePageSize;
  const pagedRows = useAll ? rows : rows.slice(startIdx, startIdx + safePageSize);

  return {
    rows: pagedRows,
    items: pagedRows,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    aggregation: Array.from(aggregationMap.values()).sort((a, b) => b.count - a.count),
  };
}

export async function getStudentAuditHistory(maSV: string) {
  const logs = await getAllAuditLogs(500);
  const codeLower = maSV.toLowerCase();
  return logs.filter(
    (l: any) =>
      (l.entityId && String(l.entityId).toLowerCase() === codeLower) ||
      (l.target && String(l.target).toLowerCase().includes(codeLower)) ||
      (l.details && String(l.details).toLowerCase().includes(codeLower))
  );
}
