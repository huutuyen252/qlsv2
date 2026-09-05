import React, { useState } from 'react';
import { HocKy, NamHoc, UserRole } from '../../types';
import { apiService } from '../../services/apiService';
import {
  Calendar,
  Layers,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  X,
  AlertCircle,
  Building2,
  ListOrdered
} from 'lucide-react';
interface SemesterAcademicYearModuleProps {
  semesters: HocKy[];
  academicYears: NamHoc[];
  userRole?: UserRole;
  onRefreshData: () => void;
  showToast: (msg: string) => void;
}
export const SemesterAcademicYearModule: React.FC<SemesterAcademicYearModuleProps> = ({
  semesters,
  academicYears,
  userRole = 'ADMIN',
  onRefreshData,
  showToast,
}) => {
  const isAdmin = userRole === 'ADMIN';
  const [isNamHocModalOpen, setIsNamHocModalOpen] = useState(false);
  const [editingNamHoc, setEditingNamHoc] = useState<NamHoc | null>(null);
  const [namHocForm, setNamHocForm] = useState({ namHocID: '', tenNamHoc: '' });
  const [isHocKyModalOpen, setIsHocKyModalOpen] = useState(false);
  const [editingHocKy, setEditingHocKy] = useState<HocKy | null>(null);
  const [hocKyForm, setHocKyForm] = useState({ hocKyID: '', tenHocKy: '', namHocID: '', ngayBatDau: '', ngayKetThuc: '' });
  const handleNamHocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namHocForm.tenNamHoc.trim()) {
      showToast('Vui lòng nhập tên năm học');
      return;
    }
    if (editingNamHoc) {
      const res = await apiService.updateAcademicYear(editingNamHoc.namHocID, { tenNamHoc: namHocForm.tenNamHoc });
      showToast(res.message);
    } else {
      const res = await apiService.addAcademicYear({
        namHocID: namHocForm.namHocID || `NH${namHocForm.tenNamHoc.replace(/\s+/g, '')}`,
        tenNamHoc: namHocForm.tenNamHoc,
      });
      showToast(res.message);
    }
    setIsNamHocModalOpen(false);
    setEditingNamHoc(null);
    setNamHocForm({ namHocID: '', tenNamHoc: '' });
    onRefreshData();
  };
  const handleDeleteNamHoc = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn mun xóa năm học "${name}" (${id})?`)) {
      const res = await apiService.deleteAcademicYear(id);
      showToast(res.message);
      onRefreshData();
    }
  };
  const handleHocKySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hocKyForm.tenHocKy.trim() || !hocKyForm.namHocID) {
      showToast('Vui lòng điền đầy đủ tên học kỳ và chọn năm học liên kết');
      return;
    }
    if (editingHocKy) {
      const res = await apiService.updateSemester(editingHocKy.hocKyID, {
        tenHocKy: hocKyForm.tenHocKy,
        namHocID: hocKyForm.namHocID,
        ngayBatDau: hocKyForm.ngayBatDau,
        ngayKetThuc: hocKyForm.ngayKetThuc,
      });
      showToast(res.message);
    } else {
      const res = await apiService.addSemester({
        hocKyID: hocKyForm.hocKyID || `HK-${Date.now().toString().slice(-4)}`,
        tenHocKy: hocKyForm.tenHocKy,
        namHocID: hocKyForm.namHocID,
        ngayBatDau: hocKyForm.ngayBatDau,
        ngayKetThuc: hocKyForm.ngayKetThuc,
      });
      showToast(res.message);
    }
    setIsHocKyModalOpen(false);
    setEditingHocKy(null);
    setHocKyForm({ hocKyID: '', tenHocKy: '', namHocID: '', ngayBatDau: '', ngayKetThuc: '' });
    onRefreshData();
  };
  const handleDeleteHocKy = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn mun xóa học kỳ "${name}" (${id})?`)) {
      const res = await apiService.deleteSemester(id);
      showToast(res.message);
      onRefreshData();
    }
  };
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Quản Lý Học Kỳ & Năm Học (Bảng HocKy & NamHoc)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Thiết lập danh mục năm học và học kỳ chính thức để liên kết xếp thời khóa biểu và tổng hợp điểm GPA sinh viên.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setEditingNamHoc(null);
                setNamHocForm({ namHocID: '', tenNamHoc: '' });
                setIsNamHocModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Năm Học
            </button>
            <button
              onClick={() => {
                setEditingHocKy(null);
                setHocKyForm({
                  hocKyID: '',
                  tenHocKy: 'Học kỳ 1',
                  namHocID: academicYears[0]?.namHocID || '',
                  ngayBatDau: '',
                  ngayKetThuc: '',
                });
                setIsHocKyModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm Học Kỳ
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
              <Calendar className="w-4 h-4 text-blue-600" />
              Bảng NamHoc ({academicYears.length} năm học)
            </div>
            <span className="text-[11px] font-mono font-semibold text-zinc-500">NamHocID | TenNamHoc</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="p-3 w-32">NamHocID</th>
                  <th className="p-3">Tên Năm Học</th>
                  <th className="p-3 text-center">S Học Kỳ</th>
                  {isAdmin && <th className="p-3 text-right">Thao Tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {academicYears.map((ny) => {
                  const semesterCount = semesters.filter(s => s.namHocID === ny.namHocID).length;
                  return (
                    <tr key={ny.namHocID} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {ny.namHocID}
                      </td>
                      <td className="p-3 font-semibold text-zinc-900 dark:text-white">
                        Năm học {ny.tenNamHoc}
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[11px]">
                          {semesterCount} học kỳ
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingNamHoc(ny);
                              setNamHocForm({ namHocID: ny.namHocID, tenNamHoc: ny.tenNamHoc });
                              setIsNamHocModalOpen(true);
                            }}
                            title="Sửa năm học"
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNamHoc(ny.namHocID, ny.tenNamHoc)}
                            title="Xóa năm học"
                            className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950 text-red-600 dark:text-red-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-white">
              <ListOrdered className="w-4 h-4 text-emerald-600" />
              Bảng HocKy ({semesters.length} học kỳ)
            </div>
            <span className="text-[11px] font-mono font-semibold text-zinc-500">HocKyID | TenHocKy | NamHocID</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-700">
                <tr>
                  <th className="p-3 w-28">HocKyID</th>
                  <th className="p-3">Tên Học Kỳ</th>
                  <th className="p-3">Năm Học Liên Kết</th>
                  {isAdmin && <th className="p-3 text-right">Thao Tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {semesters.map((sem) => {
                  const linkedYear = academicYears.find(y => y.namHocID === sem.namHocID);
                  return (
                    <tr key={sem.hocKyID} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {sem.hocKyID}
                      </td>
                      <td className="p-3 font-bold text-zinc-900 dark:text-white">
                        {sem.tenHocKy}
                      </td>
                      <td className="p-3 font-medium text-zinc-600 dark:text-zinc-300">
                        {linkedYear ? `Năm học ${linkedYear.tenNamHoc}` : sem.namHocID}
                      </td>
                      {isAdmin && (
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingHocKy(sem);
                              setHocKyForm({
                                hocKyID: sem.hocKyID,
                                tenHocKy: sem.tenHocKy,
                                namHocID: sem.namHocID,
                                ngayBatDau: sem.ngayBatDau || '',
                                ngayKetThuc: sem.ngayKetThuc || '',
                              });
                              setIsHocKyModalOpen(true);
                            }}
                            title="Sửa học kỳ"
                            className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteHocKy(sem.hocKyID, sem.tenHocKy)}
                            title="Xóa học kỳ"
                            className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950 text-red-600 dark:text-red-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {isNamHocModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsNamHocModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              {editingNamHoc ? 'Sửa Thông Tin Năm Học' : 'Thêm Năm Học Mới (NamHoc)'}
            </h3>
            <form onSubmit={handleNamHocSubmit} className="space-y-4 text-xs">
              {!editingNamHoc && (
                <div>
                  <label className="font-semibold block mb-1">Mã Năm Học (NamHocID)</label>
                  <input
                    type="text"
                    placeholder="VD: NH2026-2027 (f trng sẽ tự sinh)"
                    value={namHocForm.namHocID}
                    onChange={(e) => setNamHocForm({ ...namHocForm, namHocID: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl font-mono"
                  />
                </div>
              )}
              <div>
                <label className="font-semibold block mb-1">Tên Năm Học (TenNamHoc) *</label>
                <input
                  type="text"
                  placeholder="VD: 2026 - 2027"
                  value={namHocForm.tenNamHoc}
                  onChange={(e) => setNamHocForm({ ...namHocForm, tenNamHoc: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl font-bold"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNamHocModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {editingNamHoc ? 'Lưu Thay Đổi' : 'Thêm Năm Học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isHocKyModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsHocKyModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              {editingHocKy ? 'Sửa Thông Tin Học Kỳ' : 'Thêm Học Kỳ Mới (HocKy)'}
            </h3>
            <form onSubmit={handleHocKySubmit} className="space-y-4 text-xs">
              {!editingHocKy && (
                <div>
                  <label className="font-semibold block mb-1">Mã Học Kỳ (HocKyID)</label>
                  <input
                    type="text"
                    placeholder="VD: HK1-2026-2027 (tự sinh nếu f trng)"
                    value={hocKyForm.hocKyID}
                    onChange={(e) => setHocKyForm({ ...hocKyForm, hocKyID: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl font-mono"
                  />
                </div>
              )}
              <div>
                <label className="font-semibold block mb-1">Tên Học Kỳ (TenHocKy) *</label>
                <input
                  type="text"
                  placeholder="VD: Học kỳ 1, Học kỳ 2, Học kỳ Hè"
                  value={hocKyForm.tenHocKy}
                  onChange={(e) => setHocKyForm({ ...hocKyForm, tenHocKy: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl font-bold"
                  required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Năm Học Liên Kết (NamHocID) *</label>
                <select
                  value={hocKyForm.namHocID}
                  onChange={(e) => setHocKyForm({ ...hocKyForm, namHocID: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl font-bold"
                  required
                >
                  <option value="">-- Chọn năm học --</option>
                  {academicYears.map((y) => (
                    <option key={y.namHocID} value={y.namHocID}>
                      Năm học {y.tenNamHoc} ({y.namHocID})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    value={hocKyForm.ngayBatDau}
                    onChange={(e) => setHocKyForm({ ...hocKyForm, ngayBatDau: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Ngày kết thúc *</label>
                  <input
                    type="date"
                    value={hocKyForm.ngayKetThuc}
                    onChange={(e) => setHocKyForm({ ...hocKyForm, ngayKetThuc: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHocKyModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {editingHocKy ? 'Lưu Thay Đổi' : 'Thêm Học Kỳ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

