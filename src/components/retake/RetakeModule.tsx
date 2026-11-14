import React, { useState } from 'react';
import { ThiLaiHocLai, SinhVien, UserRole, MonHoc } from '../../types';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  DollarSign,
  AlertTriangle,
  X,
  Send,
  Trash2,
  BookOpen,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';

interface RetakeModuleProps {
  retakes: ThiLaiHocLai[];
  students: SinhVien[];
  subjects?: MonHoc[];
  userRole: UserRole;
  currentStudentCode?: string;
  onRegisterRetake: (data: {
    maSV: string;
    maMH: string;
    loaiDangKy: 'THI_LAI' | 'HOC_LAI';
    hocKy: string;
    namHoc: string;
    phiDiem?: number;
  }) => void;
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

  // In-modal delete confirmation state (Zero window.confirm)
  const [deletingRetake, setDeletingRetake] = useState<ThiLaiHocLai | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const isStudent = userRole === 'STUDENT';
  const defaultMaSV =
    isStudent && currentStudentCode ? currentStudentCode : students[0]?.maSV || 'sv2024001';

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
    phiDiem: 0,
  });

  const handleOpenModal = () => {
    setForm((prev) => ({
      ...prev,
      maSV: isStudent && currentStudentCode ? currentStudentCode : students[0]?.maSV || 'sv2024001',
      maMH: subjects[0]?.maMH || 'MATH101',
      phiDiem: 0,
    }));
    setIsModalOpen(true);
  };

  const handleLoaiDangKyChange = (loai: 'THI_LAI' | 'HOC_LAI') => {
    setForm((prev) => ({
      ...prev,
      loaiDangKy: loai,
    }));
  };

  const filteredRetakes = retakes.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.maSV.toLowerCase().includes(term) ||
      r.tenMH.toLowerCase().includes(term) ||
      (r.hoTenSV && r.hoTenSV.toLowerCase().includes(term)) ||
      r.maMH.toLowerCase().includes(term)
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

  const handleConfirmDelete = async () => {
    if (!deletingRetake || !onDeleteRetake) return;
    setIsDeleting(true);
    try {
      await onDeleteRetake(deletingRetake.id);
      setDeletingRetake(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Đăng Ký Thi Lại & Học Lại"
        icon={RotateCcw}
        actions={
          <button
            id="btn-register-retake"
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Đơn Đăng Ký</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-retake-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã SV, Tên SV, Mã môn học, Tên môn học..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Mã SV & Họ Tên</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Môn Học Đăng Ký</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Hình Thức</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Lệ Phí (VNĐ)</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Trạng Thái Duyệt</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Kết Quả Thi</th>
                <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredRetakes.length > 0 ? (
                filteredRetakes.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white text-xs">
                        {r.hoTenSV || 'Sinh viên'}
                      </div>
                      <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                        {r.maSV}
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{r.tenMH}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Mã HP: {r.maMH} · {r.hocKy} ({r.namHoc})
                      </div>
                    </td>

                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          r.loaiDangKy === 'THI_LAI'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                        }`}
                      >
                        {r.loaiDangKy === 'THI_LAI' ? 'Thi lại' : 'Học lại'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-xs">
                      {editingFeeId === r.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={10000}
                            value={tempFee}
                            onChange={(e) => setTempFee(Number(e.target.value) || 0)}
                            className="w-24 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-500 rounded text-xs font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onApproveRetake(r.id, r.trangThai, tempFee);
                              setEditingFeeId(null);
                            }}
                            className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] rounded font-bold cursor-pointer"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFeeId(null)}
                            className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-[11px] rounded cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {!r.phiDiem || r.phiDiem === 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px] bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              Chờ định mức phí
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {formatVND(r.phiDiem)}
                            </span>
                          )}
                          {!isStudent && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFeeId(r.id);
                                setTempFee(r.phiDiem || 0);
                              }}
                              className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer ml-1"
                              title="Cập nhật mức phí đào tạo"
                            >
                              {!r.phiDiem || r.phiDiem === 0 ? '[+ Điền phí]' : '[Sửa phí]'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                          r.trangThai === 'DA_DUYET'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {r.trangThai === 'DA_DUYET' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Đã duyệt</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Chờ duyệt</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {r.ketQua === 'DAT' ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ĐẠT (PASSED)
                        </span>
                      ) : r.ketQua === 'CHUA_DAT' ? (
                        <span className="font-bold text-rose-600 dark:text-rose-400">CHƯA ĐẠT</span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa có điểm</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isStudent && r.trangThai === 'CHO_DUYET' && (
                          <button
                            type="button"
                            onClick={() => onApproveRetake(r.id, 'DA_DUYET')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] cursor-pointer shadow-xs transition-colors"
                          >
                            Duyệt đơn
                          </button>
                        )}

                        {onDeleteRetake && (
                          <button
                            type="button"
                            onClick={() => setDeletingRetake(r)}
                            className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                            title="Xóa đơn đăng ký này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                      <span className="text-xs font-medium">Chưa có đơn đăng ký thi lại hoặc học lại nào</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RETAKE REGISTRATION MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md p-5 max-w-md w-full shadow-2xl relative space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Đăng Ký Thi Lại / Học Lại
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Sinh viên đăng ký *
                </label>
                {isStudent ? (
                  <input
                    type="text"
                    disabled
                    value={`${form.maSV} - ${
                      students.find((s) => s.maSV === form.maSV)?.hoTen || ''
                    }`}
                    className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-semibold text-slate-700 dark:text-slate-300"
                  />
                ) : (
                  <select
                    value={form.maSV}
                    onChange={(e) => setForm({ ...form, maSV: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Môn học đăng ký *
                </label>
                <select
                  value={form.maMH}
                  onChange={(e) => setForm({ ...form, maMH: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    Hình thức đăng ký
                  </label>
                  <select
                    value={form.loaiDangKy}
                    onChange={(e) =>
                      handleLoaiDangKyChange(e.target.value as 'THI_LAI' | 'HOC_LAI')
                    }
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="THI_LAI">Thi lại</option>
                    <option value="HOC_LAI">Học lại</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    Học kỳ áp dụng
                  </label>
                  <select
                    value={form.hocKy}
                    onChange={(e) => setForm({ ...form, hocKy: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="HK1">HK1</option>
                    <option value="HK2">HK2</option>
                  </select>
                </div>
              </div>

              {isStudent ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded text-blue-900 dark:text-blue-200 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Lưu ý về Lệ phí đào tạo</span>
                  </div>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                    Sinh viên thực hiện gửi phiếu đăng ký. Mức học phí hoặc lệ phí thi lại sẽ do{' '}
                    <strong>Phòng Đào tạo</strong> định mức và thông báo sau khi xét duyệt hồ sơ.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    Mức lệ phí quy định (VNĐ)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
                    <input
                      type="number"
                      step={10000}
                      min={0}
                      value={form.phiDiem === 0 ? '' : form.phiDiem}
                      onChange={(e) => setForm({ ...form, phiDiem: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                      placeholder="Số tiền do Admin quy định..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-1">
                    Số tiền do Admin quy định: <span className="font-bold text-blue-700 dark:text-blue-300">{form.phiDiem > 0 ? formatVND(form.phiDiem) : 'Chưa quy định'}</span>
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Xác nhận Đăng ký</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-MODAL DELETE CONFIRMATION (Zero window.confirm) */}
      {deletingRetake && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900/80 rounded-md p-5 max-w-sm w-full shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Xác Nhận Hủy Đơn Đăng Ký
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn hủy đơn đăng ký{' '}
              <strong className="text-slate-900 dark:text-white">
                {deletingRetake.loaiDangKy === 'THI_LAI' ? 'thi lại' : 'học lại'} môn{' '}
                {deletingRetake.tenMH}
              </strong>{' '}
              của sinh viên{' '}
              <strong className="text-slate-900 dark:text-white font-mono">
                {deletingRetake.maSV}
              </strong>
              ?
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingRetake(null)}
                className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Giữ lại
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 text-xs rounded bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Đang hủy...' : 'Xác Nhận Hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
