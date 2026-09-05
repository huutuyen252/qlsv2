import { User, SinhVien, Diem, RenLuyen, ThoiKhoaBieu, ThiLaiHocLai, GpaSummary, HocKy, NamHoc, Lop, DiemDanh, ThongBaoKiemTra, MonHoc, NghiLe } from '../types';
const API_BASE = '/api';
export const apiService = {
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; accessToken?: string; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối máy chủ API' };
    }
  },
  async register(userData: {
    username: string;
    fullName: string;
    role: 'ADMIN' | 'LECTURER' | 'STUDENT';
    email?: string;
    password?: string;
    studentCode?: string;
    faculty?: string;
  }): Promise<{ success: boolean; user?: User; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối máy chủ API' };
    }
  },
  async getUsers(): Promise<{ success: boolean; data: User[] }> {
    try {
      const res = await fetch(`${API_BASE}/users`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async createUser(userData: Partial<User>): Promise<{ success: boolean; message: string; data?: User }> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Không thể tạo tài khoản người dùng' };
    }
  },
  async updateUser(id: string, userData: Partial<User>): Promise<{ success: boolean; message: string; data?: User }> {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Cập nhật tài khoản thất bại' };
    }
  },
  async updateUserRole(id: string, role: string, permissions?: any): Promise<{ success: boolean; message: string; data?: User }> {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, permissions }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Cập nhật vai trò thất bại' };
    }
  },
  async updateUserPermissions(id: string, permissions: any): Promise<{ success: boolean; message: string; data?: User }> {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Cập nhật phân quyền thất bại' };
    }
  },
  async updateUserStatus(id: string, status: 'ACTIVE' | 'LOCKED' | 'PENDING'): Promise<{ success: boolean; message: string; data?: User }> {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Cập nhật trạng thái thất bại' };
    }
  },
  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch {
      return { success: false, message: 'Xóa tài khoản thất bại' };
    }
  },
  async getStudents(params?: { search?: string; khoa?: string; lop?: string }): Promise<{ success: boolean; data: SinhVien[] }> {
    try {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      const res = await fetch(`${API_BASE}/students?${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async createStudent(student: SinhVien): Promise<{ success: boolean; message: string; data?: SinhVien }> {
    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Không thể thêm sinh viên' };
    }
  },
  async updateStudent(maSV: string, student: Partial<SinhVien>): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/students/${maSV}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Không thể cập nhật sinh viên' };
    }
  },
  async deleteStudent(maSV: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/students/${maSV}`, { method: 'DELETE' });
      return await res.json();
    } catch {
      return { success: false, message: 'Không thể xóa sinh viên' };
    }
  },
  async uploadHoSoFile(maSV: string, fileName: string, fileData?: string): Promise<{ success: boolean; fileUrl: string; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/students/upload-hoso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maSV, fileName, fileData }),
      });
      return await res.json();
    } catch {
      return { success: false, fileUrl: '', message: 'Upload thất bại' };
    }
  },
  async importStudentsExcel(students: Partial<SinhVien>[]): Promise<{ success: boolean; message: string; importedCount?: number; newUsersCreated?: number }> {
    try {
      const res = await fetch(`${API_BASE}/students/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Import danh sách sinh viên Excel thất bại' };
    }
  },
  async getGrades(params?: { maSV?: string; hocKy?: string; namHoc?: string }): Promise<{ success: boolean; data: Diem[] }> {
    try {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      const res = await fetch(`${API_BASE}/grades?${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async saveGrade(grade: Partial<Diem>): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grade),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Không thể lưu điểm' };
    }
  },
  async importGradesExcel(grades: Partial<Diem>[]): Promise<{ success: boolean; message: string; importedCount?: number }> {
    try {
      const res = await fetch(`${API_BASE}/grades/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Import Excel thất bại' };
    }
  },
  async getGpaSummary(maSV: string): Promise<{ success: boolean; data?: GpaSummary; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/grades/gpa/${maSV}`);
      return await res.json();
    } catch {
      return { success: false, message: 'Không thể tính GPA' };
    }
  },
  async getTrainingPoints(params?: { maSV?: string; thang?: number; nam?: number }): Promise<{ success: boolean; data: RenLuyen[] }> {
    try {
      const query = new URLSearchParams(params as unknown as Record<string, string>).toString();
      const res = await fetch(`${API_BASE}/training?${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async saveTrainingComment(data: {
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
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/training/comment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Không thể cập nhật nhận xét' };
    }
  },
  async importTrainingExcel(training: Partial<RenLuyen>[]): Promise<{ success: boolean; message: string; importedCount?: number }> {
    try {
      const res = await fetch(`${API_BASE}/training/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ training }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Import điểm rèn luyện từ Excel thất bại' };
    }
  },
  async getSemesters(): Promise<{ success: boolean; data: HocKy[] }> {
    try {
      const res = await fetch(`${API_BASE}/hocky`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async addSemester(data: Partial<HocKy>): Promise<{ success: boolean; message: string; data?: HocKy }> {
    try {
      const res = await fetch(`${API_BASE}/hocky`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Thêm học kỳ thất bại' };
    }
  },
  async updateSemester(id: string, data: Partial<HocKy>): Promise<{ success: boolean; message: string; data?: HocKy }> {
    try {
      const res = await fetch(`${API_BASE}/hocky/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Cập nhật học kỳ thất bại' };
    }
  },
  async deleteSemester(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/hocky/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch {
      return { success: false, message: 'Xóa học kỳ thất bại' };
    }
  },
  async getAcademicYears(): Promise<{ success: boolean; data: NamHoc[] }> {
    try {
      const res = await fetch(`${API_BASE}/namhoc`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async addAcademicYear(data: Partial<NamHoc>): Promise<{ success: boolean; message: string; data?: NamHoc }> {
    try {
      const res = await fetch(`${API_BASE}/namhoc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Thêm năm học thất bại' };
    }
  },
  async updateAcademicYear(id: string, data: Partial<NamHoc>): Promise<{ success: boolean; message: string; data?: NamHoc }> {
    try {
      const res = await fetch(`${API_BASE}/namhoc/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Cập nhật năm học thất bại' };
    }
  },
  async deleteAcademicYear(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/namhoc/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch {
      return { success: false, message: 'Xóa năm học thất bại' };
    }
  },
  async getSchedule(params?: { maSV?: string; lop?: string; hocKy?: string; namHoc?: string }): Promise<{ success: boolean; data: ThoiKhoaBieu[] }> {
    try {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      const res = await fetch(`${API_BASE}/schedule?${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async addSchedule(data: Record<string, any>): Promise<{ success: boolean; message: string; data?: ThoiKhoaBieu[] }> {
    try {
      const res = await fetch(`${API_BASE}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối khi thêm thời khóa biểu' };
    }
  },
  async updateSchedule(id: string, data: Partial<ThoiKhoaBieu>): Promise<{ success: boolean; message: string; data?: ThoiKhoaBieu }> {
    try {
      const res = await fetch(`${API_BASE}/schedule/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Cập nhật thời khóa biểu thất bại' };
    }
  },
  async uploadScheduleFile(payload: { fileName: string; fileType: string; fileContent?: string; schedules?: any[]; lop?: string; hocKy?: string; namHoc?: string }): Promise<{ success: boolean; message: string; parsedCount?: number; data?: ThoiKhoaBieu[] }> {
    try {
      const res = await fetch(`${API_BASE}/tkb/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Upload & parse file thời khóa biểu thất bại' };
    }
  },
  async importScheduleExcel(schedules: any[]): Promise<{ success: boolean; message: string; importedCount?: number }> {
    try {
      const res = await fetch(`${API_BASE}/schedule/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Import thời khóa biểu từ Excel thất bại' };
    }
  },
  async deleteSchedule(id: string, maMH?: string): Promise<{ success: boolean; message: string }> {
    try {
      const query = maMH ? `?maMH=${encodeURIComponent(maMH)}` : '';
      const res = await fetch(`${API_BASE}/schedule/${id}${query}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối khi xóa thời khóa biểu' };
    }
  },
  async deleteScheduleByYear(namHoc: string, hocKy?: string, lop?: string): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      const params = new URLSearchParams();
      params.append('namHoc', namHoc);
      if (hocKy && hocKy !== 'ALL') params.append('hocKy', hocKy);
      if (lop && lop !== 'ALL') params.append('lop', lop);
      const res = await fetch(`${API_BASE}/schedule/by-year?${params.toString()}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối khi xóa thời khóa biểu theo năm học' };
    }
  },
  async getRetakes(maSV?: string): Promise<{ success: boolean; data: ThiLaiHocLai[] }> {
    try {
      const query = maSV ? `?maSV=${maSV}` : '';
      const res = await fetch(`${API_BASE}/retakes${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async registerRetake(data: { maSV: string; maMH: string; loaiDangKy: 'THI_LAI' | 'HOC_LAI'; hocKy: string; namHoc: string; phiDiem?: number }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/retakes/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Đăng ký thất bại' };
    }
  },
  async approveRetake(id: string, status: string, phiDiem?: number): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/retakes/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trangThai: status, phiDiem }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Duyệt thất bại' };
    }
  },
  async getAttendance(params?: { maSV?: string; maMH?: string; lop?: string }): Promise<{ success: boolean; data: DiemDanh[] }> {
    try {
      const query = new URLSearchParams(params as Record<string, string>).toString();
      const res = await fetch(`${API_BASE}/attendance?${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async saveAttendance(data: Partial<DiemDanh>): Promise<{ success: boolean; message: string; data?: DiemDanh }> {
    try {
      const res = await fetch(`${API_BASE}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Không thể lưu thông tin điểm danh' };
    }
  },
  async deleteAttendance(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/attendance/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch {
      return { success: false, message: 'Xóa điểm danh thất bại' };
    }
  },
  async getExamNotices(maMH?: string): Promise<{ success: boolean; data: ThongBaoKiemTra[] }> {
    try {
      const query = maMH ? `?maMH=${encodeURIComponent(maMH)}` : '';
      const res = await fetch(`${API_BASE}/exam-notices${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async saveExamNotice(notice: Partial<ThongBaoKiemTra>): Promise<{ success: boolean; message: string; data?: ThongBaoKiemTra }> {
    try {
      const res = await fetch(`${API_BASE}/exam-notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notice),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Đăng thông báo kiểm tra thất bại' };
    }
  },
  async deleteExamNotice(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/exam-notices/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch {
      return { success: false, message: 'Xóa thông báo kiểm tra thất bại' };
    }
  },
  async getSummaryReport(): Promise<{ success: boolean; summary: any }> {
    try {
      const res = await fetch(`${API_BASE}/reports/summary`);
      return await res.json();
    } catch {
      return { success: false, summary: null };
    }
  },
  async getSubjects(): Promise<{ success: boolean; data: MonHoc[] }> {
    try {
      const res = await fetch(`${API_BASE}/subjects`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },
  async addSubject(subject: Partial<MonHoc>): Promise<{ success: boolean; message: string; data?: MonHoc }> {
    try {
      const res = await fetch(`${API_BASE}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subject),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Thêm môn học thất bại' };
    }
  },
  async updateSubject(maMH: string, subject: Partial<MonHoc>): Promise<{ success: boolean; message: string; data?: MonHoc }> {
    try {
      const res = await fetch(`${API_BASE}/subjects/${encodeURIComponent(maMH)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subject),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Cập nhật môn học thất bại' };
    }
  },
  async deleteSubject(maMH: string, id?: string, lop?: string): Promise<{ success: boolean; message: string }> {
    try {
      let url = `${API_BASE}/subjects/${encodeURIComponent(maMH)}`;
      const params = new URLSearchParams();
      if (id) params.append('id', id);
      if (lop) params.append('lop', lop);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await fetch(url, { method: 'DELETE' });
      return await res.json();
    } catch {
      return { success: false, message: 'Xóa môn học thất bại' };
    }
  },
  async importSubjects(subjects: Partial<MonHoc>[]): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/subjects/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Import môn học thất bại' };
    }
  },
  async deleteGrade(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/grades/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch {
      return { success: false, message: 'Xóa bản ghi điểm thất bại' };
    }
  },
  async deleteRetake(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/retakes/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch {
      return { success: false, message: 'Xóa đơn thi lại thất bại' };
    }
  },
  async deleteClass(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/classes/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch {
      return { success: false, message: 'Xóa lớp học thất bại' };
    }
  },
  async getHolidays(): Promise<{ success: boolean; data: NghiLe[] }> {
    try {
      const res = await fetch(`${API_BASE}/holidays`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        try {
          localStorage.setItem('cached_holidays_list', JSON.stringify(json.data));
        } catch {
          // ignore
        }
        return json;
      }
    } catch {
      // fallback to localStorage cache
    }
    try {
      const cached = localStorage.getItem('cached_holidays_list');
      if (cached) {
        return { success: true, data: JSON.parse(cached) };
      }
    } catch {
      // ignore
    }
    return { success: true, data: [] };
  },
  async createHoliday(data: Partial<NghiLe>): Promise<{ success: boolean; message: string; data?: NghiLe }> {
    try {
      const res = await fetch(`${API_BASE}/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      return json;
    } catch {
      // Fallback locally
      const item: NghiLe = {
        id: `holiday_${Date.now()}`,
        dipLe: data.dipLe || '',
        tuNgay: data.tuNgay || '',
        denNgay: data.denNgay || '',
        ghiChu: data.ghiChu,
        lop: data.lop || 'ALL',
        hocKy: data.hocKy || 'ALL',
        namHoc: data.namHoc || 'ALL',
        createdAt: new Date().toISOString(),
      };
      try {
        const cached = localStorage.getItem('cached_holidays_list');
        const list = cached ? JSON.parse(cached) : [];
        const next = [item, ...list];
        localStorage.setItem('cached_holidays_list', JSON.stringify(next));
      } catch {
        // ignore
      }
      return { success: true, message: 'Đã lưu lịch nghỉ lễ', data: item };
    }
  },
  async updateHoliday(id: string, data: Partial<NghiLe>): Promise<{ success: boolean; message: string; data?: NghiLe }> {
    try {
      const res = await fetch(`${API_BASE}/holidays/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      try {
        const cached = localStorage.getItem('cached_holidays_list');
        if (cached) {
          const list = JSON.parse(cached);
          const next = list.map((h: NghiLe) => (h.id === id ? { ...h, ...data } : h));
          localStorage.setItem('cached_holidays_list', JSON.stringify(next));
        }
      } catch {
        // ignore
      }
      return { success: true, message: 'Cập nhật lịch nghỉ lễ thành công' };
    }
  },
  async deleteHoliday(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/holidays/${id}`, { method: 'DELETE' });
      return await res.json();
    } catch {
      try {
        const cached = localStorage.getItem('cached_holidays_list');
        if (cached) {
          const list = JSON.parse(cached);
          const next = list.filter((h: NghiLe) => h.id !== id);
          localStorage.setItem('cached_holidays_list', JSON.stringify(next));
        }
      } catch {
        // ignore
      }
      return { success: true, message: 'Đã xóa lịch nghỉ lễ' };
    }
  },
  async clearAllData(): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/admin/clear-all-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi khi kết nối máy chủ làm sạch dữ liệu' };
    }
  },
};

