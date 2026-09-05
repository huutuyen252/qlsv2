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
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState<boolean>(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState<UserRole>('STUDENT');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newFaculty, setNewFaculty] = useState('');
  const [modalError, setModalError] = useState('');
  const existingFaculties = Array.from(new Set(users.map((u) => u.faculty).filter(Boolean)));
  const [modalSuccess, setModalSuccess] = useState('');
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
  if (!isAdmin) {
    return (
      <div className="p-8 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 rounded-2xl flex items-center justify-center mx-auto shadow-md">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-rose-900 dark:text-rose-200">
            Khu Vực Phân Quyền Giới Hạn Quản Trị
          </h2>
          <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto mt-1 leading-relaxed">
            Chỉ Admin cao nhất (Role: ADMIN) mới có quyền truy cập module Phân cấp Quản trị viên và Cấp quyền người dùng hệ thống.
          </p>
        </div>
      </div>
    );
  }
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
    if (user.password) return user.password;
    if (user.role === 'ADMIN') return 'admin123';
    if (user.role === 'LECTURER') return 'gv123';
    return '123456';
  };
  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditFullName(user.fullName);
    setEditPassword(getUserPasswordDisplay(user));
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
      setEditModalError('Vui lòng iền Tên fng nhập và Họ tên người dùng');
      return;
    }
    const updatedData: Partial<User> = {
      username: editUsername.trim(),
      fullName: editFullName.trim(),
      password: editPassword.trim(),
      email: editEmail.trim(),
      faculty: editFaculty,
      studentCode: editRole === 'STUDENT' ? editStudentCode.trim() : undefined,
      role: editRole,
      status: editStatus,
      permissions: editPermissions,
    };
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
      setModalError('Vui lòng nhập ầy ủ thông tin Tên fng nhập và Họ tên');
      return;
    }
    const res = await onCreateUser({
      username: newUsername.trim(),
      fullName: newFullName.trim(),
      password: newPassword.trim() || '123456',
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
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-sans">
                Quản Lý Phân Cấp, Mật Khẩu & Cấp Quyền Người Dùng
              </h1>
              <span className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                Highest Admin Access
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            id="btn-admin-add-user"
            onClick={() => {
              setModalError('');
              setModalSuccess('');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Tạo & Phân Quyền Tài Khoản Mới
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Admin Cao Nhất</div>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white">{adminCount}</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Giảng Viên</div>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white">{lecturerCount}</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Tài Khoản Sinh Viên</div>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white">{studentCount}</div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold uppercase">Đang B Khóa</div>
            <div className="text-xl font-black font-mono text-slate-900 dark:text-white">{lockedCount}</div>
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-search-users"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, MaSV, email, username..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-9 pr-3 py-2 text-xs rounded-xl focus:outline-none text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowAllPasswords(!showAllPasswords)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              showAllPasswords
                ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {showAllPasswords ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4" />}
            {showAllPasswords ? 'Ẩn tất cả Mật khẩu' : 'Hiện tất cả Mật khẩu'}
          </button>
          <select
            id="select-filter-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer"
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
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả Trạng thái</option>
            <option value="ACTIVE">Hoạt Động (Active)</option>
            <option value="LOCKED">Đã khóa (Locked)</option>
          </select>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-4">Người Dùng / Mã Số</th>
                <th className="p-4">Mật Khẩu (Password)</th>
                <th className="p-4">Vai Trò (Role)</th>
                <th className="p-4">Email & Khoa</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4">Quyền Thao Tác</th>
                <th className="p-4 text-right">Thao Tác Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => {
                const isUserAdmin = user.role === 'ADMIN';
                const isUserLecturer = user.role === 'LECTURER';
                const isUserStudent = user.role === 'STUDENT';
                const currentPasswordStr = getUserPasswordDisplay(user);
                const isPassVisible = showAllPasswords || visiblePasswords[user.id];
                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            user.avatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={user.fullName}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                            {user.fullName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {user.studentCode ? `MaSV: ${user.studentCode}` : `Username: ${user.username}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700">
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
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
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
                          className="p-1.5 text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
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
                    <td className="p-4">
                      {isUserAdmin && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          ADMIN
                        </span>
                      )}
                      {isUserLecturer && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                          <UserCheck className="w-3.5 h-3.5" />
                          GIẢNG VISN
                        </span>
                      )}
                      {isUserStudent && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <GraduationCap className="w-3.5 h-3.5" />
                          SINH VISN
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{user.email}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{user.faculty || 'Đơn vị đào tạo'}</div>
                    </td>
                    <td className="p-4">
                      {user.status === 'LOCKED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          <Lock className="w-3 h-3" />
                          ĐÃ KHÓA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          HOẠT ĐỘNG
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.permissions?.canManageUsers && (
                          <span className="text-[9px] bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-1.5 py-0.5 rounded font-medium border border-purple-200 dark:border-purple-800">
                            User Mgmt
                          </span>
                        )}
                        {user.permissions?.canEditGrades && (
                          <span className="text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium border border-blue-200 dark:border-blue-800">
                            Nhập Điểm
                          </span>
                        )}
                        {user.permissions?.canImportExcel && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.5 rounded font-medium border border-indigo-200 dark:border-indigo-800">
                            Import Excel
                          </span>
                        )}
                        {user.permissions?.canEvaluateTraining && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium border border-emerald-200 dark:border-emerald-800">
                            Rèn Luyện
                          </span>
                        )}
                        {user.permissions?.canApproveRetakes && (
                          <span className="text-[9px] bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium border border-amber-200 dark:border-amber-800">
                            Duyệt Thi Lại
                          </span>
                        )}
                        {user.permissions?.canEditHoSo && (
                          <span className="text-[9px] bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 px-1.5 py-0.5 rounded font-bold border border-teal-200 dark:border-teal-800">
                            Sửa H" Sơ S Hóa
                          </span>
                        )}
                        {!user.permissions?.canManageUsers &&
                          !user.permissions?.canEditGrades &&
                          !user.permissions?.canEvaluateTraining &&
                          !user.permissions?.canEditHoSo && (
                            <span className="text-[9px] text-slate-400 italic">Quyền xem cá nhân</span>
                          )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin, Mật khẩu & Quyền"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        {user.status === 'LOCKED' ? (
                          <button
                            onClick={() => onUpdateStatus(user.id, 'ACTIVE')}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
                            title="Mở khóa tài khoản"
                          >
                            <UnlockIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpdateStatus(user.id, 'LOCKED')}
                            className="p-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 rounded-lg transition-colors cursor-pointer"
                            title="Khóa tài khoản"
                          >
                            <LockIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteUser(user.id)}
                          className="p-1.5 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg transition-colors cursor-pointer"
                          title="Xóa tài khoản"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-auto max-h-[88vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tạo & Phân Cấp Tài Khoản Mới
                </h3>
                <p className="text-xs text-slate-500">
                  Cấp tài khoản kèm quy định kiểm soát Mã số sinh viên
                </p>
              </div>
            </div>
            {modalError && (
              <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{modalError}</span>
              </div>
            )}
            {modalSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}
            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Chọn Vai Trò (Role):</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRole('STUDENT')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newRole === 'STUDENT'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Sinh Viên
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('LECTURER')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newRole === 'LECTURER'
                        ? 'bg-blue-950/60 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Giảng Viên
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRole('ADMIN')}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      newRole === 'ADMIN'
                        ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
              {newRole === 'STUDENT' && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-800/50 rounded-xl space-y-1">
                  <label className="text-xs font-bold text-emerald-400 flex items-center justify-between">
                    <span>Mã Số Sinh Viên:</span>
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
                          setNewFaculty(match.khoa || 'Công ngh Thông tin');
                        }
                      }
                    }}
                    placeholder="VD: sv2024001, sv2024002..."
                    className="w-full bg-slate-950 border border-emerald-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Tên Đăng Nhập:</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Username..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Họ Và Tên:</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Họ tên người dùng..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Mật Khẩu Ban Đầu:</label>
                  <button
                    type="button"
                    onClick={() => handleGeneratePassword('NEW')}
                    className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Email:</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Đơn V Quản Lý / Khoa:</label>
                  {existingFaculties.length > 0 ? (
                    <div className="flex gap-2">
                      <select
                        value={existingFaculties.includes(newFaculty) ? newFaculty : 'OTHER'}
                        onChange={(e) => {
                          if (e.target.value !== 'OTHER') {
                            setNewFaculty(e.target.value);
                          }
                        }}
                        className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>-- Chọn Đơn v có sẵn --</option>
                        {existingFaculties.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                        <option value="OTHER">Tự nhập Khoa/Đơn v...</option>
                      </select>
                      <input
                        type="text"
                        value={newFaculty}
                        onChange={(e) => setNewFaculty(e.target.value)}
                        placeholder="Ví dụ: Khoa CNTT, Phòng Đào tạo..."
                        className="w-1/2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={newFaculty}
                      onChange={(e) => setNewFaculty(e.target.value)}
                      placeholder="Nhập tên Khoa / Đơn v quản lý..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  )}
                </div>
              </div>
              <button
                type="submit"
                className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Khởi Tạo & Cấp Quyền Tài Khoản
              </button>
            </form>
          </div>
        </div>
      )}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-auto max-h-[88vh] overflow-y-auto">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Chỉnh Sửa Thông Tin & Mật Khẩu: {editingUser.fullName}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  ID: {editingUser.id} | {editingUser.studentCode ? `MaSV: ${editingUser.studentCode}` : `User: ${editingUser.username}`}
                </p>
              </div>
            </div>
            {editModalError && (
              <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{editModalError}</span>
              </div>
            )}
            {editModalSuccess && (
              <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{editModalSuccess}</span>
              </div>
            )}
            <form onSubmit={handleSaveUserFullInfo} className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
                  1. Thông Tin Tài Khoản & Mật Khẩu
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Tên Đăng Nhập:</label>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Họ Và Tên:</label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      Mật Khẩu Mới (Admin sửa trực tiếp):
                    </label>
                    <button
                      type="button"
                      onClick={() => handleGeneratePassword('EDIT')}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
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
                      placeholder="Mật khẩu mới..."
                      className="w-full bg-slate-900 border border-amber-500/60 rounded-xl pl-3 pr-10 py-2 text-xs text-amber-200 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Email:</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Đơn V Quản Lý / Khoa:</label>
                    {existingFaculties.length > 0 ? (
                      <div className="flex gap-2">
                        <select
                          value={existingFaculties.includes(editFaculty) ? editFaculty : 'OTHER'}
                          onChange={(e) => {
                            if (e.target.value !== 'OTHER') {
                              setEditFaculty(e.target.value);
                            }
                          }}
                          className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
                        >
                          <option value="" disabled>-- Chọn Khoa / Đơn v --</option>
                          {existingFaculties.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                          <option value="OTHER">Tự nhập khác...</option>
                        </select>
                        <input
                          type="text"
                          value={editFaculty}
                          onChange={(e) => setEditFaculty(e.target.value)}
                          placeholder="Nhập tên ơn v..."
                          className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={editFaculty}
                        onChange={(e) => setEditFaculty(e.target.value)}
                        placeholder="Nhập tên Khoa / Đơn v quản lý..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    )}
                  </div>
                </div>
                {editRole === 'STUDENT' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-emerald-400">Mã Số Sinh Viên (MaSV):</label>
                    <input
                      type="text"
                      value={editStudentCode}
                      onChange={(e) => setEditStudentCode(e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-800 rounded-xl px-3 py-2 text-xs text-emerald-200 font-mono focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Vai trò (Role):</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                    <option value="LECTURER">LECTURER (Giảng viên)</option>
                    <option value="STUDENT">STUDENT (Sinh viên)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Trạng thái Tài khoản:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">Hoạt Động (Active)</option>
                    <option value="LOCKED">Đã khóa (Locked)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <label className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                  2. Phân Quyền Chi Tiết (Permissions)
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editPermissions.canManageUsers}
                    onChange={(e) =>
                      setEditPermissions((prev) => ({ ...prev, canManageUsers: e.target.checked }))
                    }
                    className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-bold">Quản lý Phân quyền User</span>
                    <p className="text-[10px] text-slate-500">Cho phép tạo, sửa mật khẩu và phân quyền tài khoản</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editPermissions.canManageStudents}
                    onChange={(e) =>
                      setEditPermissions((prev) => ({ ...prev, canManageStudents: e.target.checked }))
                    }
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-bold">Quản lý Hồ sơ Sinh viên</span>
                    <p className="text-[10px] text-slate-500">Thêm, sửa, xóa hồ sơ lý lịch và văn bằng</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editPermissions.canEditGrades}
                    onChange={(e) =>
                      setEditPermissions((prev) => ({ ...prev, canEditGrades: e.target.checked }))
                    }
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-bold">Nhập & Chỉnh Sửa Bảng Điểm GPA</span>
                    <p className="text-[10px] text-slate-500">Cập nhật điểm chuyên cần, giữa kỳ, cuối kỳ</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editPermissions.canImportExcel}
                    onChange={(e) =>
                      setEditPermissions((prev) => ({ ...prev, canImportExcel: e.target.checked }))
                    }
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-bold">Import Bảng Điểm Từ Excel</span>
                    <p className="text-[10px] text-slate-500">Cho phép tải lên file .xlsx nhập điểm hàng loạt</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editPermissions.canEvaluateTraining}
                    onChange={(e) =>
                      setEditPermissions((prev) => ({ ...prev, canEvaluateTraining: e.target.checked }))
                    }
                    className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-bold">Đánh Giá & Nhận Xét Điểm Rèn Luyện</span>
                    <p className="text-[10px] text-slate-500">Cập nhật điểm rèn luyện và lời nhận xét tháng</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editPermissions.canApproveRetakes}
                    onChange={(e) =>
                      setEditPermissions((prev) => ({ ...prev, canApproveRetakes: e.target.checked }))
                    }
                    className="rounded border-slate-700 text-amber-600 focus:ring-amber-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-bold">Xét Duyệt Đơn Thi Lại / Học Lại</span>
                    <p className="text-[10px] text-slate-500">Duyệt trạng thái hồ sơ thi lại của sinh viên</p>
                  </div>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer bg-teal-950/40 p-2.5 rounded-xl border border-teal-800/60">
                  <input
                    type="checkbox"
                    checked={!!editPermissions.canEditHoSo}
                    onChange={(e) =>
                      setEditPermissions((prev) => ({ ...prev, canEditHoSo: e.target.checked }))
                    }
                    className="rounded border-slate-700 text-teal-500 focus:ring-teal-500 bg-slate-900"
                  />
                  <div>
                    <span className="font-bold text-teal-300">Cấp Quyền Chỉnh Sửa & B. Sung H" Sơ S Hóa (Cho Sinh Viên)</span>
                    <p className="text-[10px] text-teal-200/70">Cho phép sinh viên này được tự chỉnh sửa thông tin cá nhân và upload bổ sung các file scan hồ sơ số hóa</p>
                  </div>
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Lưu Thông Tin & Mật Khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

