# Redesign Reference Screen: AppShell, Topbar, Sidebar & Quản lý Sinh viên

Thiết lập màn hình chuẩn (Reference Screen) khóa ngôn ngữ thị giác chuyên nghiệp, đậm chất học thuật ("Professional Academic Administration System") cho toàn bộ hệ thống quản lý sinh viên hiện tại, tập trung vào cấu trúc AppShell, thanh Topbar, thanh điều hướng Sidebar và trang Danh sách Sinh viên với mật độ dữ liệu cao, phẳng, tinh tế và không mang phong cách AI Dashboard thông thường.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Căn cứ vào các lựa chọn mặc định được đề xuất từ turn trước và yêu cầu khóa visual language nghiêm ngặt từ người dùng:
> - **Mật độ dữ liệu bảng (Table Density)**: Sử dụng mật độ gọn (Compact 36px–40px/dòng), tối ưu xem nhiều bản ghi trên máy tính để bàn (Desktop-First), số liệu dùng `font-mono tabular-nums`.
> - **Bảng màu chủ đạo (Color Palette)**: Deep Academic Navy (`#1d4ed8` - Xanh trường đại học truyền thống, nền Slate 50 `#f8fafc`, bề mặt trắng tinh khiết `#ffffff`, Sidebar trung tính đậm `#0f172a`), không dùng gradient tím/xanh AI hay glassmorphism.
> - **Cơ chế xem chi tiết (Master-Detail)**: Sử dụng Side Drawer (trượt mượt mà từ cạnh phải màn hình, rộng 440px) để xem nhanh lý lịch và thông tin sinh viên mà không làm mất ngữ cảnh bảng dữ liệu đang lọc.
> - **Bảo toàn 100% dữ liệu & API**: Giữ nguyên toàn bộ database, dữ liệu thật, API endpoint và phân quyền hiện tại. Không chèn bất kỳ mock data hay bản ghi mẫu nào.

---

## 1. Overview & Core Concept

- **Mục tiêu**: Xây dựng màn hình mẫu (Reference Screen) bao gồm AppShell (khung giao diện tổng thể), Topbar (thanh điều hướng trên cùng), Sidebar (thanh danh mục nghiệp vụ bên trái) và Module Danh sách Sinh viên. Màn hình này đóng vai trò tiêu chuẩn thị giác mẫu mực để đối chiếu và áp dụng cho các module còn lại trong các giai đoạn sau.
- **Đối tượng sử dụng**: Cán bộ quản lý đào tạo, giảng viên và sinh viên thực hiện tác vụ tra cứu, quản lý hồ sơ và cập nhật thông tin hằng ngày.
- **Giá trị cốt lõi**:
  - **Academic & Structured**: Trật tự, nghiêm túc, thứ bậc rõ ràng.
  - **Dense & Fast**: Mật độ thông tin cao, dễ quét mắt, thao tác nhanh.
  - **Anti-AI Dashboard**: Loại bỏ hoàn toàn 4 KPI cards trang trí, gradient neon, pill buttons bo tròn quá mức, và các hiệu ứng bóng mờ lơ lửng.

---

## 2. User Experience & Visual Design

### A. AppShell & Topbar Contract
- **Cấu trúc 1 dòng, 3 phân vùng chuẩn mực (Gap-8)**:
  - **Vùng 1 (Brand Wordmark)**: Logo trường + Tên hệ thống "TDNU EduAdmin" thanh lịch, không gắn tag phụ hay subtitle rườm rà.
  - **Vùng 2 (Ngữ cảnh Đào tạo)**: Bộ chuyển đổi Học kỳ/Năm học hiện hành gọn gàng dạng segmented control phẳng.
  - **Vùng 3 (Thao tác Người dùng)**: Chuông thông báo (hiển thị số đếm tinh tế), Switcher giao diện Sáng/Tối và Avatar người dùng với menu dropdown tài khoản.
- **Chiều cao Topbar**: 52px cố định, phẳng, đường phân cách hairline 1px (`border-b border-slate-200 dark:border-slate-800`), loại bỏ toàn bộ hiệu ứng mờ kính (`backdrop-blur`).

