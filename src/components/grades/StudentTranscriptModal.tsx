import React, { useEffect, useId } from 'react';
import { Diem, SinhVien, MonHoc } from '../../types';
import { StudentGradeView } from './StudentGradeView';
import { X, Award } from 'lucide-react';

interface StudentTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: SinhVien | null | undefined;
  grades: Diem[];
  subjects?: MonHoc[];
  onDeleteGrade?: (id: string) => Promise<void>;
}

export const StudentTranscriptModal: React.FC<StudentTranscriptModalProps> = ({
  isOpen,
  onClose,
  student,
  grades,
  subjects = [],
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const studentGrades = grades.filter(
    (g) => g.maSV.toLowerCase() === student.maSV.toLowerCase()
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md max-w-5xl w-full shadow-lg relative my-6 max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Award className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
            <h2
              id={titleId}
              className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate"
            >
              Bảng điểm sinh viên — {student.hoTen} ({student.maSV})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng điểm"
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          <StudentGradeView
            grades={studentGrades}
            student={student}
            subjects={subjects}
          />
        </div>
      </div>
    </div>
  );
};
