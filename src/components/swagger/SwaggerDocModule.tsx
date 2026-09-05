import React, { useState } from 'react';
import { Code2, Play, CheckCircle2, Copy, Terminal, ExternalLink } from 'lucide-react';
export const SwaggerDocModule: React.FC = () => {
  const [activeEndpoint, setActiveEndpoint] = useState<string>('login');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const endpoints = [
    {
      id: 'login',
      method: 'POST',
      path: '/api/auth/login',
      summary: '1. Authentication API',
      description: 'Xác thực tài khoản sinh viên/giảng viên và trả về JWT Bearer Token.',
      payload: { username: 'sv2024001', password: 'sv123' },
    },
    {
      id: 'get-students',
      method: 'GET',
      path: '/api/students',
      summary: '2. Quản lý Hồ sơ Sinh viên',
      description: 'Lấy danh sách hồ sơ sinh viên có bộ lọc Khoa, Lớp và Từ khóa.',
      payload: null,
    },
    {
      id: 'import-grades',
      method: 'POST',
      path: '/api/grades/import',
      summary: '3. Import Bảng điểm từ Excel',
      description: 'Lưu mảng điểm từ file Excel vào PostgreSQL/Database.',
      payload: {
        grades: [
          {
            maSV: 'sv2024001',
            maMH: 'CNTT104',
            tenMH: 'Lập trình ReactJS',
            soTinChi: 3,
            hocKy: 'HK1',
            namHoc: '2024-2025',
            diemChuyenCan: 10,
            diemGiuaKy: 9,
            diemCuoiKy: 9.5,
          },
        ],
      },
    },
    {
      id: 'training-comment',
      method: 'PUT',
      path: '/api/training/comment',
      summary: '4. Giảng viên Nhận xét Rèn luyện',
      description: 'Giảng viên cập nhật điểm rèn luyện và nhận xét thái T học tập.',
      payload: {
        maSV: 'sv2024001',
        thang: 11,
        nam: 2024,
        diemRL: 90,
        nhanXet: 'Tích cực tham gia các hoạt Tổng nghỉiên cứu khoa học.',
        nguoiDanhGia: 'TS. Nguyễn Văn Hùng',
      },
    },
    {
      id: 'get-schedule',
      method: 'GET',
      path: '/api/schedule?maSV=sv2024001',
      summary: '5. Lấy Thời khóa biểu',
      description: 'Tra cứu thời khóa biểu môn học theo học kỳ và sinh viên.',
      payload: null,
    },
    {
      id: 'register-retake',
      method: 'POST',
      path: '/api/retakes/register',
      summary: '6. Đăng ký Thi lại / Học lại',
      description: 'Đăng ký thi lại học phần và tính toán lệ phí.',
      payload: {
        maSV: 'sv2024001',
        maMH: 'MATH101',
        loaiDangKy: 'THI_LAI',
        hocKy: 'HK2',
        namHoc: '2024-2025',
      },
    },
    {
      id: 'reports-summary',
      method: 'GET',
      path: '/api/reports/summary',
      summary: '7. Báo cáo Thống kê Tổng hợp',
      description: 'Tổng hợp tỷ lệ học lực, điểm rèn luyện và số môn nợ tín chỉ.',
      payload: null,
    },
  ];
  const currentEp = endpoints.find((e) => e.id === activeEndpoint) || endpoints[0];
  const handleRunApiTest = async () => {
    setLoading(true);
    setApiResponse(null);
    try {
      let res;
      if (currentEp.method === 'GET') {
        res = await fetch(currentEp.path);
      } else {
        res = await fetch(currentEp.path, {
          method: currentEp.method,
          headers: { 'Content-Type': 'application/json' },
          body: currentEp.payload ? JSON.stringify(currentEp.payload) : undefined,
        });
      }
      const json = await res.json();
      setApiResponse(json);
    } catch (err: any) {
      setApiResponse({ error: err.message || 'Lỗi kết nối API Server' });
    } finally {
      setLoading(false);
    }
  };
  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(currentEp.payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Code2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Swagger / OpenAPI 3.0 API Spec Explorer</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Tài liu mô tả RESTful API Backend theo tiêu chuẩn OpenAPI 3.0 & NestJS Swagger Module
          </p>
        </div>
        <a
          href="/api/docs/json"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-3.5 py-2 rounded-xl border border-purple-200 dark:border-purple-800"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Tải File OpenAPI Spec JSON</span>
        </a>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Danh sách Endpoints API:
          </label>
          {endpoints.map((ep) => {
            const isActive = ep.id === activeEndpoint;
            return (
              <button
                key={ep.id}
                onClick={() => {
                  setActiveEndpoint(ep.id);
                  setApiResponse(null);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all ${
                  isActive
                    ? 'bg-purple-50 border-purple-300 dark:bg-purple-950/50 dark:border-purple-800 shadow-sm'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      ep.method === 'GET'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : ep.method === 'POST'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="text-xs font-mono text-zinc-500 truncate">{ep.path}</span>
                </div>
                <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">{ep.summary}</div>
              </button>
            );
          })}
        </div>
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded font-mono uppercase ${
                  currentEp.method === 'GET'
                    ? 'bg-blue-100 text-blue-800'
                    : currentEp.method === 'POST'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {currentEp.method}
              </span>
              <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">{currentEp.path}</span>
            </div>
            <button
              id="btn-run-api-test"
              onClick={handleRunApiTest}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-md shadow-purple-500/20 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Đang gọi API...' : 'Chạy thử API Live'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{currentEp.description}</p>
          {currentEp.payload && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-zinc-500">Request Body JSON:</span>
                <button
                  onClick={copyPayload}
                  className="text-[11px] text-purple-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <Copy className="w-3 h-3" />
                  {copied ? 'Đã chép' : 'Chép JSON'}
                </button>
              </div>
              <pre className="bg-zinc-950 text-zinc-100 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-zinc-800">
                {JSON.stringify(currentEp.payload, null, 2)}
              </pre>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-500" />
              Response Output (JSON Live Server):
            </div>
            <div className="bg-zinc-950 text-emerald-400 p-4 rounded-xl text-xs font-mono min-h-[160px] overflow-x-auto border border-zinc-800">
              {loading ? (
                <div className="text-zinc-500 animate-pulse">Đang gửi request ến Express/NestJS Server...</div>
              ) : apiResponse ? (
                <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
              ) : (
                <span className="text-zinc-600">Nhấn nút "Chạy thử API Live" Y trên f kiểm tra response thực tế</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

