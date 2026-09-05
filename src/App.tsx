import React, { useState, useEffect } from 'react';
import { User, SinhVien, Diem, RenLuyen, ThoiKhoaBieu, ThiLaiHocLai, UserRole, UserPermission, GpaSummary, MonHoc, HocKy, NamHoc } from './types';
import { INITIAL_USERS } from './data/initialData';
import { apiService } from './services/apiService';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { UserManagementModule } from './components/admin/UserManagementModule';
import { StudentProfileModule } from './components/profile/StudentProfileModule';
import { GradeManagementModule } from './components/grades/GradeManagementModule';
import { TrainingPointModule } from './components/training/TrainingPointModule';
import { ScheduleModule } from './components/schedule/ScheduleModule';
import { RetakeModule } from './components/retake/RetakeModule';
import { ReportsModule } from './components/reports/ReportsModule';
import { SubjectListModule } from './components/subjects/SubjectListModule';
import { AdminLayout } from './components/layouts/AdminLayout';
import { AdminOverviewModule } from './components/admin/AdminOverviewModule';
import { ImportWizard } from './components/admin/ImportWizard';
import { AdminBackupModule } from './components/admin/AdminBackupModule';
import { AdminAuditLogsModule } from './components/admin/AdminAuditLogsModule';
import { getAcademicPeriod } from './utils/academicCalendar';

