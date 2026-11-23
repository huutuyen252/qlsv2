export type AdminUnitLevel = 'PROVINCE' | 'COMMUNE';
export type AdminUnitStatus = 'ACTIVE' | 'MERGED' | 'INACTIVE';
export type AdminUnitChangeType =
  | 'MERGED'
  | 'SPLIT'
  | 'RENAMED'
  | 'BOUNDARY_ADJUSTED'
  | 'DEACTIVATED';

export interface AdministrativeUnit {
  id: string;
  officialCode: string;
  unitLevel: AdminUnitLevel;
  name: string;
  shortName?: string;
  unitType: string; // Tỉnh / Thành phố trực thuộc TW / Xã / Phường / Đặc khu
  parentId?: string | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: AdminUnitStatus;
  successorUnitId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdministrativeUnitHistory {
  id: string;
  sourceUnitId: string;
  targetUnitId?: string | null;
  changeType: AdminUnitChangeType;
  resolutionNo?: string;
  effectiveDate: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export type AddressType = 'PERMANENT' | 'CURRENT' | 'TEMPORARY';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
export type AddressSource =
  | 'STUDENT_SELF'
  | 'ADMISSION_IMPORT'
  | 'STAFF_ENTRY'
  | 'NATIONAL_ID_SYNC';

export interface StudentAddress {
  id: string;
  maSV: string;
  addressType: AddressType;
  provinceUnitId: string;
  communeUnitId: string;
  addressDetail: string;
  isPrimary: boolean;
  validFrom: string;
  validTo?: string | null;
  verificationStatus: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  source: AddressSource;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  // Joined read-only projection fields
  provinceName?: string;
  provinceOfficialCode?: string;
  provinceStatus?: AdminUnitStatus;
  communeName?: string;
  communeOfficialCode?: string;
  communeStatus?: AdminUnitStatus;
  communeSuccessorId?: string | null;
}

export interface EthnicityCatalog {
  id: string;
  officialCode: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ReligionCatalog {
  id: string;
  officialCode: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export type EthnicityStatus = 'DECLARED' | 'NOT_DECLARED';
export type ReligionStatus = 'DECLARED' | 'CONFIRMED_NONE' | 'NOT_DECLARED';

export interface StudentDemographics {
  maSV: string;
  ethnicityId?: string | null;
  ethnicityStatus: EthnicityStatus;
  religionId?: string | null;
  religionStatus: ReligionStatus;
  verificationStatus: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  source: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  // Joined read-only projection fields
  ethnicityName?: string | null;
  ethnicityCode?: string | null;
  religionName?: string | null;
  religionCode?: string | null;
}

export type FamilyStructureStatus =
  | 'BOTH_PARENTS'
  | 'FATHER_ONLY'
  | 'MOTHER_ONLY'
  | 'GUARDIAN_ONLY'
  | 'OTHER'
  | 'NOT_DECLARED';

export type DataCompletenessState =
  | 'NOT_ENTERED'
  | 'PARTIAL'
  | 'CONFIRMED_NO_INFO'
  | 'COMPLETE';

export interface RelationshipTypeCatalog {
  id: string;
  code: string; // FATHER, MOTHER, GUARDIAN, SIBLING, GRANDPARENT, OTHER
  labelVi: string;
  isParental: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface StudentFamilyProfile {
  id: string;
  maSV: string;
  familyStructureStatus: FamilyStructureStatus;
  dataCompletenessState: DataCompletenessState;
  verificationStatus: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  notes?: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type FamilyContactType = 'PHONE' | 'ZALO' | 'EMAIL' | 'OTHER';

export interface FamilyMemberContact {
  id: string;
  familyMemberId: string;
  contactType: FamilyContactType;
  contactValue: string;
  isPrimary: boolean;
  isEmergency: boolean;
  canReceiveSms: boolean;
  verificationStatus: VerificationStatus;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFamilyMember {
  id: string;
  familyProfileId: string;
  maSV: string;
  relationshipTypeId: string;
  relationshipCode?: string;
  relationshipLabel?: string;
  fullName: string;
  birthYear?: number | null;
  isDeceased: boolean;
  occupation?: string | null;
  workplace?: string | null;
  provinceUnitId?: string | null;
  communeUnitId?: string | null;
  addressDetail?: string | null;
  provinceName?: string | null;
  communeName?: string | null;
  isGuardian: boolean;
  isPrimaryContact: boolean;
  isEmergencyContact: boolean;
  notes?: string | null;
  contacts: FamilyMemberContact[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationCatalog {
  id: string;
  code: string; // DOAN_TNCS, DANG_CSVN, ...
  name: string;
  isActive: boolean;
}

export type MembershipStatus =
  | 'NOT_MEMBER'
  | 'CANDIDATE'
  | 'PROBATIONARY'
  | 'OFFICIAL'
  | 'TRANSFERRED'
  | 'LEFT';

export interface StudentOrganizationMembership {
  id: string;
  maSV: string;
  organizationId: string;
  organizationCode?: string;
  organizationName?: string;
  membershipStatus: MembershipStatus;
  joinDate?: string | null;
  officialDate?: string | null;
  membershipCode?: string | null;
  unitName?: string | null;
  evidenceFileUrl?: string | null;
  verificationStatus: VerificationStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DataQualityIssueCategory =
  | 'MISSING_CURRENT_ADDRESS'
  | 'MISSING_PERMANENT_ADDRESS'
  | 'UNVERIFIED_ADDRESS'
  | 'EXPIRED_OR_MERGED_ADMIN_UNIT'
  | 'FAMILY_NOT_DECLARED'
  | 'FAMILY_INCOMPLETE'
  | 'MISSING_EMERGENCY_CONTACT'
  | 'INCOMPLETE_ORGANIZATION_INFO'
  | 'UNRESOLVED_CLASS_MAPPING'
  | 'MISSING_DEMOGRAPHICS';

export interface DataQualityIssue {
  id: string;
  maSV: string;
  hoTen: string;
  lop: string;
  khoa: string;
  category: DataQualityIssueCategory;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  targetTab:
    | 'OVERVIEW'
    | 'PERSONAL'
    | 'ADDRESS'
    | 'FAMILY'
    | 'ORGANIZATION'
    | 'ACADEMIC'
    | 'TRAINING'
    | 'HISTORY';
  description: string;
}

export interface StudentFullProfileResponse {
  student: any;
  addresses: StudentAddress[];
  demographics: StudentDemographics | null;
  familyProfile: StudentFamilyProfile | null;
  familyMembers: StudentFamilyMember[];
  organizations: StudentOrganizationMembership[];
  auditHistory: any[];
  dataQualityIssues: DataQualityIssue[];
  completenessPercent: number;
  permissions: {
    canEditCore: boolean;
    canEditContact: boolean;
    canEditAddress: boolean;
    canVerifyAddress: boolean;
    canEditDemographics: boolean;
    canEditFamily: boolean;
    canVerifyFamily: boolean;
    canEditOrganizations: boolean;
    canVerifyOrganizations: boolean;
    canExport: boolean;
  };
}

export interface FlatStudentFilterInput {
  search?: string;
  khoa?: string;
  lop?: string;
  trangThai?: string;
  gioiTinh?: string;
  provinceUnitId?: string;
  communeUnitId?: string;
  ethnicityId?: string;
  religionId?: string;
  familyStructureStatus?: FamilyStructureStatus | '';
}

export type StudentListSortBy =
  | 'maSV'
  | 'hoTen'
  | 'lop'
  | 'soDienThoai'
  | 'ngaySinh'
  | 'email'
  | 'locality'
  | 'ethnicity'
  | 'religion';

export type SortDirection = 'asc' | 'desc';

export interface StudentBuilderRow {
  maSV: string;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: string;
  lop: string;
  khoa: string;
  soDienThoai: string;
  email: string;
  trangThai: string;
  currentProvinceId: string;
  currentCommuneId: string;
  currentProvinceName: string;
  currentCommuneName: string;
  currentAddressFull: string;
  currentAddressStatus: string;
  permanentProvinceId: string;
  permanentCommuneId: string;
  permanentProvinceName: string;
  permanentCommuneName: string;
  ethnicityId: string;
  ethnicityName: string;
  religionId: string;
  religionName: string;
  familyStructureStatus: string;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  doanJoinDate: string;
  dangJoinDate: string;
}

export interface InlineAddressEntryInput {
  id?: string;
  provinceUnitId?: string;
  communeUnitId?: string;
  addressDetail?: string;
  validFrom?: string;
  clear?: boolean;
}

export interface InlineAddressesPayload {
  current?: InlineAddressEntryInput | null;
  permanent?: InlineAddressEntryInput | null;
  temporary?: InlineAddressEntryInput | null;
}

export interface InlineFamilyMemberInput {
  id?: string;
  fullName?: string;
  phone?: string;
  occupation?: string;
  isDeceased?: boolean;
  isEmergencyContact?: boolean;
  isGuardian?: boolean;
  relationshipTypeId?: string;
  clear?: boolean;
}

export interface InlineFamilyPayload {
  familyStructureStatus: FamilyStructureStatus;
  dataCompletenessState?: StudentFamilyProfile['dataCompletenessState'];
  notes?: string | null;
  father?: InlineFamilyMemberInput | null;
  mother?: InlineFamilyMemberInput | null;
  guardian?: InlineFamilyMemberInput | null;
}

export interface InlineOrganizationsPayload {
  doanJoinDate?: string | null;
  dangJoinDate?: string | null;
  dangOfficialDate?: string | null;
}

export interface UnifiedProfileUpdatePayload {
  core?: {
    hoTen?: string;
    ngaySinh?: string;
    gioiTinh?: 'Nam' | 'Nữ';
    soDienThoai?: string;
    email?: string;
    trangThai?: 'Đang học' | 'Bảo lưu' | 'Tốt nghiệp' | 'Đã thôi học' | 'Thôi học';
  };
  demographics?: {
    ethnicityStatus: EthnicityStatus;
    ethnicityId?: string | null;
    religionStatus: ReligionStatus;
    religionId?: string | null;
  };
  addresses?: InlineAddressesPayload;
  family?: InlineFamilyPayload;
  organizations?: InlineOrganizationsPayload;
}

