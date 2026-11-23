import { Router, Request, Response } from 'express';
import {
  PortalAuthRequest,
  hasPortalPermission,
  requirePortalAuth,
  requirePortalRoles,
} from '../middleware/portalAuth';
import { createAuditLog, getAllSinhVien, getSinhVienByMaSV } from '../db/dbOperations';
import {
  analyzeDataQuality,
  bulkImportAdministrativeUnits,
  deleteAdministrativeUnit,
  deleteEthnicity,
  deleteOrganization,
  deleteRelationshipType,
  deleteReligion,
  deleteStudentAddress,
  deleteStudentFamilyMember,
  deleteStudentOrganizationMembership,
  getAllAdministrativeUnitHistory,
  getAllAdministrativeUnits,
  getCommunesByProvince,
  getAllEthnicities,
  getAllOrganizations,
  getAllRelationshipTypes,
  getAllReligions,
  getAllStudentAddresses,
  getStudentAuditHistory,
  getStudentDemographics,
  getStudentFamilyData,
  getStudentOrganizationMemberships,
  mergeAdministrativeUnit,
  runStudentListBuilder,
  upsertAdministrativeUnit,
  upsertEthnicity,
  upsertOrganization,
  upsertRelationshipType,
  upsertReligion,
  upsertStudentAddress,
  upsertStudentAddressesInline,
  upsertStudentDemographics,
  upsertStudentFamilyInline,
  upsertStudentFamilyMember,
  upsertStudentFamilyProfile,
  upsertStudentFullProfileUnified,
  upsertStudentOrganizationMembership,
  upsertStudentOrganizationsInline,
} from '../db/profileExpansionStore';
import { StudentFullProfileResponse, User } from '../types';

export const studentProfileRouter = Router();

function getIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

function canAccessStudentRecord(user: User, maSV: string): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'LECTURER') {
    return hasPortalPermission(user, 'canManageStudents') || hasPortalPermission(user, 'canEditHoSo');
  }
  const ownCode = (user.studentCode || user.username || '').toLowerCase();
  return ownCode === maSV.toLowerCase();
}

function computeProfilePermissions(actor: User, studentMaSV: string) {
  const isSelf =
    actor.role === 'STUDENT' &&
    (actor.studentCode || actor.username || '').toLowerCase() === studentMaSV.toLowerCase();
  const canEditCore =
    actor.role === 'ADMIN' ||
    (actor.role === 'LECTURER' && hasPortalPermission(actor, 'canManageStudents'));
  const canEditContact =
    canEditCore ||
    isSelf ||
    (actor.role === 'LECTURER' && hasPortalPermission(actor, 'canEditHoSo'));
  const canEditAny = canEditContact;
  const canVerify =
    actor.role === 'ADMIN' ||
    (actor.role !== 'STUDENT' && hasPortalPermission(actor, 'canVerifyProfiles'));
  const canEditOrganizations =
    actor.role === 'ADMIN' ||
    (actor.role === 'LECTURER' && hasPortalPermission(actor, 'canManageStudents'));

  return {
    canEditCore,
    canEditContact,
    canEditAddress: canEditAny,
    canVerifyAddress: canVerify,
    canEditDemographics: canEditAny,
    canEditFamily: canEditAny,
    canVerifyFamily: canVerify,
    canEditOrganizations,
    canVerifyOrganizations: canVerify,
    canExport: actor.role === 'ADMIN' || (actor.role !== 'STUDENT' && hasPortalPermission(actor, 'canExportProfiles')),
  };
}