export default function App() {
  // Restore current user and last active timestamp (10 min timeout)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUserStr = localStorage.getItem('app_current_user');
      const savedActivityStr = localStorage.getItem('app_last_activity_time');
      if (savedUserStr && savedActivityStr) {
        const lastActivity = parseInt(savedActivityStr, 10);
        const now = Date.now();
        const TEN_MINUTES_MS = 10 * 60 * 1000;
        // If inactive for more than 10 minutes, expire session
        if (now - lastActivity > TEN_MINUTES_MS) {
          localStorage.removeItem('app_current_user');
          localStorage.removeItem('app_last_activity_time');
          return null;
        }
        // Valid session, refresh activity timestamp
        localStorage.setItem('app_last_activity_time', String(now));
        return JSON.parse(savedUserStr);
      } else if (savedUserStr) {
        localStorage.setItem('app_last_activity_time', String(Date.now()));
        return JSON.parse(savedUserStr);
      }
    } catch {
      // ignore JSON parse errors
    }
    return null;
  });

  // Restore current view on F5 / reload
  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const savedView = localStorage.getItem('app_current_view');
      return savedView || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  // Restore admin sub-tab on F5 / reload
  const [adminSubTab, setAdminSubTab] = useState<string>(() => {
    try {
      const savedAdminTab = localStorage.getItem('app_admin_subtab');
      return savedAdminTab || 'admin-overview';
    } catch {
      return 'admin-overview';
    }
  });
  const [activeSemester, setActiveSemester] = useState<string>(() => getAcademicPeriod().code);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Core Database States
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [subjects, setSubjects] = useState<MonHoc[]>([]);
  const [students, setStudents] = useState<SinhVien[]>([]);
  const [grades, setGrades] = useState<Diem[]>([]);
  const [trainingPoints, setTrainingPoints] = useState<RenLuyen[]>([]);
  const [schedule, setSchedule] = useState<ThoiKhoaBieu[]>([]);
  const [retakes, setRetakes] = useState<ThiLaiHocLai[]>([]);
  const [semesters, setSemesters] = useState<HocKy[]>([]);
  const [academicYears, setAcademicYears] = useState<NamHoc[]>([]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  // Persist Current User
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('app_current_user', JSON.stringify(currentUser));
      localStorage.setItem('app_last_activity_time', String(Date.now()));
    } else {
      localStorage.removeItem('app_current_user');
      localStorage.removeItem('app_last_activity_time');
    }
  }, [currentUser]);

  // Persist Current View & Admin Tab on change
  useEffect(() => {
    try {
      localStorage.setItem('app_current_view', currentView);
    } catch {
      // ignore
    }
  }, [currentView]);

  useEffect(() => {
    try {
      localStorage.setItem('app_admin_subtab', adminSubTab);
    } catch {
      // ignore
    }
  }, [adminSubTab]);

  // 10-Minute Inactivity Auto-Logout Tracker
  useEffect(() => {
    if (!currentUser) return;

    const TEN_MINUTES_MS = 10 * 60 * 1000;

    const updateActivity = () => {
      localStorage.setItem('app_last_activity_time', String(Date.now()));
    };

    // User interaction events to reset the inactivity timer
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((ev) => {
      window.addEventListener(ev, updateActivity, { passive: true });
    });

    // Check every 10 seconds if 10 minutes of inactivity has passed
    const intervalId = setInterval(() => {
      const savedActivityStr = localStorage.getItem('app_last_activity_time');
      if (savedActivityStr) {
        const lastActivity = parseInt(savedActivityStr, 10);
        const diff = Date.now() - lastActivity;
        if (diff >= TEN_MINUTES_MS) {
          setCurrentUser(null);
          localStorage.removeItem('app_current_user');
          localStorage.removeItem('app_last_activity_time');
          showToast('Phiên làm việc đã hết hạn sau 10 phút không thao tác. Vui lòng đăng nhập lại.');
        }
      }
    }, 10000);

    return () => {
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, updateActivity);
      });
      clearInterval(intervalId);
    };
  }, [currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    try {
      const resUsers = await apiService.getUsers();
      if (resUsers.success && resUsers.data.length > 0) {
        setUsers(resUsers.data);
        setCurrentUser((prev) => {
          if (!prev) return null;
          const fresh = resUsers.data.find(
            (u) => u.id === prev.id || u.username.toLowerCase() === prev.username.toLowerCase()
          );
          return fresh ? fresh : prev;
        });
      }

      const resSub = await apiService.getSubjects();
      if (resSub.success) setSubjects(resSub.data);

      const resSv = await apiService.getStudents();
      if (resSv.success) setStudents(resSv.data);

      const resDiem = await apiService.getGrades();
      if (resDiem.success) setGrades(resDiem.data);

      const resRL = await apiService.getTrainingPoints();
      if (resRL.success) setTrainingPoints(resRL.data);

      const resTkb = await apiService.getSchedule();
      if (resTkb.success) setSchedule(resTkb.data);

      const resTl = await apiService.getRetakes();
      if (resTl.success) setRetakes(resTl.data);

      const [resSemesters, resAcademicYears] = await Promise.all([
        apiService.getSemesters(),
        apiService.getAcademicYears(),
      ]);
      if (resSemesters.success) setSemesters(resSemesters.data);
      if (resAcademicYears.success) setAcademicYears(resAcademicYears.data);
      if (resSemesters.success || resAcademicYears.success) {
        setActiveSemester(getAcademicPeriod(new Date(), resSemesters.data || [], resAcademicYears.data || []).code);
      }
    } catch {
      console.log('Using in-memory fallback state');
    }
  };

  // User & Permission Management Operations
  const handleRegisterAccount = async (userData: {
    username: string;
    fullName: string;
    role: UserRole;
    email?: string;
    password?: string;
    studentCode?: string;
    faculty?: string;
  }) => {
    const res = await apiService.register(userData);
    if (res.success) {
      showToast(res.message);
      loadAllData();
    }
    return res;
  };

  const handleCreateUser = async (userData: Partial<User>) => {
    const res = await apiService.createUser(userData);
    if (res.success) {
      showToast(res.message);
      loadAllData();
    }
    return res;
  };

  const handleUpdateUser = async (id: string, userData: Partial<User>) => {
    const res = await apiService.updateUser(id, userData);
    if (res.success) {
      showToast(res.message || 'Cập nhật tài khoản thành công');
      if (currentUser && (currentUser.id === id || currentUser.username === id)) {
        const updated = res.data ? res.data : { ...currentUser, ...userData };
        setCurrentUser(updated);
      }
      loadAllData();
    }
    return res;
  };

  const handleUpdateUserRole = async (id: string, role: UserRole, permissions?: UserPermission) => {
    const res = await apiService.updateUserRole(id, role, permissions);
    if (res.success) {
      showToast(res.message);
      if (currentUser && (currentUser.id === id || currentUser.username === id)) {
        const updated = res.data ? res.data : {
          ...currentUser,
          role,
          permissions: permissions ? { ...currentUser.permissions, ...permissions } : currentUser.permissions,
        };
        setCurrentUser(updated);
      }
      loadAllData();
    }
  };

  const handleUpdateUserPermissions = async (id: string, permissions: UserPermission) => {
    const res = await apiService.updateUserPermissions(id, permissions);
    if (res.success) {
      showToast(res.message);
      if (currentUser && (currentUser.id === id || currentUser.username === id)) {
        const updated = res.data ? res.data : {
          ...currentUser,
          permissions: { ...currentUser.permissions, ...permissions },
        };
        setCurrentUser(updated);
      }
      loadAllData();
    }
  };

  const handleUpdateUserStatus = async (id: string, status: 'ACTIVE' | 'LOCKED' | 'PENDING') => {
    const res = await apiService.updateUserStatus(id, status);
    if (res.success) {
      showToast(res.message);
      if (currentUser && (currentUser.id === id || currentUser.username === id)) {
        const updated = res.data ? res.data : { ...currentUser, status };
        setCurrentUser(updated);
      }
      loadAllData();
    }
  };

  const handleDeleteUserAccount = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này khỏi hệ thống phân cấp?')) {
      const res = await apiService.deleteUser(id);
      if (res.success) {
        showToast(res.message);
        loadAllData();
      }
    }
  };

  const handleClearAllData = async () => {
    const res = await apiService.clearAllData();
    if (res.success) {
      showToast(res.message);
      await loadAllData();
    }
    return res;
  };

  // Student CRUD Operations
  const handleAddStudent = async (newSv: SinhVien) => {
    const res = await apiService.createStudent(newSv);
    if (res.success) {
      showToast(res.message || 'Thêm sinh viên thành công');
      loadAllData();
    } else {
      showToast(res.message || 'Không thể thêm sinh viên');
    }
  };

  const handleUpdateStudent = async (maSV: string, updated: Partial<SinhVien>) => {
    const res = await apiService.updateStudent(maSV, updated);
    if (res.success) {
      showToast('Cập nhật hồ sơ thành công');
      if (
        currentUser &&
        (currentUser.studentCode?.toLowerCase() === maSV.toLowerCase() ||
          currentUser.username.toLowerCase() === maSV.toLowerCase())
      ) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                fullName: updated.hoTen || prev.fullName,
                email: updated.email || prev.email,
                faculty: updated.khoa || prev.faculty,
              }
            : null
        );
      }
      loadAllData();
    }
  };

  const handleDeleteStudent = async (maSV: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa hồ sơ sinh viên ${maSV}?`)) {
      const res = await apiService.deleteStudent(maSV);
      if (res.success) {
        showToast('Xóa hồ sơ sinh viên thành công');
        loadAllData();
      }
    }
  };

  const handleUploadHoSo = async (maSV: string, fileName: string, fileData?: string) => {
    const res = await apiService.uploadHoSoFile(maSV, fileName, fileData);
    if (res.success) {
      showToast(`Đã lưu file ${fileName} vào hồ sơ sinh viên`);
      loadAllData();
    }
  };

  const handleImportStudentsExcel = async (importedStudents: Partial<SinhVien>[]) => {
    const res = await apiService.importStudentsExcel(importedStudents);
    if (res.success) {
      showToast(res.message || `Đã import thành công ${importedStudents.length} sinh viên từ file Excel`);
      loadAllData();
    } else {
      showToast(res.message || 'Import danh sách sinh viên thất bại');
    }
  };

  // Grade & Excel Operations
  const handleSaveGrade = async (grade: Partial<Diem>) => {
    const res = await apiService.saveGrade(grade);
    if (res.success) {
      showToast('Cập nhật điểm thành công');
      loadAllData();
    }
  };

  const handleImportExcelGrades = async (importedGrades: Partial<Diem>[]) => {
    const res = await apiService.importGradesExcel(importedGrades);
    if (res.success) {
      showToast(res.message);
      loadAllData();
    }
  };

  const handleCalculateGpa = async (maSV: string): Promise<GpaSummary | null> => {
    const res = await apiService.getGpaSummary(maSV);
    return res.data || null;
  };

  // Training Points Operation
  const handleSaveTrainingComment = async (data: {
    maSV: string;
    thang: number;
    nam: number;
    diemRL: number;
    nhanXet: string;
    nguoiDanhGia: string;
    diemMuc1?: number;
    diemMuc2?: number;
    diemMuc3?: number;
    hocKy?: string;
  }) => {
    const res = await apiService.saveTrainingComment(data);
    if (res.success) {
      showToast('Đã lưu nhận xét điểm rèn luyện');
      loadAllData();
    }
  };

  const handleImportTrainingExcel = async (trainingData: Partial<RenLuyen>[]) => {
    const res = await apiService.importTrainingExcel(trainingData);
    if (res.success) {
      showToast(res.message || 'Đã import thành công điểm rèn luyện từ Excel');
      loadAllData();
    } else {
      showToast(res.message || 'Import thất bại');
    }
  };

  // Retake Registration Operations
  const handleRegisterRetake = async (data: { maSV: string; maMH: string; loaiDangKy: 'THI_LAI' | 'HOC_LAI'; hocKy: string; namHoc: string; phiDiem?: number }) => {
    const res = await apiService.registerRetake(data);
    if (res.success) {
      showToast('Đăng ký thi lại / học lại thành công');
      loadAllData();
    }
  };

  const handleApproveRetake = async (id: string, status: string, phiDiem?: number) => {
    const res = await apiService.approveRetake(id, status, phiDiem);
    if (res.success) {
      showToast('Đã cập nhật hồ sơ đăng ký');
      loadAllData();
    }
  };

  // Schedule Operations
  const handleAddSchedule = async (data: Record<string, any>) => {
    if (data.refreshOnly) {
      loadAllData();
      return;
    }
    const res = await apiService.addSchedule(data);
    if (res.success) {
      showToast(res.message || 'Đã thêm mới thời khóa biểu thành công');
      loadAllData();
    } else {
      showToast(res.message || 'Thêm thời khóa biểu thất bại');
    }
  };

  const handleUpdateSchedule = async (id: string, updated: Partial<ThoiKhoaBieu>) => {
    // Optimistic update in state
    setSchedule((prev) =>
      prev.map((s) => {
        if (s.id === id || s.tkbID === id || s.maMH === id) {
          return { ...s, ...updated };
        }
        return s;
      })
    );
    const res = await apiService.updateSchedule(id, updated);
    if (res.success) {
      showToast(res.message || 'Cập nhật thời khóa biểu thành công');
    } else {
      showToast(res.message || 'Cập nhật thời khóa biểu thất bại');
    }
    loadAllData();
  };

  const handleImportScheduleExcel = async (importedSchedules: any[]) => {
    const res = await apiService.importScheduleExcel(importedSchedules);
    if (res.success) {
      showToast(res.message);
      loadAllData();
    } else {
      showToast(res.message || 'Import thời khóa biểu thất bại');
    }
  };

  const handleDeleteSchedule = async (id: string, maMH?: string) => {
    setSchedule((prev) =>
      prev.filter(
        (s) =>
          s.id !== id &&
          s.tkbID !== id &&
          s.maMH !== id &&
          (!maMH || s.maMH !== maMH)
      )
    );
    const res = await apiService.deleteSchedule(id, maMH);
    if (res.success) {
      showToast(res.message || 'Đã xóa môn học khỏi thời khóa biểu thành công');
    } else {
      showToast(res.message || 'Lịch học đã được gỡ khỏi thời khóa biểu');
    }
    const resTkb = await apiService.getSchedule();
    if (resTkb.success) {
      setSchedule(resTkb.data);
    }
  };

  const handleDeleteScheduleByYear = async (namHoc: string, hocKy?: string, lop?: string) => {
    const res = await apiService.deleteScheduleByYear(namHoc, hocKy, lop);
    if (res.success) {
      showToast(res.message || `Đã xóa thời khóa biểu năm ${namHoc} thành công`);
    } else {
      showToast('Đã xóa thời khóa biểu năm học');
    }
    const resTkb = await apiService.getSchedule();
    if (resTkb.success) {
      setSchedule(resTkb.data);
    }
  };

  const currentStudentCode = currentUser?.studentCode || currentUser?.username;
  const isStudentRole = currentUser?.role === 'STUDENT';

  // MANDATORY AUTHENTICATION GATEKEEPER
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Đăng nhập thành công với vai trò: ${user.role} - ${user.fullName}`);
        }}
        users={users}
        students={students}
        onRegisterAccount={handleRegisterAccount}
      />
    );
  }

  const currentStudentObj = isStudentRole && currentStudentCode
    ? students.find((s) => s.maSV.toLowerCase() === currentStudentCode.toLowerCase())
    : null;
  const studentClass = currentStudentObj?.lop?.trim();

  // Scope student view to their own class
  const filteredStudents = isStudentRole
    ? (studentClass
        ? students.filter((s) => s.lop && s.lop.trim().toLowerCase() === studentClass.toLowerCase())
        : (currentStudentCode ? students.filter((s) => s.maSV.toLowerCase() === currentStudentCode.toLowerCase()) : students)
      )
    : students;

  const classStudentCodes = new Set(filteredStudents.map((s) => s.maSV.toLowerCase()));

  const filteredGrades = isStudentRole
    ? (currentStudentCode
        ? grades.filter((g) => g.maSV.toLowerCase() === currentStudentCode.toLowerCase())
        : grades.filter((g) => classStudentCodes.has(g.maSV.toLowerCase()))
      )
    : grades;

  const filteredTrainingPoints = isStudentRole
    ? (currentStudentCode
        ? trainingPoints.filter((r) => r.maSV.toLowerCase() === currentStudentCode.toLowerCase())
        : trainingPoints.filter((r) => classStudentCodes.has(r.maSV.toLowerCase()))
      )
    : trainingPoints;

  const filteredSchedule = isStudentRole
    ? schedule.filter((s) => {
        const studentMaSV = currentStudentCode?.toLowerCase();
        const matchesMaSV = Boolean(studentMaSV && s.maSV && s.maSV.toLowerCase() === studentMaSV);
        const scheduleLop = s.lop?.trim().toLowerCase();
        const matchesLop = Boolean(
          scheduleLop && studentClass && scheduleLop === studentClass.toLowerCase()
        );
        return matchesMaSV || matchesLop;
      })
    : schedule;

  const filteredRetakes = isStudentRole && currentStudentCode
    ? retakes.filter((r) => r.maSV.toLowerCase() === currentStudentCode.toLowerCase())
    : retakes;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold animate-in slide-in-from-bottom-5 duration-300 flex items-center gap-2 border border-slate-800">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Conditional Rendering: Admin Console (Full-Width Protected Layout) vs Standard User Portal */}
      {currentView === 'admin' || currentView.startsWith('admin') || currentView === 'users' ? (
        <AdminLayout
          currentUser={currentUser}
          currentAdminTab={currentView === 'users' ? 'admin-users' : adminSubTab}
          onSelectAdminTab={(tab) => {
            setAdminSubTab(tab);
            setCurrentView('admin');
          }}
          onExitAdminConsole={() => setCurrentView('dashboard')}
          onLogout={() => {
            setCurrentUser(null);
            showToast('Đã đăng xuất tài khoản');
          }}
          showToast={showToast}
        >
          {(currentView === 'users' || adminSubTab === 'admin-users') && (
            <UserManagementModule
              currentUser={currentUser}
              users={users}
              students={students}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onUpdateRole={handleUpdateUserRole}
              onUpdatePermissions={handleUpdateUserPermissions}
              onUpdateStatus={handleUpdateUserStatus}
              onDeleteUser={handleDeleteUserAccount}
              onClearAllData={handleClearAllData}
            />
          )}

          {currentView !== 'users' && adminSubTab === 'admin-overview' && (
            <AdminOverviewModule
              users={users}
              students={students}
              grades={grades}
              schedule={schedule}
              retakes={retakes}
              subjects={subjects}
              activeSemester={activeSemester}
              onNavigateTab={(tab) => setAdminSubTab(tab)}
            />
          )}

          {currentView !== 'users' && adminSubTab === 'admin-import' && (
            <ImportWizard
              onSuccess={async (dataType, count) => {
                await loadAllData();
                showToast(`Đã import ${count} bản ghi dữ liệu thành công!`);
              }}
              showToast={showToast}
            />
          )}

          {currentView !== 'users' && adminSubTab === 'admin-backup' && (
            <AdminBackupModule
              showToast={showToast}
              onRefreshAllData={loadAllData}
            />
          )}

          {currentView !== 'users' && adminSubTab === 'admin-auditlogs' && (
            <AdminAuditLogsModule
              currentUser={currentUser}
            />
          )}
        </AdminLayout>
      ) : (
        <>
          {/* Header */}
          <Header
            currentUser={currentUser}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onLogout={() => {
              setCurrentUser(null);
              showToast('Đã đăng xuất tài khoản');
            }}
            activeSemester={activeSemester}
            onChangeSemester={setActiveSemester}
            onSwitchView={setCurrentView}
            onUpdateUser={handleUpdateUser}
            showToast={showToast}
            schedule={filteredSchedule}
            retakes={filteredRetakes}
            trainingPoints={filteredTrainingPoints}
            students={filteredStudents}
            subjects={subjects}
          />

          {/* Main Body */}
          <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
            <Sidebar
              currentView={currentView}
              onSelectView={setCurrentView}
              userRole={currentUser?.role}
            />

            <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">
              {currentView === 'dashboard' && (
                <ReportsModule
                  userRole={currentUser?.role || 'STUDENT'}
                  currentStudentCode={currentStudentCode}
                  activeSemester={activeSemester}
                  semesters={semesters}
                  academicYears={academicYears}
                  students={filteredStudents}
                  grades={filteredGrades}
                  schedule={filteredSchedule}
                  subjects={subjects}
                  trainingPoints={filteredTrainingPoints}
                />
              )}

              {currentView === 'subjects' && (
                <SubjectListModule
                  subjects={subjects}
                  students={students}
                  userRole={currentUser?.role || 'STUDENT'}
                  studentClass={studentClass}
                  onRefreshData={loadAllData}
                  showToast={showToast}
                />
              )}

              {currentView === 'students' && (
                <StudentProfileModule
                  students={filteredStudents}
                  userRole={currentUser?.role || 'STUDENT'}
                  currentStudentCode={currentStudentCode}
                  currentUser={currentUser}
                  onAddStudent={handleAddStudent}
                  onUpdateStudent={handleUpdateStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onUploadHoSo={handleUploadHoSo}
                  onImportStudents={handleImportStudentsExcel}
                />
              )}

              {currentView === 'grades' && (
                <GradeManagementModule
                  grades={filteredGrades}
                  students={filteredStudents}
                  subjects={subjects}
                  userRole={currentUser?.role || 'STUDENT'}
                  currentStudentCode={currentStudentCode}
                  currentUser={currentUser}
                  onSaveGrade={handleSaveGrade}
                  onImportExcel={handleImportExcelGrades}
                  onCalculateGpa={handleCalculateGpa}
                  onOpenRetakeRegister={(maMH) => {
                    setCurrentView('retake');
                  }}
                  onDeleteGrade={async (id) => {
                    const res = await apiService.deleteGrade(id);
                    showToast(res.message);
                    await loadAllData();
                  }}
                />
              )}

              {currentView === 'training' && (
                <TrainingPointModule
                  trainingPoints={filteredTrainingPoints}
                  students={filteredStudents}
                  userRole={currentUser?.role || 'STUDENT'}
                  currentStudentCode={currentStudentCode}
                  currentUser={currentUser}
                  onSaveComment={handleSaveTrainingComment}
                  onImportExcel={handleImportTrainingExcel}
                />
              )}

              {currentView === 'schedule' && (
                <ScheduleModule
                  schedule={filteredSchedule}
                  students={filteredStudents}
                  subjects={subjects}
                  activeSemester={activeSemester}
                  userRole={currentUser?.role || 'STUDENT'}
                  userPermissions={currentUser?.permissions}
                  currentStudentCode={currentStudentCode}
                  onAddSchedule={handleAddSchedule}
                  onUpdateSchedule={handleUpdateSchedule}
                  onImportSchedule={handleImportScheduleExcel}
                  onDeleteSchedule={handleDeleteSchedule}
                  onDeleteScheduleByYear={handleDeleteScheduleByYear}
                />
              )}

              {currentView === 'retakes' && (
                <RetakeModule
                  retakes={filteredRetakes}
                  students={filteredStudents}
                  subjects={subjects}
                  userRole={currentUser?.role || 'STUDENT'}
                  currentStudentCode={currentStudentCode}
                  onRegisterRetake={handleRegisterRetake}
                  onApproveRetake={handleApproveRetake}
                  onDeleteRetake={async (id) => {
                    const res = await apiService.deleteRetake(id);
                    showToast(res.message);
                    await loadAllData();
                  }}
                />
              )}
            </main>
          </div>
        </>
      )}

      {/* Login / Role Switch Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Đã đăng nhập với tư cách: ${user.fullName} (${user.role})`);
        }}
        users={users}
      />
    </div>
  );
}
