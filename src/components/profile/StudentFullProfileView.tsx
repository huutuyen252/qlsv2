import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  AdministrativeUnit,
  Diem,
  FamilyStructureStatus,
  RenLuyen,
  SinhVien,
  StudentAddress,
  StudentFullProfileResponse,
  UnifiedProfileUpdatePayload,
  User,
} from '../../types';
import { profileService, ProfileCatalogsBundle } from '../../services/profileService';
import {
  Breadcrumb,
  ErrorBanner,
  LoadingState,
  StatusBadge,
} from '../common';
import {
  ArrowLeft,
  Check,
  Copy,
  Edit3,
  Home,
  Mail,
  MapPin,
  Phone,
  User as UserIcon,
  X,
} from 'lucide-react';

export type ProfileTabKey =
  | 'GENERAL'
  | 'ADDRESS'
  | 'ADDITIONAL'
  | 'OVERVIEW'
  | 'PERSONAL'
  | 'ACADEMIC'
  | 'TRAINING'
  | 'HISTORY';

function formatDateVi(iso?: string | null): string {
  if (!iso) return 'Chưa có thông tin';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function getStatusVariant(trangThai?: string) {
  if (trangThai === 'Đang học') return 'success';
  if (trangThai === 'Bảo lưu') return 'warning';
  if (trangThai === 'Tốt nghiệp') return 'info';
  return 'danger';
}

function getNameInitials(fullName?: string): string {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface AddressFormState {
  id: string;
  provinceUnitId: string;
  communeUnitId: string;
  addressDetail: string;
}

interface StudentFullProfileViewProps {
  maSV: string;
  currentUser: User | null;
  grades?: Diem[];
  trainingPoints?: RenLuyen[];
  initialTab?: ProfileTabKey;
  onBack?: () => void;
  onProfileSaved?: () => Promise<void> | void;
  showToast?: (msg: string) => void;
  onGoToCatalogs?: () => void;
}

export const StudentFullProfileView: React.FC<StudentFullProfileViewProps> = ({
  maSV,
  currentUser,
  onBack,
  onProfileSaved,
  showToast,
  onGoToCatalogs,
}) => {
  const formId = useId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [copiedMaSV, setCopiedMaSV] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<'A' | 'B' | 'C'>('A');

  const [profile, setProfile] = useState<StudentFullProfileResponse | null>(null);
  const [catalogs, setCatalogs] = useState<ProfileCatalogsBundle | null>(null);

  // Section A: Thông tin cá nhân
  const [coreForm, setCoreForm] = useState({
    hoTen: '',
    ngaySinh: '',
    gioiTinh: 'Nam' as 'Nam' | 'Nữ',
    trangThai: 'Đang học' as SinhVien['trangThai'],
    soDienThoai: '',
    email: '',
  });
  const [ethnicityId, setEthnicityId] = useState('');
  const [religionValue, setReligionValue] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [existingFatherId, setExistingFatherId] = useState('');
  const [existingMotherId, setExistingMotherId] = useState('');
  const [existingFamilyStructure, setExistingFamilyStructure] = useState<FamilyStructureStatus>('NOT_DECLARED');

  // Section B & C: Nơi ở hiện tại & Địa chỉ thường trú (2 cấp)
  const [currentAddr, setCurrentAddr] = useState<AddressFormState>({
    id: '',
    provinceUnitId: '',
    communeUnitId: '',
    addressDetail: '',
  });
  const [permanentAddr, setPermanentAddr] = useState<AddressFormState>({
    id: '',
    provinceUnitId: '',
    communeUnitId: '',
    addressDetail: '',
  });

  // Dynamic cascading communes fetched via GET /api/profile/communes
  const [currentCommunes, setCurrentCommunes] = useState<AdministrativeUnit[]>([]);
  const [loadingCurrentCommunes, setLoadingCurrentCommunes] = useState(false);
  const [currentCommuneError, setCurrentCommuneError] = useState<string | null>(null);

  const [permanentCommunes, setPermanentCommunes] = useState<AdministrativeUnit[]>([]);
  const [loadingPermanentCommunes, setLoadingPermanentCommunes] = useState(false);
  const [permanentCommuneError, setPermanentCommuneError] = useState<string | null>(null);

  const hydrateForms = useCallback((p: StudentFullProfileResponse) => {
    const sv: SinhVien = p.student;
    setCoreForm({
      hoTen: sv.hoTen || '',
      ngaySinh: sv.ngaySinh || '',
      gioiTinh: sv.gioiTinh === 'Nữ' ? 'Nữ' : 'Nam',
      trangThai: (sv.trangThai || 'Đang học') as SinhVien['trangThai'],
      soDienThoai: sv.soDienThoai || '',
      email: sv.email || '',
    });

    if (p.demographics?.ethnicityStatus === 'DECLARED' && p.demographics.ethnicityId) {
      setEthnicityId(p.demographics.ethnicityId);
    } else {
      setEthnicityId('');
    }

    if (p.demographics?.religionStatus === 'CONFIRMED_NONE') {
      setReligionValue('__NONE__');
    } else if (p.demographics?.religionStatus === 'DECLARED' && p.demographics.religionId) {
      setReligionValue(p.demographics.religionId);
    } else {
      setReligionValue('');
    }

    const findAddr = (type: StudentAddress['addressType']) =>
      p.addresses.find((a) => a.addressType === type);
    const cur = findAddr('CURRENT');
    const perm = findAddr('PERMANENT');

    setCurrentAddr({
      id: cur?.id || '',
      provinceUnitId: cur?.provinceUnitId || '',
      communeUnitId: cur?.communeUnitId || '',
      addressDetail: cur?.addressDetail || '',
    });
    setPermanentAddr({
      id: perm?.id || '',
      provinceUnitId: perm?.provinceUnitId || '',
      communeUnitId: perm?.communeUnitId || '',
      addressDetail: perm?.addressDetail || '',
    });

    const members = p.familyMembers || [];
    const father = members.find((m) => (m.relationshipCode || '').toUpperCase() === 'FATHER');
    const mother = members.find((m) => (m.relationshipCode || '').toUpperCase() === 'MOTHER');
    const getPhone = (m?: typeof father) => {
      if (!m) return '';
      const ct = m.contacts.find((c) => c.contactType === 'PHONE') || m.contacts[0];
      return ct?.contactValue || '';
    };
    setFatherName(father?.fullName || '');
    setFatherPhone(getPhone(father));
    setMotherName(mother?.fullName || '');
    setMotherPhone(getPhone(mother));
    setExistingFatherId(father?.id || '');
    setExistingMotherId(mother?.id || '');
    setExistingFamilyStructure(
      (p.familyProfile?.familyStructureStatus as FamilyStructureStatus) || 'NOT_DECLARED'
    );
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    setAvatarFailed(false);
    const [profRes, catRes] = await Promise.all([
      profileService.getFullProfile(maSV),
      profileService.getCatalogs(),
    ]);
    if (!profRes.success || !profRes.data) {
      setError(profRes.message || 'Không thể tải hồ sơ sinh viên.');
      setLoading(false);
      return;
    }
    setProfile(profRes.data);
    if (catRes.success && catRes.data) {
      setCatalogs(catRes.data);
    }
    hydrateForms(profRes.data);
    setIsEditing(false);
    setLoading(false);
  }, [maSV, hydrateForms]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fetchCommunesForTarget = useCallback(
    async (target: 'CURRENT' | 'PERMANENT', provinceUnitId: string) => {
      const setList = target === 'CURRENT' ? setCurrentCommunes : setPermanentCommunes;
      const setLoadingFlag = target === 'CURRENT' ? setLoadingCurrentCommunes : setLoadingPermanentCommunes;
      const setErr = target === 'CURRENT' ? setCurrentCommuneError : setPermanentCommuneError;

      if (!provinceUnitId) {
        setList([]);
        setErr(null);
        return;
      }

      setLoadingFlag(true);
      setErr(null);
      const res = await profileService.getCommunesByProvince(provinceUnitId, 'ACTIVE');
      setLoadingFlag(false);
      if (!res.success) {
        setList([]);
        setErr(res.message || 'Không tải được danh sách Xã/Phường/Đặc khu.');
        return;
      }
      setList(res.data || []);
    },
    []
  );

  const activeProvinces = useMemo(
    () =>
      (catalogs?.provinces || [])
        .filter((p) => p.status === 'ACTIVE')
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    [catalogs]
  );

  const activeEthnicities = useMemo(
    () => (catalogs?.ethnicities || []).filter((e) => e.isActive),
    [catalogs]
  );

  const activeReligions = useMemo(
    () => (catalogs?.religions || []).filter((r) => r.isActive),
    [catalogs]
  );

  const handleEnterEdit = () => {
    if (!profile) return;
    hydrateForms(profile);
    setActionError(null);
    setIsEditing(true);

    const cur = profile.addresses.find((a) => a.addressType === 'CURRENT');
    const perm = profile.addresses.find((a) => a.addressType === 'PERMANENT');
    if (cur?.provinceUnitId) {
      fetchCommunesForTarget('CURRENT', cur.provinceUnitId);
    } else {
      setCurrentCommunes([]);
      setCurrentCommuneError(null);
    }
    if (perm?.provinceUnitId) {
      fetchCommunesForTarget('PERMANENT', perm.provinceUnitId);
    } else {
      setPermanentCommunes([]);
      setPermanentCommuneError(null);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      hydrateForms(profile);
    }
    setActionError(null);
    setCurrentCommuneError(null);
    setPermanentCommuneError(null);
    setIsEditing(false);
  };

  const handleProvinceChange = (target: 'CURRENT' | 'PERMANENT', nextProvinceId: string) => {
    if (target === 'CURRENT') {
      setCurrentAddr((prev) => ({
        ...prev,
        provinceUnitId: nextProvinceId,
        communeUnitId: '',
      }));
    } else {
      setPermanentAddr((prev) => ({
        ...prev,
        provinceUnitId: nextProvinceId,
        communeUnitId: '',
      }));
    }
    fetchCommunesForTarget(target, nextProvinceId);
  };

  const handleCopyMaSV = (code: string) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopiedMaSV(true);
    setTimeout(() => setCopiedMaSV(false), 1800);
  };

  const scrollToSection = (key: 'A' | 'B' | 'C') => {
    setActiveAnchor(key);
    const id = `${formId}-anchor-${key.toLowerCase()}`;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setActionError(null);

    const perms = profile.permissions;

    if (perms.canEditCore && !coreForm.hoTen.trim()) {
      setActionError('Họ và tên không được để trống.');
      return;
    }
    if (
      (perms.canEditCore || perms.canEditContact) &&
      coreForm.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coreForm.email.trim())
    ) {
      setActionError('Email không đúng định dạng.');
      return;
    }

    if (perms.canEditAddress) {
      const validateAddr = (label: string, a: AddressFormState): string | null => {
        const hasProv = Boolean(a.provinceUnitId.trim());
        const hasComm = Boolean(a.communeUnitId.trim());
        const hasDetail = Boolean(a.addressDetail.trim());
        if (!hasProv && !hasComm && !hasDetail) return null;
        if (!hasProv || !hasComm) {
          return `${label}: Vui lòng chọn đầy đủ Tỉnh/Thành phố và Xã/Phường/Đặc khu.`;
        }
        return null;
      };
      const curErr = validateAddr('Nơi ở hiện tại', currentAddr);
      if (curErr) {
        setActionError(curErr);
        return;
      }
      const permErr = validateAddr('Địa chỉ thường trú', permanentAddr);
      if (permErr) {
        setActionError(permErr);
        return;
      }
    }

    const payload: UnifiedProfileUpdatePayload = {};

    if (perms.canEditCore) {
      payload.core = {
        hoTen: coreForm.hoTen.trim(),
        ngaySinh: coreForm.ngaySinh,
        gioiTinh: coreForm.gioiTinh,
        trangThai: coreForm.trangThai,
        soDienThoai: coreForm.soDienThoai.trim(),
        email: coreForm.email.trim(),
      };
    } else if (perms.canEditContact) {
      payload.core = {
        soDienThoai: coreForm.soDienThoai.trim(),
        email: coreForm.email.trim(),
      };
    }

    if (perms.canEditDemographics) {
      payload.demographics = {
        ethnicityStatus: ethnicityId ? 'DECLARED' : 'NOT_DECLARED',
        ethnicityId: ethnicityId || null,
        religionStatus:
          religionValue === '__NONE__'
            ? 'CONFIRMED_NONE'
            : religionValue
            ? 'DECLARED'
            : 'NOT_DECLARED',
        religionId: religionValue && religionValue !== '__NONE__' ? religionValue : null,
      };
    }

    if (perms.canEditAddress) {
      const toAddressEntry = (a: AddressFormState) => {
        if (a.provinceUnitId || a.communeUnitId || a.addressDetail.trim()) {
          return {
            id: a.id || undefined,
            provinceUnitId: a.provinceUnitId,
            communeUnitId: a.communeUnitId,
            addressDetail: a.addressDetail.trim(),
          };
        }
        return a.id ? { clear: true } : null;
      };
      payload.addresses = {
        current: toAddressEntry(currentAddr),
        permanent: toAddressEntry(permanentAddr),
      };
    }

    if (perms.canEditFamily) {
      const fatherTrim = fatherName.trim();
      const fatherPhoneTrim = fatherPhone.trim();
      const motherTrim = motherName.trim();
      const motherPhoneTrim = motherPhone.trim();
      const phoneRegex = /^[0-9+\-\s().]{8,20}$/;

      if (fatherPhoneTrim && !phoneRegex.test(fatherPhoneTrim)) {
        setActionError('Số điện thoại bố không đúng định dạng (8–20 ký tự số).');
        return;
      }
      if (fatherPhoneTrim && !fatherTrim) {
        setActionError('Vui lòng nhập Họ tên bố khi nhập Số điện thoại bố.');
        return;
      }
      if (motherPhoneTrim && !phoneRegex.test(motherPhoneTrim)) {
        setActionError('Số điện thoại mẹ không đúng định dạng (8–20 ký tự số).');
        return;
      }
      if (motherPhoneTrim && !motherTrim) {
        setActionError('Vui lòng nhập Họ tên mẹ khi nhập Số điện thoại mẹ.');
        return;
      }

      payload.family = {
        familyStructureStatus: existingFamilyStructure,
        dataCompletenessState: fatherTrim || motherTrim ? 'PARTIAL' : 'NOT_ENTERED',
        father: fatherTrim
          ? {
              id: existingFatherId || undefined,
              fullName: fatherTrim,
              phone: fatherPhoneTrim,
            }
          : existingFatherId
          ? { id: existingFatherId, clear: true }
          : undefined,
        mother: motherTrim
          ? {
              id: existingMotherId || undefined,
              fullName: motherTrim,
              phone: motherPhoneTrim,
            }
          : existingMotherId
          ? { id: existingMotherId, clear: true }
          : undefined,
      };
    }

    setSaving(true);
    const res = await profileService.saveFullProfileUnified(maSV, payload);
    setSaving(false);

    if (!res.success || !res.data) {
      setActionError(res.message || 'Không thể lưu thay đổi hồ sơ sinh viên.');
      return;
    }

    setProfile(res.data);
    hydrateForms(res.data);
    setActionError(null);
    setIsEditing(false);
    showToast?.('Đã lưu thay đổi hồ sơ sinh viên.');
    await onProfileSaved?.();
  };

  if (loading) return <LoadingState rows={6} />;
  if (error || !profile) {
    return <ErrorBanner message={error || 'Không tìm thấy hồ sơ sinh viên.'} onRetry={loadData} />;
  }

  const sv: SinhVien = profile.student;
  const perms = profile.permissions;
  const hasAnyEditPermission = Boolean(
    perms.canEditCore ||
      perms.canEditContact ||
      perms.canEditDemographics ||
      perms.canEditAddress ||
      perms.canEditFamily
  );

  const curAddrRecord = profile.addresses.find((a) => a.addressType === 'CURRENT');
  const permAddrRecord = profile.addresses.find((a) => a.addressType === 'PERMANENT');
  const fatherRecord = (profile.familyMembers || []).find(
    (m) => (m.relationshipCode || '').toUpperCase() === 'FATHER'
  );
  const motherRecord = (profile.familyMembers || []).find(
    (m) => (m.relationshipCode || '').toUpperCase() === 'MOTHER'
  );
  const getMemberPhone = (m?: typeof fatherRecord) => {
    if (!m) return '';
    const ct = m.contacts.find((c) => c.contactType === 'PHONE') || m.contacts[0];
    return ct?.contactValue || '';
  };
  const fatherPhoneDisplay = getMemberPhone(fatherRecord);
  const motherPhoneDisplay = getMemberPhone(motherRecord);

  const ethnicityDisplay =
    profile.demographics?.ethnicityStatus === 'DECLARED' && profile.demographics.ethnicityName
      ? profile.demographics.ethnicityName
      : null;

  const religionDisplay =
    profile.demographics?.religionStatus === 'CONFIRMED_NONE'
      ? 'Không tôn giáo'
      : profile.demographics?.religionStatus === 'DECLARED' && profile.demographics.religionName
      ? profile.demographics.religionName
      : null;

  const anchorItems: Array<{
    key: 'A' | 'B' | 'C';
    title: string;
    hasData: boolean;
  }> = [
    {
      key: 'A',
      title: 'Thông tin cá nhân',
      hasData: Boolean(sv.hoTen && (sv.soDienThoai || sv.email || ethnicityDisplay)),
    },
    {
      key: 'B',
      title: 'Nơi ở hiện tại',
      hasData: Boolean(curAddrRecord?.provinceName || curAddrRecord?.communeName || curAddrRecord?.addressDetail),
    },
    {
      key: 'C',
      title: 'Địa chỉ thường trú',
      hasData: Boolean(permAddrRecord?.provinceName || permAddrRecord?.communeName || permAddrRecord?.addressDetail),
    },
  ];

  const cardClassName =
    'rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs scroll-mt-4';

  const cardHeaderClassName =
    'px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3';

  const inputClassName =
    'w-full h-10 px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors duration-150 disabled:bg-slate-50 dark:disabled:bg-slate-800/60 disabled:text-slate-500 disabled:cursor-not-allowed';

  const labelClassName = 'block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5';

  const emptyValue = (
    <span className="text-slate-400 dark:text-slate-500 font-normal">Chưa có thông tin</span>
  );

  const renderViewField = (
    label: string,
    value: React.ReactNode,
    options?: { fullWidth?: boolean; mono?: boolean }
  ) => (
    <div className={options?.fullWidth ? 'md:col-span-2' : ''}>
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</dt>
      <dd
        className={`text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug break-words ${
          options?.mono ? 'font-mono tabular-nums' : ''
        }`}
      >
        {value ?? emptyValue}
      </dd>
    </div>
  );

  const renderSectionHeader = (
    code: string,
    title: string,
    subtitle: string | undefined,
    Icon: React.ComponentType<{ className?: string }>,
    rightContent?: React.ReactNode
  ) => (
    <div className={cardHeaderClassName}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 tracking-tight truncate">
            <span className="font-mono text-blue-700 dark:text-blue-400 mr-1.5">{code}.</span>
            <span>{title}</span>
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {rightContent && <div className="shrink-0">{rightContent}</div>}
    </div>
  );

  const renderViewContent = () => (
    <div className="space-y-5">
      {/* A. THÔNG TIN CÁ NHÂN */}
      <section id={`${formId}-anchor-a`} aria-labelledby={`${formId}-sec-a`} className={cardClassName}>
        <div id={`${formId}-sec-a`}>
          {renderSectionHeader(
            'A',
            'Thông tin cá nhân',
            'Định danh học vụ, liên hệ và dân tộc - tôn giáo',
            UserIcon
          )}
        </div>
        <div className="px-5 sm:px-6 py-5 space-y-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {renderViewField('Họ và tên', <span className="font-semibold text-slate-900 dark:text-white">{sv.hoTen}</span>)}
            {renderViewField('Mã sinh viên', <span className="font-semibold">{sv.maSV}</span>, { mono: true })}
            {renderViewField('Trạng thái', <StatusBadge label={sv.trangThai || 'Đang học'} variant={getStatusVariant(sv.trangThai)} />)}
            {renderViewField('Ngày sinh', sv.ngaySinh ? formatDateVi(sv.ngaySinh) : emptyValue, { mono: true })}
            {renderViewField('Giới tính', sv.gioiTinh || emptyValue)}
            {renderViewField('Lớp sinh hoạt', sv.lop || emptyValue)}
            {renderViewField('Khoa / Viện', sv.khoa || emptyValue)}
          </dl>

          <dl className="pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
            {renderViewField(
              'Số điện thoại',
              sv.soDienThoai ? (
                <a
                  href={`tel:${sv.soDienThoai}`}
                  className="text-blue-700 dark:text-blue-400 hover:underline font-mono tabular-nums"
                >
                  {sv.soDienThoai}
                </a>
              ) : (
                emptyValue
              )
            )}
            {renderViewField(
              'Email',
              sv.email ? (
                <a
                  href={`mailto:${sv.email}`}
                  className="text-blue-700 dark:text-blue-400 hover:underline break-all"
                >
                  {sv.email}
                </a>
              ) : (
                emptyValue
              )
            )}
            {renderViewField('Dân tộc', ethnicityDisplay || emptyValue)}
            {renderViewField('Tôn giáo', religionDisplay || emptyValue)}
          </dl>

          <dl className="pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {renderViewField('Họ tên bố', fatherRecord?.fullName || emptyValue)}
            {renderViewField(
              'Số điện thoại bố',
              fatherPhoneDisplay ? (
                <a
                  href={`tel:${fatherPhoneDisplay}`}
                  className="text-blue-700 dark:text-blue-400 hover:underline font-mono tabular-nums"
                >
                  {fatherPhoneDisplay}
                </a>
              ) : (
                emptyValue
              )
            )}
            {renderViewField('Họ tên mẹ', motherRecord?.fullName || emptyValue)}
            {renderViewField(
              'Số điện thoại mẹ',
              motherPhoneDisplay ? (
                <a
                  href={`tel:${motherPhoneDisplay}`}
                  className="text-blue-700 dark:text-blue-400 hover:underline font-mono tabular-nums"
                >
                  {motherPhoneDisplay}
                </a>
              ) : (
                emptyValue
              )
            )}
          </dl>
        </div>
      </section>

      {/* B & C. NƠI Ở HIỆN TẠI + ĐỊA CHỈ THƯỜNG TRÚ (SONG SONG 2 CỘT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* B. NƠI Ở HIỆN TẠI */}
        <section id={`${formId}-anchor-b`} aria-labelledby={`${formId}-sec-b`} className={cardClassName}>
          <div id={`${formId}-sec-b`}>
            {renderSectionHeader(
              'B',
              'Nơi ở hiện tại',
              'Địa chỉ hành chính 2 cấp',
              MapPin,
              curAddrRecord?.verificationStatus === 'VERIFIED' ? (
                <StatusBadge label="Đã xác minh" variant="success" />
              ) : undefined
            )}
          </div>
          <div className="px-5 sm:px-6 py-5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {renderViewField('Tỉnh / Thành phố', curAddrRecord?.provinceName || emptyValue)}
              {renderViewField('Xã / Phường / Đặc khu', curAddrRecord?.communeName || emptyValue)}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Địa chỉ chi tiết
                </dt>
                <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed break-words">
                  {curAddrRecord?.addressDetail || emptyValue}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* C. ĐỊA CHỈ THƯỜNG TRÚ */}
        <section id={`${formId}-anchor-c`} aria-labelledby={`${formId}-sec-c`} className={cardClassName}>
          <div id={`${formId}-sec-c`}>
            {renderSectionHeader(
              'C',
              'Địa chỉ thường trú',
              'Địa chỉ hành chính 2 cấp',
              Home,
              permAddrRecord?.verificationStatus === 'VERIFIED' ? (
                <StatusBadge label="Đã xác minh" variant="success" />
              ) : undefined
            )}
          </div>
          <div className="px-5 sm:px-6 py-5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {renderViewField('Tỉnh / Thành phố', permAddrRecord?.provinceName || emptyValue)}
              {renderViewField('Xã / Phường / Đặc khu', permAddrRecord?.communeName || emptyValue)}
              <div className="sm:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Địa chỉ chi tiết
                </dt>
                <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed break-words">
                  {permAddrRecord?.addressDetail || emptyValue}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </div>
  );

  const renderEditContent = () => (
    <form onSubmit={handleSaveAll} className="space-y-5">
      {/* A. THÔNG TIN CÁ NHÂN */}
      <section id={`${formId}-anchor-a`} aria-labelledby={`${formId}-edit-sec-a`} className={cardClassName}>
        <div id={`${formId}-edit-sec-a`}>
          {renderSectionHeader(
            'A',
            'Thông tin cá nhân',
            'Định danh học vụ, liên hệ và dân tộc - tôn giáo',
            UserIcon
          )}
        </div>
        <div className="px-5 sm:px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor={`${formId}-hoten`} className={labelClassName}>
                Họ và tên {perms.canEditCore && <span className="text-rose-600">*</span>}
              </label>
              {perms.canEditCore ? (
                <input
                  id={`${formId}-hoten`}
                  type="text"
                  required
                  value={coreForm.hoTen}
                  onChange={(e) => setCoreForm({ ...coreForm, hoTen: e.target.value })}
                  className={inputClassName}
                />
              ) : (
                <div className="h-10 flex items-center text-sm font-medium text-slate-900 dark:text-slate-100">
                  {sv.hoTen}
                </div>
              )}
            </div>

            <div>
              <div className={labelClassName}>Mã sinh viên (MSSV)</div>
              <div className="h-10 flex items-center font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {sv.maSV}
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-ngaysinh`} className={labelClassName}>
                Ngày sinh
              </label>
              {perms.canEditCore ? (
                <input
                  id={`${formId}-ngaysinh`}
                  type="date"
                  value={coreForm.ngaySinh}
                  onChange={(e) => setCoreForm({ ...coreForm, ngaySinh: e.target.value })}
                  className={`${inputClassName} font-mono`}
                />
              ) : (
                <div className="h-10 flex items-center font-mono tabular-nums text-sm text-slate-900 dark:text-slate-100">
                  {sv.ngaySinh ? formatDateVi(sv.ngaySinh) : emptyValue}
                </div>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-gioitinh`} className={labelClassName}>
                Giới tính
              </label>
              {perms.canEditCore ? (
                <select
                  id={`${formId}-gioitinh`}
                  value={coreForm.gioiTinh}
                  onChange={(e) => setCoreForm({ ...coreForm, gioiTinh: e.target.value as 'Nam' | 'Nữ' })}
                  className={inputClassName}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              ) : (
                <div className="h-10 flex items-center text-sm text-slate-900 dark:text-slate-100">
                  {sv.gioiTinh || emptyValue}
                </div>
              )}
            </div>

            <div>
              <div className={labelClassName}>Lớp sinh hoạt</div>
              <div className="h-10 flex items-center text-sm text-slate-900 dark:text-slate-100">
                {sv.lop || emptyValue}
              </div>
            </div>

            <div>
              <div className={labelClassName}>Khoa / Viện</div>
              <div className="h-10 flex items-center text-sm text-slate-900 dark:text-slate-100">
                {sv.khoa || emptyValue}
              </div>
            </div>

            <div>
              <label htmlFor={`${formId}-trangthai`} className={labelClassName}>
                Trạng thái
              </label>
              {perms.canEditCore ? (
                <select
                  id={`${formId}-trangthai`}
                  value={coreForm.trangThai}
                  onChange={(e) =>
                    setCoreForm({ ...coreForm, trangThai: e.target.value as SinhVien['trangThai'] })
                  }
                  className={inputClassName}
                >
                  <option value="Đang học">Đang học</option>
                  <option value="Bảo lưu">Bảo lưu</option>
                  <option value="Tốt nghiệp">Tốt nghiệp</option>
                  <option value="Thôi học">Thôi học</option>
                </select>
              ) : (
                <div className="h-10 flex items-center">
                  <StatusBadge label={sv.trangThai || 'Đang học'} variant={getStatusVariant(sv.trangThai)} />
                </div>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-sdt`} className={labelClassName}>
                Số điện thoại
              </label>
              {perms.canEditCore || perms.canEditContact ? (
                <input
                  id={`${formId}-sdt`}
                  type="text"
                  value={coreForm.soDienThoai}
                  onChange={(e) => setCoreForm({ ...coreForm, soDienThoai: e.target.value })}
                  placeholder="Nhập số điện thoại"
                  className={`${inputClassName} font-mono`}
                />
              ) : (
                <div className="h-10 flex items-center font-mono text-sm text-slate-900 dark:text-slate-100">
                  {sv.soDienThoai || emptyValue}
                </div>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-email`} className={labelClassName}>
                Email
              </label>
              {perms.canEditCore || perms.canEditContact ? (
                <input
                  id={`${formId}-email`}
                  type="email"
                  value={coreForm.email}
                  onChange={(e) => setCoreForm({ ...coreForm, email: e.target.value })}
                  placeholder="Nhập địa chỉ email"
                  className={inputClassName}
                />
              ) : (
                <div className="h-10 flex items-center text-sm text-slate-900 dark:text-slate-100">
                  {sv.email || emptyValue}
                </div>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-ethnicity`} className={labelClassName}>
                Dân tộc
              </label>
              {perms.canEditDemographics ? (
                <select
                  id={`${formId}-ethnicity`}
                  value={ethnicityId}
                  onChange={(e) => setEthnicityId(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">-- Chưa khai báo --</option>
                  {activeEthnicities.map((eth) => (
                    <option key={eth.id} value={eth.id}>
                      {eth.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-10 flex items-center text-sm text-slate-900 dark:text-slate-100">
                  {ethnicityDisplay || emptyValue}
                </div>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-religion`} className={labelClassName}>
                Tôn giáo
              </label>
              {perms.canEditDemographics ? (
                <select
                  id={`${formId}-religion`}
                  value={religionValue}
                  onChange={(e) => setReligionValue(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">-- Chưa khai báo --</option>
                  <option value="__NONE__">Không tôn giáo</option>
                  {activeReligions.map((rel) => (
                    <option key={rel.id} value={rel.id}>
                      {rel.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-10 flex items-center text-sm text-slate-900 dark:text-slate-100">
                  {religionDisplay || emptyValue}
                </div>
              )}
            </div>

          </div>

          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor={`${formId}-father-name`} className={labelClassName}>
                Họ tên bố
              </label>
              {perms.canEditFamily ? (
                <input
                  id={`${formId}-father-name`}
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Nhập họ tên bố"
                  className={inputClassName}
                />
              ) : (
                <div className="h-10 flex items-center text-sm text-slate-900 dark:text-slate-100">
                  {fatherRecord?.fullName || emptyValue}
                </div>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-father-phone`} className={labelClassName}>
                Số điện thoại bố
              </label>
              {perms.canEditFamily ? (
                <input
                  id={`${formId}-father-phone`}
                  type="tel"
                  value={fatherPhone}
                  onChange={(e) => setFatherPhone(e.target.value)}
                  placeholder="Nhập số điện thoại bố"
                  className={`${inputClassName} font-mono`}
                />
              ) : (
                <div className="h-10 flex items-center font-mono tabular-nums text-sm text-slate-900 dark:text-slate-100">
                  {fatherPhoneDisplay || emptyValue}
                </div>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-mother-name`} className={labelClassName}>
                Họ tên mẹ
              </label>
              {perms.canEditFamily ? (
                <input
                  id={`${formId}-mother-name`}
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="Nhập họ tên mẹ"
                  className={inputClassName}
                />
              ) : (
                <div className="h-10 flex items-center text-sm text-slate-900 dark:text-slate-100">
                  {motherRecord?.fullName || emptyValue}
                </div>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-mother-phone`} className={labelClassName}>
                Số điện thoại mẹ
              </label>
              {perms.canEditFamily ? (
                <input
                  id={`${formId}-mother-phone`}
                  type="tel"
                  value={motherPhone}
                  onChange={(e) => setMotherPhone(e.target.value)}
                  placeholder="Nhập số điện thoại mẹ"
                  className={`${inputClassName} font-mono`}
                />
              ) : (
                <div className="h-10 flex items-center font-mono tabular-nums text-sm text-slate-900 dark:text-slate-100">
                  {motherPhoneDisplay || emptyValue}
                </div>
              )}
            </div>
          </div>

          {perms.canEditDemographics && (!catalogs || (activeEthnicities.length === 0 && activeReligions.length === 0)) && (
            <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
              <span>Danh mục Dân tộc / Tôn giáo hiện chưa có dữ liệu. Quản trị viên cần nhập danh mục trước.</span>
              {currentUser?.role === 'ADMIN' && onGoToCatalogs && (
                <button
                  type="button"
                  onClick={onGoToCatalogs}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-400 font-medium cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Quản trị Danh mục
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* B & C. NƠI Ở HIỆN TẠI & ĐỊA CHỈ THƯỜNG TRÚ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* B. NƠI Ở HIỆN TẠI */}
        <section id={`${formId}-anchor-b`} aria-labelledby={`${formId}-edit-sec-b`} className={cardClassName}>
          <div id={`${formId}-edit-sec-b`}>
            {renderSectionHeader(
              'B',
              'Nơi ở hiện tại',
              'Địa chỉ hành chính 2 cấp',
              MapPin,
              curAddrRecord?.verificationStatus === 'VERIFIED' ? (
                <StatusBadge label="Đã xác minh" variant="success" />
              ) : undefined
            )}
          </div>

          <div className="px-5 sm:px-6 py-5 space-y-4">
            {perms.canEditAddress && (!catalogs || activeProvinces.length === 0) && (
              <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
                <span>Danh mục Tỉnh/Thành phố chưa có dữ liệu.</span>
                {currentUser?.role === 'ADMIN' && onGoToCatalogs && (
                  <button
                    type="button"
                    onClick={onGoToCatalogs}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-400 font-medium cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    Quản trị Danh mục
                  </button>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor={`${formId}-cur-prov`} className={labelClassName}>
                  Tỉnh / Thành phố
                </label>
                <select
                  id={`${formId}-cur-prov`}
                  disabled={!perms.canEditAddress}
                  value={currentAddr.provinceUnitId}
                  onChange={(e) => handleProvinceChange('CURRENT', e.target.value)}
                  className={inputClassName}
                >
                  <option value="">-- Chọn Tỉnh/Thành phố --</option>
                  {activeProvinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`${formId}-cur-comm`} className={labelClassName}>
                  Xã / Phường / Đặc khu
                </label>
                <select
                  id={`${formId}-cur-comm`}
                  disabled={!perms.canEditAddress || !currentAddr.provinceUnitId || loadingCurrentCommunes}
                  value={currentAddr.communeUnitId}
                  onChange={(e) => setCurrentAddr({ ...currentAddr, communeUnitId: e.target.value })}
                  className={inputClassName}
                >
                  <option value="">
                    {!currentAddr.provinceUnitId
                      ? '-- Chọn Tỉnh/TP trước --'
                      : loadingCurrentCommunes
                      ? '-- Đang tải... --'
                      : '-- Chọn Xã/Phường/Đặc khu --'}
                  </option>
                  {currentCommunes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {currentCommuneError && (
                  <p className="text-xs text-rose-600 mt-1">{currentCommuneError}</p>
                )}
              </div>

              <div>
                <label htmlFor={`${formId}-cur-detail`} className={labelClassName}>
                  Địa chỉ chi tiết (số nhà, đường, thôn/tổ)
                </label>
                <input
                  id={`${formId}-cur-detail`}
                  type="text"
                  disabled={!perms.canEditAddress}
                  value={currentAddr.addressDetail}
                  onChange={(e) => setCurrentAddr({ ...currentAddr, addressDetail: e.target.value })}
                  placeholder="Nhập số nhà, đường, thôn/tổ..."
                  className={inputClassName}
                />
              </div>
            </div>
          </div>
        </section>

        {/* C. ĐỊA CHỈ THƯỜNG TRÚ */}
        <section id={`${formId}-anchor-c`} aria-labelledby={`${formId}-edit-sec-c`} className={cardClassName}>
          <div id={`${formId}-edit-sec-c`}>
            {renderSectionHeader(
              'C',
              'Địa chỉ thường trú',
              'Địa chỉ hành chính 2 cấp',
              Home,
              permAddrRecord?.verificationStatus === 'VERIFIED' ? (
                <StatusBadge label="Đã xác minh" variant="success" />
              ) : undefined
            )}
          </div>

          <div className="px-5 sm:px-6 py-5 space-y-4">
            <div>
              <label htmlFor={`${formId}-perm-prov`} className={labelClassName}>
                Tỉnh / Thành phố
              </label>
              <select
                id={`${formId}-perm-prov`}
                disabled={!perms.canEditAddress}
                value={permanentAddr.provinceUnitId}
                onChange={(e) => handleProvinceChange('PERMANENT', e.target.value)}
                className={inputClassName}
              >
                <option value="">-- Chọn Tỉnh/Thành phố --</option>
                {activeProvinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={`${formId}-perm-comm`} className={labelClassName}>
                Xã / Phường / Đặc khu
              </label>
              <select
                id={`${formId}-perm-comm`}
                disabled={!perms.canEditAddress || !permanentAddr.provinceUnitId || loadingPermanentCommunes}
                value={permanentAddr.communeUnitId}
                onChange={(e) => setPermanentAddr({ ...permanentAddr, communeUnitId: e.target.value })}
                className={inputClassName}
              >
                <option value="">
                  {!permanentAddr.provinceUnitId
                    ? '-- Chọn Tỉnh/TP trước --'
                    : loadingPermanentCommunes
                    ? '-- Đang tải... --'
                    : '-- Chọn Xã/Phường/Đặc khu --'}
                </option>
                {permanentCommunes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {permanentCommuneError && (
                <p className="text-xs text-rose-600 mt-1">{permanentCommuneError}</p>
              )}
            </div>

            <div>
              <label htmlFor={`${formId}-perm-detail`} className={labelClassName}>
                Địa chỉ chi tiết (số nhà, đường, thôn/tổ)
              </label>
              <input
                id={`${formId}-perm-detail`}
                type="text"
                disabled={!perms.canEditAddress}
                value={permanentAddr.addressDetail}
                onChange={(e) => setPermanentAddr({ ...permanentAddr, addressDetail: e.target.value })}
                placeholder="Nhập số nhà, đường, thôn/tổ..."
                className={inputClassName}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Sticky Footer Action Bar */}
      <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 py-3.5 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Đang chỉnh sửa hồ sơ · <strong className="font-mono text-slate-900 dark:text-white">{sv.maSV}</strong>
        </span>
        <div className="flex items-center gap-2.5 ml-auto">
          <button
            type="button"
            disabled={saving}
            onClick={handleCancelEdit}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors duration-150"
          >
            <X className="w-3.5 h-3.5" />
            <span>Hủy</span>
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 transition-colors duration-150"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="space-y-5 max-w-[1320px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb
          items={[
            { label: 'Danh sách sinh viên', onClick: onBack },
            { label: `${sv.maSV} · ${sv.hoTen}`, active: true },
          ]}
        />
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách</span>
          </button>
        )}
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {/* 2-Column Asymmetric Dossier Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[310px_1fr] gap-6 items-start">
        {/* Left Sticky Identity & Section Navigation Rail */}
        <aside className="xl:sticky xl:top-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {/* Architectural top band */}
          <div className="h-14 bg-slate-900 dark:bg-slate-800/90" />

          <div className="px-5 pb-5">
            {/* Avatar anchored over band */}
            <div className="-mt-8 mb-3 flex items-end justify-between gap-3">
              {sv.avatar && sv.avatar.trim() && !avatarFailed ? (
                <img
                  src={sv.avatar.trim()}
                  alt={`Ảnh thẻ ${sv.hoTen}`}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-16 h-16 rounded-xl object-cover ring-4 ring-white dark:ring-slate-900 border border-slate-200 dark:border-slate-700 bg-white shrink-0"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="w-16 h-16 rounded-xl ring-4 ring-white dark:ring-slate-900 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-lg font-bold text-blue-700 dark:text-blue-300 shrink-0"
                >
                  {getNameInitials(sv.hoTen)}
                </div>
              )}
              <StatusBadge label={sv.trangThai || 'Đang học'} variant={getStatusVariant(sv.trangThai)} />
            </div>

            {/* Name & Core Identity */}
            <div className="space-y-1.5">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
                {sv.hoTen}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <button
                  type="button"
                  onClick={() => handleCopyMaSV(sv.maSV)}
                  title="Sao chép MSSV"
                  className="inline-flex items-center gap-1 font-mono font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer tabular-nums"
                >
                  <span>{sv.maSV}</span>
                  {copiedMaSV ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
                {sv.lop && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{sv.lop}</span>
                  </>
                )}
              </div>
              {sv.khoa && (
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                  {sv.khoa}
                </p>
              )}
            </div>

            {/* Quick Contact At-a-Glance */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {sv.soDienThoai ? (
                  <a
                    href={`tel:${sv.soDienThoai}`}
                    className="font-mono tabular-nums hover:text-blue-700 dark:hover:text-blue-400 truncate"
                  >
                    {sv.soDienThoai}
                  </a>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">Chưa có SĐT</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {sv.email ? (
                  <a
                    href={`mailto:${sv.email}`}
                    className="hover:text-blue-700 dark:hover:text-blue-400 truncate"
                  >
                    {sv.email}
                  </a>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">Chưa có email</span>
                )}
              </div>
            </div>

            {/* Interactive Section Jump Navigation */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-2 pb-1">
                Thành phần hồ sơ
              </div>
              {anchorItems.map((item) => {
                const isSelected = activeAnchor === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => scrollToSection(item.key)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[11px] opacity-75">{item.key}.</span>
                      <span className="truncate">{item.title}</span>
                    </span>
                    <span
                      className={`text-[11px] shrink-0 ${
                        item.hasData
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {item.hasData ? 'Đã có' : 'Trống'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Primary Action Button */}
            {!isEditing && hasAnyEditPermission && (
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleEnterEdit}
                  className="w-full h-10 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white cursor-pointer whitespace-nowrap transition-colors duration-150"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Right Dossier Sections */}
        <div className="min-w-0">
          {isEditing ? renderEditContent() : renderViewContent()}
        </div>
      </div>
    </div>
  );
};
