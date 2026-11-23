export const FACULTY_KTCS = 'Khoa Kỹ thuật cơ sở';
export const FACULTY_O_TO = 'Khoa Ô tô';

export const SPECIALIZED_FACULTIES = [
  FACULTY_KTCS,
  FACULTY_O_TO,
] as const;

/**
 * Normalizes whitespace in a class name without forcing hardcoded cohorts or class codes.
 */
export function normalizeClassName(rawLop: string | undefined | null): string {
  if (!rawLop) return '';
  return rawLop.trim().replace(/\s+/g, ' ');
}

/**
 * Returns the specialized faculty associated with a class name, if clearly identifiable.
 * Only recognizes the 2 specialized faculties: Khoa Kỹ thuật cơ sở and Khoa Ô tô.
 */
export function getFacultyForClass(lopName: string | undefined | null): string {
  if (!lopName) return '';
  const lower = lopName.trim().toLowerCase();
  if (
    lower.includes('kỹ thuật cơ sở') ||
    lower.includes('ky thuat co so') ||
    lower.includes('ktcs') ||
    lower.includes('cơ sở') ||
    lower.includes('co so')
  ) {
    return FACULTY_KTCS;
  }
  if (lower.includes('ô tô') || lower.includes('o to') || lower.includes('oto')) {
    return FACULTY_O_TO;
  }
  return '';
}

/**
 * Normalizes a faculty name against the 2 official specialized faculties
 * (Khoa Kỹ thuật cơ sở, Khoa Ô tô) while preserving administrative units (e.g., Phòng Đào tạo).
 */
export function normalizeFacultyName(rawKhoa: string | undefined | null, lop?: string): string {
  const trimmed = (rawKhoa || '').trim();
  if (trimmed) {
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('kỹ thuật cơ sở') ||
      lower.includes('ky thuat co so') ||
      lower.includes('ktcs') ||
      lower.includes('cơ khí') ||
      lower.includes('co khi')
    ) {
      return FACULTY_KTCS;
    }
    if (lower.includes('ô tô') || lower.includes('o to') || lower.includes('oto')) {
      return FACULTY_O_TO;
    }
    return trimmed;
  }
  if (lop) {
    return getFacultyForClass(lop);
  }
  return '';
}

/**
 * Checks if two class strings refer to the same class, case-insensitively.
 */
export function isSameClass(lopA: string | undefined | null, lopB: string | undefined | null): boolean {
  if (!lopA && !lopB) return true;
  if (!lopA || !lopB) return false;
  return normalizeClassName(lopA).toLowerCase() === normalizeClassName(lopB).toLowerCase();
}

/**
 * Returns a deduplicated list of real class names strictly from student records.
 * Never injects hardcoded classes or cohorts.
 */
export function getUniqueClassesFromStudents(students: { lop?: string }[]): string[] {
  const set = new Set<string>();
  students.forEach((s) => {
    if (s.lop) {
      const norm = normalizeClassName(s.lop);
      if (norm) set.add(norm);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
}

/**
 * Returns the major associated with a class name, if identifiable from the 2 specialized faculties.
 */
export function getMajorForClass(lopName: string | undefined | null): string {
  if (!lopName) return '';
  const lower = lopName.trim().toLowerCase();
  if (
    lower.includes('kỹ thuật cơ sở') ||
    lower.includes('ky thuat co so') ||
    lower.includes('ktcs')
  ) {
    return 'Kỹ thuật cơ sở';
  }
  if (lower.includes('ô tô') || lower.includes('o to') || lower.includes('oto')) {
    return 'Công nghệ Kỹ thuật Ô tô';
  }
  return '';
}

/**
 * Extracts cohort / intake year strictly when explicitly present in the class name (e.g. K24, 2026).
 * Returns empty string if no cohort is present — never defaults to K25.
 */
export function getCohortForClass(lopName: string | undefined | null): string {
  if (!lopName) return '';
  const kMatch = lopName.match(/\bK(\d{2})\b/i);
  if (kMatch) {
    const num = kMatch[1];
    return `Khóa 20${num} (K${num})`;
  }
  const yearMatch = lopName.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const fullYear = yearMatch[1];
    const shortK = fullYear.slice(-2);
    return `Khóa ${fullYear} (K${shortK})`;
  }
  return '';
}
