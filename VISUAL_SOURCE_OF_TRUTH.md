# HỆ THỐNG QUY CHUẨN GIAO DIỆN HỌC VỤ (VISUAL SOURCE OF TRUTH)
**Trường Đại học Trần Đại Nghĩa (TDNU EduAdmin)**

Tài liệu này là **Single Visual Source of Truth** bắt buộc áp dụng cho toàn bộ dự án. Mọi phân hệ (Điểm rèn luyện, Quản lý điểm số, Thời khóa biểu, Môn học, Báo cáo, Quản trị hệ thống) **phải tái sử dụng các quy chuẩn này, tuyệt đối không tự sáng tạo style mới cho từng trang**.

---

## 1. NGUYÊN TẮC QUỐC TẾ VÀ KỶ LUẬT THIẾT KẾ
- **RÕ RÀNG > TRANG TRÍ**: Mọi pixel phục vụ công việc học vụ và tra cứu dữ liệu.
- **DỮ LIỆU > CARD**: Không bao bọc mọi nội dung trong các thẻ card lớn bo tròn (`rounded-2xl`, `rounded-3xl`). Dữ liệu nằm trực tiếp trong bảng phẳng, viền hairline (`border-slate-200 dark:border-slate-800`).
- **ANTI-AI DASHBOARD**:
  - Không gradient xanh/tím neon.
  - Không glassmorphism (`backdrop-blur`).
  - Không 4 khối KPI cards với icon màu pastel.
  - Không nút bấm dạng viên thuốc (`rounded-full`) tràn lan.
  - Không hiệu ứng hover nhảy rung giật (`hover:scale-105`).
  - Không chào hỏi trang trí vô nghĩa (`Welcome back`, `Good morning`).

---

## 2. QUY CHUẨN DESIGN TOKENS

### Typography
- **Font chính**: `Be Vietnam Pro`, hệ thống sans-serif tiêu chuẩn.
- **Dữ liệu số & Mã định danh**: Luôn dùng font monospace (`font-mono`) và `tabular-nums` cho: Mã SV, Mã môn, Số điện thoại, Điểm số, Sĩ số, Ngày tháng.
- **Cấp bậc chữ**:
  - Page Title: `text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100` (18px)
  - Section Header / Group: `text-xs font-semibold uppercase tracking-wider text-slate-400` (10-11px)
  - Body / Table Cell: `text-xs font-normal text-slate-700 dark:text-slate-300` (12px)
  - Subtitle / Meta / Caption: `text-[11px] text-slate-500 dark:text-slate-400` (11px)

### Bảng màu (Color Palette)
- **Primary (Academic Navy)**: `#1d4ed8` (Blue 700), Hover: `#1e40af` (Blue 800), Nền tinh tế: `bg-blue-600/15`
- **Background**:
  - Light mode: `#f8fafc` (`bg-slate-50`)
  - Dark mode: `#020617` (`bg-slate-950`)
- **Surface**:
  - Light mode: `#ffffff` (`bg-white`)
  - Dark mode: `#0f172a` (`bg-slate-900`)
- **Border**:
  - Hairline: `border-slate-200` (Light) / `border-slate-800` (Dark)
  - Focus Ring: `focus:border-blue-600 focus:ring-1 focus:ring-blue-600`
- **Trạng thái (Semantic)**:
  - **Thành công / Đang học / Đạt**: `emerald-700` trên nền `emerald-50`, viền `emerald-300` (Dark: `emerald-400` / `emerald-950/40` / `emerald-800`)
  - **Cảnh báo / Bảo lưu / Chờ duyệt**: `amber-700` trên nền `amber-50`, viền `amber-300` (Dark: `amber-400` / `amber-950/40` / `amber-800`)
  - **Nguy hiểm / Thôi học / Trượt**: `rose-700` trên nền `rose-50`, viền `rose-300` (Dark: `rose-400` / `rose-950/40` / `rose-800`)
  - **Thông tin / Khen thưởng**: `blue-700` trên nền `blue-50`, viền `blue-300`

### Spacing & Radius
- **Border radius**:
  - Chuẩn nút bấm & ô nhập liệu: `rounded` (4px)
  - Container / Bảng / Drawer: `rounded-md` (6px)
  - TUYỆT ĐỐI không dùng `rounded-2xl` hoặc `rounded-3xl` cho panel quản trị.
- **Padding & Row Height**:
  - Table row height: 38px - 42px (compact, high-density).
  - Cell padding: `py-2.5 px-3` (10px dọc, 12px ngang).

---

## 3. THƯ VIỆN COMPONENT DÙNG CHUNG (`src/components/common`)

Mọi màn hình mới **bắt buộc REUSE** các component chuẩn:

### 1. `PageHeader` (`<PageHeader title="..." subtitle="..." icon={...} actions={...} />`)
- Chuẩn hóa thanh tiêu đề trang, biểu tượng phân hệ, mô tả ngắn và khối nút thao tác chính.

### 2. `MetricStrip` (`<MetricStrip metrics={[...]} />`)
- Thanh tóm tắt chỉ số phẳng 1 dòng, chấm trạng thái và số liệu monospace.
- Thay thế hoàn toàn các thẻ KPI card trang trí.

### 3. `DataToolbar` (`<DataToolbar searchValue={...} onSearchChange={...} filters={...} />`)
- Thanh công cụ tìm kiếm, dropdown lọc theo Khoa/Lớp/Học kỳ, và nút Xóa lọc tự động.

### 4. `StatusBadge` (`<StatusBadge label="..." variant="success" dot />`)
- Tag trạng thái viền mỏng 4px radius, chữ rõ nét, màu dịu mắt.

### 5. `DataTable` Pattern
- Vỏ bọc: `border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 overflow-hidden shadow-xs`
- Header: `sticky top-0 z-10 bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800`
- Dòng dữ liệu: `hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors py-2.5 px-3`
- Footer phân trang: `py-2 px-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-[11px]`

### 6. Side Drawer Pattern
- Dùng Drawer trượt từ cạnh phải (`w-screen max-w-md`) với nền mờ nhẹ và lắng nghe phím `Escape` để xem nhanh thông tin chi tiết thay vì cửa sổ Modal to che toàn màn hình.

---

## 4. QUY TẮC PHÁT TRIỂN TIẾP THEO
1. **REUSE**: Khi cần tiêu đề, thanh lọc, tag trạng thái, thanh số liệu -> import từ `@/components/common`.
2. **EXTEND**: Nếu component hiện tại thiếu thuộc tính, mở rộng props một cách tương thích ngược, không viết lại component mới cùng chức năng.
3. **KHÔNG TỰ TẠO MOCK DATA**: Tiếp tục tuân thủ nguyên tắc Single Source of Truth, dùng dữ liệu thật từ cơ sở dữ liệu và API đã tích hợp.
