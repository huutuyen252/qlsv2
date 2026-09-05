import React, { useState } from 'react';
import {
  FolderTree,
  FileCode,
  Copy,
  Check,
  Container,
} from 'lucide-react';

export const NestJsCodebaseViewer: React.FC = () => {
  const [selectedFileId, setSelectedFileId] = useState<string>('main');
  const [copied, setCopied] = useState(false);

  const codeFiles = [
    {
      id: 'main',
      path: 'src/main.ts',
      title: 'Main Bootstrap & Swagger Setup',
      language: 'typescript',
      content: `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Hệ thống Quản lý Sinh viên - NestJS REST API')
    .setDescription('Hệ thống Quản lý Sinh viên, Điểm GPA, Rèn luyện, Thời khóa biểu & Thi lại')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
  console.log('NestJS Microservice server is running on http://localhost:3000');
}
bootstrap();`,
    },
    {
      id: 'app-module',
      path: 'src/app.module.ts',
      title: 'Root App Module & PostgreSQL TypeORM Config',
      language: 'typescript',
      content: `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { SinhVienModule } from './modules/sinh-vien/sinh-vien.module';
import { DiemModule } from './modules/diem/diem.module';
import { RenLuyenModule } from './modules/ren-luyen/ren-luyen.module';
import { ThoiKhoaBieuModule } from './modules/thoi-khoa-bieu/thoi-khoa-bieu.module';
import { ThiLaiHocLaiModule } from './modules/thi-lai-hoc-lai/thi-lai-hoc-lai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'qlsv_db',
      autoLoadEntities: true,
      synchronize: false,
    }),
    AuthModule,
    SinhVienModule,
    DiemModule,
    RenLuyenModule,
    ThoiKhoaBieuModule,
    ThiLaiHocLaiModule,
  ],
})
export class AppModule {}`,
    },
    {
      id: 'entity-sv',
      path: 'src/modules/sinh-vien/entities/sinh-vien.entity.ts',
      title: 'SinhVien TypeORM Entity',
      language: 'typescript',
      content: `import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DiemEntity } from '../../diem/entities/diem.entity';

@Entity('sinh_vien')
export class SinhVienEntity {
  @PrimaryColumn({ name: 'ma_sv', length: 20 })
  maSV: string;

  @Column({ name: 'ho_ten', length: 100 })
  hoTen: string;

  @Column({ name: 'ngay_sinh', type: 'date' })
  ngaySinh: string;

  @Column({ name: 'gioi_tinh', length: 10 })
  gioiTinh: string;

  @Column({ name: 'lop', length: 50 })
  lop: string;

  @Column({ name: 'khoa', length: 100 })
  khoa: string;

  @Column({ name: 'so_dien_thoai', length: 20, nullable: true })
  soDienThoai: string;

  @Column({ name: 'email', length: 100, unique: true })
  email: string;

  @Column({ name: 'dia_chi', type: 'text', nullable: true })
  diaChi: string;

  @Column({ name: 'ho_so_file', type: 'text', nullable: true })
  hoSoFile: string;

  @Column({ name: 'trang_thai', default: 'Đang học' })
  trangThai: string;

  @OneToMany(() => DiemEntity, (diem) => diem.sinhVien)
  diems: DiemEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}`,
    },
    {
      id: 'service-sv',
      path: 'src/modules/sinh-vien/sinh-vien.service.ts',
      title: 'SinhVien Service & AWS S3 Upload Integration',
      language: 'typescript',
      content: `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SinhVienEntity } from './entities/sinh-vien.entity';
import { CreateSinhVienDto } from './dto/create-sinh-vien.dto';

@Injectable()
export class SinhVienService {
  constructor(
    @InjectRepository(SinhVienEntity)
    private readonly svRepo: Repository<SinhVienEntity>,
  ) {}

  async findAll(): Promise<SinhVienEntity[]> {
    return this.svRepo.find();
  }

  async findOne(maSV: string): Promise<SinhVienEntity> {
    const sv = await this.svRepo.findOne({ where: { maSV } });
    if (!sv) throw new NotFoundException('Không tìm thấy sinh viên');
    return sv;
  }

  async create(dto: CreateSinhVienDto): Promise<SinhVienEntity> {
    const sv = this.svRepo.create(dto);
    return this.svRepo.save(sv);
  }

  async updateScanFile(maSV: string, fileUrl: string): Promise<SinhVienEntity> {
    const sv = await this.findOne(maSV);
    sv.hoSoFile = fileUrl;
    return this.svRepo.save(sv);
  }
}`,
    },
    {
      id: 'spec-sv',
      path: 'src/modules/sinh-vien/sinh-vien.service.spec.ts',
      title: 'Jest Unit Test Suite (SinhVienService)',
      language: 'typescript',
      content: `import { Test, TestingModule } from '@nestjs/testing';
import { SinhVienService } from './sinh-vien.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SinhVienEntity } from './entities/sinh-vien.entity';

describe('SinhVienService Unit Tests', () => {
  let service: SinhVienService;
  let repoMock: any;

  beforeEach(async () => {
    repoMock = {
      find: jest.fn().mockResolvedValue([{ maSV: 'sv2024001', hoTen: 'Nguyễn Văn An' }]),
      findOne: jest.fn().mockResolvedValue({ maSV: 'sv2024001', hoTen: 'Nguyễn Văn An' }),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((sv) => Promise.resolve({ ...sv })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SinhVienService,
        { provide: getRepositoryToken(SinhVienEntity), useValue: repoMock },
      ],
    }).compile();

    service = module.get<SinhVienService>(SinhVienService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return list of students', async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].maSV).toBe('sv2024001');
  });
});`,
    },
    {
      id: 'migration',
      path: 'src/migrations/1700000000000-InitSchema.ts',
      title: 'TypeORM Database Migration File',
      language: 'typescript',
      content: `import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1700000000000 implements MigrationInterface {
    name = 'InitSchema1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(\`
            CREATE TABLE "sinh_vien" (
                "ma_sv" varchar(20) NOT NULL,
                "ho_ten" varchar(100) NOT NULL,
                "ngay_sinh" date NOT NULL,
                "gioi_tinh" varchar(10) NOT NULL,
                "lop" varchar(50) NOT NULL,
                "khoa" varchar(100) NOT NULL,
                "so_dien_thoai" varchar(20),
                "email" varchar(100) NOT NULL UNIQUE,
                "dia_chi" text,
                "ho_so_file" text,
                "trang_thai" varchar(50) NOT NULL DEFAULT 'Đang học',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_sinh_vien" PRIMARY KEY ("ma_sv")
            );

            CREATE TABLE "diem" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "ma_sv" varchar(20) NOT NULL,
                "ma_mh" varchar(20) NOT NULL,
                "hoc_ky" varchar(20) NOT NULL,
                "nam_hoc" varchar(20) NOT NULL,
                "diem_cc" numeric(4,2) NOT NULL,
                "diem_gk" numeric(4,2) NOT NULL,
                "diem_ck" numeric(4,2) NOT NULL,
                "diem_tk_10" numeric(4,2) NOT NULL,
                "diem_thang_4" numeric(3,2) NOT NULL,
                "diem_chu" varchar(5) NOT NULL,
                "trang_thai" varchar(20) NOT NULL,
                CONSTRAINT "PK_diem" PRIMARY KEY ("id"),
                CONSTRAINT "FK_diem_sinh_vien" FOREIGN KEY ("ma_sv") REFERENCES "sinh_vien"("ma_sv") ON DELETE CASCADE
            );
        \`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(\`DROP TABLE "diem"; DROP TABLE "sinh_vien";\`);
    }
}`,
    },
    {
      id: 'docker',
      path: 'Dockerfile',
      title: 'Dockerfile for NestJS Deployment',
      language: 'dockerfile',
      content: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]`,
    },
    {
      id: 'docker-compose',
      path: 'docker-compose.yml',
      title: 'Docker Compose (PostgreSQL + Redis + NestJS)',
      language: 'yaml',
      content: `version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: qlsv_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: qlsv_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  nestjs-app:
    build: .
    container_name: qlsv_nestjs
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: postgres
      DB_PASSWORD: postgrespassword
      DB_NAME: qlsv_db
      JWT_SECRET: supersecretjwtkey2025
    depends_on:
      - postgres

volumes:
  pgdata:`,
    },
  ];

  const activeFile = codeFiles.find((f) => f.id === selectedFileId) || codeFiles[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Container className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Thư mục & Mã nguồn Backend NestJS Chuẩn</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Kiến trúc Microservice chuẩn NestJS với TypeORM Entities, Controllers, Services, Migration và Dockerfile
          </p>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-all self-start sm:self-auto"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
          <span>{copied ? 'Đã sao chép mã' : 'Sao chép File này'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
            <FolderTree className="w-4 h-4 text-emerald-500" />
            Cấu trúc thư mục NestJS:
          </div>
          <div className="space-y-1">
            {codeFiles.map((file) => {
              const isActive = file.id === selectedFileId;
              return (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-mono transition-all flex items-center gap-2.5 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800 font-bold'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <FileCode className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-zinc-400'}`} />
                  <div className="truncate">
                    <div className="truncate">{file.path}</div>
                    <div className="text-[10px] text-zinc-400 font-sans truncate">{file.title}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-8 bg-zinc-950 p-5 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
              <span className="text-xs font-mono font-semibold text-emerald-400">{activeFile.path}</span>
              <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                {activeFile.language}
              </span>
            </div>
            <pre className="text-xs font-mono text-zinc-200 leading-relaxed overflow-x-auto p-2">
              <code>{activeFile.content}</code>
            </pre>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between font-mono">
            <span>Sử dụng NestJS CLI: nest g module {activeFile.id}</span>
            <span>TypeORM PostgreSQL Driver</span>
          </div>
        </div>
      </div>
    </div>
  );
};