### B. Sidebar Nghiệp vụ (Academic Navigation)
- **Độ rộng**: 240px khi mở rộng, 64px khi thu gọn (`isCollapsed`), nền trung tính tối (`#0f172a`), chữ sáng dịu (`text-slate-300`).
- **Phân nhóm nghiệp vụ theo tiêu chuẩn đại học**:
  - `TỔNG QUAN`: Báo cáo & Thống kê
  - `QUẢN LÝ SINH VIÊN`: Sinh viên & Lớp học, Môn học
  - `ĐÀO TẠO & HỌC TẬP`: Thời khóa biểu, Bảng điểm GPA, Thi lại/Học lại
  - `ĐIỂM RÈN LUYỆN`: Sổ điểm rèn luyện, Xét duyệt, Cán bộ lớp, Khiếu nại
  - `HỆ THỐNG` (Chỉ hiện cho `ADMIN`): Người dùng & Phân quyền, Import Excel, Sao lưu, Nhật ký Audit Logs.
- **Trạng thái Active**: Nền `bg-blue-600/15 text-blue-400 border-l-2 border-blue-500`, không dùng bóng đổ hay bo tròn dạng viên thuốc.

### C. DataToolbar & Cascading Filter
- Tích hợp liền mạch phía trên bảng dữ liệu:
  - `[🔍 Tìm kiếm MSSV, họ tên, email...]`
  - `[Khoa đào tạo ▾]` $\rightarrow$ `[Lớp sinh hoạt ▾]` $\rightarrow$ `[Trạng thái đào tạo ▾]`
  - `Filter Chips`: Hiển thị các tiêu chí đang lọc kèm nút `(×)` để hủy nhanh.
  - `Group Action Buttons` (bên phải): `[Xuất Excel]` (secondary), `[+ Thêm sinh viên]` (primary - duy nhất một nút nổi bật).

### D. DataTable Sinh viên (Trung tâm Dữ liệu)
- **Header cố định (`sticky top-0`)**: Nền `bg-slate-100 dark:bg-slate-800/90`, chữ hoa cỡ nhỏ 11.5px, `tracking-wider`.
- **Cột dữ liệu chuẩn**:
  - `[ ]` Checkbox chọn dòng.
  - `Mã SV`: Căn trái, `font-mono font-medium text-blue-700 dark:text-blue-400`.
  - `Họ và tên`: Kèm avatar nhỏ (24px) và họ tên đầy đủ, nhấp vào để mở Drawer.
  - `Giới tính`: Nam / Nữ (text trơn).
  - `Ngày sinh`: Định dạng DD/MM/YYYY chuẩn.
  - `Lớp sinh hoạt`: Tên lớp chính quy.
  - `Khoa đào tạo`: Tên khoa phụ trách.
  - `Số điện thoại`: Số điện thoại liên hệ (`font-mono`).
  - `Trạng thái`: StatusBadge phẳng (`Đang học` - xanh lá, `Bảo lưu` - vàng cam, `Tốt nghiệp` - xanh dương).
  - `Thao tác`: Nút văn bản trực quan `[Chi tiết]` `[Sửa]` `[Xóa]` (không lạm dụng icon trơ trọi).
- **Phân trang (Pagination Bar)**: Hiển thị rõ `"Hiển thị 1 - 25 trong tổng số 42 sinh viên"`, bộ chọn số dòng/trang (25, 50, 100) và nút điều hướng trang chuẩn.

### E. Master-Detail Side Drawer
- Khi nhấp vào sinh viên: Trượt êm ái từ phải sang với độ rộng 440px, nền trắng/slate-900, hiển thị:
  - Header: Họ tên, Mã số sinh viên, Avatar, Lớp, Khoa.
  - Tab 1: Lý lịch cá nhân & Liên hệ (Email, SĐT, Địa chỉ, Ngày nhập học).
  - Tab 2: Hồ sơ đính kèm (File nhập học, CCCD, minh chứng).
  - Nút đóng `[X]` hoặc nhấp ra ngoài để đóng, phím `Esc` hỗ trợ accessibility.

---

## 3. Key Product Decisions & Trade-Offs

- **Quyết định 1: Loại bỏ Card bao quanh Table**
  - *Phương án chọn*: Đặt Data Table trực tiếp trên nền trắng có viền hairline 1px bao ngoài, bỏ hoàn toàn lớp Card bo tròn `rounded-3xl` và bóng đổ đa tầng.
  - *Lý do*: Tối ưu 100% diện tích màn hình để hiển thị số lượng cột và hàng tối đa, phong cách phần mềm nghiệp vụ chuẩn.