async function buildFullProfileResponse(maSV: string, actor: User): Promise<StudentFullProfileResponse | null> {
  const student = await getSinhVienByMaSV(maSV);
  if (!student) return null;

  const [addresses, rawDemographics, familyData, organizations, auditHistory, dqResult] = await Promise.all([
    getAllStudentAddresses(student.maSV),
    getStudentDemographics(student.maSV),
    getStudentFamilyData(student.maSV),
    getStudentOrganizationMemberships(student.maSV),
    getStudentAuditHistory(student.maSV),
    analyzeDataQuality(new Set([student.maSV.toLowerCase()])),
  ]);

  let score = 0;
  const totalChecks = 6;
  if (addresses.some((a) => a.addressType === 'PERMANENT')) score++;
  if (addresses.some((a) => a.addressType === 'CURRENT')) score++;
  if (rawDemographics && rawDemographics.ethnicityStatus === 'DECLARED') score++;
  if (familyData.profile && familyData.profile.familyStructureStatus !== 'NOT_DECLARED') score++;
  if (familyData.members.some((m) => m.isEmergencyContact && m.contacts.length > 0)) score++;
  if (organizations.length > 0) score++;

  const normalizedFamilyProfile = familyData.profile
    ? {
        ...familyData.profile,
        familyStructureStatus:
          familyData.profile.familyStructureStatus === 'GUARDIAN_ONLY'
            ? ('OTHER' as const)
            : familyData.profile.familyStructureStatus,
      }
    : null;

  return {
    student,
    addresses,
    demographics: rawDemographics || null,
    familyProfile: normalizedFamilyProfile,
    familyMembers: familyData.members,
    organizations,
    auditHistory,
    dataQualityIssues: dqResult.issues,
    completenessPercent: Math.round((score / totalChecks) * 100),
    permissions: computeProfilePermissions(actor, student.maSV),
  };
}

// ==================== 1. READ SHARED CATALOGS ====================

