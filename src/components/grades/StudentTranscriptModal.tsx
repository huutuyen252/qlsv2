import React from 'react';
import { Diem, SinhVien, MonHoc } from '../../types';
import { StudentGradeView } from './StudentGradeView';
import { X, Award } from 'lucide-react';
interface StudentTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: SinhVien | null | undefined;
  grades: Diem[];
  subjects?: MonHoc[];
}
export const StudentTranscriptModal: React.FC<StudentTranscriptModalProps> = ({
  isOpen,
  onClose,
  student,
  grades,
  subjects = [],
}) => {
  if (!isOpen || !student) return null;
  const studentGrades = grades.filter(
    (g) => g.maSV.toLowerCase() === student.maSV.toLowerCase()
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl relative my-6 max-h-[92vh] overflow-y-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Bảng Điểm Chi Tiết & Tra Cứu GPA Sinh Viên
              </h2>
              <p className="text-xs text-zinc-500">
                Sinh viên: <strong className="text-zinc-900 dark:text-white">{student.hoTen}</strong> ({student.maSV})  Lớp: {student.lop}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-full bg-zinc-100 dark:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <StudentGradeView
          grades={studentGrades}
          student={student}
          subjects={subjects}
        />
      </div>
    </div>
  );
};

