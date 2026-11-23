import React, { useState, useRef } from 'react';
import { Clock, Printer, Download, BookOpen, Calendar, Info } from 'lucide-react';
import { triggerPrintWithFallback, downloadPrintableHtml } from '../../utils/printHelper';

export const OfficialSchoolScheduleView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule24' | 'timeSlots'>('schedule24');
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    setPrintNotice(null);
    triggerPrintWithFallback({
      element: printSheetRef.current,
      title: activeTab === 'schedule24' ? 'Thời khóa biểu 24 tuần chuẩn' : 'Khung thời gian biểu đào tạo',
      filename: `TDNU_TKB_${activeTab}.html`,
      landscape: activeTab === 'schedule24',
      onFallback: () => {
        setPrintNotice(
          'Khung xem trước đang chặn hộp thoại in trực tiếp. Đã tự động tải xuống tệp bản in (.html) — mở tệp và nhấn Ctrl+P để in hoặc lưu PDF.'
        );
      },
    });
  };

  const handleDownloadHtml = () => {
    const ok = downloadPrintableHtml(printSheetRef.current, {
      title: activeTab === 'schedule24' ? 'Thời khóa biểu 24 tuần chuẩn' : 'Khung thời gian biểu đào tạo',
      filename: `TDNU_TKB_${activeTab}.html`,
      landscape: activeTab === 'schedule24',
    });
    if (ok) {
      setPrintNotice('Đã tải xuống tệp bản in (.html). Mở tệp và nhấn Ctrl+P để in hoặc lưu PDF.');
    }
  };

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100 font-sans">
      <div className="no-print bg-white dark:bg-slate-900 p-3 rounded-md border border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('schedule24');
                setPrintNotice(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'schedule24'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Bảng TKB 24 Tuần Chuẩn (HK1 2026-2027)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('timeSlots');
                setPrintNotice(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'timeSlots'
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Khung Thời Gian Biểu Đào Tạo (Lý thuyết / Thực hành)
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              Tải bản in (HTML)
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              In Mẫu Văn Bản
            </button>
          </div>
        </div>
        {printNotice && (
          <div
            role="status"
            className="flex items-center gap-2 p-2 rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-xs text-blue-900 dark:text-blue-200"
          >
            <Info className="w-4 h-4 shrink-0 text-blue-700 dark:text-blue-400" />
            <span>{printNotice}</span>
          </div>
        )}
      </div>
      <div ref={printSheetRef} className="print-page">
      {activeTab === 'timeSlots' && (
        <div className="bg-white text-black p-6 md:p-8 rounded-md border border-slate-300 font-serif max-w-6xl mx-auto space-y-6">
          <div className="text-center space-y-1 border-b border-slate-300 pb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">TỔNG CỤC HẬU CẦN - KỸ THUẬT</h4>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">TRƯỜNG SĨ QUAN KỸ THUẬT QUÂN SỰ</h3>
            <div className="pt-3 pb-1">
              <h1 className="text-2xl font-black uppercase text-slate-950 tracking-wider">THỜI KHÓA BIỂU</h1>
              <h2 className="text-lg font-bold uppercase text-slate-800">HỌC KỲ 1 - NĂM HỌC 2026 - 2027</h2>
            </div>
            <p className="text-xs italic text-slate-600">
              (Ban hành kèm theo Quyết định số 561/QĐ-SQKT ngày 2 tháng 7 năm 2026 của Hiệu trưởng Trường Sĩ quan Kỹ thuật quân sự)
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 font-sans">
            <div className="border border-slate-950 p-4 space-y-3 bg-slate-50/50 rounded-md">
              <div className="font-bold text-sm text-slate-900 italic font-serif">Lý thuyết:</div>
              <div className="text-center font-bold text-xs bg-slate-200 py-1.5 uppercase border border-slate-400">
                THỜI GIAN BIỂU ĐÀO TẠO
              </div>
              <div className="grid grid-cols-2 border border-slate-400 text-xs text-center font-bold bg-slate-100">
                <div className="p-1 border-r border-slate-400 uppercase">BUỔI SÁNG (Tiết 1 - 5: 07h00 - 11h00)</div>
                <div className="p-1 uppercase">BUỔI CHIỀU (Tiết 7 - 9: 13h30 - 16h00)</div>
              </div>
              <div className="grid grid-cols-2 border-x border-b border-slate-400 text-xs">
                <div className="border-r border-slate-400">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="border-b border-slate-400 bg-slate-100 font-bold text-[11px]">
                        <th className="p-1 border-r border-slate-300">Tiết</th>
                        <th className="p-1 border-r border-slate-300">Giờ vào</th>
                        <th className="p-1 border-r border-slate-300">Giờ ra</th>
                        <th className="p-1">Giải lao</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-[11px]">
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Tiết 1</td>
                        <td className="p-1.5 border-r border-slate-300">07h 00'</td>
                        <td className="p-1.5 border-r border-slate-300">07h 45'</td>
                        <td className="p-1.5 font-semibold text-blue-700">05 phút</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Tiết 2</td>
                        <td className="p-1.5 border-r border-slate-300">07h 50'</td>
                        <td className="p-1.5 border-r border-slate-300">08h 35'</td>
                        <td className="p-1.5 text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Tiết 3</td>
                        <td className="p-1.5 border-r border-slate-300">08h 35'</td>
                        <td className="p-1.5 border-r border-slate-300">09h 20'</td>
                        <td className="p-1.5 font-semibold text-blue-700">10 phút</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Tiết 4</td>
                        <td className="p-1.5 border-r border-slate-300">09h 30'</td>
                        <td className="p-1.5 border-r border-slate-300">10h 15'</td>
                        <td className="p-1.5 text-slate-400">-</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Tiết 5</td>
                        <td className="p-1.5 border-r border-slate-300">10h 15'</td>
                        <td className="p-1.5 border-r border-slate-300">11h 00'</td>
                        <td className="p-1.5 text-slate-500 font-medium">Hết sáng</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="border-b border-slate-400 bg-slate-100 font-bold text-[11px]">
                        <th className="p-1 border-r border-slate-300">Tiết</th>
                        <th className="p-1 border-r border-slate-300">Giờ vào</th>
                        <th className="p-1 border-r border-slate-300">Giờ ra</th>
                        <th className="p-1">Giải lao</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-[11px]">
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Tiết 7</td>
                        <td className="p-1.5 border-r border-slate-300">13h 30'</td>
                        <td className="p-1.5 border-r border-slate-300">14h 15'</td>
                        <td className="p-1.5 font-semibold text-blue-700">05 phút</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Tiết 8</td>
                        <td className="p-1.5 border-r border-slate-300">14h 20'</td>
                        <td className="p-1.5 border-r border-slate-300">15h 05'</td>
                        <td className="p-1.5 font-semibold text-blue-700">10 phút</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Tiết 9</td>
                        <td className="p-1.5 border-r border-slate-300">15h 15'</td>
                        <td className="p-1.5 border-r border-slate-300">16h 00'</td>
                        <td className="p-1.5 text-slate-500 font-medium">Hết chiều</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-[11px] text-slate-800 pt-1 text-left font-serif space-y-1 bg-amber-50/80 p-2.5 rounded border border-amber-200">
                <div className="font-bold text-amber-900 flex items-center gap-1">
                  <span>🚩 Quy định Chào cờ sáng Thứ 2:</span>
                </div>
                <div className="text-slate-700 leading-relaxed space-y-0.5">
                  <div>• <strong className="font-semibold text-slate-900">Thứ 2 hàng tuần:</strong> Chào cờ Tiểu đoàn (07:00 - 07:45), học từ <strong className="text-blue-900 font-bold">Tiết 2 (07:50)</strong>.</div>
                  <div>• <strong className="font-semibold text-slate-900">Thứ 2 đầu tháng:</strong> Chào cờ Nhà trường (07:00 - 08:35 tại Sân chào cờ), học từ <strong className="text-blue-900 font-bold">Tiết 3 (08:35)</strong>.</div>
                </div>
              </div>
            </div>
            <div className="border border-slate-950 p-4 space-y-3 bg-slate-50/50 rounded-md">
              <div className="font-bold text-sm text-slate-900 italic font-serif">Thực hành:</div>
              <div className="text-center font-bold text-xs bg-slate-200 py-1.5 uppercase border border-slate-400">
                THỜI GIAN BIỂU ĐÀO TẠO
              </div>
              <div className="grid grid-cols-2 border border-slate-400 text-xs text-center font-bold bg-slate-100">
                <div className="p-1 border-r border-slate-400 uppercase">BUỔI SÁNG</div>
                <div className="p-1 uppercase">BUỔI CHIỀU</div>
              </div>
              <div className="grid grid-cols-2 border-x border-b border-slate-400 text-xs">
                <div className="border-r border-slate-400">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="border-b border-slate-400 bg-slate-100 font-bold text-[11px]">
                        <th className="p-1 border-r border-slate-300">Ca</th>
                        <th className="p-1 border-r border-slate-300">Giờ vào</th>
                        <th className="p-1 border-r border-slate-300">Giờ ra</th>
                        <th className="p-1">Giải lao</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-[11px]">
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Ca 1</td>
                        <td className="p-1.5 border-r border-slate-300">7h 00'</td>
                        <td className="p-1.5 border-r border-slate-300">08h 45'</td>
                        <td className="p-1.5 font-semibold text-blue-700">20 phút</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Ca 2</td>
                        <td className="p-1.5 border-r border-slate-300">9h 05'</td>
                        <td className="p-1.5 border-r border-slate-300">10h 50'</td>
                        <td className="p-1.5 text-slate-400">"</td>
                      </tr>
                      <tr className="bg-amber-50">
                        <td className="p-1.5 font-bold border-r border-slate-300 text-amber-900">VSCN</td>
                        <td className="p-1.5 border-r border-slate-300">10h 50'</td>
                        <td className="p-1.5 border-r border-slate-300">11h 00'</td>
                        <td className="p-1.5 text-amber-800 font-medium">10 phút</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="border-b border-slate-400 bg-slate-100 font-bold text-[11px]">
                        <th className="p-1 border-r border-slate-300">Ca</th>
                        <th className="p-1 border-r border-slate-300">Giờ vào</th>
                        <th className="p-1 border-r border-slate-300">Giờ ra</th>
                        <th className="p-1">Giải lao</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-[11px]">
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Ca 3</td>
                        <td className="p-1.5 border-r border-slate-300">13h 30'</td>
                        <td className="p-1.5 border-r border-slate-300">14h 30'</td>
                        <td className="p-1.5 font-semibold text-blue-700">10 phút</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold border-r border-slate-300">Ca 4</td>
                        <td className="p-1.5 border-r border-slate-300">14h 40'</td>
                        <td className="p-1.5 border-r border-slate-300">15h 40'</td>
                        <td className="p-1.5 text-slate-400">"</td>
                      </tr>
                      <tr className="bg-amber-50">
                        <td className="p-1.5 font-bold border-r border-slate-300 text-amber-900">VSCN</td>
                        <td className="p-1.5 border-r border-slate-300">15h 40'</td>
                        <td className="p-1.5 border-r border-slate-300">16h 00'</td>
                        <td className="p-1.5 text-amber-800 font-medium">20 phút</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-[11px] italic text-slate-700 pt-1 text-center font-serif">
                Ca 1, Thứ 2 hàng tuần bắt đầu từ <strong className="font-bold">7h45'</strong> (sau chào cờ tiểu đoàn)
              </div>
            </div>
          </div>
          <div className="text-right text-xs font-bold uppercase font-serif text-slate-800 pt-4">
            TP. HỒ CHÍ MINH, THÁNG 7 NĂM 2026
          </div>
        </div>
      )}
      {activeTab === 'schedule24' && (
        <div className="bg-white text-black p-4 md:p-6 rounded-md border border-slate-300 font-sans space-y-5 overflow-x-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-300 pb-3 gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800 font-serif">
                TRƯỜNG ĐẠI HỌC TRẦN ĐẠI NGHĨA - PHÒNG ĐÀO TẠO
              </h4>
              <h1 className="text-lg md:text-xl font-black uppercase text-slate-950 font-serif tracking-tight mt-0.5">
                THỜI KHÓA BIỂU HỌC KỲ 1 - NĂM HỌC 2026 - 2027
              </h1>
            </div>
            <div className="text-xs font-mono font-bold bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-md">
              Sĩ số: 29 | Mẫu QĐ 561
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium bg-slate-50 p-2.5 rounded-md border border-slate-200">
            <div><span className="font-bold text-slate-600">Khóa:</span> Theo danh mục lớp</div>
            <div><span className="font-bold text-slate-600">Lớp:</span> Theo lớp đang chọn</div>
            <div><span className="font-bold text-slate-600">Khoa chuyên ngành:</span> Khoa Kỹ thuật cơ sở / Khoa Ô tô</div>
            <div><span className="font-bold text-slate-600">Thời gian:</span> 03/08/2026 - 17/01/2027</div>
          </div>
          <div className="overflow-x-auto border border-slate-950 text-[10px] leading-tight">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-200 font-bold border-b border-slate-800">
                  <th className="p-1 border-r border-slate-800 w-12">TUẦN</th>
                  {Array.from({ length: 24 }, (_, i) => (
                    <th key={i + 1} className="p-1 border-r border-slate-800 min-w-[38px] text-[10px]">
                      {i + 1}
                    </th>
                  ))}
                </tr>
                <tr className="bg-slate-100 font-semibold border-b border-slate-800 text-[9px]">
                  <th className="p-1 border-r border-slate-800">NGÀY</th>
                  {Array.from({ length: 24 }, (_, i) => {
                    const mon = new Date(2026, 7, 3 + i * 7);
                    const sat = new Date(2026, 7, 3 + i * 7 + 5);
                    const formatPart = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
                    return (
                      <th key={i} className="p-0.5 border-r border-slate-800 whitespace-nowrap text-[8px] font-mono">
                        {`${formatPart(mon)}-${formatPart(sat)}`}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr className="border-b border-slate-800">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-800">THỨ 2</td>
                  <td colSpan={5} className="bg-emerald-50 text-emerald-950 font-bold border-r border-slate-800 p-1">CCTT</td>
                  <td className="bg-emerald-50 text-emerald-950 font-bold border-r border-slate-800 p-1">CCTT</td>
                  <td colSpan={3} className="bg-emerald-50 text-emerald-950 font-bold border-r border-slate-800 p-1">CCTT</td>
                  <td className="bg-emerald-50 text-emerald-950 font-bold border-r border-slate-800 p-1">CCTT</td>
                  <td colSpan={7} className="bg-emerald-50 text-emerald-950 font-bold border-r border-slate-800 p-1">CCTT</td>
                  <td className="bg-emerald-50 text-emerald-950 font-bold border-r border-slate-800 p-1">CCTT</td>
                  <td colSpan={6} className="bg-emerald-50 text-emerald-950 font-bold border-r border-slate-800 p-1">CCTT</td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-800">THỨ 3</td>
                  <td colSpan={4} className="border-r border-slate-800 p-1 font-semibold text-blue-900 bg-blue-50/60">
                    25DSK407<br/><span className="text-[9px] text-slate-600">H1.302</span>
                  </td>
                  <td className="bg-amber-100 text-amber-900 font-bold border-r border-slate-800 p-1">
                    [Nghỉ Lễ 2/9]
                  </td>
                  <td className="bg-amber-50 text-amber-900 font-bold border-r border-slate-800 p-1">
                    Khai giảng
                  </td>
                  <td colSpan={10} className="border-r border-slate-800 p-1 font-semibold text-blue-900 bg-blue-50/60">
                    25DSK407 / 25DSK308<br/><span className="text-[9px] text-slate-600">H1.302</span>
                  </td>
                  <td className="bg-amber-100 text-amber-900 font-bold border-r border-slate-800 p-1">
                    [VHVN]
                  </td>
                  <td colSpan={6} className="border-r border-slate-800 p-1 font-semibold text-blue-900 bg-blue-50/60">
                    25DSK308<br/><span className="text-[9px] text-slate-600">H1.302</span>
                  </td>
                  <td className="bg-green-300 text-green-950 font-black border-r border-slate-800 p-1">
                    25DSK308 [Thi]
                  </td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-800">THỨ 4</td>
                  <td colSpan={9} className="border-r border-slate-800 p-1 font-semibold text-slate-800">
                    BHBR / NPP(d)
                  </td>
                  <td colSpan={7} className="border-r border-slate-800 p-1 font-semibold text-blue-900 bg-blue-50/60">
                    25DSK203 (SB) / 25DSK308 (H1.302)
                  </td>
                  <td colSpan={8} className="border-r border-slate-800 p-1 font-semibold text-blue-900 bg-blue-50/60">
                    25DSK203 (SB)
                  </td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-800">THỨ 5</td>
                  <td colSpan={9} className="border-r border-slate-800 p-1 font-semibold text-blue-900 bg-blue-50/60">
                    Tổng kết / 25DSK305 (H1.302) / NPP(K)
                  </td>
                  <td className="bg-green-300 text-green-950 font-black border-r border-slate-800 p-1">
                    25DSK305 [Thi]
                  </td>
                  <td colSpan={13} className="border-r border-slate-800 p-1 font-semibold text-blue-900 bg-blue-50/60">
                    25DSK405 (H2.302) / 25DSK308 (H1.302)
                  </td>
                  <td className="bg-green-300 text-green-950 font-black border-r border-slate-800 p-1">
                    25DSK405 [Thi]
                  </td>
                </tr>
                <tr className="border-b border-slate-800">
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-800">THỨ 6</td>
                  <td colSpan={15} className="border-r border-slate-800 p-1 font-semibold text-blue-900 bg-blue-50/60">
                    25DSK303 (H1.206)
                  </td>
                  <td className="bg-amber-100 text-amber-900 font-bold border-r border-slate-800 p-1">
                    [Nhà giáo VN]
                  </td>
                  <td colSpan={3} className="border-r border-slate-800 p-1 font-semibold text-blue-900 bg-blue-50/60">
                    25DSK303 (H1.206)
                  </td>
                  <td className="bg-green-300 text-green-950 font-black border-r border-slate-800 p-1">
                    25DSK303 [Thi]
                  </td>
                  <td className="bg-amber-100 text-amber-900 font-bold border-r border-slate-800 p-1">
                    [Tết DL]
                  </td>
                  <td colSpan={2} className="border-r border-slate-800 p-1 font-semibold text-blue-900 bg-blue-50/60">
                    25DSK203 (SB)
                  </td>
                  <td className="bg-green-300 text-green-950 font-black border-r border-slate-800 p-1">
                    25DSK203 [Thi]
                  </td>
                </tr>
                <tr>
                  <td className="p-1 font-bold bg-slate-100 border-r border-slate-800">THỨ 7</td>
                  <td colSpan={24} className="p-1 font-semibold text-slate-600 bg-slate-50">
                    Ngoại khóa toàn khóa học
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="pt-2 space-y-2">
            <h3 className="text-xs font-bold uppercase text-slate-900 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              DANH SÁCH MÔN HỌC TRONG HỌC KỲ 1 (2026 - 2027)
            </h3>
            <div className="overflow-x-auto border border-slate-300 rounded-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-10 text-center">STT</th>
                    <th className="p-2 border-r border-slate-300 w-24">Ký hiệu</th>
                    <th className="p-2 border-r border-slate-300">Tên Môn Học</th>
                    <th className="p-2 border-r border-slate-300 w-16 text-center">ĐVHT</th>
                    <th className="p-2 border-r border-slate-300 w-16 text-center">Số tiết</th>
                    <th className="p-2">Giáo viên giảng dạy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2 text-center font-bold">1</td>
                    <td className="p-2 font-mono font-bold text-blue-800">25DSK407</td>
                    <td className="p-2 font-bold">Cơ kỹ thuật</td>
                    <td className="p-2 text-center font-bold">4</td>
                    <td className="p-2 text-center">60</td>
                    <td className="p-2 text-slate-700">Tuấn Anh, Mr.Cảnh, Quốc Ngọc, Quốc Quý, Đề Tài, Minh Tuấn, Thế Vân</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-bold">2</td>
                    <td className="p-2 font-mono font-bold text-blue-800">25DSK305</td>
                    <td className="p-2 font-bold">Giải tích 2</td>
                    <td className="p-2 text-center font-bold">3</td>
                    <td className="p-2 text-center">45</td>
                    <td className="p-2 text-slate-700">Minh Trung, Hoài Nhân</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-bold">3</td>
                    <td className="p-2 font-mono font-bold text-blue-800">25DSK308</td>
                    <td className="p-2 font-bold">Hóa đại cương</td>
                    <td className="p-2 text-center font-bold">3</td>
                    <td className="p-2 text-center">45</td>
                    <td className="p-2 text-slate-700">Xuân Vy, Trần Q. Trung</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-bold">4</td>
                    <td className="p-2 font-mono font-bold text-blue-800">25DSK303</td>
                    <td className="p-2 font-bold">Tiếng Anh 3</td>
                    <td className="p-2 text-center font-bold">3</td>
                    <td className="p-2 text-center">90</td>
                    <td className="p-2 text-slate-700">Hồng Hạnh, Xuân Quang, Anh Tuấn</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-bold">5</td>
                    <td className="p-2 font-mono font-bold text-blue-800">25DSK406</td>
                    <td className="p-2 font-bold">Dung sai - Kỹ thuật đo</td>
                    <td className="p-2 text-center font-bold">2</td>
                    <td className="p-2 text-center">30</td>
                    <td className="p-2 text-slate-700">Tuấn Nghĩa, Quốc Định, Đức Thuận, Đức Trọng</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-bold">6</td>
                    <td className="p-2 font-mono font-bold text-blue-800">25DSK203</td>
                    <td className="p-2 font-bold">Giáo dục thể chất 3</td>
                    <td className="p-2 text-center font-bold">3</td>
                    <td className="p-2 text-center">90</td>
                    <td className="p-2 text-slate-700">Hồng Ninh</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-bold">7</td>
                    <td className="p-2 font-mono font-bold text-blue-800">25DSK436</td>
                    <td className="p-2 font-bold">Thí nghiệm kỹ thuật đo lường cơ khí</td>
                    <td className="p-2 text-center font-bold">1</td>
                    <td className="p-2 text-center">30</td>
                    <td className="p-2 text-slate-700">Trọng Quyết, Văn Nhân, Đức Thuận</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-center font-bold">8</td>
                    <td className="p-2 font-mono font-bold text-blue-800">25DSK405</td>
                    <td className="p-2 font-bold">Vẽ kỹ thuật cơ khí (nâng cao)</td>
                    <td className="p-2 text-center font-bold">2</td>
                    <td className="p-2 text-center">45</td>
                    <td className="p-2 text-slate-700">Văn Nhân, Tuấn Nghĩa, Văn Phi, Hồng Thanh</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-between items-end pt-6 text-xs font-serif text-slate-900">
            <div className="italic text-slate-600">
              * Ghi chú: CCTT: Chào cờ tiểu đoàn; BHBR: Bảo hiểm bảo dưỡng xe; NPP: Nghiên cứu phương pháp.
            </div>
            <div className="text-center font-serif space-y-1">
              <div className="font-bold">TL. HIỆU TRƯỞNG</div>
              <div className="font-bold uppercase">TRƯỞNG PHÒNG ĐÀO TẠO</div>
              <div className="h-12"></div>
              <div className="font-bold text-sm">TS. Nguyễn Mạnh Hùng</div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

