// src/services/trainingApiService.ts
// Client API Service cho Phân hệ Quản lý Điểm Rèn luyện Sinh viên

import {
  ScorePolicy,
  ScoreCategory,
  BaseScoreConfig,
  ScoreClassification,
  ClassOfficerRole,
  ClassOfficerAssignment,
  ScoreCriterion,
  TrainingMonth,
  ScoreTransaction,
  MonthlyScoreAccount,
  ScoreAppeal,
  MonthStatus,
  TransactionStatus,
} from '../types/trainingPoint';

import { getAuthHeaders } from './apiService';

const API_BASE = '/api/training-points';

const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  return fetch(input, {
    ...init,
    headers: getAuthHeaders(init.headers),
  });
};

export const trainingApiService = {
  // 1. Cấu hình quy chế & tiêu chí
  async getPolicies(): Promise<{ success: boolean; data: ScorePolicy[] }> {
    try {
      const res = await authFetch(`${API_BASE}/policies`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },

  async getCategories(policyId?: string): Promise<{ success: boolean; data: ScoreCategory[] }> {
    try {
      const query = policyId ? `?policyId=${encodeURIComponent(policyId)}` : '';
      const res = await authFetch(`${API_BASE}/categories${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },

  async getBaseConfigs(policyId?: string): Promise<{ success: boolean; data: BaseScoreConfig[] }> {
    try {
      const query = policyId ? `?policyId=${encodeURIComponent(policyId)}` : '';
      const res = await authFetch(`${API_BASE}/base-configs${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },

  async getClassifications(policyId?: string): Promise<{ success: boolean; data: ScoreClassification[] }> {
    try {
      const query = policyId ? `?policyId=${encodeURIComponent(policyId)}` : '';
      const res = await authFetch(`${API_BASE}/classifications${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },

  async getOfficerRoles(): Promise<{ success: boolean; data: ClassOfficerRole[] }> {
    try {
      const res = await authFetch(`${API_BASE}/officer-roles`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },

  async getOfficerAssignments(params?: { classId?: string; studentCode?: string; academicYear?: string }): Promise<{ success: boolean; data: ClassOfficerAssignment[] }> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await authFetch(`${API_BASE}/officer-assignments?${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },

  async createOfficerAssignment(data: Partial<ClassOfficerAssignment>): Promise<{ success: boolean; message: string; data?: ClassOfficerAssignment }> {
    try {
      const res = await authFetch(`${API_BASE}/officer-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối khi phân công cán bộ' };
    }
  },

  async getCriteria(params?: { categoryId?: string; activeOnly?: boolean }): Promise<{ success: boolean; data: ScoreCriterion[] }> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await authFetch(`${API_BASE}/criteria?${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },

  async createCriterion(
    data: Partial<ScoreCriterion>
  ): Promise<{ success: boolean; message: string; data?: ScoreCriterion }> {
    try {
      const res = await authFetch(`${API_BASE}/criteria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối khi thêm tiêu chí rèn luyện' };
    }
  },

  async updateCriterion(
    id: string,
    data: Partial<ScoreCriterion>
  ): Promise<{ success: boolean; message: string; data?: ScoreCriterion }> {
    try {
      const res = await authFetch(`${API_BASE}/criteria/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối khi cập nhật tiêu chí rèn luyện' };
    }
  },

  async deleteCriterion(
    id: string
  ): Promise<{ success: boolean; message: string; data?: ScoreCriterion }> {
    try {
      const res = await authFetch(`${API_BASE}/criteria/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối khi xóa tiêu chí rèn luyện' };
    }
  },

  async getMonths(academicYear?: string): Promise<{ success: boolean; data: TrainingMonth[] }> {
    try {
      const query = academicYear ? `?academicYear=${encodeURIComponent(academicYear)}` : '';
      const res = await authFetch(`${API_BASE}/months${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [] };
    }
  },

  async updateMonthStatus(month: number, year: number, status: MonthStatus, user?: string, reopenReason?: string): Promise<{ success: boolean; message: string; data?: TrainingMonth }> {
    try {
      const res = await authFetch(`${API_BASE}/months/${month}/${year}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, user, reopenReason }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối khi cập nhật trạng thái tháng' };
    }
  },

  // 2. Điểm tháng & Bảng điểm lớp
  async getMonthlyAccounts(params: { month: number; year: number; classId?: string; studentCode?: string }): Promise<{ success: boolean; data: MonthlyScoreAccount[]; total: number }> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await authFetch(`${API_BASE}/monthly-accounts?${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [], total: 0 };
    }
  },

  async getStudentScorecard(studentCode: string, month: number, year: number): Promise<{ success: boolean; data?: { account: MonthlyScoreAccount; transactions: ScoreTransaction[] }; message?: string }> {
    try {
      const query = `studentCode=${encodeURIComponent(studentCode)}&month=${month}&year=${year}`;
      const res = await authFetch(`${API_BASE}/student-scorecard?${query}`);
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi tải phiếu điểm sinh viên' };
    }
  },

  // 3. Giao dịch điểm
  async getTransactions(params?: { studentCode?: string; classId?: string; month?: number; year?: number; status?: TransactionStatus }): Promise<{ success: boolean; data: ScoreTransaction[]; total: number }> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await authFetch(`${API_BASE}/transactions?${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [], total: 0 };
    }
  },

  async createTransaction(data: any): Promise<{ success: boolean; message: string; data?: ScoreTransaction }> {
    try {
      const res = await authFetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối khi tạo giao dịch điểm' };
    }
  },

  async createBatchTransactions(data: any): Promise<{ success: boolean; message: string; createdCount?: number; data?: ScoreTransaction[] }> {
    try {
      const res = await authFetch(`${API_BASE}/transactions/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi kết nối khi nhập điểm hàng loạt' };
    }
  },

  async approveTransaction(id: string, approvedBy?: string, approvedByName?: string): Promise<{ success: boolean; message: string; data?: ScoreTransaction }> {
    try {
      const res = await authFetch(`${API_BASE}/transactions/${encodeURIComponent(id)}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy, approvedByName }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi duyệt giao dịch điểm' };
    }
  },

  async rejectTransaction(id: string, rejectedBy?: string, reason?: string): Promise<{ success: boolean; message: string; data?: ScoreTransaction }> {
    try {
      const res = await authFetch(`${API_BASE}/transactions/${encodeURIComponent(id)}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedBy, reason }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi từ chối giao dịch điểm' };
    }
  },

  async cancelTransaction(id: string, cancelledBy?: string, reason?: string, createReversal: boolean = false): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const res = await authFetch(`${API_BASE}/transactions/${encodeURIComponent(id)}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelledBy, reason, createReversal }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi hủy giao dịch điểm' };
    }
  },

  // 4. Khiếu nại
  async getAppeals(params?: { studentCode?: string; status?: string }): Promise<{ success: boolean; data: ScoreAppeal[]; total: number }> {
    try {
      const query = new URLSearchParams(params as any).toString();
      const res = await authFetch(`${API_BASE}/appeals?${query}`);
      return await res.json();
    } catch {
      return { success: false, data: [], total: 0 };
    }
  },

  async createAppeal(data: Partial<ScoreAppeal>): Promise<{ success: boolean; message: string; data?: ScoreAppeal }> {
    try {
      const res = await authFetch(`${API_BASE}/appeals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi gửi khiếu nại' };
    }
  },

  async resolveAppeal(id: string, status: 'ACCEPTED' | 'REJECTED', replyNote: string, reviewedBy?: string): Promise<{ success: boolean; message: string; data?: ScoreAppeal }> {
    try {
      const res = await authFetch(`${API_BASE}/appeals/${encodeURIComponent(id)}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, replyNote, reviewedBy }),
      });
      return await res.json();
    } catch {
      return { success: false, message: 'Lỗi xử lý khiếu nại' };
    }
  },

  // 5. Realtime SSE Listener
  subscribeToEvents(onEvent: (event: { type: string; data: any }) => void): () => void {
    if (typeof window === 'undefined' || !window.EventSource) {
      return () => {};
    }

    const eventSource = new EventSource(`${API_BASE}/events`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onEvent(payload);
      } catch {
        // ignore parse error
      }
    };

    eventSource.onerror = () => {
      // Browser automatically attempts reconnect with exponential backoff
    };

    return () => {
      eventSource.close();
    };
  },
};
