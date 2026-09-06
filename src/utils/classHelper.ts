export const CANONICAL_CLASS_CO_KHI = 'CNKT CƠ KHÍ 25DDS09041';
export const CANONICAL_CLASS_O_TO = 'CNKT Ô TÔ 25DDS09021';

export const CANONICAL_CLASSES = [
  CANONICAL_CLASS_CO_KHI,
  CANONICAL_CLASS_O_TO,
] as const;

export const FACULTY_CO_KHI = 'Khoa Cơ khí';
export const FACULTY_O_TO = 'Khoa Ô tô';

/**
 * Normalizes any variation of class name into its canonical uppercase representation.
 * Examples:
 * - "CNKT Cơ khí 25DDS 09041", "CNKT Cơ khí 25DDS09041", "25DDS09041" -> "CNKT CƠ KHÍ 25DDS09041"
 * - "CNKT Ô tô 25DDS09021", "CNKT Ô tô 25DDS 09021", "25DDS09021" -> "CNKT Ô TÔ 25DDS09021"
 */
export function normalizeClassName(rawLop: string | undefined | null): string {
  if (!rawLop) return '';
  const trimmed = rawLop.trim().replace(/\s+/g, ' ');
  const lower = trimmed.toLowerCase();

  // Check Mechanical engineering 25DDS09041
  if (
    lower.includes('09041') ||
    ((lower.includes('cơ khí') || lower.includes('co khi')) && (lower.includes('25dds') || lower.includes('cnkt')))
  ) {
    return CANONICAL_CLASS_CO_KHI;
  }

  // Check Automotive engineering 25DDS09021
  if (
    lower.includes('09021') ||
    ((lower.includes('ô tô') || lower.includes('o to')) && (lower.includes('25dds') || lower.includes('cnkt')))
  ) {
    return CANONICAL_CLASS_O_TO;
  }

  // General cleanup
  return trimmed.replace(/25DDS\s+/i, '25DDS').toUpperCase();
}

/**
 * Returns the faculty associated with a class name.
 */
export function getFacultyForClass(lopName: string | undefined | null): string {
  const norm = normalizeClassName(lopName);
  if (norm === CANONICAL_CLASS_CO_KHI) return FACULTY_CO_KHI;
  if (norm === CANONICAL_CLASS_O_TO) return FACULTY_O_TO;

  if (!lopName) return 'Khoa Đào tạo';
  const lower = lopName.toLowerCase();
  if (lower.includes('cơ khí') || lower.includes('co khi') || lower.includes('ktcs')) return FACULTY_CO_KHI;
  if (lower.includes('ô tô') || lower.includes('o to')) return FACULTY_O_TO;
  if (lower.includes('thông tin') || lower.includes('cntt')) return 'Khoa Công nghệ Thông tin';
  return 'Khoa Đào tạo';
}

/**
 * Normalizes faculty name.
 */
export function normalizeFacultyName(rawKhoa: string | undefined | null, lop?: string): string {
  if (lop) {
    const facultyFromLop = getFacultyForClass(lop);
    if (facultyFromLop) return facultyFromLop;
  }
  if (!rawKhoa) return 'Khoa Đào tạo';
  const lower = rawKhoa.toLowerCase();
  if (lower.includes('cơ khí') || lower.includes('co khi') || lower.includes('ktcs')) return FACULTY_CO_KHI;
  if (lower.includes('ô tô') || lower.includes('o to')) return FACULTY_O_TO;
  if (lower.includes('thông tin') || lower.includes('cntt')) return 'Khoa Công nghệ Thông tin';
  return rawKhoa.trim();
}

/**
 * Checks if two class strings refer to the same class, case-insensitively and canonicalized.
 */
export function isSameClass(lopA: string | undefined | null, lopB: string | undefined | null): boolean {
  if (!lopA && !lopB) return true;
  if (!lopA || !lopB) return false;
  return normalizeClassName(lopA) === normalizeClassName(lopB);
}

/**
 * Returns a deduplicated list of canonical class names from student records.
 */
export function getUniqueClassesFromStudents(students: { lop?: string }[]): string[] {
  const set = new Set<string>();

  // Add from students
  students.forEach((s) => {
    if (s.lop) {
      const norm = normalizeClassName(s.lop);
      if (norm) set.add(norm);
    }
  });

  // Ensure standard classes exist
  CANONICAL_CLASSES.forEach((c) => set.add(c));

  return Array.from(set).sort();
}
