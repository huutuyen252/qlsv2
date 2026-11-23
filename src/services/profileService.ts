import { getAuthHeaders } from './apiService';
import {
  AdministrativeUnit,
  AdministrativeUnitHistory,
  DataQualityIssue,
  EthnicityCatalog,
  FamilyMemberContact,
  FlatStudentFilterInput,
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
  StudentFullProfileResponse,
  StudentListSortBy,
  StudentOrganizationMembership,
  UnifiedProfileUpdatePayload,
} from '../types';

export interface ProfileCatalogsBundle {
  provinces: AdministrativeUnit[];
  communes: AdministrativeUnit[];
  ethnicities: EthnicityCatalog[];
  religions: ReligionCatalog[];
  relationshipTypes: RelationshipTypeCatalog[];
  organizations: OrganizationCatalog[];
}

async function requestJson<T = any>(url: string, init?: RequestInit): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(init?.headers),
      },
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, message: err?.message || 'Lỗi kết nối máy chủ API' };
  }
}

export const profileService = {
  getCatalogs() {
    return requestJson<ProfileCatalogsBundle>('/api/profile/catalogs');
  },
  getCommunesByProvince(provinceUnitId: string, status: string = 'ACTIVE') {
    const qs = new URLSearchParams({ provinceUnitId, status }).toString();
    return requestJson<AdministrativeUnit[]>(`/api/profile/communes?${qs}`);
  },

  // Admin Catalogs: Administrative Units (2-tier)
  getAdminUnits() {
    return requestJson<{ units: AdministrativeUnit[]; history: AdministrativeUnitHistory[] }>('/api/admin/administrative-units');
  },
  saveAdminUnit(unit: Partial<AdministrativeUnit>) {
    return requestJson<AdministrativeUnit>('/api/admin/administrative-units', {
      method: 'POST',
      body: JSON.stringify(unit),
    });
  },
  importAdminUnits(rows: any[]) {
    return requestJson<{ imported: number; errors: Array<{ row: number; message: string }> }>('/api/admin/administrative-units/import', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  },
  mergeAdminUnit(sourceId: string, payload: { targetUnitId: string; resolutionNo?: string; effectiveDate: string; notes?: string }) {
    return requestJson(`/api/admin/administrative-units/${encodeURIComponent(sourceId)}/merge`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteAdminUnit(id: string) {
    return requestJson(`/api/admin/administrative-units/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // Ethnicities & Religions & Relationship Types & Organizations
  saveEthnicity(item: Partial<EthnicityCatalog>) {
    return requestJson<EthnicityCatalog>('/api/admin/ethnicities', { method: 'POST', body: JSON.stringify(item) });
  },
  importEthnicities(rows: Array<{ officialCode: string; name: string; sortOrder?: number }>) {
    return requestJson('/api/admin/ethnicities/import', { method: 'POST', body: JSON.stringify({ rows }) });
  },
  deleteEthnicity(id: string) {
    return requestJson(`/api/admin/ethnicities/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  saveReligion(item: Partial<ReligionCatalog>) {
    return requestJson<ReligionCatalog>('/api/admin/religions', { method: 'POST', body: JSON.stringify(item) });
  },
  importReligions(rows: Array<{ officialCode: string; name: string; sortOrder?: number }>) {
    return requestJson('/api/admin/religions/import', { method: 'POST', body: JSON.stringify({ rows }) });
  },
  deleteReligion(id: string) {
    return requestJson(`/api/admin/religions/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  saveRelationshipType(item: Partial<RelationshipTypeCatalog>) {
    return requestJson<RelationshipTypeCatalog>('/api/admin/relationship-types', { method: 'POST', body: JSON.stringify(item) });
  },
  deleteRelationshipType(id: string) {
    return requestJson(`/api/admin/relationship-types/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  saveOrganization(item: Partial<OrganizationCatalog>) {
    return requestJson<OrganizationCatalog>('/api/admin/organizations', { method: 'POST', body: JSON.stringify(item) });
  },
  deleteOrganization(id: string) {
    return requestJson(`/api/admin/organizations/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  // Student Full Profile (Unified View/Edit)
  getFullProfile(maSV: string) {
    return requestJson<StudentFullProfileResponse>(
      `/api/students/${encodeURIComponent(maSV)}/full-profile`
    );
  },
  saveFullProfileUnified(maSV: string, payload: UnifiedProfileUpdatePayload) {
    return requestJson<StudentFullProfileResponse>(
      `/api/students/${encodeURIComponent(maSV)}/full-profile`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  },

  saveAddressesInline(maSV: string, payload: InlineAddressesPayload) {
    return requestJson<StudentAddress[]>(`/api/students/${encodeURIComponent(maSV)}/addresses/inline`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  saveAddress(maSV: string, address: Partial<StudentAddress>) {
    return requestJson<StudentAddress>(`/api/students/${encodeURIComponent(maSV)}/addresses`, {
      method: 'POST',
      body: JSON.stringify(address),
    });
  },
  verifyAddress(maSV: string, addressId: string, status: 'VERIFIED' | 'REJECTED') {
    return requestJson<StudentAddress>(
      `/api/students/${encodeURIComponent(maSV)}/addresses/${encodeURIComponent(addressId)}/verify`,
      { method: 'POST', body: JSON.stringify({ status }) }
    );
  },
  deleteAddress(maSV: string, addressId: string) {
    return requestJson(`/api/students/${encodeURIComponent(maSV)}/addresses/${encodeURIComponent(addressId)}`, {
      method: 'DELETE',
    });
  },

  saveDemographics(maSV: string, payload: Partial<StudentDemographics>) {
    return requestJson<StudentDemographics>(`/api/students/${encodeURIComponent(maSV)}/demographics`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  saveFamilyInline(maSV: string, payload: InlineFamilyPayload) {
    return requestJson<{ profile: StudentFamilyProfile; members: StudentFamilyMember[] }>(
      `/api/students/${encodeURIComponent(maSV)}/family/inline`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
  },
  saveFamilyProfile(maSV: string, payload: Partial<StudentFamilyProfile>) {
    return requestJson<StudentFamilyProfile>(`/api/students/${encodeURIComponent(maSV)}/family-profile`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  saveFamilyMember(
    maSV: string,
    payload: Partial<Omit<StudentFamilyMember, 'contacts'>> & { contacts?: Partial<FamilyMemberContact>[] }
  ) {
    return requestJson<StudentFamilyMember>(`/api/students/${encodeURIComponent(maSV)}/family-members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteFamilyMember(maSV: string, memberId: string) {
    return requestJson(`/api/students/${encodeURIComponent(maSV)}/family-members/${encodeURIComponent(memberId)}`, {
      method: 'DELETE',
    });
  },

  saveOrganizationsInline(maSV: string, payload: InlineOrganizationsPayload) {
    return requestJson<StudentOrganizationMembership[]>(
      `/api/students/${encodeURIComponent(maSV)}/organizations/inline`,
      { method: 'PUT', body: JSON.stringify(payload) }
    );
  },
  saveOrganizationMembership(maSV: string, payload: Partial<StudentOrganizationMembership>) {
    return requestJson<StudentOrganizationMembership>(`/api/students/${encodeURIComponent(maSV)}/organizations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  deleteOrganizationMembership(maSV: string, membershipId: string) {
    return requestJson(`/api/students/${encodeURIComponent(maSV)}/organizations/${encodeURIComponent(membershipId)}`, {
      method: 'DELETE',
    });
  },

  // Unified Student List Query & Export
  queryStudentList(payload: {
    flatFilters?: FlatStudentFilterInput;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: StudentListSortBy;
    sortDir?: SortDirection;
    all?: boolean;
  }) {
    return requestJson<{
      rows: StudentBuilderRow[];
      items: StudentBuilderRow[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>('/api/students/list-query', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  exportBuilder(payload: {
    flatFilters?: FlatStudentFilterInput;
    selectedColumns: string[];
    sortBy?: StudentListSortBy;
    sortDir?: SortDirection;
  }) {
    return requestJson<{ rows: StudentBuilderRow[]; total: number }>('/api/students/builder-export', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getDataQuality() {
    return requestJson<{ issues: DataQualityIssue[]; summary: any }>('/api/students/data-quality');
  },
};

