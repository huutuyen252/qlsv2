// src/routes/trainingPointRoutes.ts
// Bộ định tuyến REST API & Realtime SSE cho Phân hệ Quản lý Điểm Rèn luyện

import { Router, Request, Response } from 'express';
import {
  getPolicies,
  getCategories,
  getBaseConfigs,
  getClassifications,
  getOfficerRoles,
  getOfficerAssignments,
  createOfficerAssignment,
  getCriteria,
  getTrainingMonths,
  getTransactions,
  createTransaction,
  approveTransaction,
  rejectTransaction,
  cancelTransaction,
  updateMonthStatus,
  calculateStudentMonthlyScore,
  getAppeals,
  createAppeal,
  resolveAppeal,
  trainingEventBus,
} from '../db/trainingDbOperations';
import { getAllSinhVien } from '../db/dbOperations';
import {
  requirePortalAuth,
  requirePortalPermission,
  PortalAuthRequest,
} from '../middleware/portalAuth';

export const trainingPointRouter = Router();

// Bảo vệ toàn bộ endpoint Điểm rèn luyện (ngoại trừ SSE stream /events)
trainingPointRouter.use((req: PortalAuthRequest, res: Response, next) => {
  if (req.path === '/events') {
    return next();
  }
  return requirePortalAuth(req, res, next);
});

// ==========================================
// 1. REALTIME SERVER-SENT EVENTS (SSE)
// ==========================================
trainingPointRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Gửi thông điệp kết nối ban đầu
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

  const onCreated = (tx: any) => {
    res.write(`data: ${JSON.stringify({ type: 'TRANSACTION_CREATED', data: tx })}\n\n`);
  };
  const onApproved = (tx: any) => {
    res.write(`data: ${JSON.stringify({ type: 'TRANSACTION_APPROVED', data: tx })}\n\n`);
  };
  const onRejected = (tx: any) => {
    res.write(`data: ${JSON.stringify({ type: 'TRANSACTION_REJECTED', data: tx })}\n\n`);
  };
  const onCancelled = (payload: any) => {
    res.write(`data: ${JSON.stringify({ type: 'TRANSACTION_CANCELLED', data: payload })}\n\n`);
  };
  const onMonthlyUpdated = (acc: any) => {
    res.write(`data: ${JSON.stringify({ type: 'MONTHLY_UPDATED', data: acc })}\n\n`);
  };
  const onMonthLocked = (month: any) => {
    res.write(`data: ${JSON.stringify({ type: 'MONTH_LOCKED', data: month })}\n\n`);
  };
  const onAppealUpdated = (appeal: any) => {
    res.write(`data: ${JSON.stringify({ type: 'APPEAL_UPDATED', data: appeal })}\n\n`);
  };

  trainingEventBus.on('score.transaction.created', onCreated);
  trainingEventBus.on('score.transaction.approved', onApproved);
  trainingEventBus.on('score.transaction.rejected', onRejected);
  trainingEventBus.on('score.transaction.cancelled', onCancelled);
  trainingEventBus.on('score.monthly.updated', onMonthlyUpdated);
  trainingEventBus.on('score.month.locked', onMonthLocked);
  trainingEventBus.on('score.appeal.updated', onAppealUpdated);

  // Heartbeat ping mỗi 25s để giữ kết nối không bị timeout
  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    trainingEventBus.off('score.transaction.created', onCreated);
    trainingEventBus.off('score.transaction.approved', onApproved);
    trainingEventBus.off('score.transaction.rejected', onRejected);
    trainingEventBus.off('score.transaction.cancelled', onCancelled);
    trainingEventBus.off('score.monthly.updated', onMonthlyUpdated);
    trainingEventBus.off('score.month.locked', onMonthLocked);
    trainingEventBus.off('score.appeal.updated', onAppealUpdated);
  });
});

// ==========================================
// 2. CẤU HÌNH QUY CHẾ, NHÓM ĐIỂM, TIÊU CHÍ
// ==========================================
trainingPointRouter.get('/policies', (_req: Request, res: Response) => {
  return res.json({ success: true, data: getPolicies() });
});

trainingPointRouter.get('/categories', (req: Request, res: Response) => {
  const { policyId } = req.query;
  return res.json({ success: true, data: getCategories(policyId as string) });
});

trainingPointRouter.get('/base-configs', (req: Request, res: Response) => {
  const { policyId } = req.query;
  return res.json({ success: true, data: getBaseConfigs(policyId as string) });
});

trainingPointRouter.get('/classifications', (req: Request, res: Response) => {
  const { policyId } = req.query;
  return res.json({ success: true, data: getClassifications(policyId as string) });
});

