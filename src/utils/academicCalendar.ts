export type AcademicSemesterCode = 'HK1' | 'HK2';

export interface AcademicPeriod {
  semester: AcademicSemesterCode;
  academicYear: string;
  code: string;
}

export function getAcademicPeriod(
  date = new Date(),
  configuredSemesters: Array<{ hocKyID: string; namHocID: string; ngayBatDau?: string; ngayKetThuc?: string }> = [],
  configuredYears: Array<{ namHocID: string; tenNamHoc: string }> = []
): AcademicPeriod {
  const configured = configuredSemesters.find((semester) => {
    if (!semester.ngayBatDau || !semester.ngayKetThuc) return false;
    const start = new Date(`${semester.ngayBatDau}T00:00:00`);
    const end = new Date(`${semester.ngayKetThuc}T23:59:59`);
    return date >= start && date <= end;
  });

  if (configured) {
    const semester = configured.hocKyID.toUpperCase().includes('2') ? 'HK2' : 'HK1';
    const academicYear = configuredYears.find((year) => year.namHocID === configured.namHocID)?.tenNamHoc
      || configured.namHocID.replace(/^NH/i, '')
      || `${date.getFullYear()}-${date.getFullYear() + 1}`;
    return { semester, academicYear, code: `${semester}-${academicYear}` };
  }

  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const academicStartYear = month >= 8 ? year : year - 1;
  const semester: AcademicSemesterCode = month >= 8 ? 'HK1' : 'HK2';
  const academicYear = `${academicStartYear}-${academicStartYear + 1}`;

  return {
    semester,
    academicYear,
    code: `${semester}-${academicYear}`,
  };
}

export function getPreviousAcademicYear(date = new Date()): string {
  const { academicYear } = getAcademicPeriod(date);
  const startYear = Number(academicYear.slice(0, 4));
  return `${startYear - 1}-${startYear}`;
}
