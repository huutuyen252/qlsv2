CREATE TABLE "diem" (
	"id" text PRIMARY KEY NOT NULL,
	"ma_sv" text NOT NULL,
	"ho_ten_sv" text,
	"ma_mh" text NOT NULL,
	"ten_mh" text,
	"so_tin_chi" integer,
	"hoc_ky" text NOT NULL,
	"nam_hoc" text NOT NULL,
	"diem_chuyen_can" double precision DEFAULT 0 NOT NULL,
	"diem_giua_ky" double precision DEFAULT 0 NOT NULL,
	"diem_cuoi_ky" double precision DEFAULT 0 NOT NULL,
	"diem_tong_ket_10" double precision DEFAULT 0 NOT NULL,
	"diem_thang_4" double precision DEFAULT 0 NOT NULL,
	"diem_chu" text DEFAULT 'F' NOT NULL,
	"trang_thai" text DEFAULT 'FAILED' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mon_hoc" (
	"ma_mh" text PRIMARY KEY NOT NULL,
	"ten_mh" text NOT NULL,
	"so_tin_chi" integer NOT NULL,
	"khoa_phu_trach" text,
	"khoa" text,
	"loai_mon" text,
	"hoc_ky" text,
	"nam_hoc" text,
	"lop" text,
	"le_phi_thi_lai" integer,
	"le_phi_hoc_lai" integer
);
--> statement-breakpoint
CREATE TABLE "sinh_vien" (
	"ma_sv" text PRIMARY KEY NOT NULL,
	"ho_ten" text NOT NULL,
	"avatar" text,
	"ngay_sinh" text NOT NULL,
	"gioi_tinh" text NOT NULL,
	"lop" text NOT NULL,
	"khoa" text NOT NULL,
	"so_dien_thoai" text NOT NULL,
	"email" text NOT NULL,
	"dia_chi" text NOT NULL,
	"ho_so_file" text,
	"ho_so_file_name" text,
	"ho_so_files" jsonb,
	"ngay_nhap_hoc" text NOT NULL,
	"trang_thai" text DEFAULT 'Đang học' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"avatar" text,
	"student_code" text,
	"faculty" text,
	"status" text DEFAULT 'ACTIVE',
	"permissions" jsonb,
	"created_at" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