trainingPointRouter.get('/officer-roles', (_req: Request, res: Response) => {
  return res.json({ success: true, data: getOfficerRoles() });
});

trainingPointRouter.get('/officer-assignments', (req: Request, res: Response) => {
  const { classId, studentCode, academicYear } = req.query;
  return res.json({
    success: true,
    data: getOfficerAssignments({
      classId: classId as string,
      studentCode: studentCode as string,
      academicYear: academicYear as string,
    }),
  });
});

trainingPointRouter.post('/officer-assignments', requirePortalPermission('canEvaluateTraining'), (req: Request, res: Response) => {
  try {
    const { studentCode, classId, roleId, validFrom, validTo, note, assignedBy } = req.body;
    if (!studentCode || !roleId) {
      return res.status(400).json({ success: false, message: 'Thiếu sinh viên hoặc chức vụ được phân công' });
    }
    const created = createOfficerAssignment({
      studentCode,
      classId,
      roleId,
      validFrom,
      validTo,
      note,
      assignedBy: assignedBy || 'admin',
    });
    return res.status(201).json({ success: true, message: 'Phân công cán bộ lớp thành công', data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

trainingPointRouter.get('/criteria', (req: Request, res: Response) => {
  const { categoryId, activeOnly } = req.query;
  return res.json({
    success: true,
    data: getCriteria({
      categoryId: categoryId as string,
      activeOnly: activeOnly === 'true',
    }),
  });
});

trainingPointRouter.get('/months', (req: Request, res: Response) => {
  const { academicYear } = req.query;
  return res.json({ success: true, data: getTrainingMonths(academicYear as string) });
});

trainingPointRouter.put('/months/:month/:year/status', requirePortalPermission('canEvaluateTraining'), (req: Request, res: Response) => {
  try {
    const month = parseInt(req.params.month, 10);
    const year = parseInt(req.params.year, 10);
    const { status, user, reopenReason } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Thiếu trạng thái tháng' });
    }
    const updated = updateMonthStatus(month, year, status, user || 'admin', reopenReason);
    return res.json({ success: true, message: `Tháng ${month}/${year} đã chuyển sang trạng thái: ${status}`, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 3. TỔNG HỢP ĐIỂM THÁNG & CÁ NHÂN
// ==========================================
trainingPointRouter.get('/monthly-accounts', async (req: Request, res: Response) => {
  try {
    const { month, year, classId, studentCode } = req.query;
    const m = month ? parseInt(month as string, 10) : 11;
    const y = year ? parseInt(year as string, 10) : 2026;

    // Lấy danh sách sinh viên phù hợp
    let studentList = await getAllSinhVien();
    if (classId) {
      studentList = studentList.filter((s) => s.lop.toLowerCase() === (classId as string).toLowerCase());
    }
    if (studentCode) {
      studentList = studentList.filter((s) => s.maSV.toLowerCase() === (studentCode as string).toLowerCase());
    }

    const accounts = studentList.map((st) => {
      return calculateStudentMonthlyScore(st.maSV, m, y, st.hoTen, st.lop);
    });

    return res.json({
      success: true,
      data: accounts,
      total: accounts.length,
      month: m,
      year: y,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

trainingPointRouter.get('/student-scorecard', (req: Request, res: Response) => {
  try {
    const { studentCode, month, year } = req.query;
    if (!studentCode) {
      return res.status(400).json({ success: false, message: 'Thiếu mã sinh viên' });
    }
    const m = month ? parseInt(month as string, 10) : 11;
    const y = year ? parseInt(year as string, 10) : 2026;

    const account = calculateStudentMonthlyScore(studentCode as string, m, y);
    const transactions = getTransactions({ studentCode: studentCode as string, month: m, year: y });

    return res.json({
      success: true,
      data: {
        account,
        transactions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. GIAO DỊCH ĐIỂM (TẠO, DUYỆT, TỪ CHỐI, HỦY)
// ==========================================
trainingPointRouter.get('/transactions', (req: Request, res: Response) => {
  try {
    const { studentCode, classId, month, year, status } = req.query;
    const list = getTransactions({
      studentCode: studentCode as string,
      classId: classId as string,
      month: month ? parseInt(month as string, 10) : undefined,
      year: year ? parseInt(year as string, 10) : undefined,
      status: status as any,
    });
    return res.json({ success: true, data: list, total: list.length });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

trainingPointRouter.post('/transactions', (req: Request, res: Response) => {
  try {
    const tx = createTransaction(req.body);
    return res.status(201).json({
      success: true,
      message: tx.status === 'APPROVED' ? 'Đã cộng/trừ điểm thành công' : 'Đã gửi giao dịch điểm chờ duyệt',
      data: tx,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// Nhập điểm hàng loạt theo sự kiện
trainingPointRouter.post('/transactions/batch', requirePortalPermission('canEvaluateTraining'), (req: Request, res: Response) => {
  try {
    const { students, criterionId, month, year, occurredAt, note, evidenceUrl, createdBy, createdByName, autoSubmit } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách sinh viên trống' });
    }
    if (!criterionId) {
      return res.status(400).json({ success: false, message: 'Chưa chọn tiêu chí rèn luyện' });
    }

    const createdList: any[] = [];
    const errors: any[] = [];

    for (const s of students) {
      try {
        const tx = createTransaction({
          studentCode: s.studentCode || s.maSV,
          studentName: s.studentName || s.hoTen,
          classId: s.classId || s.lop || 'Chưa phân lớp',
          month: month || 11,
          year: year || 2026,
          criterionId,
          occurredAt,
          occurrences: s.occurrences || 1,
          pointsPerOccurrence: s.pointsPerOccurrence,
          note: s.note || note,
          evidenceUrl,
          createdBy: createdBy || 'admin',
          createdByName: createdByName || 'Quản trị viên',
          autoSubmit: autoSubmit !== undefined ? autoSubmit : true,
        });
        createdList.push(tx);
      } catch (err: any) {
        errors.push({ studentCode: s.studentCode || s.maSV, error: err.message });
      }
    }

    return res.json({
      success: true,
      message: `Đã nhập điểm thành công cho ${createdList.length} sinh viên${errors.length > 0 ? `, ${errors.length} lỗi` : ''}`,
      createdCount: createdList.length,
      data: createdList,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

trainingPointRouter.put('/transactions/:id/approve', requirePortalPermission('canEvaluateTraining'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approvedBy, approvedByName } = req.body;
    const tx = approveTransaction(id, approvedBy || 'admin', approvedByName);
    return res.json({ success: true, message: 'Đã duyệt giao dịch điểm thành công và tính lại điểm tháng', data: tx });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

trainingPointRouter.put('/transactions/:id/reject', requirePortalPermission('canEvaluateTraining'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectedBy, reason } = req.body;
    const tx = rejectTransaction(id, rejectedBy || 'admin', reason || 'Không đủ điều kiện / thiếu minh chứng');
    return res.json({ success: true, message: 'Đã từ chối giao dịch điểm', data: tx });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

trainingPointRouter.put('/transactions/:id/cancel', requirePortalPermission('canEvaluateTraining'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cancelledBy, reason, createReversal } = req.body;
    const result = cancelTransaction(id, cancelledBy || 'admin', reason || 'Hủy giao dịch theo yêu cầu', createReversal);
    return res.json({
      success: true,
      message: result.reversal ? 'Đã hủy giao dịch và tạo giao dịch đảo ngược để bù trừ điểm' : 'Đã hủy giao dịch điểm',
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. KHIẾU NẠI & PHẢN HỒI
// ==========================================
trainingPointRouter.get('/appeals', (req: Request, res: Response) => {
  const { studentCode, status } = req.query;
  const list = getAppeals({ studentCode: studentCode as string, status: status as string });
  return res.json({ success: true, data: list, total: list.length });
});

trainingPointRouter.post('/appeals', (req: Request, res: Response) => {
  try {
    const { studentCode, title, reason, transactionId, month, year, evidenceUrl } = req.body;
    if (!studentCode || !reason) {
      return res.status(400).json({ success: false, message: 'Thiếu mã sinh viên hoặc lý do khiếu nại' });
    }
    const created = createAppeal({
      studentCode,
      title: title || 'Khiếu nại điểm rèn luyện',
      reason,
      transactionId,
      month: month || 11,
      year: year || 2026,
      evidenceUrl,
    });
    return res.status(201).json({ success: true, message: 'Đã gửi khiếu nại thành công đến Ban cố vấn học tập', data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

trainingPointRouter.put('/appeals/:id/resolve', requirePortalPermission('canEvaluateTraining'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, replyNote, reviewedBy } = req.body;
    if (!status || (status !== 'ACCEPTED' && status !== 'REJECTED')) {
      return res.status(400).json({ success: false, message: 'Trạng thái giải quyết không hợp lệ' });
    }
    const updated = resolveAppeal(id, status, replyNote || '', reviewedBy || 'admin');
    return res.json({ success: true, message: `Đã phản hồi khiếu nại (${status})`, data: updated });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
