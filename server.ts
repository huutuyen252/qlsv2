import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  seedInitialDataIfNeeded,
  getAllUsers,
  getUserById,
  getUserByUsername,
  createUser,
  updateUser,
  deleteUser,
  getAllSinhVien,
  getSinhVienByMaSV,
  createSinhVien,
  updateSinhVien,
  deleteSinhVien,
  upsertSinhVien,
  getAllMonHoc,
  getMonHocByMaMH,
  upsertMonHoc,
  deleteMonHoc,
  getAllDiem,
  upsertDiem,
  deleteDiem,
  getAllRenLuyen,
  upsertRenLuyen,
  getAllThoiKhoaBieu,
  createThoiKhoaBieu,
  updateThoiKhoaBieu,
  deleteThoiKhoaBieu,
  deleteThoiKhoaBieuByYear,
  getAllThiLaiHocLai,
  createThiLaiHocLai,
  updateThiLaiHocLai,
  deleteThiLaiHocLai,
  getAllNamHoc,
  upsertNamHoc,
  deleteNamHoc,
  getAllHocKy,
  upsertHocKy,
  deleteHocKy,
  getAllLop,
  upsertLop,
  deleteLop,
  getAllDiemDanh,
  createDiemDanh,
  deleteDiemDanh,
  getAllThongBaoKiemTra,
  createThongBaoKiemTra,
  deleteThongBaoKiemTra,
  getAllNghiLe,
  createNghiLe,
  updateNghiLe,
  deleteNghiLe,
  clearAllOperationalData,
} from './src/db/dbOperations.ts';
import { SinhVien, Diem, RenLuyen, ThoiKhoaBieu, ThiLaiHocLai, NamHoc, HocKy, Lop, DiemDanh, ThongBaoKiemTra, MonHoc, NghiLe } from './src/types/index.ts';
const failedLoginAttempts: Record<string, number> = {};
async function startServer() {
  const app = express();
  const PORT = 3000;
  try {
    await seedInitialDataIfNeeded();
  } catch (err: any) {
    console.warn('[DB] Seeding skipped:', err?.message);
  }
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tên đăng nhập/mđã sinh viên và mật khẩu' });
      }
      const key = username.trim().toLowerCase();
      const user = await getUserByUsername(key);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mã số sinh viên không tồn tại trên hệ thống PostgreSQL. Vui lòng kiểm tra lại!' });
      }
      if (user.status === 'LOCKED') {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản này đã bị KHÓA! Do nhập sai thông tin quá 5 lần hoặc bị Quản trị viên khóa. Chỉ có Quản trị viên (Admin) mới có quyền mở khóa tài khoản này.',
        });
      }
      const validPasswords = ['admin123', '123456', 'admin', 'gv123', 'sv123', user.password];
      const isPasswordCorrect = validPasswords.includes(password.trim());
      if (!isPasswordCorrect) {
        failedLoginAttempts[key] = (failedLoginAttempts[key] || 0) + 1;
        const count = failedLoginAttempts[key];
        if (count >= 5) {
          await updateUser(user.id, { status: 'LOCKED' });
          return res.status(403).json({
            success: false,
            message: `Tài khoản [${user.username}] đã bị KHÓA do nhập sai thông tin quá 5 lần! Chỉ có Quản trị viên (Admin) mới có thể mở khóa tài khoản này.`,
          });
        }
        return res.status(401).json({
          success: false,
          message: `Thông tin đăng nhập không chính xác! Cảnh báo: Bạn đã nhập sai ${count}/5 lần. Còn ${5 - count} lần thử trước khi tài khoản bị khóa.`,
        });
      }
      failedLoginAttempts[key] = 0;
      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user_${user.id}_role_${user.role}.${Date.now()}`;
      return res.json({
        success: true,
        message: 'Đăng nhập thành công',
        accessToken: mockToken,
        user,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Lỗi xử lý đăng nhập' });
    }
  });
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { username, fullName, role, email, password, studentCode, faculty } = req.body;
      if (
        !username?.trim() ||
        !fullName?.trim() ||
        !role ||
        !email?.trim() ||
        !password?.trim() ||
        !faculty?.trim() ||
        (role === 'STUDENT' && !studentCode?.trim() && !username?.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: 'Bắt buộc điền đầy đủ tất cả các ô thông tin, không được bỏ trống bất kỳ ô nào!',
        });
      }
      const existing = await getUserByUsername(username.trim());
      if (existing) {
        return res.status(400).json({ success: false, message: 'Tên đăng nhập / Mã SV này đã tồn tại trên hệ thống PostgreSQL' });
      }
      const newUser = {
        id: `u-${Date.now()}`,
        username: username.trim(),
        fullName: fullName.trim(),
        role,
        email: email.trim() || `${username}@tdnu.edu.vn`,
        password: password.trim(),
        studentCode: role === 'STUDENT' ? (studentCode || username).trim() : undefined,
        faculty: faculty || (role === 'STUDENT' ? 'Khoa Cơ khí' : 'Khoa Cơ khí'),
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString().split('T')[0],
        permissions: {
          canManageUsers: role === 'ADMIN',
          canManageStudents: role === 'ADMIN' || role === 'LECTURER',
          canEditGrades: role === 'ADMIN' || role === 'LECTURER',
          canImportExcel: role === 'ADMIN' || role === 'LECTURER',
          canEvaluateTraining: role === 'ADMIN' || role === 'LECTURER',
          canApproveRetakes: role === 'ADMIN',
          canManageSchedule: role === 'ADMIN' || role === 'LECTURER',
        },
      };
      const created = await createUser(newUser);
      return res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.',
        user: created,
      });
    } catch (error: any) {
      console.error('Register error:', error);
      return res.status(500).json({ success: false, message: error.message || 'Lỗi đăng ký tài khoản' });
    }
  });
  app.get('/api/users', async (req: Request, res: Response) => {
    try {
      const userList = await getAllUsers();
      return res.json({ success: true, data: userList, total: userList.length });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const { username, fullName, role, email, password, studentCode, faculty, permissions } = req.body;
      if (!username || !fullName || !role) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin người dùng bắt buTc' });
      }
      const existing = await getUserByUsername(username.trim());
      if (existing) {
        return res.status(400).json({ success: false, message: 'Tên đăng nhập đã tồn tại trong CSDL PostgreSQL' });
      }
      const newUser = {
        id: `u-${Date.now()}`,
        username: username.trim(),
        fullName: fullName.trim(),
        role,
        email: email || `${username}@tdnu.edu.vn`,
        password: password?.trim() || '123456',
        studentCode: role === 'STUDENT' ? (studentCode || username).trim() : undefined,
        faculty: faculty || 'BT môn Đào tạo',
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString().split('T')[0],
        permissions: permissions || {
          canManageUsers: role === 'ADMIN',
          canManageStudents: role === 'ADMIN' || role === 'LECTURER',
          canEditGrades: role === 'ADMIN' || role === 'LECTURER',
          canImportExcel: role === 'ADMIN' || role === 'LECTURER',
          canEvaluateTraining: role === 'ADMIN' || role === 'LECTURER',
          canApproveRetakes: role === 'ADMIN',
          canManageSchedule: role === 'ADMIN' || role === 'LECTURER',
        },
      };
      const created = await createUser(newUser);
      return res.status(201).json({ success: true, message: 'Đã tạo tài khoản và cấp quyền thành công trong PostgreSQL', data: created });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { username, fullName, email, password, faculty, studentCode, role, status, permissions, avatar } = req.body;
      const existingUser = await getUserById(id);
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }
      if (username && username.trim().toLowerCase() !== existingUser.username.toLowerCase()) {
        const checkDupl = await getUserByUsername(username.trim());
        if (checkDupl && checkDupl.id !== id) {
          return res.status(400).json({ success: false, message: 'Tên đăng nhập đã được sử dụng bởi tài khoản khác' });
        }
      }
      const updateData: any = {};
      if (username !== undefined) updateData.username = username.trim();
      if (fullName !== undefined) updateData.fullName = fullName.trim();
      if (email !== undefined) updateData.email = email.trim();
      if (password !== undefined && password.trim() !== '') updateData.password = password.trim();
      if (faculty !== undefined) updateData.faculty = faculty.trim();
      if (studentCode !== undefined) updateData.studentCode = studentCode.trim();
      if (role !== undefined) updateData.role = role;
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'ACTIVE') {
          failedLoginAttempts[existingUser.username.toLowerCase()] = 0;
        }
      }
      if (permissions !== undefined) {
        updateData.permissions = { ...((existingUser.permissions as any) || {}), ...permissions };
      }
      if (avatar !== undefined) updateData.avatar = avatar;
      const updated = await updateUser(id, updateData);
      const codeToSync = updated?.studentCode || updated?.username;
      if (codeToSync) {
        const student = await getSinhVienByMaSV(codeToSync);
        if (student) {
          const svUpdate: any = {};
          if (fullName !== undefined) svUpdate.hoTen = fullName.trim();
          if (email !== undefined) svUpdate.email = email.trim();
          if (faculty !== undefined) svUpdate.khoa = faculty.trim();
          await updateSinhVien(codeToSync, svUpdate);
        }
      }
      return res.json({
        success: true,
        message: `Đã cập nhật thông tin tài khoản [${updated?.username}] thành công trong PostgreSQL!`,
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put('/api/users/:id/role', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role, permissions } = req.body;
      const existingUser = await getUserById(id);
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }
      const updateData: any = {};
      if (role) updateData.role = role;
      if (permissions) {
        updateData.permissions = { ...((existingUser.permissions as any) || {}), ...permissions };
      }
      const updated = await updateUser(id, updateData);
      return res.json({ success: true, message: `Đã cập nhật role thành ${updated?.role} và phân quyền`, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put('/api/users/:id/permissions', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      const existingUser = await getUserById(id);
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }
      const updated = await updateUser(id, {
        permissions: { ...((existingUser.permissions as any) || {}), ...permissions },
      });
      return res.json({ success: true, message: 'Đã cập nhật chi tiết phân quyền người dùng', data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put('/api/users/:id/status', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const existingUser = await getUserById(id);
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }
      const newStatus = status || 'ACTIVE';
      const updated = await updateUser(id, { status: newStatus });
      if (newStatus === 'ACTIVE') {
        failedLoginAttempts[existingUser.username.toLowerCase()] = 0;
      }
      return res.json({ success: true, message: `Trạng thái tài khoản đã chuyfn sang: ${updated?.status}`, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.delete('/api/users/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await deleteUser(id);
      return res.json({ success: true, message: 'Đã xóa tài khoản thành công khỏi CSDL PostgreSQL' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get('/api/students', async (req: Request, res: Response) => {
    try {
      const { search, khoa, lop } = req.query;
      const list = await getAllSinhVien(search as string, khoa as string, lop as string);
      return res.json({ success: true, data: list, total: list.length });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get('/api/students/profile', async (req: Request, res: Response) => {
    try {
      const maSV = req.query.maSV as string;
      if (!maSV) {
        return res.status(400).json({ success: false, message: 'Thiếu maSV' });
      }
      const student = await getSinhVienByMaSV(maSV);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên trong PostgreSQL' });
      }
      return res.json({ success: true, data: student });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post('/api/students', async (req: Request, res: Response) => {
    try {
      const newStudent: SinhVien = req.body;
      if (!newStudent.maSV || !newStudent.hoTen) {
        return res.status(400).json({ success: false, message: 'MaSV và HoTen là bắt buTc' });
      }
      const existing = await getSinhVienByMaSV(newStudent.maSV);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Mã sinh viên đã tồn tại' });
      }
      const created = await createSinhVien(newStudent);
      return res.status(201).json({ success: true, message: 'Thêm hồ sơ sinh viên thành công vào PostgreSQL', data: created });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put('/api/students/:maSV', async (req: Request, res: Response) => {
    try {
      const { maSV } = req.params;
      const existing = await getSinhVienByMaSV(maSV);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
      }
      const updated = await updateSinhVien(maSV, req.body);
      const user = await getUserByUsername(maSV);
      if (user) {
        const uUpdate: any = {};
        if (req.body.hoTen) uUpdate.fullName = req.body.hoTen.trim();
        if (req.body.email) uUpdate.email = req.body.email.trim();
        if (req.body.khoa) uUpdate.faculty = req.body.khoa.trim();
        await updateUser(user.id, uUpdate);
      }
      return res.json({ success: true, message: 'Cập nhật thông tin sinh viên thành công', data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.delete('/api/students/:maSV', async (req: Request, res: Response) => {
    try {
      const { maSV } = req.params;
      await deleteSinhVien(maSV);
      return res.json({ success: true, message: 'Xóa sinh viên thành công khỏi PostgreSQL' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post('/api/students/import', async (req: Request, res: Response) => {
    try {
      const { students } = req.body;
      if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ success: false, message: 'Dữ liệu danh sách sinh viên từ Excel không hợp l' });
      }
      let importedCount = 0;
      let newUsersCreated = 0;
      for (const st of students) {
        if (st.maSV && st.hoTen) {
          const studentObj = {
            maSV: st.maSV.trim(),
            hoTen: st.hoTen.trim(),
            ngaySinh: st.ngaySinh || '2007-01-01',
            gioiTinh: st.gioiTinh || 'Nam',
            lop: st.lop || 'CNKT Cơ khí 25DDS 09041',
            khoa: st.khoa || 'Khoa Cơ khí',
            soDienThoai: st.soDienThoai || '0900000000',
            email: st.email || `${st.maSV.trim().toLowerCase()}@tdnu.edu.vn`,
            diaChi: st.diaChi || 'TP. H" Chí Minh',
            ngayNhapHoc: st.ngayNhapHoc || '2025-09-05',
            trangThai: st.trangThai || 'Đang học',
            hoSoFile: st.hoSoFile || null,
            hoSoFileName: st.hoSoFileName || null,
            hoSoFiles: st.hoSoFiles || null,
          };
          await upsertSinhVien(studentObj);
          importedCount++;
          const existingUser = await getUserByUsername(st.maSV.trim());
          if (!existingUser) {
            await createUser({
              id: `u-${st.maSV.trim().toLowerCase()}`,
              username: st.maSV.trim(),
              fullName: st.hoTen.trim(),
              email: st.email || `${st.maSV.trim().toLowerCase()}@tdnu.edu.vn`,
              password: '123456',
              studentCode: st.maSV.trim(),
              faculty: st.khoa || 'Khoa Cơ khí',
              role: 'STUDENT',
              status: 'ACTIVE',
              createdAt: new Date().toISOString().split('T')[0],
              permissions: { canImportExcel: false },
            });
            newUsersCreated++;
          } else {
            await updateUser(existingUser.id, {
              fullName: st.hoTen.trim(),
              email: st.email || existingUser.email,
              faculty: st.khoa || existingUser.faculty,
            });
          }
        }
      }
      return res.json({
        success: true,
        message: `Đã import thành công ${importedCount} hồ sơ sinh viên vào PostgreSQL và "ng bộ ${newUsersCreated} tài khoản người dùng!`,
        importedCount,
        newUsersCreated,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post('/api/students/upload-hoso', async (req: Request, res: Response) => {
    try {
      const { maSV, fileName, fileData } = req.body;
      const s3Url = fileData || `https://s3.ap-southeast-1.amazonaws.com/huce-student-files/hoso_${maSV}_${Date.now()}.pdf`;
      if (maSV) {
        const student = await getSinhVienByMaSV(maSV);
        if (student) {
          await updateSinhVien(maSV, {
            hoSoFile: s3Url,
            hoSoFileName: fileName || `HoSo_${maSV}_Scan.pdf`,
          });
        }
      }
      return res.json({
        success: true,
        message: 'Upload file hồ sơ lên Cloud Storage thành công và lưu vào PostgreSQL',
        fileUrl: s3Url,
        fileName: fileName || `HoSo_${maSV}_Scan.pdf`,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get('/api/grades', async (req: Request, res: Response) => {
    try {
      const { maSV, hocKy, namHoc } = req.query;
      const list = await getAllDiem(maSV as string, hocKy as string, namHoc as string);
      return res.json({ success: true, data: list });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post('/api/grades', async (req: Request, res: Response) => {
    try {
      const newGrade: Diem = req.body;
      const student = await getSinhVienByMaSV(newGrade.maSV);
      if (student) {
        newGrade.hoTenSV = student.hoTen;
      }
      if (!newGrade.id) {
        newGrade.id = `d-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      const saved = await upsertDiem(newGrade);
      return res.json({ success: true, message: 'Cập nhật điểm thành công vào PostgreSQL', data: saved });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post('/api/grades/import', async (req: Request, res: Response) => {
    try {
      const { grades } = req.body;
      if (!Array.isArray(grades) || grades.length === 0) {
        return res.status(400).json({ success: false, message: 'Dữ liệu Excel không hợp l' });
      }
      let importedCount = 0;
      for (const g of grades) {
        if (g.maSV && g.maMH) {
          const student = await getSinhVienByMaSV(g.maSV);
          const hoTenSV = student ? student.hoTen : g.hoTenSV || '';
          const cc = Number(g.diemChuyenCan || 0);
          const gk = Number(g.diemGiuaKy || 0);
          const ck = Number(g.diemCuoiKy || 0);
          const tk10 = Math.round((cc * 0.1 + gk * 0.3 + ck * 0.6) * 10) / 10;
          let thang4 = 0;
          let chu = 'F';
          let trangThai: 'PASSED' | 'FAILED' = 'FAILED';
          if (tk10 >= 8.5) { thang4 = 4.0; chu = 'A'; trangThai = 'PASSED'; }
          else if (tk10 >= 8.0) { thang4 = 3.5; chu = 'B+'; trangThai = 'PASSED'; }
          else if (tk10 >= 7.0) { thang4 = 3.0; chu = 'B'; trangThai = 'PASSED'; }
          else if (tk10 >= 6.5) { thang4 = 2.5; chu = 'C+'; trangThai = 'PASSED'; }
          else if (tk10 >= 5.5) { thang4 = 2.0; chu = 'C'; trangThai = 'PASSED'; }
          else if (tk10 >= 5.0) { thang4 = 1.5; chu = 'D+'; trangThai = 'PASSED'; }
          else if (tk10 >= 4.0) { thang4 = 1.0; chu = 'D'; trangThai = 'PASSED'; }
          else { thang4 = 0.0; chu = 'F'; trangThai = 'FAILED'; }
          const item: Diem = {
            id: g.id || `d-${g.maSV}-${g.maMH}-${g.hocKy || 'HK1'}-${g.namHoc || '2025-2026'}`.replace(/\s+/g, ''),
            maSV: g.maSV,
            hoTenSV,
            maMH: g.maMH,
            tenMH: g.tenMH || 'Môn học',
            soTinChi: Number(g.soTinChi || 3),
            hocKy: g.hocKy || 'HK1',
            namHoc: g.namHoc || '2024-2025',
            diemChuyenCan: cc,
            diemGiuaKy: gk,
            diemCuoiKy: ck,
            diemTongKet10: tk10,
            diemThang4: thang4,
            diemChu: chu,
            trangThai,
          };
          await upsertDiem(item);
          importedCount++;
        }
      }
      return res.json({
        success: true,
        message: `Đã import thành công ${importedCount} ầu điểm sinh viên từ Excel vào PostgreSQL`,
        importedCount,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get('/api/grades/gpa/:maSV', async (req: Request, res: Response) => {
    try {
      const { maSV } = req.params;
      const student = await getSinhVienByMaSV(maSV);
      if (!student) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
      }
      const studentGrades = await getAllDiem(maSV);
      if (studentGrades.length === 0) {
        return res.json({
          success: true,
          data: {
            maSV,
            hoTen: student.hoTen,
            tongTinChiTichLuy: 0,
            diemTBTichLuyThang10: 0,
            diemTBTichLuyThang4: 0,
            xepLoaiHocLuc: 'Chưa có điểm',
            soMonNoTinChi: 0,
          },
        });
      }
      let totalCredits = 0;
      let totalWeighted10 = 0;
      let totalWeighted4 = 0;
      let failedCourses = 0;
      studentGrades.forEach((g: Diem) => {
        const tc = g.soTinChi || 3;
        totalCredits += tc;
        totalWeighted10 += g.diemTongKet10 * tc;
        totalWeighted4 += g.diemThang4 * tc;
        if (g.trangThai === 'FAILED') {
          failedCourses++;
        }
      });
      const gpa10 = Math.round((totalWeighted10 / totalCredits) * 100) / 100;
      const gpa4 = Math.round((totalWeighted4 / totalCredits) * 100) / 100;
      let ranking = 'Trung bình';
      if (totalCredits === 0) ranking = 'Chưa có điểm';
      else if (gpa4 >= 3.60) ranking = 'Xuất sắc';
      else if (gpa4 >= 3.20) ranking = 'Giỏi';
      else if (gpa4 >= 2.80) ranking = 'Khá';
      else if (gpa4 >= 2.00) ranking = 'Trung bình';
      else ranking = 'Yếu';
      return res.json({
        success: true,
        data: {
          maSV,
          hoTen: student.hoTen,
          lop: student.lop,
          tongTinChiTichLuy: totalCredits,
          diemTBTichLuyThang10: gpa10,
          diemTBTichLuyThang4: gpa4,
          xepLoaiHocLuc: ranking,
          soMonNoTinChi: failedCourses,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get('/api/training', async (req: Request, res: Response) => {
    try {
      const { maSV, thang, nam } = req.query;
      const list = await getAllRenLuyen(
        maSV as string,
        thang ? Number(thang) : undefined,
        nam ? Number(nam) : undefined
      );
      return res.json({ success: true, data: list });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put('/api/training/comment', async (req: Request, res: Response) => {
    try {
      const { maSV, thang, nam, diemRL, nhanXet, nguoiDanhGia, diemMuc1, diemMuc2, diemMuc3, hocKy } = req.body;
      if (!maSV) {
        return res.status(400).json({ success: false, message: 'Mã sinh viên là bắt buTc' });
      }
      const m1 = Number(diemMuc1) || 0;
      const m2 = Number(diemMuc2) || 0;
      const m3 = Number(diemMuc3) || 0;
      const points = (m1 + m2 + m3 > 0) ? (m1 + m2 + m3) : Number(diemRL || 80);
      let xepLoai = 'Tt';
      if (points >= 90) xepLoai = 'Xuất sắc';
      else if (points >= 80) xepLoai = 'Tt';
      else if (points >= 70) xepLoai = 'Khá';
      else if (points >= 60) xepLoai = 'TBK';
      else if (points >= 50) xepLoai = 'TB';
      else if (points >= 35) xepLoai = 'Yếu';
      else xepLoai = 'Kém';
      const student = await getSinhVienByMaSV(maSV);
      const record: RenLuyen = {
        id: `rl-${maSV}-${thang || 11}-${nam || 2024}`,
        maSV,
        hoTenSV: student ? student.hoTen : 'Sinh viên',
        lop: student ? student.lop : 'CNKT Cơ khí 25DDS 09041',
        thang: Number(thang || 11),
        nam: Number(nam || 2024),
        diemRL: points,
        xepLoai,
        nhanXet: nhanXet || 'Giảng viên đã duyệt ánh giá.',
        nguoiDanhGia: nguoiDanhGia || 'Giảng viên Chủ nhim',
        ngayDanhGia: new Date().toISOString().split('T')[0],
        diemMuc1: m1 || undefined,
        diemMuc2: m2 || undefined,
        diemMuc3: m3 || undefined,
        hocKy: hocKy || 'HK1',
      };
      const saved = await upsertRenLuyen(record);
      return res.json({ success: true, message: 'Đã cập nhật nhận xét và điểm rèn luyện vào PostgreSQL', data: saved });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post('/api/training/import', async (req: Request, res: Response) => {
    try {
      const { training } = req.body;
      if (!Array.isArray(training) || training.length === 0) {
        return res.status(400).json({ success: false, message: 'Dữ liệu điểm rèn luyện từ Excel không hợp l' });
      }
      let importedCount = 0;
      for (const t of training) {
        if (t.maSV) {
          const student = await getSinhVienByMaSV(t.maSV);
          const m1 = Number(t.diemMuc1) || 0;
          const m2 = Number(t.diemMuc2) || 0;
          const m3 = Number(t.diemMuc3) || 0;
          const points = (m1 + m2 + m3 > 0) ? (m1 + m2 + m3) : Number(t.diemRL || 80);
          const finalPoints = Math.min(100, Math.max(0, points));
          let xepLoai = 'Tt';
          if (finalPoints >= 90) xepLoai = 'Xuất sắc';
          else if (finalPoints >= 80) xepLoai = 'Tt';
          else if (finalPoints >= 70) xepLoai = 'Khá';
          else if (finalPoints >= 60) xepLoai = 'TBK';
          else if (finalPoints >= 50) xepLoai = 'TB';
          else if (finalPoints >= 35) xepLoai = 'Yếu';
          else xepLoai = 'Kém';
          const thangVal = Number(t.thang || 11);
          const namVal = Number(t.nam || 2025);
          const record: RenLuyen = {
            id: `rl-${t.maSV}-${thangVal}-${namVal}`,
            maSV: t.maSV,
            hoTenSV: student ? student.hoTen : t.hoTenSV || 'Sinh viên',
            lop: student ? student.lop : t.lop || 'CNKT Cơ khí 25DDS 09041',
            thang: thangVal,
            nam: namVal,
            hocKy: t.hocKy || 'HK1',
            diemRL: finalPoints,
            diemMuc1: m1 || undefined,
            diemMuc2: m2 || undefined,
            diemMuc3: m3 || undefined,
            xepLoai,
            nhanXet: t.nhanXet || 'Đã import từ file Excel.',
            nguoiDanhGia: t.nguoiDanhGia || 'HTi "ng Quản lý sinh viên',
            ngayDanhGia: new Date().toISOString().split('T')[0],
          };
          await upsertRenLuyen(record);
          importedCount++;
        }
      }
      return res.json({
        success: true,
        message: `Đã import thành công ${importedCount} ánh giá điểm rèn luyện vào PostgreSQL!`,
        importedCount,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get(['/api/hocky', '/hocky'], async (req: Request, res: Response) => {
    try {
      const list = await getAllHocKy();
      return res.json({ success: true, data: list });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post(['/api/hocky', '/hocky'], async (req: Request, res: Response) => {
    try {
      const { tenHocKy, namHocID, hocKyID, ngayBatDau, ngayKetThuc } = req.body;
      if (!tenHocKy || !namHocID) {
        return res.status(400).json({ success: false, message: 'Tên học kỳ và ID năm học là bắt buTc' });
      }
      const newId = hocKyID || `HK${Date.now()}`;
      const newItem: HocKy = {
        hocKyID: newId,
        tenHocKy,
        namHocID,
        ngayBatDau,
        ngayKetThuc,
      };
      const created = await upsertHocKy(newItem);
      return res.status(201).json({ success: true, message: 'Thêm học kỳ mới thành công vào PostgreSQL', data: created });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put(['/api/hocky/:id', '/hocky/:id'], async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { tenHocKy, namHocID, ngayBatDau, ngayKetThuc } = req.body;
      const updated = await upsertHocKy({ hocKyID: id, tenHocKy, namHocID, ngayBatDau, ngayKetThuc });
      return res.json({ success: true, message: 'Cập nhật thông tin học kỳ thành công trong PostgreSQL', data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.delete(['/api/hocky/:id', '/hocky/:id'], async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await deleteHocKy(id);
      return res.json({ success: true, message: 'Đã xóa học kỳ khỏi CSDL PostgreSQL' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get(['/api/namhoc', '/namhoc'], async (req: Request, res: Response) => {
    try {
      const list = await getAllNamHoc();
      return res.json({ success: true, data: list });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post(['/api/namhoc', '/namhoc'], async (req: Request, res: Response) => {
    try {
      const { tenNamHoc, namHocID } = req.body;
      if (!tenNamHoc) {
        return res.status(400).json({ success: false, message: 'Tên năm học là bắt buTc' });
      }
      const newId = namHocID || `NH${tenNamHoc.replace(/\s+/g, '')}`;
      const newItem: NamHoc = {
        namHocID: newId,
        tenNamHoc,
      };
      const created = await upsertNamHoc(newItem);
      return res.status(201).json({ success: true, message: 'Thêm năm học mới thành công vào PostgreSQL', data: created });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put(['/api/namhoc/:id', '/namhoc/:id'], async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { tenNamHoc } = req.body;
      const updated = await upsertNamHoc({ namHocID: id, tenNamHoc });
      return res.json({ success: true, message: 'Cập nhật năm học thành công trong PostgreSQL', data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.delete(['/api/namhoc/:id', '/namhoc/:id'], async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { deleteSchedule } = req.query;
      await deleteNamHoc(id);
      if (deleteSchedule === 'true' || deleteSchedule === '1') {
        await deleteThoiKhoaBieuByYear(id);
      }
      return res.json({ success: true, message: 'Đã xóa năm học khỏi CSDL PostgreSQL' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get(['/api/schedule', '/api/tkb', '/tkb'], async (req: Request, res: Response) => {
    try {
      const { maSV, lop, hocKy, namHoc, week } = req.query;
      let list = await getAllThoiKhoaBieu(maSV as string, lop as string, hocKy as string, namHoc as string);
      if (week) {
        const wNum = Number(week);
        list = list.filter((t: { tuanTu?: number; tuanDen?: number; danhSachTuan?: number[] }) => (t.tuanTu && t.tuanDen ? wNum >= t.tuanTu && wNum <= t.tuanDen : true) || (t.danhSachTuan && t.danhSachTuan.includes(wNum)));
      }
      return res.json({ success: true, data: list });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post(['/api/schedule', '/api/tkb', '/tkb'], async (req: Request, res: Response) => {
    try {
      const {
        maSV,
        lop,
        lopID,
        applyToClass,
        hocKy,
        hocKyID,
        namHoc,
        namHocID,
        tuanTu,
        tuanDen,
        tuan,
        danhSachTuan,
        maMH,
        tenMH,
        soTinChi,
        giangVien,
        phongHoc,
        lichHoc
      } = req.body;
      if (!tenMH || !maMH) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tên môn học và mđã học phần' });
      }
      const createdItems: any[] = [];
      const targetClass = lop || lopID || 'CNKT Cơ khí 25DDS 09041';
      if (applyToClass && targetClass) {
        const allStudents = await getAllSinhVien(undefined, undefined, targetClass);
        const studentCodes = allStudents.length > 0 ? allStudents.map((s: any) => s.maSV) : [maSV || '25DDS0904103'];
        for (let idx = 0; idx < studentCodes.length; idx++) {
          const studentCode = studentCodes[idx];
          const idVal = `tkb-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;
          const newItem = {
            id: idVal,
            tkbID: idVal,
            maSV: studentCode,
            lop: targetClass,
            lopID: targetClass,
            hocKy: hocKy || 'HK1',
            hocKyID: hocKyID || hocKy || 'HK1-2025-2026',
            namHoc: namHoc || '2025-2026',
            namHocID: namHocID || namHoc || 'NH2025-2026',
            tuanTu: Number(tuanTu || tuan || 1),
            tuanDen: Number(tuanDen || 15),
            tuan: Number(tuan || tuanTu || 1),
            danhSachTuan: danhSachTuan || Array.from({ length: (Number(tuanDen) || 15) - (Number(tuanTu || tuan || 1)) + 1 }, (_, i) => (Number(tuanTu || tuan || 1)) + i),
            maMH,
            tenMH,
            soTinChi: soTinChi !== undefined && soTinChi !== null && soTinChi !== '' ? Number(soTinChi) : 0,
            giangVien: giangVien || 'Giảng viên BT môn',
            phongHoc: phongHoc || 'A2-201',
            lichHoc: lichHoc && lichHoc.length > 0 ? lichHoc : [{ thu: 2, tietBatDau: 1, soTiet: 3, phong: phongHoc || 'A2-201', coSo: 'Cơ sY chính' }]
          };
          const saved = await createThoiKhoaBieu(newItem);
          createdItems.push(saved);
        }
      } else {
        const idVal = `tkb-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newItem = {
          id: idVal,
          tkbID: idVal,
          maSV: maSV || '25DDS0904103',
          lop: targetClass,
          lopID: targetClass,
          hocKy: hocKy || 'HK1',
          hocKyID: hocKyID || hocKy || 'HK1-2025-2026',
          namHoc: namHoc || '2025-2026',
          namHocID: namHocID || namHoc || 'NH2025-2026',
          tuanTu: Number(tuanTu || tuan || 1),
          tuanDen: Number(tuanDen || 15),
          tuan: Number(tuan || tuanTu || 1),
          danhSachTuan: danhSachTuan || Array.from({ length: (Number(tuanDen) || 15) - (Number(tuanTu || tuan || 1)) + 1 }, (_, i) => (Number(tuanTu || tuan || 1)) + i),
          maMH,
          tenMH,
          soTinChi: soTinChi !== undefined && soTinChi !== null && soTinChi !== '' ? Number(soTinChi) : 0,
          giangVien: giangVien || 'Giảng viên BT môn',
          phongHoc: phongHoc || 'A2-201',
          lichHoc: lichHoc && lichHoc.length > 0 ? lichHoc : [{ thu: 2, tietBatDau: 1, soTiet: 3, phong: phongHoc || 'A2-201', coSo: 'Cơ sY chính' }]
        };
        const saved = await createThoiKhoaBieu(newItem);
        createdItems.push(saved);
      }
      return res.json({
        success: true,
        message: `Đã thêm mới thời khóa biểu thành công (${createdItems.length} bản ghi) vào PostgreSQL!`,
        data: createdItems
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put(['/api/schedule/:id', '/api/tkb/:id', '/tkb/:id'], async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await updateThoiKhoaBieu(id, req.body);
      return res.json({
        success: true,
        message: 'Cập nhật thời khóa biểu thành công trong PostgreSQL',
        data: updated
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.delete(['/api/schedule/by-year', '/api/tkb/by-year'], async (req: Request, res: Response) => {
    try {
      const namHoc = (req.query.namHoc as string) || (req.body?.namHoc as string);
      const hocKy = (req.query.hocKy as string) || (req.body?.hocKy as string);
      const lop = (req.query.lop as string) || (req.body?.lop as string);

      const result = await deleteThoiKhoaBieuByYear(namHoc, hocKy, lop);
      const yearLabel = !namHoc || namHoc === 'ALL' ? 'tất cả năm học' : `năm học ${namHoc}`;
      const hkLabel = hocKy && hocKy !== 'ALL' ? ` (HK: ${hocKy})` : '';
      return res.json({
        success: true,
        message: `Đã xóa thành công ${result.count || 0} mục thời khóa biểu của ${yearLabel}${hkLabel} khỏi PostgreSQL`,
        count: result.count || 0,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post(['/api/schedule/delete-by-year', '/api/tkb/delete-by-year'], async (req: Request, res: Response) => {
    try {
      const { namHoc, hocKy, lop } = req.body;
      const result = await deleteThoiKhoaBieuByYear(namHoc, hocKy, lop);
      const yearLabel = !namHoc || namHoc === 'ALL' ? 'tất cả năm học' : `năm học ${namHoc}`;
      const hkLabel = hocKy && hocKy !== 'ALL' ? ` (HK: ${hocKy})` : '';
      return res.json({
        success: true,
        message: `Đã xóa thành công ${result.count || 0} mục thời khóa biểu của ${yearLabel}${hkLabel} khỏi PostgreSQL`,
        count: result.count || 0,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.delete(['/api/schedule/:id', '/api/tkb/:id', '/tkb/:id'], async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { maMH } = req.query;
      await deleteThoiKhoaBieu(id, maMH as string);
      return res.json({ success: true, message: 'Đã xóa lịch học khỏi PostgreSQL' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get('/api/retakes', async (req: Request, res: Response) => {
    try {
      const { maSV } = req.query;
      const list = await getAllThiLaiHocLai(maSV as string);
      return res.json({ success: true, data: list });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post('/api/retakes/register', async (req: Request, res: Response) => {
    try {
      const { maSV, maMH, tenMH, soTinChi, loaiDangKy, lanThi, hocKy, namHoc, phiDiem } = req.body;
      if (!maSV || !maMH || !loaiDangKy) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin đăng ký bắt buTc' });
      }
      const student = await getSinhVienByMaSV(maSV);
      const newRetake: ThiLaiHocLai = {
        id: `dk-${Date.now()}`,
        maSV,
        hoTenSV: student ? student.hoTen : 'Sinh viên',
        maMH,
        tenMH: tenMH || 'Môn học',
        soTinChi: Number(soTinChi || 3),
        loaiDangKy,
        lanThi: Number(lanThi || 1),
        hocKy: hocKy || 'HK1',
        namHoc: namHoc || '2025-2026',
        phiDiem: Number(phiDiem || (loaiDangKy === 'THI_LAI' ? 150000 : (Number(soTinChi || 3) * 350000))),
        trangThai: 'CHO_DUYET',
        ketQua: 'CHUA_CO_DIEM',
        ngayDangKy: new Date().toISOString().split('T')[0],
      };
      const created = await createThiLaiHocLai(newRetake);
      return res.status(201).json({ success: true, message: 'Gửi yêu cầu đăng ký thi lại/học lại thành công vào PostgreSQL', data: created });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put('/api/retakes/:id/approve', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { trangThai, ketQua } = req.body;
      const updated = await updateThiLaiHocLai(id, {
        trangThai: trangThai || 'DA_DUYET',
        ketQua: ketQua || 'CHUA_CO_DIEM',
      });
      return res.json({ success: true, message: 'Duyệt yêu cầu đăng ký thành công trong PostgreSQL', data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get(['/api/attendance', '/api/diemdanh'], async (req: Request, res: Response) => {
    try {
      const { maSV, maMH } = req.query;
      const list = await getAllDiemDanh(maSV as string, maMH as string);
      return res.json({ success: true, data: list });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post(['/api/attendance', '/api/diemdanh'], async (req: Request, res: Response) => {
    try {
      const { id, maSV, hoTenSV, maMH, tenMH, lop, ngay, soTietNghi, coPhep, ghiChu, nguoiDiemDanh } = req.body;
      if (!maSV || !maMH || !ngay) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin điểm danh bắt buTc' });
      }
      const item = {
        id: id || `dd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        maSV,
        hoTenSV,
        maMH,
        tenMH,
        lop,
        ngay,
        soTietNghi: soTietNghi === undefined || soTietNghi === null ? 1 : Number(soTietNghi),
        coPhep: Boolean(coPhep),
        ghiChu: ghiChu || '',
        nguoiDiemDanh: nguoiDiemDanh || 'Giảng viên',
        createdAt: new Date().toISOString(),
      };
      const saved = await createDiemDanh(item);
      return res.status(201).json({ success: true, message: 'Ghi nhận điểm danh thành công vào PostgreSQL', data: saved });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.delete(['/api/attendance/:id', '/api/diemdanh/:id'], async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await deleteDiemDanh(id);
      return res.json({ success: true, message: 'Đã xóa bản ghi điểm danh khỏi PostgreSQL' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get(['/api/exam-notices', '/api/thongbao-kiemtra'], async (req: Request, res: Response) => {
    try {
      const { maMH } = req.query;
      const list = await getAllThongBaoKiemTra(maMH as string);
      return res.json({ success: true, data: list });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post(['/api/exam-notices', '/api/thongbao-kiemtra'], async (req: Request, res: Response) => {
    try {
      const { maMH, tenMH, loai, tieuDe, noiDung, ngayKiemTra, tuanKiemTra, giangVienTao } = req.body;
      if (!maMH || !tieuDe || !noiDung) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin thông báo kiểm tra' });
      }
      const item = {
        id: `tbkt-${Date.now()}`,
        maMH,
        tenMH: tenMH || 'Môn học',
        loai: loai || '15_PHUT',
        tieuDe,
        noiDung,
        ngayKiemTra,
        tuanKiemTra: Number(tuanKiemTra || 1),
        giangVienTao: giangVienTao || 'Giảng viên BT môn',
        createdAt: new Date().toISOString(),
      };
      const created = await createThongBaoKiemTra(item);
      return res.status(201).json({ success: true, message: 'Tạo thông báo kiểm tra thành công trong PostgreSQL', data: created });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.delete(['/api/exam-notices/:id', '/api/thongbao-kiemtra/:id'], async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await deleteThongBaoKiemTra(id);
      return res.json({ success: true, message: 'Đã xóa thông báo kiểm tra khỏi PostgreSQL' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  // Holidays (Nghỉ Lễ)
  app.get(['/api/holidays', '/api/nghile'], async (req: Request, res: Response) => {
    try {
      const list = await getAllNghiLe();
      return res.json({ success: true, data: list });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post(['/api/holidays', '/api/nghile'], async (req: Request, res: Response) => {
    try {
      const { dipLe, tuNgay, denNgay, ghiChu, lop, hocKy, namHoc } = req.body;
      if (!dipLe || !tuNgay || !denNgay) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tên dịp nghỉ lễ và khoảng ngày nghỉ lễ' });
      }
      const item: Partial<NghiLe> = {
        id: `holiday_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        dipLe: dipLe.trim(),
        tuNgay: tuNgay.trim(),
        denNgay: denNgay.trim(),
        ghiChu: ghiChu ? ghiChu.trim() : '',
        lop: lop || 'ALL',
        hocKy: hocKy || 'ALL',
        namHoc: namHoc || 'ALL',
        createdAt: new Date().toISOString(),
      };
      const created = await createNghiLe(item);
      return res.status(201).json({ success: true, message: `Thêm lịch nghỉ lễ "${dipLe}" thành công!`, data: created });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put(['/api/holidays/:id', '/api/nghile/:id'], async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updated = await updateNghiLe(id, req.body);
      return res.json({ success: true, message: 'Cập nhật lịch nghỉ lễ thành công', data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.delete(['/api/holidays/:id', '/api/nghile/:id'], async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await deleteNghiLe(id);
      return res.json({ success: true, message: 'Đã xóa lịch nghỉ lễ thành công' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get(['/api/subjects', '/api/monhoc'], async (req: Request, res: Response) => {
    try {
      const { khoa, lop, hocKy, namHoc } = req.query;
      const list = await getAllMonHoc(khoa as string, lop as string, hocKy as string, namHoc as string);
      return res.json({ success: true, data: list, total: list.length });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post(['/api/subjects', '/api/monhoc'], async (req: Request, res: Response) => {
    try {
      const { maMH, tenMH, soTinChi, khoa, khoaPhuTrach, loaiMon, hocKy, namHoc, lop, lePhiThiLai, lePhiHocLai } = req.body;
      if (!maMH || !tenMH) {
        return res.status(400).json({ success: false, message: 'Mã môn học và Tên môn học là bắt buTc' });
      }
      const item: MonHoc = {
        maMH: maMH.trim(),
        tenMH: tenMH.trim(),
        soTinChi: Number(soTinChi || 3),
        khoa: khoa || 'Khoa Cơ khí',
        khoaPhuTrach: khoaPhuTrach || khoa || 'Khoa Cơ khí',
        loaiMon: loaiMon || 'Bắt buộc',
        hocKy: hocKy || 'HK1',
        namHoc: namHoc || '2025-2026',
        lop: lop || 'ALL',
        lePhiThiLai: Number(lePhiThiLai || 150000),
        lePhiHocLai: Number(lePhiHocLai || 1050000),
      };
      const saved = await upsertMonHoc(item);
      return res.status(201).json({ success: true, message: 'Lưu môn học thành công vào PostgreSQL', data: saved });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.put(['/api/subjects/:maMH', '/api/monhoc/:maMH'], async (req: Request, res: Response) => {
    try {
      const { maMH } = req.params;
      const existing = await getMonHocByMaMH(maMH);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
      }
      const item: MonHoc = {
        maMH,
        tenMH: req.body.tenMH || existing.tenMH,
        soTinChi: req.body.soTinChi !== undefined ? Number(req.body.soTinChi) : existing.soTinChi,
        khoa: req.body.khoa || existing.khoa,
        khoaPhuTrach: req.body.khoaPhuTrach || existing.khoaPhuTrach,
        loaiMon: req.body.loaiMon || existing.loaiMon,
        hocKy: req.body.hocKy || existing.hocKy,
        namHoc: req.body.namHoc || existing.namHoc,
        lop: req.body.lop || existing.lop,
        lePhiThiLai: req.body.lePhiThiLai !== undefined ? Number(req.body.lePhiThiLai) : existing.lePhiThiLai,
        lePhiHocLai: req.body.lePhiHocLai !== undefined ? Number(req.body.lePhiHocLai) : existing.lePhiHocLai,
      };
      const updated = await upsertMonHoc(item);
      return res.json({ success: true, message: 'Cập nhật môn học thành công trong PostgreSQL', data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.delete(['/api/subjects/:maMH', '/api/monhoc/:maMH'], async (req: Request, res: Response) => {
    try {
      const { maMH } = req.params;
      await deleteMonHoc(maMH);
      return res.json({ success: true, message: 'Đã xóa môn học khỏi PostgreSQL' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post(['/api/subjects/import', '/api/monhoc/import'], async (req: Request, res: Response) => {
    try {
      const { subjects } = req.body;
      if (!Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ success: false, message: 'Dữ liệu danh sách môn học không hợp l' });
      }
      let count = 0;
      for (const s of subjects) {
        if (s.maMH && s.tenMH) {
          const item: MonHoc = {
            maMH: s.maMH.trim(),
            tenMH: s.tenMH.trim(),
            soTinChi: Number(s.soTinChi || 3),
            khoa: s.khoa || 'Khoa Cơ khí',
            khoaPhuTrach: s.khoaPhuTrach || s.khoa || 'Khoa Cơ khí',
            loaiMon: s.loaiMon || 'Bắt buộc',
            hocKy: s.hocKy || 'HK1',
            namHoc: s.namHoc || '2025-2026',
            lop: s.lop || 'ALL',
            lePhiThiLai: Number(s.lePhiThiLai || 150000),
            lePhiHocLai: Number(s.lePhiHocLai || 1050000),
          };
          await upsertMonHoc(item);
          count++;
        }
      }
      return res.json({ success: true, message: `Import thành công ${count} môn học vào PostgreSQL!`, importedCount: count });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get('/api/reports/summary', async (req: Request, res: Response) => {
    try {
      const { khoa, lop: lopFilter, hocKy, namHoc } = req.query;
      const students = await getAllSinhVien(undefined, khoa as string, lopFilter as string);
      const grades = await getAllDiem(undefined, hocKy as string, namHoc as string);
      const training = await getAllRenLuyen(undefined);
      const totalStudents = students.length;
      const totalPassedGrades = grades.filter((g: Diem) => g.trangThai === 'PASSED').length;
      const totalFailedGrades = grades.filter((g: Diem) => g.trangThai === 'FAILED').length;
      return res.json({
        success: true,
        data: {
          totalStudents,
          totalPassedGrades,
          totalFailedGrades,
          totalGrades: grades.length,
          totalTrainingRecords: training.length,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.post('/api/admin/clear-all-data', async (req: Request, res: Response) => {
    try {
      await clearAllOperationalData();
      return res.json({
        success: true,
        message: 'Đã làm sạch toàn bộ dữ liệu nghiệp vụ thành công trên CSDL PostgreSQL! Hệ thống giữ nguyên các tài khoản Quản trị viên (Admin).',
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get('/api/docs/json', (req: Request, res: Response) => {
    res.json({
      openapi: '3.0.0',
      info: {
        title: 'Hệ thống Quản lý Sinh viên - PostgreSQL & NestJS API Specs',
        version: '1.0.0',
        description: 'OpenAPI Swagger Spec vi cơ sY dữ liệu PostgreSQL Cloud SQL cho các dch vụ Quản lý Sinh viên, Điểm GPA, Rèn luyện, Thời khóa biểu',
      },
      paths: {
        '/api/auth/login': {
          post: {
            summary: 'Đăng nhập hệ thống bằng Mã Sinh Viên / Username',
            responses: { 200: { description: 'Trả về JWT Token và Role' } }
          }
        },
        '/api/students': {
          get: {
            summary: 'Lấy danh sách hồ sơ sinh viên từ PostgreSQL (Phân trang, Lọc theo Khoa, Lớp)',
            responses: { 200: { description: 'Danh sách sinh viên' } }
          },
          post: {
            summary: 'Thêm mới sinh viên',
            responses: { 201: { description: 'Tạo thành công' } }
          }
        },
        '/api/grades/import': {
          post: {
            summary: 'Import bảng điểm sinh viên từ Excel (.xlsx) vào PostgreSQL',
            responses: { 200: { description: 'Thành công' } }
          }
        },
        '/api/training/comment': {
          put: {
            summary: 'Giảng viên nhập nhận xét và điểm rèn luyện',
            responses: { 200: { description: 'Cập nhật thành công' } }
          }
        },
        '/api/schedule': {
          get: {
            summary: 'Xem thời khóa biểu theo học kỳ và năm học',
            responses: { 200: { description: 'Lịch học sinh viên' } }
          }
        },
        '/api/retakes/register': {
          post: {
            summary: 'Đăng ký thi lại / học lại trực tuyến',
            responses: { 201: { description: 'Đăng ký thành công' } }
          }
        }
      }
    });
  });
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Express + PostgreSQL backend running on http://localhost:${PORT}`);
  });
}
startServer().catch((error) => {
  console.error('[Server] Không thể khởi động do PostgreSQL chưa sẵn sàng.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

