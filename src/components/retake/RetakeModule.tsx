import React, { useState } from 'react';
import { ThiLaiHocLai, SinhVien, UserRole, MonHoc } from '../../types';
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Search,
  DollarSign,
  AlertTriangle,
  X,
  Send,
  Trash2,
} from 'lucide-react';
interface RetakeModuleProps {
  retakes: ThiLaiHocLai[];
  students: SinhVien[];
  subjects?: MonHoc[];
  userRole: UserRole;
  currentStudentCode?: string;
  onRegisterRetake: (data: { maSV: string; maMH: string; loaiDangKy: 'THI_LAI' | 'HOC_LAI'; hocKy: string; namHoc: string; phiDiem?: number }) => void;
  onApproveRetake: (id: string, status: string, phiDiem?: number) => void;
  onDeleteRetake?: (id: string) => Promise<void>;
}
export const RetakeModule: React.FC<RetakeModuleProps> = ({
  retakes,
  students,
  subjects = [],
  userRole,
  currentStudentCode,
  onRegisterRetake,
  onApproveRetake,
  onDeleteRetake,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [tempFee, setTempFee] = useState<number>(0);
  const defaultMaSV = (userRole === 'STUDENT' && currentStudentCode) ? currentStudentCode : (students[0]?.maSV || 'sv2024001');
  const [form, setForm] = useState<{
    maSV: string;
    maMH: string;
    loaiDangKy: 'THI_LAI' | 'HOC_LAI';
    hocKy: string;
    namHoc: string;
    phiDiem: number;
  }>({
    maSV: defaultMaSV,
    maMH: subjects[0]?.maMH || 'MATH101',
    loaiDangKy: 'THI_LAI',
    hocKy: 'HK2',
    namHoc: '2026-2027',
    phiDiem: userRole === 'STUDENT' ? 0 : 250000,
  });
  const handleOpenModal = () => {
    setForm((prev) => ({
      ...prev,
      maSV: (userRole === 'STUDENT' && currentStudentCode) ? currentStudentCode : (students[0]?.maSV || 'sv2024001'),
      maMH: subjects[0]?.maMH || 'MATH101',
      phiDiem: userRole === 'STUDENT' ? 0 : 250000,
    }));
    setIsModalOpen(true);
  };
  const handleLoaiDangKyChange = (loai: 'THI_LAI' | 'HOC_LAI') => {
    setForm((prev) => ({
      ...prev,
      loaiDangKy: loai,
      phiDiem: userRole === 'STUDENT' ? 0 : (loai === 'THI_LAI' ? 250000 : 1350000),
    }));
  };
  const filteredRetakes = retakes.filter((r) => {
    return (
      r.maSV.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tenMH.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.hoTenSV && r.hoTenSV.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });
  const handleSubmitRegister = (e: React.FormEvent) => {
    e.preventDefault();
    onRegisterRetake({
      ...form,
      phiDiem: Number(form.phiDiem) || 0,
    });
    setIsModalOpen(false);
  };
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Quản lý Đăng ký Thi lại & Học lại</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Đăng ký thi cải thiện/thi lại, đóng lệ phí thi và duyệt kết quả thi của Phòng Đào tạo
          </p>
        </div>
        <button
          id="btn-register-retake"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tạo Đăng ký Thi lại / Học lại
        </button>
      </div>
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            id="search-retake-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã SV, Tên SV, Môn học..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 uppercase font-semibold border-b border-zinc-200 dark:border-zinc-700">
              <tr>
                <th className="p-3.5">Mã SV & Tên SV</th>
                <th className="p-3.5">Môn học đăng ký</th>
                <th className="p-3.5">Loại đăng ký</th>
                <th className="p-3.5">Lệ phí</th>
                <th className="p-3.5">Trạng thái duyệt</th>
                <th className="p-3.5">Kết quả thi</th>
                {(userRole === 'ADMIN' || userRole === 'LECTURER') && <th className="p-3.5 text-right">Duyệt hồ sơ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {filteredRetakes.length > 0 ? (
                filteredRetakes.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-zinc-900 dark:text-white">{r.hoTenSV || 'Sinh viên'}</div>
                      <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">{r.maSV}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold">{r.tenMH}</div>
                      <div className="text-[11px] text-zinc-500">
                        Mã HP: {r.maMH}  {r.hocKy} ({r.namHoc})
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.loaiDangKy === 'THI_LAI'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                        }`}
                      >
                        {r.loaiDangKy === 'THI_LAI' ? 'Thi lại' : 'Học lại'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-zinc-900 dark:text-white">
                      {editingFeeId === r.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={10000}
                            value={tempFee}
                            onChange={(e) => setTempFee(Number(e.target.value) || 0)}
                            className="w-28 p-1 bg-white dark:bg-zinc-800 border border-blue-500 rounded text-xs font-mono font-bold"
                            placeholder="Số tiền VNĐ"
                          />
                          <button
                            onClick={() => {
                              onApproveRetake(r.id, r.trangThai, tempFee);
                              setEditingFeeId(null);
                            }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] rounded font-bold cursor-pointer"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingFeeId(null)}
                            className="px-2 py-1 bg-zinc-200 dark:bg-zinc-700 text-[10px] rounded cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {(!r.phiDiem || r.phiDiem === 0) ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                              Chờ Admin iền phí
                            </span>
                          ) : (
                            <span>{formatVND(r.phiDiem)}</span>
                          )}
                          {(userRole === 'ADMIN' || userRole === 'LECTURER') && (
                            <button
                              onClick={() => {
                                setEditingFeeId(r.id);
                                setTempFee(r.phiDiem || 0);
                              }}
                              className="text-[10px] text-blue-600 hover:text-blue-500 font-bold hover:underline opacity-90 cursor-pointer ml-1"
                              title="Cập nhật / Điền học phí cho sinh viên"
                            >
                              {(!r.phiDiem || r.phiDiem === 0) ? '[+ Điền học phí]' : '[Sửa lệ phí]'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.trangThai === 'DA_DUYET'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {r.trangThai === 'DA_DUYET' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Đã duyệt
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-500" />
                            Chờ duyệt
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {r.ketQua === 'DAT' ? (
                        <span className="font-bold text-emerald-600">ĐẠT (PASSED)</span>
                      ) : r.ketQua === 'CHUA_DAT' ? (
                        <span className="font-bold text-red-600">CHƯA ĐẠT</span>
                      ) : (
                        <span className="text-zinc-400 font-italic">Chưa thi</span>
                      )}
                    </td>
                    {(userRole === 'ADMIN' || userRole === 'LECTURER') && (
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.trangThai === 'CHO_DUYET' && (
                            <button
                              onClick={() => onApproveRetake(r.id, 'DA_DUYET')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                            >
                              Duyệt
                            </button>
                          )}
                          {onDeleteRetake && (
                            <button
                              onClick={async () => {
                                if (window.confirm(`s️ Bạn có chắc chắn mun xóa đơn đăng ký thi lại/học lại môn ${r.tenMH} của ${r.hoTenSV || r.maSV}?`)) {
                                  await onDeleteRetake(r.id);
                                }
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg border border-red-200 dark:border-red-800 transition-all cursor-pointer"
                              title="Xóa đơn đăng ký này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                    Chưa có đăng ký thi lại/học lại nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              Đăng ký Trực tuyến Thi lại / Học lại
            </h3>
            <form onSubmit={handleSubmitRegister} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Sinh viên đăng ký *</label>
                {userRole === 'STUDENT' ? (
                  <input
                    type="text"
                    disabled
                    value={`${form.maSV} - ${students.find((s) => s.maSV === form.maSV)?.hoTen || ''}`}
                    className="w-full p-2.5 bg-zinc-100 dark:bg-zinc-800 border rounded-xl font-semibold text-zinc-700 dark:text-zinc-300"
                  />
                ) : (
                  <select
                    value={form.maSV}
                    onChange={(e) => setForm({ ...form, maSV: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                    required
                  >
                    {students.map((s) => (
                      <option key={s.maSV} value={s.maSV}>
                        {s.maSV} - {s.hoTen} ({s.lop})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="font-semibold block mb-1">Môn học đăng ký *</label>
                <select
                  value={form.maMH}
                  onChange={(e) => setForm({ ...form, maMH: e.target.value })}
                  className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  required
                >
                  {subjects.map((m) => (
                    <option key={m.maMH} value={m.maMH}>
                      {m.maMH} - {m.tenMH} ({m.soTinChi} Tín chỉ)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Hình thức đăng ký</label>
                  <select
                    value={form.loaiDangKy}
                    onChange={(e) => handleLoaiDangKyChange(e.target.value as 'THI_LAI' | 'HOC_LAI')}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl font-semibold"
                  >
                    <option value="THI_LAI">Thi lại</option>
                    <option value="HOC_LAI">Học lại</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Học kỳ đăng ký</label>
                  <select
                    value={form.hocKy}
                    onChange={(e) => setForm({ ...form, hocKy: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800 border rounded-xl"
                  >
                    <option value="HK1">HK1</option>
                    <option value="HK2">HK2</option>
                  </select>
                </div>
              </div>
              {userRole === 'STUDENT' ? (
                <div className="p-3 bg-blue-50/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl text-blue-900 dark:text-blue-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Lưu ý về Lệ phí Học phí</span>
                  </div>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                    Sinh viên ch thực hiện đăng ký thông tin môn học. Số tiền học phí/lệ phí thi lại của môn này sẽ do <strong>Admin / Phòng Đào tạo</strong> kiểm tra và định mức sau khi xét duyệt đơn đăng ký.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="font-semibold block mb-1 text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                    <span>Mức lệ phí đăng ký (VNĐ) *</span>
                    <span className="text-[10px] text-amber-600 font-normal">(Admin / Đào tạo iền)</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      step={10000}
                      required
                      value={form.phiDiem}
                      onChange={(e) => setForm({ ...form, phiDiem: Number(e.target.value) || 0 })}
                      placeholder="Nhập mức lệ phí thi lại / học lại..."
                      className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono font-bold text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    Số tiền ấn nh: <span className="font-bold">{formatVND(form.phiDiem)}</span>
                  </p>
                </div>
              )}
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800"
                >
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  Xác nhận Đăng ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

