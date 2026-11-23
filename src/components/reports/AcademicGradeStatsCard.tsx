import React, { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, XCircle, Layers, Users } from 'lucide-react';
import { Diem, SinhVien } from '../../types';
import { convertGradeScale, getAcademicClassification } from '../../utils/gradeHelper';
import { EmptyState, StatusBadge } from '../common';

interface AcademicGradeStatsCardProps {
  students: SinhVien[];
  grades: Diem[];
  attentionCount: number;
  semesterLabel?: string;
}

interface ScoreMilestoneRow {
  key: string;
  score4: number;
  score4Label: string;
  letter: string;
  range10: string;
  isPassed: boolean;
  count: number;
  percentage: number;
  barClass: string;
}

interface ClassificationRow {
  key: string;
  label: string;
  range4: string;
  isPassed: boolean;
  count: number;
  percentage: number;
  barClass: string;
}

const SCORE_MILESTONE_DEFINITIONS: Array<{
  key: string;
  score4: number;
  score4Label: string;
  letter: string;
  range10: string;
  isPassed: boolean;
  barClass: string;
}> = [
  { key: '4.0', score4: 4.0, score4Label: '4.0', letter: 'A', range10: '8.5 – 10.0', isPassed: true, barClass: 'bg-emerald-600' },
  { key: '3.5', score4: 3.5, score4Label: '3.5', letter: 'B+', range10: '8.0 – 8.4', isPassed: true, barClass: 'bg-teal-600' },
  { key: '3.0', score4: 3.0, score4Label: '3.0', letter: 'B', range10: '7.0 – 7.9', isPassed: true, barClass: 'bg-blue-600' },
  { key: '2.5', score4: 2.5, score4Label: '2.5', letter: 'C+', range10: '6.5 – 6.9', isPassed: true, barClass: 'bg-indigo-500' },
  { key: '2.0', score4: 2.0, score4Label: '2.0', letter: 'C', range10: '5.5 – 6.4', isPassed: true, barClass: 'bg-amber-500' },
  { key: '1.5', score4: 1.5, score4Label: '1.5', letter: 'D+', range10: '5.0 – 5.4', isPassed: true, barClass: 'bg-orange-500' },
  { key: '1.0', score4: 1.0, score4Label: '1.0', letter: 'D', range10: '4.0 – 4.9', isPassed: true, barClass: 'bg-slate-500' },
  { key: '0.0', score4: 0.0, score4Label: '0.0', letter: 'F', range10: '< 4.0', isPassed: false, barClass: 'bg-rose-600' },
];

function resolveScore4(grade: Diem): number | null {
  if (typeof grade.diemThang4 === 'number' && !Number.isNaN(grade.diemThang4)) {
    return Math.round(grade.diemThang4 * 100) / 100;
  }
  if (typeof grade.diemTongKet10 === 'number' && !Number.isNaN(grade.diemTongKet10)) {
    return convertGradeScale(grade.diemTongKet10).thang4;
  }
  return null;
}

function resolveMilestoneKey(score4: number): string {
  if (score4 >= 3.75) return '4.0';
  if (score4 >= 3.25) return '3.5';
  if (score4 >= 2.75) return '3.0';
  if (score4 >= 2.25) return '2.5';
  if (score4 >= 1.75) return '2.0';
  if (score4 >= 1.25) return '1.5';
  if (score4 >= 1.0) return '1.0';
  return '0.0';
}

function calcPercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export const AcademicGradeStatsCard: React.FC<AcademicGradeStatsCardProps> = ({
  students,
  grades,
  attentionCount,
  semesterLabel,
}) => {
  const [tableView, setTableView] = useState<'MILESTONES' | 'CLASSIFICATION'>('MILESTONES');

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalClasses = new Set(students.map((s) => s.lop).filter(Boolean)).size;

    const normalizedGrades: Array<{
      maSV: string;
      score4: number;
      score10: number | null;
      credits: number;
      milestoneKey: string;
      isPassed: boolean;
    }> = [];

    grades.forEach((g) => {
      const score4 = resolveScore4(g);
      if (score4 === null) return;
      const score10 =
        typeof g.diemTongKet10 === 'number' && !Number.isNaN(g.diemTongKet10)
          ? g.diemTongKet10
          : null;
      const credits = g.soTinChi && g.soTinChi > 0 ? g.soTinChi : 3;
      const isPassed = score4 >= 1.0;
      normalizedGrades.push({
        maSV: (g.maSV || '').toLowerCase(),
        score4,
        score10,
        credits,
        milestoneKey: resolveMilestoneKey(score4),
        isPassed,
      });
    });

    const totalGrades = normalizedGrades.length;
    if (totalGrades === 0) {
      return {
        hasData: false,
        totalClasses,
        totalStudents,
        evaluatedStudentsCount: 0,
        totalGrades: 0,
        avgGPA4: null as number | null,
        avgGPA10: null as number | null,
        passedGradesCount: 0,
        failedGradesCount: 0,
        passRate: 0,
        failRate: 0,
        classificationCounts: {
          xuatSac: 0,
          gioi: 0,
          kha: 0,
          trungBinhKha: 0,
          trungBinh: 0,
          yeu: 0,
          kem: 0,
        },
        classificationRows: [] as ClassificationRow[],
        milestoneRows: [] as ScoreMilestoneRow[],
      };
    }

    let passedGradesCount = 0;
    let failedGradesCount = 0;
    let sum4 = 0;
    let sum10 = 0;
    let count10 = 0;

    const milestoneCounts = new Map<string, number>();
    SCORE_MILESTONE_DEFINITIONS.forEach((m) => milestoneCounts.set(m.key, 0));

    // Group grades by student to calculate official GPA (Hệ 4) per student for classification (XS, Giỏi, Khá, ...)
    const studentGpaMap = new Map<
      string,
      { weighted4: number; totalCredits: number }
    >();

    normalizedGrades.forEach((item) => {
      if (item.isPassed) passedGradesCount++;
      else failedGradesCount++;

      sum4 += item.score4;
      if (item.score10 !== null) {
        sum10 += item.score10;
        count10++;
      }

      milestoneCounts.set(
        item.milestoneKey,
        (milestoneCounts.get(item.milestoneKey) || 0) + 1
      );

      if (item.maSV) {
        const entry = studentGpaMap.get(item.maSV) || { weighted4: 0, totalCredits: 0 };
        entry.weighted4 += item.score4 * item.credits;
        entry.totalCredits += item.credits;
        studentGpaMap.set(item.maSV, entry);
      }
    });

    const classificationCounts = {
      xuatSac: 0,
      gioi: 0,
      kha: 0,
      trungBinhKha: 0,
      trungBinh: 0,
      yeu: 0,
      kem: 0,
    };

    studentGpaMap.forEach((entry) => {
      if (entry.totalCredits <= 0) return;
      const gpa4 = Math.round((entry.weighted4 / entry.totalCredits) * 100) / 100;
      const rank = getAcademicClassification(gpa4, entry.totalCredits);
      if (rank === 'Xuất sắc') classificationCounts.xuatSac++;
      else if (rank === 'Giỏi') classificationCounts.gioi++;
      else if (rank === 'Khá') classificationCounts.kha++;
      else if (rank === 'Trung bình Khá') classificationCounts.trungBinhKha++;
      else if (rank === 'Trung bình') classificationCounts.trungBinh++;
      else if (rank === 'Yếu') classificationCounts.yeu++;
      else if (rank === 'Kém') classificationCounts.kem++;
    });

    const evaluatedStudentsCount = studentGpaMap.size;

    const milestoneRows: ScoreMilestoneRow[] = SCORE_MILESTONE_DEFINITIONS.map((def) => {
      const count = milestoneCounts.get(def.key) || 0;
      return {
        ...def,
        count,
        percentage: calcPercent(count, totalGrades),
      };
    });

    const classificationRows: ClassificationRow[] = [
      {
        key: 'XS',
        label: 'Xuất sắc',
        range4: '3.60 – 4.00',
        isPassed: true,
        count: classificationCounts.xuatSac,
        percentage: calcPercent(classificationCounts.xuatSac, evaluatedStudentsCount),
        barClass: 'bg-emerald-600',
      },
      {
        key: 'GIOI',
        label: 'Giỏi',
        range4: '3.20 – 3.59',
        isPassed: true,
        count: classificationCounts.gioi,
        percentage: calcPercent(classificationCounts.gioi, evaluatedStudentsCount),
        barClass: 'bg-blue-600',
      },
      {
        key: 'KHA',
        label: 'Khá',
        range4: '2.80 – 3.19',
        isPassed: true,
        count: classificationCounts.kha,
        percentage: calcPercent(classificationCounts.kha, evaluatedStudentsCount),
        barClass: 'bg-indigo-500',
      },
      {
        key: 'TBK',
        label: 'Trung bình Khá',
        range4: '2.40 – 2.79',
        isPassed: true,
        count: classificationCounts.trungBinhKha,
        percentage: calcPercent(classificationCounts.trungBinhKha, evaluatedStudentsCount),
        barClass: 'bg-amber-500',
      },
      {
        key: 'TB',
        label: 'Trung bình',
        range4: '2.00 – 2.39',
        isPassed: true,
        count: classificationCounts.trungBinh,
        percentage: calcPercent(classificationCounts.trungBinh, evaluatedStudentsCount),
        barClass: 'bg-orange-500',
      },
      {
        key: 'YEU',
        label: 'Yếu (Đạt tối thiểu)',
        range4: '1.00 – 1.99',
        isPassed: true,
        count: classificationCounts.yeu,
        percentage: calcPercent(classificationCounts.yeu, evaluatedStudentsCount),
        barClass: 'bg-slate-500',
      },
      {
        key: 'KEM',
        label: 'Chưa đạt (Kém)',
        range4: '< 1.00',
        isPassed: false,
        count: classificationCounts.kem,
        percentage: calcPercent(classificationCounts.kem, evaluatedStudentsCount),
        barClass: 'bg-rose-600',
      },
    ];

    return {
      hasData: true,
      totalClasses,
      totalStudents,
      evaluatedStudentsCount,
      totalGrades,
      avgGPA4: Math.round((sum4 / totalGrades) * 100) / 100,
      avgGPA10: count10 > 0 ? Math.round((sum10 / count10) * 100) / 100 : null,
      passedGradesCount,
      failedGradesCount,
      passRate: calcPercent(passedGradesCount, totalGrades),
      failRate: calcPercent(failedGradesCount, totalGrades),
      classificationCounts,
      classificationRows,
      milestoneRows,
    };
  }, [students, grades]);

  const xsRate = calcPercent(stats.classificationCounts.xuatSac, stats.evaluatedStudentsCount);
  const gioiRate = calcPercent(stats.classificationCounts.gioi, stats.evaluatedStudentsCount);
  const khaRate = calcPercent(stats.classificationCounts.kha, stats.evaluatedStudentsCount);
  const tbYeuCount =
    stats.classificationCounts.trungBinhKha +
    stats.classificationCounts.trungBinh +
    stats.classificationCounts.yeu;
  const tbYeuRate = calcPercent(tbYeuCount, stats.evaluatedStudentsCount);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 p-4 space-y-3.5">
      {/* Header đồng bộ phong cách thẻ Điểm rèn luyện */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Thống kê kết quả học tập (Hệ 4){semesterLabel ? ` · ${semesterLabel}` : ''}
          </h2>
          <StatusBadge label={`${stats.totalClasses} lớp`} variant="info" />
          <StatusBadge label={`${stats.totalStudents} SV`} variant="neutral" />
          {stats.hasData && (
            <StatusBadge label={`${stats.totalGrades} lượt điểm`} variant="success" />
          )}
          {attentionCount > 0 && (
            <StatusBadge label={`${attentionCount} cần chú ý`} variant="danger" />
          )}
        </div>

        {stats.hasData && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 dark:text-slate-300 font-mono tabular-nums">
            <span>
              TB Hệ 4:{' '}
              <strong className="text-blue-700 dark:text-blue-400">
                {stats.avgGPA4 !== null ? stats.avgGPA4.toFixed(2) : '—'}
              </strong>
            </span>
            <span>
              TB Hệ 10:{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {stats.avgGPA10 !== null ? stats.avgGPA10.toFixed(2) : '—'}
              </strong>
            </span>
            <span>
              SV có điểm:{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {stats.evaluatedStudentsCount}/{stats.totalStudents}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Dải quy mô lớp & sinh viên luôn hiển thị trung thực */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">
              Tổng số lớp
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {stats.totalClasses}
            </span>
          </div>
          <Layers className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase block">
              Tổng sinh viên
            </span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {stats.totalStudents}
            </span>
          </div>
          <Users className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        <div className="p-2.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase block">
              Đạt yêu cầu (Hệ 4 ≥ 1.0)
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold text-emerald-900 dark:text-emerald-100 font-mono tabular-nums">
                {stats.hasData ? stats.passedGradesCount : '—'}
              </span>
              {stats.hasData && (
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                  ({stats.passRate.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>

        <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase block">
              Chưa đạt (Hệ 4 &lt; 1.0)
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-base font-bold text-rose-900 dark:text-rose-100 font-mono tabular-nums">
                {stats.hasData ? stats.failedGradesCount : '—'}
              </span>
              {stats.hasData && (
                <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 font-mono tabular-nums">
                  ({stats.failRate.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
        </div>
      </div>

      {stats.hasData ? (
        <>
          {/* Khối ô xếp loại học lực kiểu tương đồng với Điểm rèn luyện */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase block">
                Xuất sắc (3.6–4.0)
              </span>
              <span className="text-base font-bold text-emerald-900 dark:text-emerald-100 font-mono tabular-nums mt-1 block">
                {stats.classificationCounts.xuatSac} SV
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                {xsRate.toFixed(1)}%
              </span>
            </div>

            <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center">
              <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300 uppercase block">
                Giỏi (3.2–3.59)
              </span>
              <span className="text-base font-bold text-blue-900 dark:text-blue-100 font-mono tabular-nums mt-1 block">
                {stats.classificationCounts.gioi} SV
              </span>
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 font-mono tabular-nums">
                {gioiRate.toFixed(1)}%
              </span>
            </div>

            <div className="p-3 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center">
              <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 uppercase block">
                Khá (2.8–3.19)
              </span>
              <span className="text-base font-bold text-indigo-900 dark:text-indigo-100 font-mono tabular-nums mt-1 block">
                {stats.classificationCounts.kha} SV
              </span>
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 font-mono tabular-nums">
                {khaRate.toFixed(1)}%
              </span>
            </div>

            <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase block">
                TB Khá / TB / Yếu (1.0–2.79)
              </span>
              <span className="text-base font-bold text-amber-900 dark:text-amber-100 font-mono tabular-nums mt-1 block">
                {tbYeuCount} SV
              </span>
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 font-mono tabular-nums">
                {tbYeuRate.toFixed(1)}%
              </span>
            </div>

            <div className="p-3 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase block">
                Chưa đạt (&lt; 1.0)
              </span>
              <span className="text-base font-bold text-rose-900 dark:text-rose-100 font-mono tabular-nums mt-1 block">
                {stats.failedGradesCount} lượt
              </span>
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 font-mono tabular-nums">
                {stats.failRate.toFixed(1)}% ({stats.classificationCounts.kem} SV)
              </span>
            </div>
          </div>

          {/* Bảng tỷ lệ chi tiết các mốc điểm & xếp loại */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {tableView === 'MILESTONES'
                  ? 'Bảng tỷ lệ chi tiết theo mốc điểm Hệ 4 (Tất cả lượt điểm)'
                  : 'Bảng tỷ lệ chi tiết xếp loại học lực sinh viên (GPA Hệ 4)'}
              </span>
              <div
                role="tablist"
                aria-label="Chế độ xem bảng thống kê điểm"
                className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-700 self-start sm:self-auto"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tableView === 'MILESTONES'}
                  onClick={() => setTableView('MILESTONES')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    tableView === 'MILESTONES'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Các mốc điểm (0.0 – 4.0)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tableView === 'CLASSIFICATION'}
                  onClick={() => setTableView('CLASSIFICATION')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    tableView === 'CLASSIFICATION'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Xếp loại GPA sinh viên
                </button>
              </div>
            </div>

            {tableView === 'MILESTONES' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Mốc Hệ 4</th>
                      <th className="py-2 px-3 text-center">Điểm chữ</th>
                      <th className="py-2 px-3 text-center">Quy đổi Hệ 10</th>
                      <th className="py-2 px-3 text-center">Yêu cầu (≥ 1.0)</th>
                      <th className="py-2 px-3 text-right">Số lượng</th>
                      <th className="py-2 px-3 text-right">Tỷ lệ (%)</th>
                      <th className="py-2 px-3 min-w-[140px]">Phân bố</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {stats.milestoneRows.map((row) => (
                      <tr
                        key={row.key}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                      >
                        <td className="py-2 px-3 font-mono font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {row.score4Label}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block min-w-[28px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                              row.isPassed
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {row.letter}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {row.range10}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <StatusBadge
                            label={row.isPassed ? 'Đạt' : 'Chưa đạt'}
                            variant={row.isPassed ? 'success' : 'danger'}
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {row.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {row.percentage.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3">
                          <div className="w-full h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded ${row.barClass}`}
                              style={{ width: `${Math.min(100, row.percentage)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100">
                    <tr>
                      <td colSpan={3} className="py-2 px-3">
                        Tổng cộng ({stats.totalClasses} lớp · {stats.totalStudents} SV)
                      </td>
                      <td className="py-2 px-3 text-center font-mono tabular-nums text-[11px] whitespace-nowrap">
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Đạt: {stats.passedGradesCount} ({stats.passRate.toFixed(1)}%)
                        </span>
                        <span className="mx-1.5 text-slate-400">·</span>
                        <span className="text-rose-700 dark:text-rose-400">
                          Chưa đạt: {stats.failedGradesCount} ({stats.failRate.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {stats.totalGrades}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        100.0%
                      </td>
                      <td className="py-2 px-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Xếp loại học lực</th>
                      <th className="py-2 px-3 text-center">Khoảng GPA (Hệ 4)</th>
                      <th className="py-2 px-3 text-center">Ngưỡng ≥ 1.0</th>
                      <th className="py-2 px-3 text-right">Số sinh viên</th>
                      <th className="py-2 px-3 text-right">Tỷ lệ (%)</th>
                      <th className="py-2 px-3 min-w-[140px]">Phân bố</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {stats.classificationRows.map((row) => (
                      <tr
                        key={row.key}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                      >
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {row.label}
                        </td>
                        <td className="py-2 px-3 text-center font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {row.range4}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <StatusBadge
                            label={row.isPassed ? 'Đạt' : 'Chưa đạt'}
                            variant={row.isPassed ? 'success' : 'danger'}
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {row.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {row.percentage.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3">
                          <div className="w-full h-2 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded ${row.barClass}`}
                              style={{ width: `${Math.min(100, row.percentage)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100">
                    <tr>
                      <td colSpan={3} className="py-2 px-3">
                        Tổng sinh viên đã có điểm ({stats.evaluatedStudentsCount}/{stats.totalStudents} SV)
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {stats.evaluatedStudentsCount}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        100.0%
                      </td>
                      <td className="py-2 px-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <EmptyState message="Chưa có dữ liệu điểm học tập trong phạm vi đang lọc." />
      )}
    </div>
  );
};