studentProfileRouter.get('/profile/catalogs', requirePortalAuth, async (_req: PortalAuthRequest, res: Response) => {
  try {
    const [provinces, communes, ethnicities, religions, relationshipTypes, organizations] =
      await Promise.all([
        getAllAdministrativeUnits({ unitLevel: 'PROVINCE' }),
        getAllAdministrativeUnits({ unitLevel: 'COMMUNE' }),
        getAllEthnicities(),
        getAllReligions(),
        getAllRelationshipTypes(),
        getAllOrganizations(),
      ]);

    return res.json({
      success: true,
      data: {
        provinces,
        communes,
        ethnicities: ethnicities.filter((e) => e.isActive),
        religions: religions.filter((r) => r.isActive),
        relationshipTypes: relationshipTypes.filter((rt) => rt.isActive),
        organizations: organizations.filter((o) => o.isActive),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Lỗi tải danh mục chuẩn.' });
  }
});

studentProfileRouter.get('/profile/communes', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const provinceUnitId = String(req.query.provinceUnitId || '').trim();
    const status = String(req.query.status || 'ACTIVE').trim();
    if (!provinceUnitId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn Tỉnh/Thành phố (provinceUnitId).' });
    }
    const communes = await getCommunesByProvince(provinceUnitId, status);
    return res.json({ success: true, data: communes });
  } catch (err: any) {
    const msg = err?.message || 'Lỗi tải danh sách Xã/Phường/Đặc khu.';
    const statusCode = msg.includes('không tồn tại') ? 404 : 400;
    return res.status(statusCode).json({ success: false, message: msg });
  }
});

// ==================== 2. ADMIN CATALOG & CUSTOM FIELD MANAGEMENT ====================

studentProfileRouter.get('/admin/administrative-units', requirePortalAuth, async (_req, res) => {
  try {
    const [units, history] = await Promise.all([
      getAllAdministrativeUnits(),
      getAllAdministrativeUnitHistory(),
    ]);
    return res.json({ success: true, data: { units, history } });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

studentProfileRouter.post('/admin/administrative-units', requirePortalRoles('ADMIN'), async (req: PortalAuthRequest, res: Response) => {
  try {
    const saved = await upsertAdministrativeUnit(req.body);
    await createAuditLog({
      user: req.authUser!.username,
      role: req.authUser!.role,
      actorUserId: req.authUser!.id,
      action: 'UPSERT_ADMIN_UNIT',
      entityType: 'administrative_units',
      entityId: saved.id,
      target: `Đơn vị HC: ${saved.officialCode} - ${saved.name}`,
      details: `Lưu đơn vị hành chính cấp ${saved.unitLevel}: ${saved.name}`,
      afterJson: saved,
      ip: getIp(req),
    });
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.post('/admin/administrative-units/import', requirePortalRoles('ADMIN'), async (req: PortalAuthRequest, res: Response) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách đơn vị hành chính import không hợp lệ.' });
    }
    const result = await bulkImportAdministrativeUnits(rows);
    await createAuditLog({
      user: req.authUser!.username,
      role: req.authUser!.role,
      actorUserId: req.authUser!.id,
      action: 'IMPORT_ADMIN_UNITS',
      entityType: 'administrative_units',
      target: 'Danh mục hành chính 2 cấp',
      details: `Import ${result.imported} đơn vị hành chính (lỗi: ${result.errors.length})`,
      ip: getIp(req),
    });
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.post('/admin/administrative-units/:id/merge', requirePortalRoles('ADMIN'), async (req: PortalAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { targetUnitId, resolutionNo, effectiveDate, notes } = req.body;
    const result = await mergeAdministrativeUnit({
      sourceUnitId: id,
      targetUnitId,
      resolutionNo,
      effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
      notes,
      actorUsername: req.authUser!.username,
    });
    await createAuditLog({
      user: req.authUser!.username,
      role: req.authUser!.role,
      actorUserId: req.authUser!.id,
      action: 'MERGE_ADMIN_UNIT',
      entityType: 'administrative_units',
      entityId: id,
      target: `Sáp nhập ĐVHC ${id} -> ${targetUnitId}`,
      details: `Sáp nhập đơn vị hành chính theo QĐ ${resolutionNo || 'chưa ghi'}`,
      afterJson: result,
      ip: getIp(req),
    });
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.delete('/admin/administrative-units/:id', requirePortalRoles('ADMIN'), async (req: PortalAuthRequest, res: Response) => {
  try {
    await deleteAdministrativeUnit(req.params.id);
    await createAuditLog({
      user: req.authUser!.username,
      role: req.authUser!.role,
      actorUserId: req.authUser!.id,
      action: 'DELETE_ADMIN_UNIT',
      entityType: 'administrative_units',
      entityId: req.params.id,
      target: `Đơn vị HC: ${req.params.id}`,
      details: 'Xóa đơn vị hành chính chưa được tham chiếu',
      ip: getIp(req),
    });
    return res.json({ success: true, message: 'Đã xóa đơn vị hành chính.' });
  } catch (err: any) {
    return res.status(409).json({ success: false, message: err.message });
  }
});

// Ethnicities
studentProfileRouter.get('/admin/ethnicities', requirePortalAuth, async (_req, res) => {
  res.json({ success: true, data: await getAllEthnicities() });
});

studentProfileRouter.post('/admin/ethnicities', requirePortalRoles('ADMIN'), async (req: PortalAuthRequest, res: Response) => {
  try {
    const saved = await upsertEthnicity(req.body);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.post('/admin/ethnicities/import', requirePortalRoles('ADMIN'), async (req: PortalAuthRequest, res: Response) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách dân tộc không hợp lệ.' });
    }
    let imported = 0;
    for (const r of rows) {
      if (r.officialCode && r.name) {
        await upsertEthnicity(r);
        imported++;
      }
    }
    return res.json({ success: true, data: { imported } });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.delete('/admin/ethnicities/:id', requirePortalRoles('ADMIN'), async (req, res) => {
  try {
    await deleteEthnicity(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(409).json({ success: false, message: err.message });
  }
});

// Religions
studentProfileRouter.get('/admin/religions', requirePortalAuth, async (_req, res) => {
  res.json({ success: true, data: await getAllReligions() });
});

studentProfileRouter.post('/admin/religions', requirePortalRoles('ADMIN'), async (req, res) => {
  try {
    const saved = await upsertReligion(req.body);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.post('/admin/religions/import', requirePortalRoles('ADMIN'), async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách tôn giáo không hợp lệ.' });
    }
    let imported = 0;
    for (const r of rows) {
      if (r.officialCode && r.name) {
        await upsertReligion(r);
        imported++;
      }
    }
    return res.json({ success: true, data: { imported } });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.delete('/admin/religions/:id', requirePortalRoles('ADMIN'), async (req, res) => {
  try {
    await deleteReligion(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(409).json({ success: false, message: err.message });
  }
});

// Relationship Types
studentProfileRouter.get('/admin/relationship-types', requirePortalAuth, async (_req, res) => {
  res.json({ success: true, data: await getAllRelationshipTypes() });
});

studentProfileRouter.post('/admin/relationship-types', requirePortalRoles('ADMIN'), async (req, res) => {
  try {
    const saved = await upsertRelationshipType(req.body);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.delete('/admin/relationship-types/:id', requirePortalRoles('ADMIN'), async (req, res) => {
  try {
    await deleteRelationshipType(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(409).json({ success: false, message: err.message });
  }
});

// Organizations
studentProfileRouter.get('/admin/organizations', requirePortalAuth, async (_req, res) => {
  res.json({ success: true, data: await getAllOrganizations() });
});

studentProfileRouter.post('/admin/organizations', requirePortalRoles('ADMIN'), async (req, res) => {
  try {
    const saved = await upsertOrganization(req.body);
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.delete('/admin/organizations/:id', requirePortalRoles('ADMIN'), async (req, res) => {
  try {
    await deleteOrganization(req.params.id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(409).json({ success: false, message: err.message });
  }
});

// ==================== 3. STUDENT LIST QUERY & EXPORT ====================

const ALLOWED_SORT_FIELDS = new Set([
  'maSV',
  'hoTen',
  'lop',
  'soDienThoai',
  'ngaySinh',
  'email',
  'locality',
  'ethnicity',
  'religion',
]);

studentProfileRouter.post('/students/list-query', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const {
      flatFilters,
      search,
      page,
      pageSize,
      sortBy,
      sortDir,
      all,
      aggregateBy,
      aggregateAddressType,
    } = req.body || {};

    if (sortBy && !ALLOWED_SORT_FIELDS.has(String(sortBy))) {
      return res.status(400).json({ success: false, message: 'Trường sắp xếp không hợp lệ.' });
    }

    const effectiveFlatFilters =
      typeof search === 'string'
        ? { ...(flatFilters || {}), search }
        : flatFilters;

    const result = await runStudentListBuilder({
      actorUser: actor,
      flatFilters: effectiveFlatFilters,
      aggregateBy: aggregateBy || 'NONE',
      aggregateAddressType: aggregateAddressType || 'CURRENT',
      page,
      pageSize,
      sortBy,
      sortDir,
      all,
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.post('/students/builder-export', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    if (actor.role === 'STUDENT' || !hasPortalPermission(actor, 'canExportProfiles')) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xuất báo cáo hồ sơ sinh viên (yêu cầu quyền canExportProfiles).',
      });
    }
    const { flatFilters, selectedColumns, sortBy, sortDir } = req.body || {};

    const result = await runStudentListBuilder({
      actorUser: actor,
      flatFilters,
      sortBy,
      sortDir,
      all: true,
    });

    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'EXPORT_PROFILES',
      entityType: 'student_list_export',
      target: 'Xuất báo cáo hồ sơ sinh viên',
      details: `Xuất ${result.total} hồ sơ sinh viên (cột: ${(selectedColumns || []).join(', ') || 'mặc định'})`,
      ip: getIp(req),
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.get('/students/data-quality', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    let scopedMaSVs: Set<string> | undefined;
    if (actor.role === 'STUDENT') {
      const ownCode = (actor.studentCode || actor.username || '').toLowerCase();
      scopedMaSVs = new Set(ownCode ? [ownCode] : []);
    } else if (actor.role === 'LECTURER' && !hasPortalPermission(actor, 'canManageStudents')) {
      return res.status(403).json({ success: false, message: 'Bạn chưa được cấp quyền xem chất lượng hồ sơ.' });
    }
    const result = await analyzeDataQuality(scopedMaSVs);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 4. STUDENT FULL PROFILE (UNIFIED VIEW / EDIT) ====================

studentProfileRouter.get('/students/:maSV/full-profile', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const { maSV } = req.params;

    if (!canAccessStudentRecord(actor, maSV)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem chi tiết hồ sơ sinh viên này.',
      });
    }

    const payload = await buildFullProfileResponse(maSV, actor);
    if (!payload) {
      return res.status(404).json({ success: false, message: `Không tìm thấy sinh viên mã ${maSV}.` });
    }

    return res.json({ success: true, data: payload });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

studentProfileRouter.put('/students/:maSV/full-profile', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const { maSV } = req.params;

    if (!canAccessStudentRecord(actor, maSV)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật hồ sơ sinh viên này.',
      });
    }

    const existingStudent = await getSinhVienByMaSV(maSV);
    if (!existingStudent) {
      return res.status(404).json({ success: false, message: `Không tìm thấy sinh viên mã ${maSV}.` });
    }

    const perms = computeProfilePermissions(actor, existingStudent.maSV);
    const body = req.body || {};

    if (!perms.canEditCore && body.core) {
      const coreKeys = Object.keys(body.core).filter((k) => k !== 'soDienThoai' && k !== 'email');
      if (coreKeys.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Bạn chỉ được cập nhật số điện thoại và email liên hệ, không có quyền sửa thông tin định danh.',
        });
      }
    }
    if (!perms.canEditOrganizations && body.organizations !== undefined) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ Cán bộ quản lý / Admin được phép cập nhật thông tin Đoàn/Đảng.',
      });
    }

    await upsertStudentFullProfileUnified(existingStudent.maSV, body, actor, {
      canEditCore: perms.canEditCore,
      canEditContact: perms.canEditContact,
      canEditAddress: perms.canEditAddress,
      canEditDemographics: perms.canEditDemographics,
      canEditFamily: perms.canEditFamily,
      canEditOrganizations: perms.canEditOrganizations,
      canVerifyProfiles: perms.canVerifyAddress,
    });

    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'UPDATE_FULL_PROFILE',
      entityType: 'sinh_vien',
      entityId: existingStudent.maSV,
      target: `Hồ sơ SV ${existingStudent.maSV}`,
      details: `Cập nhật hồ sơ chi tiết sinh viên ${existingStudent.hoTen} (${existingStudent.maSV})`,
      ip: getIp(req),
    });

    const refreshed = await buildFullProfileResponse(existingStudent.maSV, actor);
    return res.json({ success: true, data: refreshed });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// Addresses
studentProfileRouter.put('/students/:maSV/addresses/inline', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const { maSV } = req.params;
    if (!canAccessStudentRecord(actor, maSV)) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật địa chỉ sinh viên này.' });
    }
    const isSelf = actor.role === 'STUDENT';
    const saved = await upsertStudentAddressesInline(maSV, req.body || {}, actor.username, {
      source: isSelf ? 'STUDENT_SELF' : 'STAFF_ENTRY',
      verificationStatus:
        isSelf || !hasPortalPermission(actor, 'canVerifyProfiles') ? 'PENDING_REVIEW' : 'VERIFIED',
    });
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'UPSERT_ADDRESS_INLINE',
      entityType: 'sinh_vien',
      entityId: maSV,
      target: `Địa chỉ SV ${maSV}`,
      details: `Lưu trực tiếp ${saved.length} địa chỉ 2 cấp`,
      ip: getIp(req),
    });
    return res.json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.post('/students/:maSV/addresses', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const { maSV } = req.params;
    if (!canAccessStudentRecord(actor, maSV)) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật địa chỉ sinh viên này.' });
    }
    const isSelf = actor.role === 'STUDENT';
    const payload = {
      ...req.body,
      maSV,
      source: isSelf ? 'STUDENT_SELF' : req.body.source || 'STAFF_ENTRY',
      verificationStatus:
        isSelf || !hasPortalPermission(actor, 'canVerifyProfiles')
          ? 'PENDING_REVIEW'
          : req.body.verificationStatus || 'VERIFIED',
    };
    const saved = await upsertStudentAddress(payload, actor.username);
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'UPSERT_ADDRESS',
      entityType: 'sinh_vien',
      entityId: maSV,
      target: `Địa chỉ SV ${maSV}`,
      details: `Cập nhật địa chỉ (${saved.addressType}): ${saved.communeName}, ${saved.provinceName}`,
      afterJson: saved,
      ip: getIp(req),
    });
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.post('/students/:maSV/addresses/:addressId/verify', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    if (actor.role !== 'ADMIN' && !hasPortalPermission(actor, 'canVerifyProfiles')) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xác minh địa chỉ.' });
    }
    const existingList = await getAllStudentAddresses(req.params.maSV);
    const existing = existingList.find((a) => a.id === req.params.addressId);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi địa chỉ.' });
    }
    const status = req.body.status === 'REJECTED' ? 'REJECTED' : 'VERIFIED';
    const updated = await upsertStudentAddress(
      {
        ...existing,
        verificationStatus: status,
        verifiedBy: actor.username,
        verifiedAt: new Date().toISOString(),
      },
      actor.username
    );
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'VERIFY_ADDRESS',
      entityType: 'sinh_vien',
      entityId: req.params.maSV,
      target: `Xác minh địa chỉ SV ${req.params.maSV}`,
      details: `Chuyển trạng thái địa chỉ (${updated.addressType}) sang ${status}`,
      ip: getIp(req),
    });
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.delete('/students/:maSV/addresses/:addressId', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    if (!canAccessStudentRecord(actor, req.params.maSV)) {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa địa chỉ.' });
    }
    await deleteStudentAddress(req.params.addressId);
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'DELETE_ADDRESS',
      entityType: 'sinh_vien',
      entityId: req.params.maSV,
      target: `Địa chỉ SV ${req.params.maSV}`,
      details: `Xóa bản ghi địa chỉ ${req.params.addressId}`,
      ip: getIp(req),
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// Demographics
studentProfileRouter.put('/students/:maSV/demographics', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const { maSV } = req.params;
    if (!canAccessStudentRecord(actor, maSV)) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật thông tin dân tộc/tôn giáo.' });
    }
    const saved = await upsertStudentDemographics(
      maSV,
      {
        ...req.body,
        source: actor.role === 'STUDENT' ? 'STUDENT_SELF' : req.body.source || 'STAFF_ENTRY',
      },
      actor.username
    );
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'UPDATE_DEMOGRAPHICS',
      entityType: 'sinh_vien',
      entityId: maSV,
      target: `Nhân thân SV ${maSV}`,
      details: `Cập nhật dân tộc (${saved.ethnicityStatus}) và tôn giáo (${saved.religionStatus})`,
      ip: getIp(req),
    });
    return res.json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// Family Profile & Members
studentProfileRouter.put('/students/:maSV/family/inline', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const { maSV } = req.params;
    if (!canAccessStudentRecord(actor, maSV)) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật thông tin gia đình.' });
    }
    const saved = await upsertStudentFamilyInline(maSV, req.body || {}, actor.username);
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'UPDATE_FAMILY_INLINE',
      entityType: 'sinh_vien',
      entityId: maSV,
      target: `Gia đình SV ${maSV}`,
      details: `Cập nhật gia đình (${saved.profile.familyStructureStatus}, ${saved.members.length} thành viên)`,
      ip: getIp(req),
    });
    return res.json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.put('/students/:maSV/family-profile', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const { maSV } = req.params;
    if (!canAccessStudentRecord(actor, maSV)) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật cấu trúc gia đình.' });
    }
    const saved = await upsertStudentFamilyProfile(maSV, req.body, actor.username);
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'UPDATE_FAMILY_PROFILE',
      entityType: 'sinh_vien',
      entityId: maSV,
      target: `Cấu trúc gia đình SV ${maSV}`,
      details: `Cập nhật cấu trúc gia đình: ${saved.familyStructureStatus} (${saved.dataCompletenessState})`,
      afterJson: saved,
      ip: getIp(req),
    });
    return res.json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.post('/students/:maSV/family-members', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const { maSV } = req.params;
    if (!canAccessStudentRecord(actor, maSV)) {
      return res.status(403).json({ success: false, message: 'Không có quyền cập nhật thành viên gia đình.' });
    }
    const saved = await upsertStudentFamilyMember(maSV, req.body, actor.username);
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'UPSERT_FAMILY_MEMBER',
      entityType: 'sinh_vien',
      entityId: maSV,
      target: `Thành viên gia đình SV ${maSV}`,
      details: `Lưu thành viên gia đình "${saved.fullName}" (${saved.relationshipLabel || saved.relationshipTypeId})`,
      ip: getIp(req),
    });
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.delete('/students/:maSV/family-members/:memberId', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    if (!canAccessStudentRecord(actor, req.params.maSV)) {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa thành viên gia đình.' });
    }
    await deleteStudentFamilyMember(req.params.memberId);
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'DELETE_FAMILY_MEMBER',
      entityType: 'sinh_vien',
      entityId: req.params.maSV,
      target: `Thành viên gia đình SV ${req.params.maSV}`,
      details: `Xóa thành viên gia đình ${req.params.memberId}`,
      ip: getIp(req),
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// Organizations (Đoàn / Đảng)
studentProfileRouter.put('/students/:maSV/organizations/inline', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const { maSV } = req.params;
    if (actor.role !== 'ADMIN' && !hasPortalPermission(actor, 'canManageStudents')) {
      return res.status(403).json({ success: false, message: 'Chỉ Cán bộ quản lý / Admin được phép cập nhật thông tin Đoàn/Đảng.' });
    }
    const saved = await upsertStudentOrganizationsInline(maSV, req.body || {}, actor.username);
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'UPDATE_ORGANIZATIONS_INLINE',
      entityType: 'sinh_vien',
      entityId: maSV,
      target: `Đoàn/Đảng SV ${maSV}`,
      details: `Lưu trực tiếp ngày vào Đoàn / Đảng (${saved.length} bản ghi)`,
      ip: getIp(req),
    });
    return res.json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.post('/students/:maSV/organizations', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    const { maSV } = req.params;
    if (actor.role !== 'ADMIN' && !hasPortalPermission(actor, 'canManageStudents')) {
      return res.status(403).json({ success: false, message: 'Chỉ Cán bộ quản lý / Admin được phép cập nhật thông tin Đoàn/Đảng.' });
    }
    const saved = await upsertStudentOrganizationMembership(maSV, req.body, actor.username);
    await createAuditLog({
      user: actor.username,
      role: actor.role,
      actorUserId: actor.id,
      action: 'UPSERT_ORGANIZATION',
      entityType: 'sinh_vien',
      entityId: maSV,
      target: `Đoàn/Đảng SV ${maSV}`,
      details: `Cập nhật tổ chức ${saved.organizationName}: trạng thái ${saved.membershipStatus}`,
      afterJson: saved,
      ip: getIp(req),
    });
    return res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

studentProfileRouter.delete('/students/:maSV/organizations/:membershipId', requirePortalAuth, async (req: PortalAuthRequest, res: Response) => {
  try {
    const actor = req.authUser!;
    if (actor.role !== 'ADMIN' && !hasPortalPermission(actor, 'canManageStudents')) {
      return res.status(403).json({ success: false, message: 'Không có quyền xóa thông tin Đoàn/Đảng.' });
    }
    await deleteStudentOrganizationMembership(req.params.membershipId);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});
