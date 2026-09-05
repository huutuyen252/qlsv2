import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { SinhVien, UserRole, HoSoFile, User } from '../../types';
import {
  Users,
  Search,
  Plus,
  FileText,
  Upload,
  Edit3,
  Trash2,
  ExternalLink,
  X,
  CheckCircle,
  Eye,
  Filter,
  GraduationCap,
  Folder,
  ChevronRight,
  ArrowLeft,
  Layers,
  Tag,
  Paperclip,
  Download,
  FileSpreadsheet,
  Info,
  FileUp,
  Check,
  Lock,
  ShieldCheck,
  Printer,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User as UserIcon,
  Copy,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';

export const getStudentAvatarUrl = (student: Partial<SinhVien>): string => {
  if (student.avatar && student.avatar.trim()) {
    return student.avatar.trim();
  }
  const cleanName = encodeURIComponent(student.hoTen || student.maSV || 'Sinh Vien');
  const isFemale = student.gioiTinh === 'Nữ';
  // Standard high-quality deterministic avatar
  return `https://ui-avatars.com/api/?name=${cleanName}&background=${isFemale ? 'e11d48' : '2563eb'}&color=fff&size=200&bold=true&font-size=0.38`;
};

interface StudentProfileModuleProps {
  students: SinhVien[];
  userRole: UserRole;
  currentStudentCode?: string;
  currentUser?: User | null;
  onAddStudent: (student: SinhVien) => void;
  onUpdateStudent: (maSV: string, student: Partial<SinhVien>) => void;
  onDeleteStudent: (maSV: string) => void;
  onUploadHoSo: (maSV: string, fileName: string, fileData?: string) => void;
  onImportStudents?: (students: Partial<SinhVien>[]) => void;
}

export const StudentProfileModule: React.FC<StudentProfileModuleProps> = ({
  students,
  userRole,
  currentStudentCode,
  currentUser,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onUploadHoSo,
  onImportStudents,
}) => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'HIERARCHICAL' | 'FLAT'>('HIERARCHICAL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKhoa, setSelectedKhoa] = useState('');
  const [selectedLop, setSelectedLop] = useState('');

  // Class & Faculty map state
  const [classMap, setClassMap] = useState<Record<string, string>>(() => {
    const defaultMap: Record<string, string> = {
      'CNKT Cơ khí 25DDS 09041': 'Khoa Cơ khí',
      'CNKT Ô tô 25DDS09021': 'Khoa Ô tô',
    };
    students.forEach((s) => {
      if (s.lop && s.khoa) {
        defaultMap[s.lop] = s.khoa;
      }
    });
    return defaultMap;
  });

  // Edit / Add Class Modals State
  const [editingClassModal, setEditingClassModal] = useState<{
    oldLopName: string;
    lopName: string;
    khoa: string;
  } | null>(null);

  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassFormData, setNewClassFormData] = useState({ lopName: '', khoa: '' });

  // Helper to determine faculty for a given class
  const getFacultyForClass = (lopName: string): string => {
    if (classMap[lopName]) return classMap[lopName];
    const studentWithFaculty = students.find((s) => s.lop === lopName && s.khoa);
    if (studentWithFaculty) return studentWithFaculty.khoa;
    if (lopName.toLowerCase().includes('ô tô') || lopName.toLowerCase().includes('o to')) return 'Khoa Ô tô';
    if (lopName.toLowerCase().includes('cơ khí') || lopName.toLowerCase().includes('co khi')) return 'Khoa Cơ khí';
    if (lopName.toLowerCase().includes('thông tin') || lopName.toLowerCase().includes('cntt')) return 'Khoa Công nghệ Thông tin';
    return 'Khoa Đào tạo';
  };

  // Available classes derived dynamically from students list
  const availableClasses: string[] = Array.from(
    new Set(students.map((s) => s.lop).filter(Boolean) as string[])
  );

  const handleSaveNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLop = newClassFormData.lopName.trim();
    const trimmedKhoa = newClassFormData.khoa.trim() || 'Khoa Đào tạo';
    if (!trimmedLop) return;

    setClassMap((prev) => ({
      ...prev,
      [trimmedLop]: trimmedKhoa,
    }));

    setIsAddClassModalOpen(false);
    setNewClassFormData({ lopName: '', khoa: '' });
    alert(`Đã thêm lớp học mới: "${trimmedLop}" thuộc Khoa "${trimmedKhoa}"!`);
  };

  const handleSaveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassModal) return;

    const { oldLopName, lopName, khoa } = editingClassModal;
    const newLopName = lopName.trim();
    const newKhoa = khoa.trim() || 'Khoa Đào tạo';

    if (!newLopName) return;

    // Update classMap
    setClassMap((prev) => {
      const next = { ...prev };
      if (oldLopName !== newLopName) {
        delete next[oldLopName];
      }
      next[newLopName] = newKhoa;
      return next;
    });

    // Update all students in this class
    const studentsInOldClass = students.filter((s) => s.lop === oldLopName);
    studentsInOldClass.forEach((s) => {
      onUpdateStudent(s.maSV, {
        lop: newLopName,
        khoa: newKhoa,
      });
    });

    if (selectedClass === oldLopName) {
      setSelectedClass(newLopName);
    }

    setEditingClassModal(null);
    alert(
      `Đã cập nhật thành công thông tin Lớp "${newLopName}" và Khoa "${newKhoa}" cho ${studentsInOldClass.length} sinh viên!`
    );
  };

  const handleDeleteClass = (lopName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const studentsInLop = students.filter((s) => s.lop === lopName);
    const faculty = getFacultyForClass(lopName);

    const confirmMsg =
      studentsInLop.length > 0
        ? `⚠️ XÁC NHẬN XÓA LỚP HỌC:\n\nLớp: ${lopName}\nKhoa: ${faculty}\nSĩ số: ${studentsInLop.length} sinh viên\n\nBạn có chắc chắn muốn XÓA LỚP này và XÓA TOÀN BỘ ${studentsInLop.length} sinh viên thuộc lớp khỏi hệ thống không?`
        : `⚠️ XÁC NHẬN XÓA LỚP HỌC:\n\nLớp: ${lopName}\nKhoa: ${faculty}\n\nBạn có chắc chắn muốn xóa lớp học này khỏi danh sách không?`;

    if (window.confirm(confirmMsg)) {
      studentsInLop.forEach((s) => {
        onDeleteStudent(s.maSV);
      });

      setClassMap((prev) => {
        const next = { ...prev };
        delete next[lopName];
        return next;
      });

      if (selectedClass === lopName) {
        setSelectedClass(null);
      }

      alert(`Đã xóa thành công lớp "${lopName}"!`);
    }
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<SinhVien | null>(null);
  const [viewingDocumentStudent, setViewingDocumentStudent] = useState<SinhVien | null>(null);
  const [viewingDetailStudent, setViewingDetailStudent] = useState<SinhVien | null>(null);
  const [copiedMaSV, setCopiedMaSV] = useState(false);

  // Excel Import state
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [previewExcelStudents, setPreviewExcelStudents] = useState<Partial<SinhVien>[]>([]);
  const [excelFileName, setExcelFileName] = useState('');

  // Sample Excel Template Generator
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Mã SV': '25DDS0904188',
        'Họ và tên': 'Nguyễn Văn Minh',
        'Lớp': 'CNKT CƠ KHÍ',
        'Mã Lớp': '25DDS09041',
        'Khoa / Viện': 'Khoa Cơ khí',
        'Ngày sinh': '2007-04-15',
        'Giới tính': 'Nam',
        'Số điện thoại': '0987654321',
        'Email': 'minh.nv25@tdnu.edu.vn',
        'Địa chỉ': 'TP. Hồ Chí Minh',
        'Ngày nhập học': '2025-09-05',
        'Trạng thái': 'Đang học',
      },
      {
        'Mã SV': '25DDS0904189',
        'Họ và tên': 'Trần Thị Thu Hà',
        'Lớp': 'CNKT CƠ KHÍ',
        'Mã Lớp': '25DDS09041',
        'Khoa / Viện': 'Khoa Cơ khí',
        'Ngày sinh': '2007-08-20',
        'Giới tính': 'Nữ',
        'Số điện thoại': '0912345678',
        'Email': 'ha.ttt25@tdnu.edu.vn',
        'Địa chỉ': 'Bình Dương',
        'Ngày nhập học': '2025-09-05',
        'Trạng thái': 'Đang học',
      },
      {
        'Mã SV': '25DDS0902190',
        'Họ và tên': 'Lê Hoàng Nam',
        'Lớp': 'CNKT Ô TÔ',
        'Mã Lớp': '25DDS09021',
        'Khoa / Viện': 'Khoa Ô tô',
        'Ngày sinh': '2007-11-02',
        'Giới tính': 'Nam',
        'Số điện thoại': '0933445566',
        'Email': 'nam.lh25@tdnu.edu.vn',
        'Địa chỉ': 'Đồng Nai',
        'Ngày nhập học': '2025-09-05',
        'Trạng thái': 'Đang học',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachSinhVien');
    XLSX.writeFile(workbook, 'Mau_Import_DanhSach_SinhVien.xlsx');
  };

  // Parse Uploaded Excel File
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const parsed: Partial<SinhVien>[] = data
          .map((row) => {
            const maSV = String(row['Mã SV'] || row['MaSV'] || row['MSSV'] || row['Mã sinh viên'] || row['maSV'] || '').trim();
            const hoTen = String(row['Họ và tên'] || row['HoTen'] || row['Họ tên'] || row['hoTen'] || '').trim();
            const lopVal = String(row['Lớp'] || row['Lop'] || row['Lớp sinh hoạt'] || row['lop'] || '').trim();
            const maLopVal = String(row['Mã Lớp'] || row['Mã lớp'] || row['MaLop'] || row['maLop'] || '').trim();

            let lop = '';
            if (lopVal && maLopVal) {
              lop = lopVal.includes(maLopVal) ? lopVal : `${lopVal} ${maLopVal}`;
            } else if (maLopVal) {
              lop = maLopVal;
            } else if (lopVal) {
              lop = lopVal;
            } else {
              lop = 'CNKT Ô TÔ 25DDS09021';
            }

            const khoa = String(row['Khoa / Viện'] || row['Khoa'] || row['KhoaViên'] || row['khoa'] || 'Khoa Cơ khí').trim();
            const ngaySinh = String(row['Ngày sinh'] || row['NgaySinh'] || row['ngaySinh'] || '2007-01-01').trim();
            const gioiTinh = String(row['Giới tính'] || row['GioiTinh'] || row['gioiTinh'] || 'Nam').trim();
            const soDienThoai = String(row['Số điện thoại'] || row['SoDienThoai'] || row['SĐT'] || row['soDienThoai'] || '').trim();
            const email = String(row['Email'] || row['email'] || (maSV ? `${maSV.toLowerCase()}@tdnu.edu.vn` : '')).trim();
            const diaChi = String(row['Địa chỉ'] || row['DiaChi'] || row['diaChi'] || 'TP. Hồ Chí Minh').trim();
            const ngayNhapHoc = String(row['Ngày nhập học'] || row['NgayNhapHoc'] || row['ngayNhapHoc'] || '2025-09-05').trim();
            const trangThai = String(row['Trạng thái'] || row['TrangThai'] || row['trangThai'] || 'Đang học').trim();

            return {
              maSV,
              hoTen,
              lop,
              khoa,
              ngaySinh,
              gioiTinh: (gioiTinh.toLowerCase().includes('nữ') || gioiTinh.toLowerCase().includes('nu') ? 'Nữ' : 'Nam') as 'Nam' | 'Nữ',
              soDienThoai,
              email,
              diaChi,
              ngayNhapHoc,
              trangThai: (trangThai as any) || 'Đang học',
              hoSoFiles: [], // Hồ sơ số hóa có thể bổ sung sau
            };
          })
          .filter((s) => s.maSV && s.hoTen)
          .sort((a, b) => (a.maSV || '').localeCompare(b.maSV || '', undefined, { numeric: true, sensitivity: 'base' }));

        setPreviewExcelStudents(parsed);
        setExcelFileName(file.name);
      } catch (error) {
        console.error(error);
        alert('Không thể đọc file Excel. Vui lòng kiểm tra lại địđịnh dạng file!');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImportExcel = () => {
    if (previewExcelStudents.length === 0) return;
    const sortedStudents = [...previewExcelStudents].sort((a, b) =>
      (a.maSV || '').localeCompare(b.maSV || '', undefined, { numeric: true, sensitivity: 'base' })
    );
    if (onImportStudents) {
      onImportStudents(sortedStudents);
    } else {
      // Fallback batch addition
      sortedStudents.forEach((st) => onAddStudent(st as SinhVien));
    }
    setIsExcelImportModalOpen(false);
    setPreviewExcelStudents([]);
    setExcelFileName('');
  };

  // Form State
  const [formData, setFormData] = useState<Partial<SinhVien>>({
    maSV: '',
    hoTen: '',
    ngaySinh: '2003-01-01',
    gioiTinh: 'Nam',
    lop: 'CNKT Cơ khí 25DDS 09041',
    khoa: 'Khoa Cơ khí',
    soDienThoai: '',
    email: '',
    diaChi: '',
    ngayNhapHoc: '2021-09-05',
    trangThai: 'Đang học',
    hoSoFiles: [],
  });

  // Helper to extract file list from student
  const getStudentFiles = (student: SinhVien): HoSoFile[] => {
    if (student.hoSoFiles && student.hoSoFiles.length > 0) {
      return student.hoSoFiles;
    }
    if (student.hoSoFile) {
      return [
        {
          id: `legacy-${student.maSV}`,
          customName: 'Giấy báo nhập học & Bằng THPT',
          fileName: student.hoSoFileName || `HoSo_${student.maSV}_Scan.pdf`,
          fileUrl: student.hoSoFile,
          uploadedAt: '2025-09-05',
        },
      ];
    }
    return [];
  };

  // Permissions check
  const isStudentRole = userRole === 'STUDENT';
  const canEditProfile =
    userRole === 'ADMIN' ||
    userRole === 'LECTURER' ||
    Boolean(currentUser?.permissions?.canEditHoSo) ||
    Boolean(currentUser?.permissions?.canManageStudents);

  const studentCodeLower = (currentStudentCode || currentUser?.studentCode || currentUser?.username || '').toLowerCase();

  // If student role, filter to only the student's own profile
  const studentSelfList = students.filter(
    (s) =>
      s.maSV.toLowerCase() === studentCodeLower ||
      (s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase())
  );

  const baseStudentsList = isStudentRole
    ? studentSelfList.length > 0
      ? studentSelfList
      : students.length > 0
      ? [students[0]]
      : []
    : students;

  const myProfile = isStudentRole
    ? (studentSelfList[0] || (students.length > 0 ? students[0] : null))
    : null;

  // Filter & sort students by MSSV ascending from smallest to largest
  const filteredStudents = baseStudentsList
    .filter((s) => {
      const matchesClass = !selectedClass || s.lop === selectedClass;
      const matchesSearch =
        s.maSV.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.hoTen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesKhoa = !selectedKhoa || s.khoa === selectedKhoa;
      const matchesLop = !selectedLop || s.lop === selectedLop;
      return matchesClass && matchesSearch && matchesKhoa && matchesLop;
    })
    .sort((a, b) => a.maSV.localeCompare(b.maSV, undefined, { numeric: true, sensitivity: 'base' }));

  const handleOpenAdd = () => {
    const defaultMaSV = `25DDS0904${Math.floor(100 + Math.random() * 900)}`;
    setFormData({
      maSV: defaultMaSV,
      hoTen: '',
      ngaySinh: '2007-06-15',
      gioiTinh: 'Nam',
      lop: 'CNKT Cơ khí 25DDS 09041',
      khoa: 'Khoa Cơ khí',
      soDienThoai: '0912345678',
      email: '',
      diaChi: 'TP. Hồ Chí Minh',
      ngayNhapHoc: '2025-09-05',
      trangThai: 'Đang học',
      hoSoFiles: [
        {
          id: `hs-1-${Date.now()}`,
          customName: 'Giấy báo nhập học & Bằng THPT',
          fileName: `GiayBaoNhapHoc_${defaultMaSV}.pdf`,
          fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          uploadedAt: new Date().toISOString().split('T')[0],
        },
      ],
    });
    setEditingStudent(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (student: SinhVien) => {
    setEditingStudent(student);
    const files = getStudentFiles(student);
    setFormData({
      ...student,
      hoSoFiles: files,
    });
    setIsAddModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.maSV || !formData.hoTen) return;

    if (editingStudent) {
      onUpdateStudent(editingStudent.maSV, formData);
    } else {
      onAddStudent(formData as SinhVien);
    }
    setIsAddModalOpen(false);
  };

  const handleUpdateCustomName = (fileId: string, newName: string) => {
    setFormData((prev) => {
      const currentFiles = prev.hoSoFiles || [];
      const updated = currentFiles.map((f) =>
        f.id === fileId ? { ...f, customName: newName } : f
      );
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
        let defaultName = 'Tài liệu scan';
        const fname = file.name.toLowerCase();
        if (fname.includes('cccd') || fname.includes('cmnd')) defaultName = 'Căn cước công dân (2 mặt)';
        else if (fname.includes('thpt') || fname.includes('bang')) defaultName = 'Bằng tốt nghiệp THPT';
        else if (fname.includes('khai sinh')) defaultName = 'Giấy khai sinh (Bản sao)';
        else if (fname.includes('nhap hoc') || fname.includes('giay bao')) defaultName = 'Giấy báo nhập học';
        else if (fname.includes('ly lich') || fname.includes('so yeu')) defaultName = 'Sơ yếu lý lịch sinh viên';
        else defaultName = file.name.replace(/\.[^/.]+$/, '');

        existingFiles.push({
          id: `file-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
          customName: defaultName,
          fileName: file.name,
          fileUrl: (reader.result as string) || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
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
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDirectUploadSim = (student: SinhVien, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const existingFiles = getStudentFiles(student);
    const newFiles: HoSoFile[] = [...existingFiles];

    let loadedCount = 0;
    const filesArr: File[] = Array.from(files);
    filesArr.forEach((file: File, index: number) => {
      const reader = new FileReader();
      reader.onload = () => {
        let defaultName = file.name.replace(/\.[^/.]+$/, '');
        newFiles.push({
          id: `hs-${Date.now()}-${index}`,
          customName: defaultName || 'Tài liệu đính kèm mới',
          fileName: file.name,
          fileUrl: (reader.result as string) || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          uploadedAt: new Date().toISOString().split('T')[0],
        });

        loadedCount++;
        if (loadedCount === filesArr.length) {
          onUpdateStudent(student.maSV, {
            hoSoFiles: newFiles,
            hoSoFile: newFiles[0]?.fileUrl,
            hoSoFileName: newFiles[0]?.fileName,
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleOpenSinglePdf = (
    fileUrl: string,
    customName: string,
    fileName: string,
    student: { hoTen: string; maSV: string; lop?: string }
  ) => {
    const displayTitle = `${customName} - ${student.hoTen} (${student.maSV})`;
    if (fileUrl.startsWith('data:')) {
      const newWin = window.open('', '_blank');
      if (newWin) {
        newWin.document.write(`
          <!DOCTYPE html>
          <html lang="vi">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${displayTitle}</title>
            <style>
              body { margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; }
              header { background: #1e293b; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
              .student-info h1 { margin: 0; font-size: 16px; font-weight: 700; color: #38bdf8; }
              .student-info p { margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; }
              .actions { display: flex; gap: 12px; align-items: center; }
              .btn { background: #0284c7; color: white; padding: 8px 16px; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 600; }
              .btn:hover { background: #0369a1; }
              main { flex: 1; position: relative; background: #0f172a; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <header>
              <div class="student-info">
                <h1>📄 ${customName} — ${student.hoTen} (${student.maSV})</h1>
                <p>Lớp: ${student.lop || 'N/A'} • File gốc: ${fileName}</p>
              </div>
              <div class="actions">
                <a href="${fileUrl}" download="${fileName}" class="btn">Tải file về</a>
              </div>
            </header>
            <main>
              <iframe src="${fileUrl}"></iframe>
            </main>
          </body>
          </html>
        `);
        newWin.document.close();
      }
    } else {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* STUDENT ROLE VIEW: DEDICATED PERSONAL STUDENT PROFILE & DIGITAL DOCUMENTS */}
      {/* ========================================================================= */}
      {isStudentRole ? (
        myProfile ? (
          <div className="space-y-6">
            {/* Student Module Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Hồ Sơ & Lý Lịch Sinh Viên</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Thông tin định danh sinh viên, lớp sinh hoạt và danh mục tài liệu hồ sơ số hóa đã lưu trữ
                  </p>
                </div>
              </div>

              {canEditProfile && (
                <button
                  onClick={() => handleOpenEdit(myProfile)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Cập nhật lý lịch</span>
                </button>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Personal Details Card */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 space-y-6">
                {/* Identity Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
                    {myProfile.hoTen ? myProfile.hoTen.split(' ').slice(-1)[0]?.charAt(0) : 'SV'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-zinc-900 dark:text-white">{myProfile.hoTen}</h3>
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                        {myProfile.maSV}
                      </span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          myProfile.trangThai === 'Đang học'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : myProfile.trangThai === 'Bảo lưu'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        }`}
                      >
                        {myProfile.trangThai || 'Đang học'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium">
                      Lớp: <strong className="text-zinc-800 dark:text-zinc-200">{myProfile.lop || 'Chưa phân lớp'}</strong> • Khoa: <strong className="text-zinc-800 dark:text-zinc-200">{myProfile.khoa || 'Khoa Đào tạo'}</strong>
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-0.5">Mã sinh viên</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white text-sm">{myProfile.maSV}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-0.5">Họ và tên</span>
                    <span className="font-bold text-zinc-900 dark:text-white text-sm">{myProfile.hoTen}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-0.5">Lớp sinh hoạt</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{myProfile.lop}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-0.5">Khoa / Viện đào tạo</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{myProfile.khoa}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-0.5">Ngày sinh & Giới tính</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{myProfile.ngaySinh} ({myProfile.gioiTinh})</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-0.5">Số điện thoại liên hệ</span>
                    <span className="font-mono font-medium text-zinc-900 dark:text-white">{myProfile.soDienThoai || 'Chưa cập nhật'}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-0.5">Email sinh viên</span>
                    <span className="font-medium text-zinc-900 dark:text-white truncate block">{myProfile.email || `${myProfile.maSV.toLowerCase()}@tdnu.edu.vn`}</span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-0.5">Ngày nhập học</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{myProfile.ngayNhapHoc || '2025-09-05'}</span>
                  </div>

                  <div className="sm:col-span-2 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-0.5">Địa chỉ thường trú</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{myProfile.diaChi || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>

              {/* Digital Documents Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Hồ Sơ Số Hóa Đã Nộp</h4>
                    </div>
                    <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                      {getStudentFiles(myProfile).length} file
                    </span>
                  </div>

                  {/* List of files */}
                  <div className="mt-4 space-y-3">
                    {getStudentFiles(myProfile).length > 0 ? (
                      getStudentFiles(myProfile).map((file, idx) => (
                        <div
                          key={file.id || idx}
                          className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-blue-400 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                                {file.customName || file.fileName}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                              {file.uploadedAt || 'Mới nộp'}
                            </span>
                          </div>

                          <div className="text-[10px] text-zinc-400 font-mono truncate">
                            File: {file.fileName}
                          </div>

                          <div className="pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSinglePdf(file.fileUrl, file.customName || 'Hồ sơ', file.fileName, myProfile)
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem PDF</span>
                            </button>
                            <a
                              href={file.fileUrl}
                              download={file.fileName}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Tải về</span>
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 px-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 space-y-2">
                        <FileText className="w-8 h-8 text-zinc-400 mx-auto" />
                        <p className="text-xs text-zinc-500 font-medium">Chưa có file scan hồ sơ nào được lưu</p>
                      </div>
                    )}
                  </div>
                </div>

                {canEditProfile && (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer bg-zinc-50 dark:bg-zinc-800/40 hover:bg-blue-50/50 transition-all text-center">
                    <Upload className="w-5 h-5 text-blue-500 mb-1" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      + Bổ sung thêm File Scan (PDF/Ảnh)
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">
                      Bằng THPT, CCCD, Giấy báo nhập học...
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      onChange={(e) => handleDirectUploadSim(myProfile, e)}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Không tìm thấy thông tin hồ sơ</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Hệ thống chưa tìm thấy dữ liệu hồ sơ cá nhân tương ứng với tài khoản sinh viên đang đăng nhập. Vui lòng liên hệ Cố vấn học tập hoặc Quản trị viên.
            </p>
          </div>
        )
      ) : (
        /* ========================================================================= */
        /* ADMIN & LECTURER ROLE VIEW: CLASS NAVIGATOR, CARDS GRID & STUDENTS TABLE  */
        /* ========================================================================= */
        <>
          {/* Module Title & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Quản lý Hồ sơ Sinh viên</h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Mode switch button */}
              <button
                onClick={() => {
                  if (viewMode === 'HIERARCHICAL') {
                    setViewMode('FLAT');
                  } else {
                    setViewMode('HIERARCHICAL');
                    setSelectedClass(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 transition-all"
              >
                <Layers className="w-4 h-4 text-blue-500" />
                <span>{viewMode === 'HIERARCHICAL' ? 'Xem Tất Cả (Dạng Danh Sách)' : 'Phân Cấp Theo Lớp'}</span>
              </button>

              {userRole === 'ADMIN' && (
                <div className="flex items-center gap-2">
                  <button
                    id="btn-import-students-excel"
                    onClick={() => setIsExcelImportModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Import từ File Excel mẫu</span>
                  </button>

                  <button
                    id="btn-add-student"
                    onClick={handleOpenAdd}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Sinh viên</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BREADCRUMB & CLASS NAVIGATOR */}
          {viewMode === 'HIERARCHICAL' && (
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
              <div className="flex items-center flex-wrap gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <button
                  onClick={() => setSelectedClass(null)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    selectedClass === null
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  <span>Tất cả Lớp học</span>
                </button>

                {selectedClass && (
                  <>
                    <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 text-white font-bold shadow-sm">
                      <Users className="w-4 h-4" />
                      <span>Lớp: {selectedClass} ({getFacultyForClass(selectedClass)})</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* LEVEL 1: CLASS CARDS GRID */}
          {viewMode === 'HIERARCHICAL' && selectedClass === null && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </h3>
                <span className="text-xs text-zinc-500 font-mono">
                  {availableClasses.length} lớp học
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableClasses.map((lopName) => {
                  const studentsInLop = students.filter((s) => s.lop === lopName);
                  const activeCount = studentsInLop.filter((s) => s.trangThai === 'Đang học').length;
                  const hasScanCount = studentsInLop.reduce((acc, s) => acc + getStudentFiles(s).length, 0);
                  const faculty = getFacultyForClass(lopName);

                  return (
                    <div
                      key={lopName}
                      onClick={() => setSelectedClass(lopName)}
                      className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 truncate max-w-[170px]">
                            {faculty}
                          </span>

                          {userRole === 'ADMIN' && (
                            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingClassModal({
                                    oldLopName: lopName,
                                    lopName: lopName,
                                    khoa: faculty,
                                  });
                                }}
                                className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors cursor-pointer"
                                title="Chỉnh sửa Tên Lớp hoặc Khoa"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteClass(lopName, e)}
                                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-colors cursor-pointer"
                                title="Xóa Lớp học này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <h4 className="text-base font-black text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {lopName}
                        </h4>

                        <div className="grid grid-cols-2 gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span>Sĩ số: {studentsInLop.length} SV</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>Đang học: {activeCount}</span>
                          </div>
                          <div className="flex items-center gap-1.5 col-span-2 text-zinc-500">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            <span>Hồ sơ số hóa: {hasScanCount} file trong lớp</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                        <span>Xem danh sách sinh viên lớp</span>
                        <span className="font-mono text-sm group-hover:translate-x-1 transition-transform">➔</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LEVEL 2 OR FLAT MODE: STUDENT LIST TABLE */}
          {(viewMode === 'FLAT' || selectedClass !== null) && (
            <div className="space-y-4">
              {viewMode === 'HIERARCHICAL' && selectedClass && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/70 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                        {getFacultyForClass(selectedClass)}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-blue-950 dark:text-blue-200 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>Danh Sách Sinh Viên Lớp: {selectedClass}</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {userRole === 'ADMIN' && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingClassModal({
                              oldLopName: selectedClass,
                              lopName: selectedClass,
                              khoa: getFacultyForClass(selectedClass),
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 transition-all cursor-pointer"
                          title="Chỉnh sửa Tên Lớp hoặc Khoa này"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Sửa Lớp / Khoa</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteClass(selectedClass, e)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Xóa Lớp học này"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Xóa Lớp</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedClass(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Đổi Lớp Khác</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Filter & Search Bar */}
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2 relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    id="search-student-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo Mã SV, Họ tên, Email..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <select
                    id="filter-khoa-select"
                    value={selectedKhoa}
                    onChange={(e) => setSelectedKhoa(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả Khoa / Viện</option>
                    {Array.from(new Set(students.map((s) => s.khoa).filter(Boolean))).map((kh) => (
                      <option key={kh} value={kh}>{kh}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    id="filter-lop-select"
                    value={selectedLop}
                    onChange={(e) => setSelectedLop(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tất cả Lớp học</option>
                    {Array.from(new Set(students.map((s) => s.lop).concat(['CNKT Cơ khí 25DDS 09041', 'CNKT Ô tô 25DDS09021']))).map((lop) => (
                      <option key={lop} value={lop}>{lop}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student List Table */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 uppercase font-semibold border-b border-zinc-200 dark:border-zinc-700">
                      <tr>
                        <th className="p-3.5 text-center w-12">STT</th>
                        <th className="p-3.5">Mã SV & Họ tên</th>
                        <th className="p-3.5">Lớp / Khoa</th>
                        <th className="p-3.5">Ngày sinh & GT</th>
                        <th className="p-3.5">Liên hệ</th>
                        <th className="p-3.5">Hồ sơ Số hóa ({students.reduce((a, b) => a + getStudentFiles(b).length, 0)} file)</th>
                        <th className="p-3.5">Trạng thái</th>
                        <th className="p-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((s, index) => {
                          const files = getStudentFiles(s);
                          return (
                            <tr key={s.maSV} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="p-3.5 text-center font-mono font-bold text-zinc-400 dark:text-zinc-500">
                                {index + 1}
                              </td>
                              <td className="p-3.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingDetailStudent(s)}
                                  className="text-left group cursor-pointer flex items-center gap-3"
                                  title="Bấm để xem chi tiết hồ sơ & thông tin sinh viên"
                                >
                                  <div className="relative shrink-0">
                                    <img
                                      src={getStudentAvatarUrl(s)}
                                      alt={s.hoTen}
                                      className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 group-hover:ring-2 group-hover:ring-blue-500 transition-all bg-zinc-100 dark:bg-zinc-800"
                                      onError={(e) => {
                                        const clean = encodeURIComponent(s.hoTen || 'SV');
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${clean}&background=2563eb&color=fff&size=120&bold=true`;
                                      }}
                                    />
                                    <span
                                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 ${
                                        s.trangThai === 'Đang học'
                                          ? 'bg-emerald-500'
                                          : s.trangThai === 'Bảo lưu'
                                          ? 'bg-amber-500'
                                          : 'bg-rose-500'
                                      }`}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                      <span className="truncate">{s.hoTen}</span>
                                      <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity shrink-0" />
                                    </div>
                                    <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold">{s.maSV}</div>
                                  </div>
                                </button>
                              </td>
                              <td className="p-3.5">
                                <div className="font-semibold text-zinc-800 dark:text-zinc-200">{s.lop}</div>
                                <div className="text-[11px] text-zinc-500">{s.khoa}</div>
                              </td>
                              <td className="p-3.5">
                                <div>{s.ngaySinh}</div>
                                <div className="text-[11px] text-zinc-500">{s.gioiTinh}</div>
                              </td>
                              <td className="p-3.5">
                                <div>{s.email}</div>
                                <div className="text-[11px] text-zinc-500">{s.soDienThoai}</div>
                              </td>
                              <td className="p-3.5">
                                {files.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                      onClick={() => setViewingDocumentStudent(s)}
                                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 hover:shadow-sm transition-all cursor-pointer"
                                      title="Xem danh sách file scan hồ sơ"
                                    >
                                      <Paperclip className="w-3.5 h-3.5" />
                                      <span>{files.length} Hồ sơ số hóa</span>
                                    </button>
                                    {canEditProfile && (
                                      <label className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-blue-600 cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-all" title="Bổ sung thêm file scan">
                                        <Upload className="w-3 h-3 text-blue-500" />
                                        <span>+ Thêm</span>
                                        <input
                                          type="file"
                                          multiple
                                          accept=".pdf,.jpg,.jpeg,.png"
                                          className="hidden"
                                          onChange={(e) => handleDirectUploadSim(s, e)}
                                        />
                                      </label>
                                    )}
                                  </div>
                                ) : (
                                  canEditProfile ? (
                                    <label className="inline-flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 hover:text-amber-900 font-semibold cursor-pointer bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/80 transition-all shadow-sm">
                                      <Upload className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span>+ Bổ sung file scan</span>
                                      <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                        onChange={(e) => handleDirectUploadSim(s, e)}
                                      />
                                    </label>
                                  ) : (
                                    <span className="text-xs text-zinc-400 italic">Chưa có file scan</span>
                                  )
                                )}
                              </td>
                              <td className="p-3.5">
                                {userRole === 'ADMIN' ? (
                                  <select
                                    value={s.trangThai || 'Đang học'}
                                    onChange={(e) => {
                                      const newStatus = e.target.value as 'Đang học' | 'Bảo lưu' | 'Thôi học';
                                      onUpdateStudent(s.maSV, { trangThai: newStatus });
                                    }}
                                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 border border-transparent shadow-xs transition-all ${
                                      s.trangThai === 'Đang học'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 hover:bg-emerald-200'
                                        : s.trangThai === 'Bảo lưu'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 hover:bg-amber-200'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 hover:bg-rose-200'
                                    }`}
                                    title="Chỉnh sửa trực tiếp trạng thái sinh viên"
                                  >
                                    <option value="Đang học" className="bg-white dark:bg-zinc-900 text-emerald-800 dark:text-emerald-300 font-bold">
                                      Đang học
                                    </option>
                                    <option value="Bảo lưu" className="bg-white dark:bg-zinc-900 text-amber-800 dark:text-amber-300 font-bold">
                                      Bảo lưu
                                    </option>
                                    <option value="Thôi học" className="bg-white dark:bg-zinc-900 text-rose-800 dark:text-rose-300 font-bold">
                                      Thôi học
                                    </option>
                                  </select>
                                ) : (
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      s.trangThai === 'Đang học'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                        : s.trangThai === 'Bảo lưu'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                    }`}
                                  >
                                    {s.trangThai}
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setViewingDetailStudent(s)}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg cursor-pointer transition-colors inline-flex items-center"
                                  title="Xem chi tiết lý lịch & hồ sơ sinh viên"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {canEditProfile && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(s)}
                                    className="p-1.5 text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer transition-colors inline-flex items-center"
                                    title="Chỉnh sửa hồ sơ"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                )}
                                {userRole === 'ADMIN' && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteStudent(s.maSV)}
                                    className="p-1.5 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer transition-colors inline-flex items-center"
                                    title="Xóa hồ sơ"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                            Không tìm thấy dữ liệu sinh viên phù hợp
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative my-auto max-h-[88vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>{editingStudent ? 'Cập nhật Hồ sơ Sinh viên' : 'Thêm Hồ sơ Sinh viên mới'}</span>
            </h3>

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
              {/* Avatar Selector */}
              <div className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                <div className="relative shrink-0">
                  <img
                    src={getStudentAvatarUrl(formData)}
                    alt={formData.hoTen || 'Avatar'}
                    className="w-14 h-14 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.hoTen || 'SV')}&background=2563eb&color=fff&size=120`;
                    }}
                  />
                  <label
                    className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-all shadow-sm"
                    title="Tải ảnh đại diện"
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
                          setFormData((prev) => ({ ...prev, avatar: reader.result as string }));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <label className="font-bold text-xs text-zinc-900 dark:text-white block">
                    Ảnh Đại Diện Cá Nhân
                  </label>
                  <p className="text-[11px] text-zinc-500">
                    Bấm vào biểu tượng máy ảnh để tải ảnh chân dung từ máy tính (.jpg, .png)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Mã Sinh viên *</label>
                  <input
                    type="text"
                    disabled={!!editingStudent}
                    value={formData.maSV}
                    onChange={(e) => setFormData({ ...formData, maSV: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    value={formData.hoTen}
                    onChange={(e) => setFormData({ ...formData, hoTen: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Lớp sinh hoạt</label>
                  <input
                    type="text"
                    value={formData.lop}
                    onChange={(e) => setFormData({ ...formData, lop: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Khoa / Viện</label>
                  <input
                    type="text"
                    value={formData.khoa}
                    onChange={(e) => setFormData({ ...formData, khoa: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Ngày sinh</label>
                  <input
                    type="date"
                    value={formData.ngaySinh}
                    onChange={(e) => setFormData({ ...formData, ngaySinh: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Giới tính</label>
                  <select
                    value={formData.gioiTinh}
                    onChange={(e) => setFormData({ ...formData, gioiTinh: e.target.value as 'Nam' | 'Nữ' })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={formData.soDienThoai}
                    onChange={(e) => setFormData({ ...formData, soDienThoai: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Email trường</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Địa chỉ thường trú</label>
                <input
                  type="text"
                  value={formData.diaChi}
                  onChange={(e) => setFormData({ ...formData, diaChi: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              {/* Hồ sơ Số hóa MULTI-FILE UPLOAD AREA inside modal */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Danh sách Hồ sơ Số hóa đính kèm ({formData.hoSoFiles?.length || 0} file)</span>
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                    Tải nhiều file & đặt tên phân loại
                  </span>
                </div>

                {/* Uploaded Files List with Editable Custom Names */}
                {formData.hoSoFiles && formData.hoSoFiles.length > 0 && (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {formData.hoSoFiles.map((file, idx) => (
                      <div
                        key={file.id || idx}
                        className="p-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="flex-1">
                              <label className="text-[10px] text-zinc-400 font-medium block mb-0.5">
                                Đặt tên hiển thị / Phân loại file #{idx + 1}:
                              </label>
                              <input
                                type="text"
                                value={file.customName}
                                onChange={(e) => handleUpdateCustomName(file.id, e.target.value)}
                                placeholder="Ví dụ: Bằng THPT, CCCD 2 mặt, Sơ yếu lý lịch..."
                                className="w-full text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 self-end mb-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSinglePdf(
                                  file.fileUrl,
                                  file.customName || 'Hồ sơ',
                                  file.fileName,
                                  {
                                    hoTen: formData.hoTen || 'Sinh viên',
                                    maSV: formData.maSV || '',
                                    lop: formData.lop || '',
                                  }
                                )
                              }
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors"
                              title="Xem thử file trong tab mới"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveFile(file.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                              title="Xóa file này"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Preset Name Suggestions */}
                        <div className="flex flex-wrap items-center gap-1 text-[10px] pt-1">
                          <span className="text-zinc-400 font-medium mr-1">Tên gợi ý:</span>
                          {[
                            'Giấy báo nhập học',
                            'Bằng THPT',
                            'CCCD (2 mặt)',
                            'Sơ yếu lý lịch',
                            'Giấy khai sinh',
                            'Giấy khám sức khỏe',
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleUpdateCustomName(file.id, preset)}
                              className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 transition-colors"
                            >
                              + {preset}
                            </button>
                          ))}
                        </div>

                        <div className="text-[10px] text-zinc-400 flex items-center justify-between font-mono pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                          <span className="truncate">Tên file gốc: {file.fileName}</span>
                          <span className="shrink-0">{file.uploadedAt || 'Mới đính kèm'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dropzone for adding multi-files */}
                <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer bg-zinc-50 dark:bg-zinc-800/40 hover:bg-blue-50/50 transition-all text-center">
                  <Upload className="w-5 h-5 text-blue-500 mb-1" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Bấm chọn hoặc kéo thả để tải lên thêm nhiều File Scan (PDF, PNG, JPG)
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">
                    Hỗ trợ chọn nhiều file cùng lúc (Giấy báo nhập học, CCCD, Bằng THPT, Sơ yếu lý lịch...)
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

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20"
                >
                  {editingStudent ? 'Lưu cập nhật' : 'Tạo hồ sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal - Shows All Categorized Files */}
      {viewingDocumentStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative my-auto max-h-[88vh] overflow-y-auto">
            <button
              onClick={() => setViewingDocumentStudent(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                <Paperclip className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Danh Mục Hồ Sơ Số Hóa Đã Xác Thực
                </h3>
                <p className="text-xs text-zinc-500">
                  Sinh viên: <strong className="text-zinc-800 dark:text-zinc-200">{viewingDocumentStudent.hoTen}</strong> ({viewingDocumentStudent.maSV}) — Lớp: {viewingDocumentStudent.lop}
                </p>
              </div>
            </div>

            {/* List of Files */}
            {(() => {
              const studentFiles = getStudentFiles(viewingDocumentStudent);
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <span>Tổng số file: {studentFiles.length} tài liệu số hóa</span>
                    {canEditProfile ? (
                      <label className="inline-flex items-center gap-1 text-blue-600 hover:underline cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm file mới</span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            handleDirectUploadSim(viewingDocumentStudent, e);
                            // Refresh student files in modal
                            setTimeout(() => {
                              const updated = students.find((st) => st.maSV === viewingDocumentStudent.maSV);
                              if (updated) setViewingDocumentStudent(updated);
                            }, 300);
                          }}
                        />
                      </label>
                    ) : (
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Chỉ xem & Tải file scan</span>
                      </span>
                    )}
                  </div>

                  {studentFiles.length > 0 ? (
                    <div className="space-y-3">
                      {studentFiles.map((file, idx) => (
                        <div
                          key={file.id || idx}
                          className="bg-zinc-50 dark:bg-zinc-800/80 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-400 transition-all"
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <h4 className="font-bold text-sm text-blue-950 dark:text-blue-200 truncate">
                                {file.customName || file.fileName}
                              </h4>
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono pl-7 flex items-center gap-3">
                              <span>File gốc: {file.fileName}</span>
                              <span>•</span>
                              <span>Ngày tải: {file.uploadedAt || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSinglePdf(
                                  file.fileUrl,
                                  file.customName || 'Hồ sơ',
                                  file.fileName,
                                  viewingDocumentStudent
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Mở Scan (Tab mới)</span>
                            </button>

                            <a
                              href={file.fileUrl}
                              download={file.fileName}
                              className="p-1.5 text-zinc-600 hover:text-blue-600 dark:text-zinc-400 bg-white dark:bg-zinc-700 rounded-xl border border-zinc-200 dark:border-zinc-600 transition-colors"
                              title="Tải về máy"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed text-zinc-500 text-xs">
                      Chưa có file hồ sơ số hóa nào được tải lên cho sinh viên này
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL: VIEW FULL STUDENT PROFILE & DETAILS */}
      {viewingDetailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto space-y-6">
            <button
              type="button"
              onClick={() => {
                setViewingDetailStudent(null);
                setCopiedMaSV(false);
              }}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-5 border-b border-zinc-200 dark:border-zinc-800">
              <div className="relative group shrink-0 self-start sm:self-center">
                <img
                  src={getStudentAvatarUrl(viewingDetailStudent)}
                  alt={viewingDetailStudent.hoTen}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-2 border-white dark:border-zinc-700 shadow-xl shadow-blue-500/10 bg-zinc-100 dark:bg-zinc-800"
                  onError={(e) => {
                    const clean = encodeURIComponent(viewingDetailStudent.hoTen || 'SV');
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${clean}&background=2563eb&color=fff&size=200&bold=true`;
                  }}
                />
                {canEditProfile && (
                  <label
                    className="absolute -bottom-1.5 -right-1.5 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer transition-all hover:scale-105"
                    title="Đổi ảnh đại diện sinh viên"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const newAvatar = reader.result as string;
                          onUpdateStudent(viewingDetailStudent.maSV, { avatar: newAvatar });
                          setViewingDetailStudent({
                            ...viewingDetailStudent,
                            avatar: newAvatar,
                          });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white truncate">
                    {viewingDetailStudent.hoTen}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(viewingDetailStudent.maSV);
                      setCopiedMaSV(true);
                      setTimeout(() => setCopiedMaSV(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                    title="Bấm để sao chép Mã sinh viên"
                  >
                    <span>{viewingDetailStudent.maSV}</span>
                    {copiedMaSV ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-500" />}
                  </button>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      viewingDetailStudent.trangThai === 'Đang học'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : viewingDetailStudent.trangThai === 'Bảo lưu'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                    }`}
                  >
                    {viewingDetailStudent.trangThai || 'Đang học'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-medium flex items-center flex-wrap gap-2">
                  <span>Lớp: <strong className="text-zinc-800 dark:text-zinc-200">{viewingDetailStudent.lop}</strong></span>
                  <span>•</span>
                  <span>Khoa: <strong className="text-zinc-800 dark:text-zinc-200">{viewingDetailStudent.khoa}</strong></span>
                </p>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Thông tin học vụ */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/70 space-y-3">
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>Thông Tin Học Vụ & Đào Tạo</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Mã sinh viên:</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">{viewingDetailStudent.maSV}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Lớp học phần/sinh hoạt:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{viewingDetailStudent.lop}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Khoa / Viện quản lý:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{viewingDetailStudent.khoa}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Khóa đào tạo:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Khóa 2025 (2025 - 2029)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Ngày nhập học:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{viewingDetailStudent.ngayNhapHoc || '05/09/2025'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Tình trạng học tập:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{viewingDetailStudent.trangThai || 'Đang học'}</span>
                  </div>
                </div>
              </div>

              {/* Box 2: Thông tin nhân thân & liên hệ */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/70 space-y-3">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                  <span>Thông Tin Cá Nhân & Liên Hệ</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Ngày sinh:</span>
                    <span className="font-medium text-zinc-900 dark:text-white flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {viewingDetailStudent.ngaySinh}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Giới tính:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{viewingDetailStudent.gioiTinh}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Số điện thoại:</span>
                    {viewingDetailStudent.soDienThoai ? (
                      <a
                        href={`tel:${viewingDetailStudent.soDienThoai}`}
                        className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {viewingDetailStudent.soDienThoai}
                      </a>
                    ) : (
                      <span className="text-zinc-400 italic">Chưa cập nhật</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Email trường:</span>
                    <a
                      href={`mailto:${viewingDetailStudent.email || `${viewingDetailStudent.maSV.toLowerCase()}@tdnu.edu.vn`}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[180px] flex items-center gap-1"
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      {viewingDetailStudent.email || `${viewingDetailStudent.maSV.toLowerCase()}@tdnu.edu.vn`}
                    </a>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-zinc-500 shrink-0">Địa chỉ:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 text-right flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      {viewingDetailStudent.diaChi || 'Chưa cập nhật'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 3: Hồ sơ số hóa đính kèm */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/70 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-blue-600" />
                  <span>Hồ Sơ Số Hóa Đã Xác Thực ({getStudentFiles(viewingDetailStudent).length} tài liệu)</span>
                </h4>
                {canEditProfile && (
                  <label className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-bold cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tải thêm file scan</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        handleDirectUploadSim(viewingDetailStudent, e);
                        setTimeout(() => {
                          const updated = students.find((st) => st.maSV === viewingDetailStudent.maSV);
                          if (updated) setViewingDetailStudent(updated);
                        }, 300);
                      }}
                    />
                  </label>
                )}
              </div>

              {getStudentFiles(viewingDetailStudent).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {getStudentFiles(viewingDetailStudent).map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2 hover:border-blue-400 transition-all"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                          <span className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                            {file.customName || file.fileName}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono truncate pl-5">
                          {file.fileName}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenSinglePdf(
                              file.fileUrl,
                              file.customName || 'Hồ sơ',
                              file.fileName,
                              viewingDetailStudent
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                          title="Xem file scan"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>
                        <a
                          href={file.fileUrl}
                          download={file.fileName}
                          className="p-1 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg transition-colors"
                          title="Tải file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 text-xs text-zinc-400">
                  Chưa có tài liệu số hóa nào được lưu trữ cho sinh viên này
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-zinc-500" />
                <span>In Lý Lịch Trích Ngang</span>
              </button>

              <div className="flex items-center gap-2">
                {canEditProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      const st = viewingDetailStudent;
                      setViewingDetailStudent(null);
                      handleOpenEdit(st);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Chỉnh Sửa Hồ Sơ</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setViewingDetailStudent(null);
                    setCopiedMaSV(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT STUDENTS FROM EXCEL */}
      {isExcelImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setIsExcelImportModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Import Danh Sách Sinh Viên Từ File Excel Mẫu
                </h3>
                <p className="text-xs text-zinc-500">
                  Tải danh sách nhiều sinh viên cùng lúc bằng file Excel chuẩn (.xlsx, .xls)
                </p>
              </div>
            </div>

            {/* Alert Note */}
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 rounded-2xl text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 shrink-0" />
                <span>Hồ sơ số hóa (File Scan PDF) có thể bổ sung sau khi thêm sinh viên!</span>
              </div>
              <p className="text-[11px] text-blue-800 dark:text-blue-300 pl-5">
                File Excel chỉ cần chứa các thông tin lý lịch căn bản (Mã SV, Họ tên, Lớp, Khoa...). Sau khi import thành công, Admin hoặc Sinh viên có thể bấm <strong>"Bổ sung file scan"</strong> trực tiếp trong danh sách để đính kèm bằng THPT, CCCD, Giấy khai sinh... bất cứ lúc nào.
              </p>
            </div>

            {/* Step 1: Download Sample Excel */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-white">
                    Bước 1: Tải về File Excel Mẫu Chuẩn
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    File mẫu chứa đầy đủ các cột tiêu đề tiêu chuẩn: Mã SV, Họ và tên, Lớp, Mã Lớp, Khoa, Ngày sinh, Giới tính, SĐT, Email...
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải File Mẫu (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Step 2: Upload Excel File */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-zinc-900 dark:text-white">
                Bước 2: Tải Lên File Excel Đã Điền Danh Sách Sinh Viên
              </h4>

              <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-emerald-300 dark:border-emerald-800/80 rounded-2xl hover:border-emerald-500 cursor-pointer bg-emerald-50/30 dark:bg-emerald-950/20 transition-all text-center">
                <FileUp className="w-7 h-7 text-emerald-600 mb-1.5" />
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Bấm để chọn file hoặc kéo thả file Excel (.xlsx, .xls, .csv)
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5">
                  {excelFileName ? `Đã chọn: ${excelFileName}` : 'Hỗ trợ các địđịnh dạng .xlsx, .xls, .csv'}
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleExcelFileUpload}
                />
              </label>
            </div>

            {/* Preview Table */}
            {previewExcelStudents.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>Xem Trước Danh Sách Trích Xuất ({previewExcelStudents.length} sinh viên)</span>
                  </h4>
                  <span className="text-[10px] text-zinc-400">Đã đọc từ {excelFileName}</span>
                </div>

                <div className="max-h-52 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold sticky top-0">
                      <tr>
                        <th className="p-2">STT</th>
                        <th className="p-2">Mã SV</th>
                        <th className="p-2">Họ và tên</th>
                        <th className="p-2">Lớp</th>
                        <th className="p-2">Khoa / Viện</th>
                        <th className="p-2">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {previewExcelStudents.map((st, idx) => (
                        <tr key={st.maSV || idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <td className="p-2 font-mono text-zinc-400">{idx + 1}</td>
                          <td className="p-2 font-bold text-blue-600 dark:text-blue-400">{st.maSV}</td>
                          <td className="p-2 font-semibold">{st.hoTen}</td>
                          <td className="p-2">{st.lop}</td>
                          <td className="p-2">{st.khoa}</td>
                          <td className="p-2 font-mono text-zinc-500">{st.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsExcelImportModalOpen(false);
                  setPreviewExcelStudents([]);
                  setExcelFileName('');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={previewExcelStudents.length === 0}
                onClick={handleConfirmImportExcel}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xác nhận Import ({previewExcelStudents.length} Sinh viên)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Class & Faculty */}
      {editingClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-auto max-h-[88vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setEditingClassModal(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" />
              <span>Chỉnh Sửa Thông Tin Lớp Học & Khoa</span>
            </h3>

            <form onSubmit={handleSaveEditClass} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Tên Lớp Học *</label>
                <input
                  type="text"
                  value={editingClassModal.lopName}
                  onChange={(e) =>
                    setEditingClassModal({ ...editingClassModal, lopName: e.target.value })
                  }
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Khoa / Viện Quản Lý *</label>
                {Array.from(new Set(students.map((s) => s.khoa).filter(Boolean))).length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={Array.from(new Set(students.map((s) => s.khoa).filter(Boolean))).includes(editingClassModal.khoa) ? editingClassModal.khoa : 'OTHER'}
                      onChange={(e) => {
                        if (e.target.value !== 'OTHER') {
                          setEditingClassModal({ ...editingClassModal, khoa: e.target.value });
                        }
                      }}
                      className="w-1/2 p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-white font-bold text-xs cursor-pointer"
                    >
                      <option value="" disabled>-- Chọn Khoa / Viện --</option>
                      {Array.from(new Set(students.map((s) => s.khoa).filter(Boolean))).map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                      <option value="OTHER">Tự nhập khác...</option>
                    </select>
                    <input
                      type="text"
                      value={editingClassModal.khoa}
                      onChange={(e) =>
                        setEditingClassModal({ ...editingClassModal, khoa: e.target.value })
                      }
                      placeholder="Tên Khoa/Viện..."
                      className="w-1/2 p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-white font-bold text-xs"
                      required
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={editingClassModal.khoa}
                    onChange={(e) =>
                      setEditingClassModal({ ...editingClassModal, khoa: e.target.value })
                    }
                    placeholder="Nhập tên Khoa / Viện..."
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-white font-bold text-xs"
                    required
                  />
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 rounded-xl text-blue-900 dark:text-blue-200 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                  <span>Tự động đồng bộ:</span>
                </p>
                <p>
                  Thay đổi Tên Lớp hoặc Khoa tại đây sẽ tự động cập nhật lý lịch cho tất cả{' '}
                  <strong className="underline font-black">
                    {students.filter((s) => s.lop === editingClassModal.oldLopName).length}
                  </strong>{' '}
                  sinh viên hiện có trong lớp này!
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingClassModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Class */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative my-auto max-h-[88vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setIsAddClassModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <span>Tạo Lớp Học Mới</span>
            </h3>

            <form onSubmit={handleSaveNewClass} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Tên Lớp Học Mới *</label>
                <input
                  type="text"
                  value={newClassFormData.lopName}
                  onChange={(e) =>
                    setNewClassFormData({ ...newClassFormData, lopName: e.target.value })
                  }
                  placeholder="Ví dụ: CNKT Điện - Điện tử 25DDS"
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-zinc-900 dark:text-white font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-zinc-700 dark:text-zinc-300">Khoa / Viện Quản Lý *</label>
                {Array.from(new Set(students.map((s) => s.khoa).filter(Boolean))).length > 0 ? (
                  <div className="flex gap-2">
                    <select
                      value={Array.from(new Set(students.map((s) => s.khoa).filter(Boolean))).includes(newClassFormData.khoa) ? newClassFormData.khoa : 'OTHER'}
                      onChange={(e) => {
                        if (e.target.value !== 'OTHER') {
                          setNewClassFormData({ ...newClassFormData, khoa: e.target.value });
                        }
                      }}
                      className="w-1/2 p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-zinc-900 dark:text-white font-bold text-xs cursor-pointer"
                    >
                      <option value="" disabled>-- Chọn Khoa / Viện --</option>
                      {Array.from(new Set(students.map((s) => s.khoa).filter(Boolean))).map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                      <option value="OTHER">Tự nhập khác...</option>
                    </select>
                    <input
                      type="text"
                      value={newClassFormData.khoa}
                      onChange={(e) =>
                        setNewClassFormData({ ...newClassFormData, khoa: e.target.value })
                      }
                      placeholder="Tên Khoa/Viện..."
                      className="w-1/2 p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-zinc-900 dark:text-white font-bold text-xs"
                      required
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={newClassFormData.khoa}
                    onChange={(e) =>
                      setNewClassFormData({ ...newClassFormData, khoa: e.target.value })
                    }
                    placeholder="Nhập tên Khoa / Viện quản lý..."
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-zinc-900 dark:text-white font-bold text-xs"
                    required
                  />
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Lớp Mới</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
