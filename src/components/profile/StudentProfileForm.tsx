import React, { useEffect, useId, useState } from 'react';
import { FamilyStructureStatus, HoSoFile, SinhVien } from '../../types';
import { apiService } from '../../services/apiService';
import { profileService } from '../../services/profileService';
import { ErrorBanner } from '../common';
import type { ProfileTabKey } from './StudentFullProfileView';
import {
  normalizeClassName,
  normalizeFacultyName,
  getFacultyForClass as getFacultyFromHelper,
  SPECIALIZED_FACULTIES,
} from '../../utils/classHelper';
import {
  Camera,
  ExternalLink,
  FileText,
  GraduationCap,
  Phone,
  Upload,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';

interface StudentProfileFormProps {
  isOpen: boolean;
  editingStudent: SinhVien | null;
  availableClasses: string[];
  defaultClass?: string;
  getFacultyForClass: (lop: string) => string;
  getStudentFiles: (sv: SinhVien) => HoSoFile[];
  getStudentAvatarUrl: (student: Partial<SinhVien>) => string;
  onClose: () => void;
  onSaveStudent: (payload: Partial<SinhVien>, editingStudent: SinhVien | null) => Promise<void> | void;
  onUpdateAvatarImmediate?: (maSV: string, avatar: string) => void;
  onPreviewDocument: (
    fileUrl: string,
    customName: string,
    fileName: string,
    student: { hoTen: string; maSV: string; lop?: string }
  ) => void;
  onOpenFullProfile?: (maSV: string, tab?: ProfileTabKey) => void;
  onAfterParentInfoSaved?: () => Promise<void> | void;
}

const EMPTY_STUDENT_FORM: Partial<SinhVien> = {
  maSV: '',
  hoTen: '',
  ngaySinh: '',
  gioiTinh: 'Nam',
  lop: '',
  khoa: '',
  soDienThoai: '',
  email: '',
  diaChi: '',
  ngayNhapHoc: '',
  trangThai: 'Đang học',
  hoSoFiles: [],
};

export const StudentProfileForm: React.FC<StudentProfileFormProps> = ({
  isOpen,
  editingStudent,
  availableClasses,
  defaultClass,
  getFacultyForClass,
  getStudentFiles,
  getStudentAvatarUrl,
  onClose,
  onSaveStudent,
  onUpdateAvatarImmediate,
  onPreviewDocument,
  onOpenFullProfile,
  onAfterParentInfoSaved,
}) => {
  const formIdPrefix = useId();
  const [formData, setFormData] = useState<Partial<SinhVien>>(EMPTY_STUDENT_FORM);
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [existingFatherId, setExistingFatherId] = useState('');
  const [existingMotherId, setExistingMotherId] = useState('');
  const [existingFamilyStructure, setExistingFamilyStructure] = useState<FamilyStructureStatus>('NOT_DECLARED');
  const [loadingParentInfo, setLoadingParentInfo] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isCustomClassInput, setIsCustomClassInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    setFormError(null);
    setFatherName('');
    setMotherName('');
    setParentPhone('');
    setExistingFatherId('');
    setExistingMotherId('');
    setExistingFamilyStructure('NOT_DECLARED');

    if (editingStudent) {
      const files = getStudentFiles(editingStudent);
      const normLop = normalizeClassName(editingStudent.lop);
      setFormData({
        ...editingStudent,
        lop: normLop,
        khoa: normalizeFacultyName(editingStudent.khoa, editingStudent.lop),
        hoSoFiles: files,
      });
      setIsCustomClassInput(Boolean(normLop && !availableClasses.includes(normLop)));

      setLoadingParentInfo(true);
      profileService
        .getFullProfile(editingStudent.maSV)
        .then((res) => {
          if (!active) return;
          if (res.success && res.data) {
            const members = res.data.familyMembers || [];
            const father = members.find((m) => (m.relationshipCode || '').toUpperCase() === 'FATHER');
            const mother = members.find((m) => (m.relationshipCode || '').toUpperCase() === 'MOTHER');
            const guardian = members.find((m) => (m.relationshipCode || '').toUpperCase() === 'GUARDIAN');

            const getPhone = (m?: typeof father) => {
              if (!m) return '';
              const ct = m.contacts.find((c) => c.contactType === 'PHONE') || m.contacts[0];
              return ct?.contactValue || '';
            };

            setFatherName(father?.fullName || '');
            setMotherName(mother?.fullName || '');
            setParentPhone(getPhone(father) || getPhone(mother) || getPhone(guardian) || '');
            setExistingFatherId(father?.id || '');
            setExistingMotherId(mother?.id || '');
            setExistingFamilyStructure(
              (res.data.familyProfile?.familyStructureStatus as FamilyStructureStatus) || 'NOT_DECLARED'
            );
          }
        })
        .finally(() => {
          if (active) setLoadingParentInfo(false);
        });
    } else {
      const normDefault = defaultClass && defaultClass !== '__UNASSIGNED__' ? normalizeClassName(defaultClass) : '';
      const initialClass = normDefault || availableClasses[0] || '';
      setFormData({
        ...EMPTY_STUDENT_FORM,
        lop: initialClass,
        khoa: initialClass ? getFacultyForClass(initialClass) : '',
      });
      setIsCustomClassInput(
        Boolean(initialClass && !availableClasses.includes(initialClass)) || availableClasses.length === 0
      );
      setLoadingParentInfo(false);
    }

    return () => {
      active = false;
    };
  }, [isOpen, editingStudent, availableClasses, defaultClass, getFacultyForClass, getStudentFiles]);

  if (!isOpen) return null;

  const handleUpdateCustomName = (fileId: string, newName: string) => {
    setFormData((prev) => {
      const currentFiles = prev.hoSoFiles || [];
      const updated = currentFiles.map((f) => (f.id === fileId ? { ...f, customName: newName } : f));
      return { ...prev, hoSoFiles: updated };
    });
  };

  const handleRemoveFile = (fileId: string) => {
    setFormData((prev) => {
      const currentFiles = prev.hoSoFiles || [];
      const updated = currentFiles.filter((f) => f.id !== fileId);
      return {
        ...prev,
        hoSoFiles: updated,
        hoSoFile: updated[0]?.fileUrl || '',
        hoSoFileName: updated[0]?.fileName || '',
      };
    });
  };

  const handleMultipleFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray: File[] = Array.from(files);
    const existingFiles = [...(formData.hoSoFiles || [])];

    let loadedCount = 0;
    filesArray.forEach((file: File, index: number) => {
      const reader = new FileReader();
      reader.onload = () => {
        let defaultName = file.name.replace(/\.[^/.]+$/, '');
        const fname = file.name.toLowerCase();
        if (fname.includes('cccd') || fname.includes('cmnd')) defaultName = 'Căn cước công dân';
        else if (fname.includes('thpt') || fname.includes('bang')) defaultName = 'Bằng tốt nghiệp THPT';
        else if (fname.includes('khai sinh')) defaultName = 'Giấy khai sinh';
        else if (fname.includes('nhap hoc') || fname.includes('giay bao')) defaultName = 'Giấy báo nhập học';
        else if (fname.includes('ly lich') || fname.includes('so yeu')) defaultName = 'Sơ yếu lý lịch';

        const localData = reader.result as string;
        apiService
          .uploadHoSoFile(formData.maSV || 'temp', file.name, localData)
          .then((res) => {
            const finalUrl = res.success && res.fileUrl ? res.fileUrl : localData;
            existingFiles.push({
              id: `file-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
              customName: defaultName,
              fileName: file.name,
              fileUrl: finalUrl,
              uploadedAt: new Date().toISOString().split('T')[0],
            });
            loadedCount++;
            if (loadedCount === filesArray.length) {
              setFormData((prev) => ({
                ...prev,
                hoSoFiles: [...existingFiles],
                hoSoFile: existingFiles[0]?.fileUrl || prev.hoSoFile,
                hoSoFileName: existingFiles[0]?.fileName || prev.hoSoFileName,
              }));
            }
          })
          .catch(() => {
            existingFiles.push({
              id: `file-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
              customName: defaultName,
              fileName: file.name,
              fileUrl: localData,
              uploadedAt: new Date().toISOString().split('T')[0],
            });
            loadedCount++;
            if (loadedCount === filesArray.length) {
              setFormData((prev) => ({
                ...prev,
                hoSoFiles: [...existingFiles],
                hoSoFile: existingFiles[0]?.fileUrl || prev.hoSoFile,
                hoSoFileName: existingFiles[0]?.fileName || prev.hoSoFileName,
              }));
            }
          });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const maSVTrim = (formData.maSV || '').trim();
    const hoTenTrim = (formData.hoTen || '').trim();
    const lopTrim = normalizeClassName((formData.lop || '').trim());
    const fatherTrim = fatherName.trim();
    const motherTrim = motherName.trim();
    const parentPhoneTrim = parentPhone.trim();

    if (!maSVTrim) {
      setFormError('Vui lòng nhập Mã sinh viên.');
      return;
    }
    if (!hoTenTrim) {
      setFormError('Vui lòng nhập Họ và tên sinh viên.');
      return;
    }
    if (!lopTrim) {
      setFormError('Vui lòng chọn hoặc nhập Lớp sinh hoạt.');
      return;
    }
    if (parentPhoneTrim && !/^[0-9+\-\s().]{8,20}$/.test(parentPhoneTrim)) {
      setFormError('Số điện thoại phụ huynh không đúng định dạng (8–20 ký tự số).');
      return;
    }
    if (parentPhoneTrim && !fatherTrim && !motherTrim) {
      setFormError('Vui lòng nhập Họ tên bố hoặc Họ tên mẹ khi nhập Số điện thoại phụ huynh.');
      return;
    }

    const normKhoa = (formData.khoa || '').trim() || getFacultyFromHelper(lopTrim);
    const payload: Partial<SinhVien> = {
      ...formData,
      maSV: maSVTrim,
      hoTen: hoTenTrim,
      lop: lopTrim,
      khoa: normKhoa,
    };

    setIsSubmitting(true);
    setFormError(null);
    try {
      await onSaveStudent(payload, editingStudent);

      const shouldPersistParentInfo = Boolean(
        fatherTrim || motherTrim || parentPhoneTrim || existingFatherId || existingMotherId
      );
      if (shouldPersistParentInfo) {
        const targetMaSV = editingStudent ? editingStudent.maSV : maSVTrim;
        const familyRes = await profileService.saveFullProfileUnified(targetMaSV, {
          family: {
            familyStructureStatus: existingFamilyStructure,
            dataCompletenessState: fatherTrim || motherTrim ? 'PARTIAL' : 'NOT_ENTERED',
            father: fatherTrim
              ? {
                  id: existingFatherId || undefined,
                  fullName: fatherTrim,
                  phone: parentPhoneTrim,
                }
              : existingFatherId
              ? {
                  id: existingFatherId,
                  clear: true,
                }
              : undefined,
            mother: motherTrim
              ? {
                  id: existingMotherId || undefined,
                  fullName: motherTrim,
                  phone: fatherTrim ? '' : parentPhoneTrim,
                }
              : existingMotherId
              ? {
                  id: existingMotherId,
                  clear: true,
                }
              : undefined,
          },
        });
        if (!familyRes.success) {
          setFormError(
            familyRes.message || 'Đã lưu thông tin cơ bản nhưng không thể cập nhật thông tin phụ huynh.'
          );
          return;
        }
        await onAfterParentInfoSaved?.();
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    'w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formIdPrefix}-student-modal-title`}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md max-w-2xl w-full p-5 shadow-xl relative my-auto max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h3
              id={`${formIdPrefix}-student-modal-title`}
              className="text-sm font-bold text-slate-900 dark:text-slate-100"
            >
              {editingStudent ? 'Cập nhật Hồ sơ Sinh viên' : 'Thêm Hồ sơ Sinh viên'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Đóng biểu mẫu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {formError && <ErrorBanner message={formError} />}

        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
          {/* 1. Thông tin định danh & Ảnh hồ sơ */}
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>1. Thông tin định danh & Ảnh hồ sơ</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-800">
              <div className="relative shrink-0">
                <img
                  src={getStudentAvatarUrl(formData)}
                  alt={formData.hoTen || 'Avatar'}
                  className="w-14 h-14 rounded-lg object-cover border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getStudentAvatarUrl({ ...formData, avatar: '' });
                  }}
                />
                <label
                  className="absolute -bottom-1 -right-1 p-1 bg-blue-700 hover:bg-blue-800 text-white rounded cursor-pointer transition-colors"
                  title="Tải ảnh thẻ"
                >
                  <Camera className="w-3 h-3" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const localData = reader.result as string;
                        setFormData((prev) => ({ ...prev, avatar: localData }));
                        const targetMaSV = formData.maSV || editingStudent?.maSV;
                        if (targetMaSV) {
                          if (editingStudent) {
                            onUpdateAvatarImmediate?.(targetMaSV, localData);
                          }
                          apiService.uploadAvatar(targetMaSV, localData).then((res) => {
                            if (res.success && res.avatarUrl) {
                              setFormData((prev) => ({ ...prev, avatar: res.avatarUrl }));
                              if (editingStudent) {
                                onUpdateAvatarImmediate?.(targetMaSV, res.avatarUrl);
                              }
                            }
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block text-xs">
                  Ảnh thẻ sinh viên
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`${formIdPrefix}-masv`}
                  className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Mã Sinh viên (MSSV) <span className="text-rose-600">*</span>
                </label>
                <input
                  id={`${formIdPrefix}-masv`}
                  type="text"
                  disabled={!!editingStudent}
                  value={formData.maSV || ''}
                  onChange={(e) => setFormData({ ...formData, maSV: e.target.value })}
                  placeholder="Ví dụ: SV001"
                  className={`${inputClassName} font-mono`}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor={`${formIdPrefix}-hoten`}
                  className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Họ và tên <span className="text-rose-600">*</span>
                </label>
                <input
                  id={`${formIdPrefix}-hoten`}
                  type="text"
                  value={formData.hoTen || ''}
                  onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                  placeholder="Nhập họ và tên"
                  className={inputClassName}
                  required
                />
              </div>
            </div>
          </div>

          {/* 2. Thông tin đào tạo & Lớp sinh hoạt */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>2. Thông tin đào tạo & Lớp sinh hoạt</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor={`${formIdPrefix}-lop`}
                    className="font-medium text-slate-700 dark:text-slate-300"
                  >
                    Lớp sinh hoạt <span className="text-rose-600">*</span>
                  </label>
                  {availableClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCustomClassInput((prev) => !prev)}
                      className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {isCustomClassInput ? 'Chọn từ danh mục' : 'Nhập lớp khác'}
                    </button>
                  )}
                </div>
                {availableClasses.length > 0 && !isCustomClassInput ? (
                  <select
                    id={`${formIdPrefix}-lop`}
                    value={formData.lop || ''}
                    onChange={(e) => {
                      const newLop = e.target.value;
                      setFormData({
                        ...formData,
                        lop: newLop,
                        khoa: newLop ? getFacultyForClass(newLop) : '',
                      });
                    }}
                    className={`${inputClassName} font-medium cursor-pointer`}
                    required
                  >
                    <option value="" disabled>
                      -- Chọn lớp --
                    </option>
                    {availableClasses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`${formIdPrefix}-lop`}
                    type="text"
                    value={formData.lop || ''}
                    onChange={(e) => {
                      const newLop = e.target.value;
                      setFormData({
                        ...formData,
                        lop: newLop,
                        khoa: formData.khoa || (newLop ? getFacultyFromHelper(newLop) : ''),
                      });
                    }}
                    placeholder="Nhập tên lớp sinh hoạt"
                    className={`${inputClassName} font-medium`}
                    required
                  />
                )}
              </div>
              <div>
                <label
                  htmlFor={`${formIdPrefix}-khoa`}
                  className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Khoa / Viện
                </label>
                <select
                  id={`${formIdPrefix}-khoa`}
                  value={formData.khoa || ''}
                  onChange={(e) => setFormData({ ...formData, khoa: e.target.value })}
                  className={`${inputClassName} cursor-pointer`}
                >
                  <option value="">-- Chọn khoa chuyên ngành --</option>
                  {SPECIALIZED_FACULTIES.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                  {formData.khoa &&
                    !(SPECIALIZED_FACULTIES as readonly string[]).includes(formData.khoa) && (
                      <option value={formData.khoa}>{formData.khoa}</option>
                    )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`${formIdPrefix}-trangthai`}
                  className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Trạng thái
                </label>
                <select
                  id={`${formIdPrefix}-trangthai`}
                  value={formData.trangThai || 'Đang học'}
                  onChange={(e) =>
                    setFormData({ ...formData, trangThai: e.target.value as SinhVien['trangThai'] })
                  }
                  className={`${inputClassName} cursor-pointer`}
                >
                  <option value="Đang học">Đang học</option>
                  <option value="Bảo lưu">Bảo lưu</option>
                  <option value="Tốt nghiệp">Tốt nghiệp</option>
                  <option value="Thôi học">Thôi học</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor={`${formIdPrefix}-ngaynhaphoc`}
                  className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Ngày nhập học
                </label>
                <input
                  id={`${formIdPrefix}-ngaynhaphoc`}
                  type="date"
                  value={formData.ngayNhapHoc || ''}
                  onChange={(e) => setFormData({ ...formData, ngayNhapHoc: e.target.value })}
                  className={`${inputClassName} font-mono`}
                />
              </div>
            </div>
          </div>

          {/* 3. Thông tin cá nhân & Liên lạc */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>3. Thông tin cá nhân & Liên lạc</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`${formIdPrefix}-ngaysinh`}
                  className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Ngày sinh
                </label>
                <input
                  id={`${formIdPrefix}-ngaysinh`}
                  type="date"
                  value={formData.ngaySinh || ''}
                  onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                  className={`${inputClassName} font-mono`}
                />
              </div>
              <div>
                <label
                  htmlFor={`${formIdPrefix}-gioitinh`}
                  className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Giới tính
                </label>
                <select
                  id={`${formIdPrefix}-gioitinh`}
                  value={formData.gioiTinh || 'Nam'}
                  onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value as 'Nam' | 'Nữ' })}
                  className={`${inputClassName} cursor-pointer`}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`${formIdPrefix}-sdt`}
                  className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Số điện thoại
                </label>
                <input
                  id={`${formIdPrefix}-sdt`}
                  type="text"
                  value={formData.soDienThoai || ''}
                  onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                  placeholder="09xxxxxxxx"
                  className={`${inputClassName} font-mono`}
                />
              </div>
              <div>
                <label
                  htmlFor={`${formIdPrefix}-email`}
                  className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Email trường
                </label>
                <input
                  id={`${formIdPrefix}-email`}
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="tensv@tdnu.edu.vn"
                  className={inputClassName}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={`${formIdPrefix}-diachi`}
                className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
              >
                Địa chỉ thường trú
              </label>
              <input
                id={`${formIdPrefix}-diachi`}
                type="text"
                value={formData.diaChi || ''}
                onChange={(e) => setFormData({ ...formData, diaChi: e.target.value })}
                placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
                className={inputClassName}
              />
            </div>

            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Thông tin liên hệ phụ huynh
                </span>
                {loadingParentInfo && (
                  <span className="text-[11px] text-blue-700 dark:text-blue-400">Đang tải...</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`${formIdPrefix}-father-name`}
                    className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                  >
                    Họ tên bố
                  </label>
                  <input
                    id={`${formIdPrefix}-father-name`}
                    type="text"
                    disabled={loadingParentInfo}
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Nhập họ tên bố"
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${formIdPrefix}-mother-name`}
                    className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                  >
                    Họ tên mẹ
                  </label>
                  <input
                    id={`${formIdPrefix}-mother-name`}
                    type="text"
                    disabled={loadingParentInfo}
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="Nhập họ tên mẹ"
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${formIdPrefix}-parent-phone`}
                  className="font-medium text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Số điện thoại phụ huynh
                </label>
                <input
                  id={`${formIdPrefix}-parent-phone`}
                  type="tel"
                  disabled={loadingParentInfo}
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="Nhập số điện thoại liên hệ phụ huynh"
                  className={`${inputClassName} font-mono`}
                />
              </div>
            </div>
          </div>

          {/* 4. Hồ sơ số hóa */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>4. Hồ sơ số hóa ({formData.hoSoFiles?.length || 0} tệp)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal normal-case">PDF, JPG, PNG</span>
            </div>

            {formData.hoSoFiles && formData.hoSoFiles.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {formData.hoSoFiles.map((file, idx) => (
                  <div
                    key={file.id || idx}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                        <div className="flex-1">
                          <label
                            htmlFor={`${formIdPrefix}-doc-${file.id}`}
                            className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block mb-0.5"
                          >
                            Tên tài liệu #{idx + 1}
                          </label>
                          <input
                            id={`${formIdPrefix}-doc-${file.id}`}
                            type="text"
                            value={file.customName}
                            onChange={(e) => handleUpdateCustomName(file.id, e.target.value)}
                            className="w-full text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-end mb-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            onPreviewDocument(file.fileUrl, file.customName || 'Hồ sơ', file.fileName, {
                              hoTen: formData.hoTen || 'Sinh viên',
                              maSV: formData.maSV || '',
                              lop: formData.lop || '',
                            })
                          }
                          className="p-1 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition-colors cursor-pointer"
                          title="Xem tài liệu"
                          aria-label="Xem tài liệu"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition-colors cursor-pointer"
                          title="Xóa tệp"
                          aria-label="Xóa tệp"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-mono pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span className="truncate">{file.fileName}</span>
                      {file.uploadedAt && <span className="shrink-0 tabular-nums">{file.uploadedAt}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded hover:border-blue-600 dark:hover:border-blue-500 cursor-pointer bg-slate-50 dark:bg-slate-800/60 transition-colors text-center">
              <Upload className="w-4 h-4 text-blue-700 dark:text-blue-400 mb-1" />
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Chọn tệp hồ sơ (PDF, JPG, PNG)
              </span>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={handleMultipleFilesUpload}
              />
            </label>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              {editingStudent && onOpenFullProfile && (
                <button
                  type="button"
                  onClick={() => {
                    const targetMaSV = editingStudent.maSV;
                    onClose();
                    onOpenFullProfile(targetMaSV, 'GENERAL');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors cursor-pointer text-xs font-medium"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Mở hồ sơ đầy đủ (Địa chỉ 2 cấp, Dân tộc, Tôn giáo)</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onClose}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs font-medium disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting || loadingParentInfo}
                className="px-3.5 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white transition-colors cursor-pointer text-xs font-medium disabled:opacity-50"
              >
                {isSubmitting ? 'Đang lưu...' : editingStudent ? 'Lưu cập nhật' : 'Tạo hồ sơ'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