- **Quyết định 2: Master-Detail Side Drawer thay vì Modal giữa màn hình**
  - *Phương án chọn*: Side Drawer mở từ bên phải.
  - *Lý do*: Giúp người quản trị đối chiếu thông tin sinh viên mà không bị mất dấu vị trí dòng đang xem trong danh sách lớn.
- **Quyết định 3: Thay thế Pill Badges bằng Text Metadata + Dấu phân cách**
  - *Phương án chọn*: Trạng thái và metadata hiển thị dạng text tinh tế có dấu chấm `·` hoặc khung viền 1px bo góc nhẹ 4px, tuyệt đối không dùng candy pill.

---

## 4. Technical Architecture & Data Strategy

### Component Hierarchy & Interaction Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│ AppShell (max-w-full, h-screen flex flex-col, bg-slate-50)             │
├────────────────────────────────────────────────────────────────────────┤
│ Topbar (h-52px, flex items-center justify-between, border-b)           │
│  ├─ Brand Wordmark ("TDNU EduAdmin")                                   │
│  ├─ Academic Semester Selector ("HK1 / 2026-2027")                     │
│  └─ User Actions (Notifications, Theme Toggle, Account Menu)           │
├────────────────────────────────────────────────────────────────────────┤
│ Workspace Body (flex-1 flex overflow-hidden)                           │
│  ├─ Sidebar (w-60 / w-16 collapsed, bg-slate-900, flex flex-col)       │
│  │   ├─ Nav Groups (Tổng quan, QL Sinh viên, Đào tạo, Rèn luyện...)     │
│  │   └─ Collapse/Expand Toggle Button                                  │
│  │                                                                     │
│  └─ Main Content Area (flex-1 flex flex-col overflow-y-auto p-6)       │
│      └─ StudentProfileModule (Reference Screen View)                   │
│          ├─ Page Header (Tiêu đề 20px, Breadcrumb, Actions)           │
│          ├─ DataToolbar (Search Input, Dropdowns, Filter Chips)        │
│          ├─ DataTable (Sticky Header, Compact Rows, Selection, Actions)│
│          ├─ PaginationBar (Showing x-y of z, Page Buttons)             │
│          │                                                             │
│          └─ StudentDetailDrawer (Slide-over from right, w-440px)       │
│              ├─ Header Profile Info                                    │
│              ├─ Detailed Contact & Academic Meta                       │
│              └─ Attached Documents List                                │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

| Tên Component | Trách nhiệm | Nguồn dữ liệu & Handlers |
| :--- | :--- | :--- |
| `src/components/Header.tsx` | Thanh Topbar phẳng, gọn, chuyển học kỳ và profile | Nhận props `currentUser`, `activeSemester`, `onChangeSemester`, `onLogout`. |
| `src/components/Sidebar.tsx` | Thanh menu phân cấp theo vai trò (`MAIN_MENU_ITEMS`) | Nhận props `currentView`, `onSelectView`, `userRole`, hỗ trợ collapse. |
| `src/components/profile/StudentProfileModule.tsx` | Bảng danh sách sinh viên, thanh công cụ tìm kiếm, lọc khoa/lớp | Sử dụng dữ liệu `students` thật từ API, các hàm `onAddStudent`, `onUpdateStudent`, `onDeleteStudent`. |
| `src/components/profile/StudentDetailDrawer.tsx` | Side panel hiển thị chi tiết hồ sơ sinh viên được chọn | Quản lý state `selectedStudentForDrawer: SinhVien \| null`. |

---

## 5. Verification Plan

- **Kiểm tra biên dịch & Lint**: Chạy `compile_applet` và `lint_applet` để bảo đảm zero TypeScript errors.
- **Kiểm tra giao diện thực tế (Visual Verification)**:
  - Topbar: Đạt chuẩn 52px, phẳng, không gradient, không glassmorphism.
  - Sidebar: Phân nhóm rõ ràng, active state tinh tế, collapse mượt mà.
  - Bảng sinh viên: Mật độ compact 36px, header sticky, hiển thị đầy đủ các cột và font số liệu `tabular-nums`.
  - Drawer chi tiết: Mở êm ái khi click vào dòng sinh viên, đóng chuẩn xác khi bấm `Esc` hoặc nút đóng.
- **Kiểm tra tính toàn vẹn dữ liệu**: Xác nhận các chức năng thêm, sửa, xóa, tìm kiếm, lọc khoa/lớp và tải hồ sơ sinh viên hoạt động nguyên vẹn 100%.
