// src/components/admin/UserManagementModule.tsx
// Phân hệ Quản Lý Người Dùng & Phân Quyền RBAC - Trường ĐH Trần Đại Nghĩa
// Tuân thủ Visual Source of Truth: Anti-AI Slop, Zero-Pill Discipline, Slate Palette, Dense Layout

import React, { useState } from 'react';
import { User, UserRole, UserPermission, SinhVien } from '../../types';
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  GraduationCap,
  UserPlus,
  Search,
  CheckCircle2,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  X,
  KeyRound,
  AlertCircle,
  Users,
  Check,
  Building,
  Mail,
  Calendar,
  Sparkles,
  Filter,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import {
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckIcon,
  EditIcon,
  TrashIcon,
  LockIcon,
  UnlockIcon,
} from '../common/ActionIcons';
import { resolvePlainPassword } from '../../utils/security';

interface UserManagementModuleProps {
  currentUser: User | null;
  users: User[];
  students: SinhVien[];
  onCreateUser: (userData: Partial<User>) => Promise<{ success: boolean; message: string }>;
  onUpdateUser?: (id: string, userData: Partial<User>) => Promise<{ success: boolean; message: string }> | Promise<any>;
  onUpdateRole: (id: string, role: UserRole, permissions?: UserPermission) => Promise<void>;
  onUpdatePermissions: (id: string, permissions: UserPermission) => Promise<void>;
  onUpdateStatus: (id: string, status: 'ACTIVE' | 'LOCKED' | 'PENDING') => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onClearAllData?: () => Promise<any>;
}

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({
  currentUser,
  users,
  students,
  onCreateUser,
  onUpdateUser,
  onUpdateRole,
  onUpdatePermissions,
  onUpdateStatus,
  onDeleteUser,
  onClearAllData,
}) => {
  const isAdmin = currentUser?.role === 'ADMIN';

  // Visibility & Interaction States
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState<boolean>(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Create User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('STUDENT');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFaculty, setNewFaculty] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Edit User Form State
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editFaculty, setEditFaculty] = useState('');
  const [editStudentCode, setEditStudentCode] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('STUDENT');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'LOCKED' | 'PENDING'>('ACTIVE');
  const [editPermissions, setEditPermissions] = useState<UserPermission>({});
  const [editModalError, setEditModalError] = useState('');
  const [editModalSuccess, setEditModalSuccess] = useState('');

  const existingFaculties = Array.from(new Set(users.map((u) => u.faculty).filter(Boolean)));

  // Permission Check: Only ADMIN can access
  if (!isAdmin) {
    return (
      <div className="p-8 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-center space-y-3">
        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-rose-900 dark:text-rose-200 uppercase tracking-tight">
            Khu Vực Phân Quyền Giới Hạn Quản Trị
          </h2>
          <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto mt-1 leading-relaxed">
            Chỉ Quản trị viên cao nhất (Role: ADMIN) mới có quyền truy cập module Phân cấp Quản trị viên và Cấp quyền người dùng hệ thống.
          </p>
        </div>
      </div>
    );
  }

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.studentCode && u.studentCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Statistics
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const lecturerCount = users.filter((u) => u.role === 'LECTURER').length;
  const studentCount = users.filter((u) => u.role === 'STUDENT').length;
  const lockedCount = users.filter((u) => u.status === 'LOCKED').length;

  const handleGeneratePassword = (target: 'NEW' | 'EDIT') => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    let rand = '';
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (target === 'NEW') {
      setNewPassword(rand);
      setShowNewPassword(true);
    } else {
      setEditPassword(rand);
      setShowEditPassword(true);
    }
  };

  const getUserPasswordDisplay = (user: User) => {
    return resolvePlainPassword(user);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditFullName(user.fullName);
    const plainPass = resolvePlainPassword(user);
    setEditPassword(plainPass);
    setShowEditPassword(false);
    setEditEmail(user.email || '');
    setEditFaculty(user.faculty || 'Khoa Cơ khí');
    setEditStudentCode(user.studentCode || '');
    setEditRole(user.role);
    setEditStatus(user.status || 'ACTIVE');
    setEditModalError('');
    setEditModalSuccess('');
    setEditPermissions(
      user.permissions || {
        canManageUsers: user.role === 'ADMIN',
        canManageStudents: user.role === 'ADMIN' || user.role === 'LECTURER',
        canEditGrades: user.role === 'ADMIN' || user.role === 'LECTURER',
        canImportExcel: user.role === 'ADMIN' || user.role === 'LECTURER',
        canEvaluateTraining: user.role === 'ADMIN' || user.role === 'LECTURER',
        canApproveRetakes: user.role === 'ADMIN',
        canManageSchedule: user.role === 'ADMIN' || user.role === 'LECTURER',
      }
    );
  };

  const handleSaveUserFullInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditModalError('');
    setEditModalSuccess('');

    if (!editUsername.trim() || !editFullName.trim()) {
      setEditModalError('Vui lòng điền Tên đăng nhập và Họ tên người dùng');
      return;
    }

    const updatedData: Partial<User> = {
      username: editUsername.trim(),
      fullName: editFullName.trim(),
      email: editEmail.trim(),
      faculty: editFaculty,
      studentCode: editRole === 'STUDENT' ? editStudentCode.trim() : undefined,
      role: editRole,
      status: editStatus,
      permissions: editPermissions,
    };

    if (editPassword && editPassword.trim() !== '' && !editPassword.includes('••••••••')) {
      updatedData.password = editPassword.trim();
      updatedData.plainPassword = editPassword.trim();
    }

    if (onUpdateUser) {
      const res = await onUpdateUser(editingUser.id, updatedData);
      if (res && res.success === false) {
        setEditModalError(res.message || 'Cập nhật thất bại');
        return;
      }
    } else {
      await onUpdateRole(editingUser.id, editRole, editPermissions);
    }

    setEditModalSuccess('Đã cập nhật thông tin tài khoản và mật khẩu thành công!');
    setTimeout(() => {
      setEditingUser(null);
      setEditModalSuccess('');
    }, 1000);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!newUsername.trim() || !newFullName.trim()) {
      setModalError('Vui lòng nhập đầy đủ thông tin Tên đăng nhập và Họ tên');
      return;
    }

    const rawPass = newPassword.trim() || '123456';
    const res = await onCreateUser({
      username: newUsername.trim(),
      fullName: newFullName.trim(),
      password: rawPass,
      plainPassword: rawPass,
      role: newRole,
      studentCode: newRole === 'STUDENT' ? (newStudentCode || newUsername).trim() : undefined,
      email: newEmail.trim() || `${newUsername}@tdnu.edu.vn`,
      faculty: newFaculty,
    });

    if (res.success) {
      setModalSuccess('Đã khởi tạo tài khoản và mật khẩu thành công!');
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setNewUsername('');
        setNewFullName('');
        setNewPassword('123456');
        setNewStudentCode('');
        setNewEmail('');
        setModalSuccess('');
      }, 1000);
    } else {
      setModalError(res.message || 'Tạo tài khoản thất bại');
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    await onDeleteUser(userToDelete.id);
    setUserToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                Quản Lý Phân Cấp & Cấp Quyền Người Dùng
              </h1>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="btn-admin-add-user"
            type="button"
            onClick={() => {
              setModalError('');
              setModalSuccess('');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tạo Tài Khoản Mới</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Admin Cao Nhất</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white leading-tight">{adminCount}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Giảng Viên</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white leading-tight">{lecturerCount}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Tài Khoản Sinh Viên</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white leading-tight">{studentCount}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Đang Bị Khóa</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white leading-tight">{lockedCount}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            id="input-search-users"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, Mã SV, email, username..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 pl-8 pr-3 py-1.5 text-xs rounded text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowAllPasswords(!showAllPasswords)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded border transition-colors cursor-pointer ${
              showAllPasswords
                ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/70 dark:border-amber-800 dark:text-amber-300'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            {showAllPasswords ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showAllPasswords ? 'Ẩn tất cả Mật khẩu' : 'Hiện tất cả Mật khẩu'}</span>
          </button>
          <select
            id="select-filter-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            <option value="ALL">Tất cả Vai trò</option>
            <option value="ADMIN">Admin Quản trị</option>
            <option value="LECTURER">Giảng viên</option>
            <option value="STUDENT">Sinh viên</option>
          </select>
          <select
            id="select-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 rounded text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            <option value="ALL">Tất cả Trạng thái</option>
            <option value="ACTIVE">Hoạt Động (Active)</option>
            <option value="LOCKED">Đã khóa (Locked)</option>
          </select>
        </div>
      </div>

      {/* Main Dense User Table */}
      <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3.5 py-2.5">Người Dùng / Mã Số</th>
                <th className="px-3.5 py-2.5">Mật Khẩu (Password)</th>
                <th className="px-3.5 py-2.5">Vai Trò (Role)</th>
                <th className="px-3.5 py-2.5">Email & Khoa / Đơn Vị</th>
                <th className="px-3.5 py-2.5 text-center">Trạng Thái</th>
                <th className="px-3.5 py-2.5">Quyền Thao Tác (RBAC)</th>
                <th className="px-3.5 py-2.5 text-right">Thao Tác Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-xs">
                    Không tìm thấy người dùng nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isUserAdmin = user.role === 'ADMIN';
                  const isUserLecturer = user.role === 'LECTURER';
                  const isUserStudent = user.role === 'STUDENT';
                  const studentMatch = isUserStudent
                    ? students.find((s) => s.maSV.toLowerCase() === (user.studentCode || user.username).toLowerCase())
                    : null;
                  const displayAvatar =
                    user.avatar || studentMatch?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
                  const currentPasswordStr = getUserPasswordDisplay(user);
                  const isPassVisible = showAllPasswords || visiblePasswords[user.id];

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={displayAvatar}
                            alt={user.fullName}
                            className="w-8 h-8 rounded object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white leading-tight">
                              {user.fullName}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {user.studentCode ? `Mã SV: ${user.studentCode}` : `Tài khoản: ${user.username}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-700">
                            {isPassVisible ? currentPasswordStr : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setVisiblePasswords((prev) => ({
                                ...prev,
                                [user.id]: !prev[user.id],
                              }))
                            }
                            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded transition-colors cursor-pointer"
                            title={visiblePasswords[user.id] ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                          >
                            {isPassVisible ? (
                              <EyeOffIcon className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <EyeIcon className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(currentPasswordStr);
                              setCopiedUserId(user.id);
                              setTimeout(() => setCopiedUserId(null), 1500);
                            }}
                            className="p-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 rounded transition-colors cursor-pointer"
                            title="Sao chép mật khẩu"
                          >
                            {copiedUserId === user.id ? (
                              <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <CopyIcon className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        {isUserAdmin && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <ShieldCheck className="w-3 h-3" />
                            ADMIN
                          </span>
                        )}
                        {isUserLecturer && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <UserCheck className="w-3 h-3" />
                            GIẢNG VIÊN
                          </span>
                        )}
                        {isUserStudent && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <GraduationCap className="w-3 h-3" />
                            SINH VIÊN
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="text-slate-800 dark:text-slate-200 font-medium leading-tight">{user.email}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{user.faculty || 'Đơn vị đào tạo'}</div>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        {user.status === 'LOCKED' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <Lock className="w-3 h-3" />
                            ĐÃ KHÓA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            HOẠT ĐỘNG
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.permissions?.canManageUsers && (
                            <span className="text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-1 py-0.2 rounded font-medium border border-purple-200 dark:border-purple-800">
                              Quản trị User
                            </span>
                          )}
                          {user.permissions?.canEditGrades && (
                            <span className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-1 py-0.2 rounded font-medium border border-blue-200 dark:border-blue-800">
                              Nhập Điểm
                            </span>
                          )}
                          {user.permissions?.canImportExcel && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1 py-0.2 rounded font-medium border border-indigo-200 dark:border-indigo-800">
                              Import Excel
                            </span>
                          )}
                          {user.permissions?.canEvaluateTraining && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-1 py-0.2 rounded font-medium border border-emerald-200 dark:border-emerald-800">
                              Rèn Luyện
                            </span>
                          )}
                          {user.permissions?.canApproveRetakes && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-1 py-0.2 rounded font-medium border border-amber-200 dark:border-amber-800">
                              Duyệt Thi Lại
                            </span>
                          )}
                          {user.permissions?.canEditHoSo && (
                            <span className="text-[9px] bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 px-1 py-0.2 rounded font-semibold border border-teal-200 dark:border-teal-800">
                              Hồ Sơ Số Hóa
                            </span>
                          )}
                          {!user.permissions?.canManageUsers &&
                            !user.permissions?.canEditGrades &&
                            !user.permissions?.canEvaluateTraining &&
                            !user.permissions?.canEditHoSo && (
                              <span className="text-[10px] text-slate-400 italic">Quyền xem cơ bản</span>
                            )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin, Mật khẩu & Quyền"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                          </button>
                          {user.status === 'LOCKED' ? (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(user.id, 'ACTIVE')}
                              className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Mở khóa tài khoản"
                            >
                              <UnlockIcon className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(user.id, 'LOCKED')}
                              className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Khóa tài khoản"
                            >
                              <LockIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title="Xóa tài khoản"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-lg w-full p-5 shadow-xl relative my-auto max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5 mb-3.5 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Tạo & Phân Cấp Tài Khoản Mới
                </h3>
              </div>
            </div>

            {modalError && (
              <div className="mb-3 p-2.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{modalError}</span>
              </div>
            )}
            {modalSuccess && (
              <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Chọn Vai Trò (Role):</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('STUDENT')}
                    className={`py-1.5 px-2 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                      newRole === 'STUDENT'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Sinh Viên
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('LECTURER')}
                    className={`py-1.5 px-2 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                      newRole === 'LECTURER'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Giảng Viên
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('ADMIN')}
                    className={`py-1.5 px-2 rounded border text-xs font-semibold transition-colors cursor-pointer ${
                      newRole === 'ADMIN'
                        ? 'bg-purple-50 border-purple-500 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {newRole === 'STUDENT' && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded space-y-1">
                  <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 block">
                    Mã Số Sinh Viên (Tự động tra cứu hồ sơ):
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentCode}
                    onChange={(e) => {
                      setNewStudentCode(e.target.value);
                      if (e.target.value) {
                        const match = students.find(
                          (s) => s.maSV.toLowerCase() === e.target.value.trim().toLowerCase()
                        );
                        if (match) {
                          setNewFullName(match.hoTen);
                          setNewUsername(match.maSV);
                          setNewEmail(match.email || `${match.maSV}@tdnu.edu.vn`);
                          setNewFaculty(match.khoa || 'Công nghệ Thông tin');
                        }
                      }
                    }}
                    placeholder="VD: sv2024001, sv2024002..."
                    className="w-full bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên Đăng Nhập:</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Username..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Họ Và Tên:</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Họ tên người dùng..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mật Khẩu Ban Đầu:</label>
                  <button
                    type="button"
                    onClick={() => handleGeneratePassword('NEW')}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Tạo ngẫu nhiên
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded pl-2.5 pr-8 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email:</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Đơn Vị Quản Lý / Khoa:</label>
                  <input
                    type="text"
                    value={newFaculty}
                    onChange={(e) => setNewFaculty(e.target.value)}
                    placeholder="Khoa CNTT, Phòng Đào tạo..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer"
                >
                  Khởi Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER & PERMISSIONS MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-lg w-full p-5 shadow-xl relative my-auto max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5 mb-3.5 border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                  Chỉnh Sửa Thông Tin & Mật Khẩu
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {editingUser.fullName} • {editingUser.studentCode ? `Mã SV: ${editingUser.studentCode}` : `User: ${editingUser.username}`}
                </p>
              </div>
            </div>

            {editModalError && (
              <div className="mb-3 p-2.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{editModalError}</span>
              </div>
            )}
            {editModalSuccess && (
              <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs rounded flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{editModalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveUserFullInfo} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700 space-y-2.5">
                <label className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                  1. Thông Tin Tài Khoản & Mật Khẩu
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên Đăng Nhập:</label>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Họ Và Tên:</label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      Mật Khẩu Mới (Admin sửa trực tiếp):
                    </label>
                    <button
                      type="button"
                      onClick={() => handleGeneratePassword('EDIT')}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Tạo ngẫu nhiên
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới hoặc chỉnh sửa mật khẩu..."
                      className="w-full bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-600 rounded pl-2.5 pr-8 py-1.5 text-xs text-slate-900 dark:text-amber-200 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showEditPassword ? <EyeOff className="w-3.5 h-3.5 text-amber-500" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email:</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Đơn Vị Quản Lý / Khoa:</label>
                    <input
                      type="text"
                      value={editFaculty}
                      onChange={(e) => setEditFaculty(e.target.value)}
                      placeholder="Khoa CNTT, Phòng Đào tạo..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                {editRole === 'STUDENT' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Mã Số Sinh Viên (Mã SV):</label>
                    <input
                      type="text"
                      value={editStudentCode}
                      onChange={(e) => setEditStudentCode(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vai trò (Role):</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                    <option value="LECTURER">LECTURER (Giảng viên)</option>
                    <option value="STUDENT">STUDENT (Sinh viên)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Trạng thái Tài khoản:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">Hoạt Động (Active)</option>
                    <option value="LOCKED">Đã khóa (Locked)</option>
                  </select>
                </div>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-slate-200 dark:border-slate-700">
                <label className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">
                  2. Phân Quyền Chi Tiết (RBAC Permissions)
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canManageUsers}
                      onChange={(e) =>
                        setEditPermissions((prev) => ({ ...prev, canManageUsers: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold">Quản lý Phân quyền Người dùng</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canManageStudents}
                      onChange={(e) =>
                        setEditPermissions((prev) => ({ ...prev, canManageStudents: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold">Quản lý Hồ sơ Sinh viên</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canEditGrades}
                      onChange={(e) =>
                        setEditPermissions((prev) => ({ ...prev, canEditGrades: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold">Nhập & Chỉnh Sửa Bảng Điểm GPA</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canImportExcel}
                      onChange={(e) =>
                        setEditPermissions((prev) => ({ ...prev, canImportExcel: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold">Import Bảng Điểm & TKB Từ Excel</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canEvaluateTraining}
                      onChange={(e) =>
                        setEditPermissions((prev) => ({ ...prev, canEvaluateTraining: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold">Đánh Giá & Nhận Xét Điểm Rèn Luyện</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canApproveRetakes}
                      onChange={(e) =>
                        setEditPermissions((prev) => ({ ...prev, canApproveRetakes: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold">Xét Duyệt Đơn Thi Lại / Học Lại</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer bg-teal-50 dark:bg-teal-950/40 p-2 rounded border border-teal-200 dark:border-teal-800">
                    <input
                      type="checkbox"
                      checked={!!editPermissions.canEditHoSo}
                      onChange={(e) =>
                        setEditPermissions((prev) => ({ ...prev, canEditHoSo: e.target.checked }))
                      }
                      className="rounded border-teal-300 text-teal-600 focus:ring-teal-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-teal-800 dark:text-teal-300">Cấp Quyền Bổ Sung Hồ Sơ Số Hóa (Cho Sinh Viên)</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs transition-colors cursor-pointer"
                >
                  Lưu Thông Tin & Mật Khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL (Replaces bare delete) */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded max-w-md w-full p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm uppercase tracking-tight">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Xác Nhận Xóa Tài Khoản Người Dùng</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa tài khoản của người dùng{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">{userToDelete.fullName}</strong> (
              <span className="font-mono">{userToDelete.username}</span>)? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded shadow-xs transition-colors cursor-pointer"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
