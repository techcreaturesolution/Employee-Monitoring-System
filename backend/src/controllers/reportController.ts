import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Attendance } from '../models/Attendance';
import { ActivityLog } from '../models/ActivityLog';
import { Screenshot } from '../models/Screenshot';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';

// Helper to compile report data based on type
const compileReportData = async (type: string, tenantId: any, startDate?: string, endDate?: string, userId?: string) => {
  switch (type) {
    case 'attendance': {
      const match: Record<string, any> = { tenantId: new mongoose.Types.ObjectId(tenantId) };
      if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = startDate;
        if (endDate) match.date.$lte = endDate;
      }
      if (userId) match.userId = new mongoose.Types.ObjectId(userId);

      return await Attendance.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$userId',
            totalDays: { $sum: 1 },
            presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
            lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
            halfDays: { $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] } },
            onLeaveDays: { $sum: { $cond: [{ $eq: ['$status', 'on-leave'] }, 1, 0] } },
            totalWorkMinutes: { $sum: '$totalWorkMinutes' },
            totalOvertimeMinutes: { $sum: '$overtimeMinutes' },
            avgWorkMinutes: { $avg: '$totalWorkMinutes' },
          }
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            name: '$user.name',
            email: '$user.email',
            department: '$user.department',
            totalDays: 1,
            presentDays: 1,
            lateDays: 1,
            halfDays: 1,
            onLeaveDays: 1,
            totalWorkMinutes: 1,
            totalOvertimeMinutes: 1,
            avgWorkMinutes: { $round: ['$avgWorkMinutes', 0] },
          }
        }
      ]);
    }

    case 'productivity': {
      const match: Record<string, any> = { tenantId: new mongoose.Types.ObjectId(tenantId) };
      if (startDate || endDate) {
        match.startTime = {};
        if (startDate) match.startTime.$gte = new Date(startDate);
        if (endDate) match.startTime.$lte = new Date(endDate);
      }
      if (userId) match.userId = new mongoose.Types.ObjectId(userId);

      return await ActivityLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: { userId: '$userId', category: '$category' },
            totalMinutes: { $sum: '$durationMinutes' },
          }
        },
        {
          $group: {
            _id: '$_id.userId',
            productiveMinutes: { $sum: { $cond: [{ $eq: ['$_id.category', 'productive'] }, '$totalMinutes', 0] } },
            unproductiveMinutes: { $sum: { $cond: [{ $eq: ['$_id.category', 'unproductive'] }, '$totalMinutes', 0] } },
            neutralMinutes: { $sum: { $cond: [{ $eq: ['$_id.category', 'neutral'] }, '$totalMinutes', 0] } },
          }
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            name: '$user.name',
            email: '$user.email',
            productiveMinutes: 1,
            unproductiveMinutes: 1,
            neutralMinutes: 1,
            totalMinutes: { $add: ['$productiveMinutes', '$unproductiveMinutes', '$neutralMinutes'] }
          }
        }
      ]);
    }

    case 'activity': {
      const match: Record<string, any> = { tenantId: new mongoose.Types.ObjectId(tenantId) };
      if (startDate || endDate) {
        match.startTime = {};
        if (startDate) match.startTime.$gte = new Date(startDate);
        if (endDate) match.startTime.$lte = new Date(endDate);
      }
      if (userId) match.userId = new mongoose.Types.ObjectId(userId);

      return await ActivityLog.aggregate([
        { $match: match },
        {
          $group: {
            _id: { appName: '$appName', userId: '$userId' },
            totalMinutes: { $sum: '$durationMinutes' },
          }
        },
        { $lookup: { from: 'users', localField: '_id.userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            appName: '$_id.appName',
            userName: '$user.name',
            userEmail: '$user.email',
            totalMinutes: 1,
          }
        },
        { $sort: { totalMinutes: -1 } }
      ]);
    }

    case 'screenshots': {
      const match: Record<string, any> = { tenantId: new mongoose.Types.ObjectId(tenantId) };
      if (startDate || endDate) {
        match.timestamp = {};
        if (startDate) match.timestamp.$gte = new Date(startDate);
        if (endDate) match.timestamp.$lte = new Date(endDate);
      }
      if (userId) match.userId = new mongoose.Types.ObjectId(userId);

      return await Screenshot.aggregate([
        { $match: match },
        {
          $group: {
            _id: { userId: '$userId', tag: '$productivityTag' },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.userId',
            productiveCount: { $sum: { $cond: [{ $eq: ['$_id.tag', 'productive'] }, '$count', 0] } },
            unproductiveCount: { $sum: { $cond: [{ $eq: ['$_id.tag', 'unproductive'] }, '$count', 0] } },
            neutralCount: { $sum: { $cond: [{ $eq: ['$_id.tag', 'neutral'] }, '$count', 0] } },
            totalCount: { $sum: '$count' }
          }
        },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            name: '$user.name',
            email: '$user.email',
            productiveCount: 1,
            unproductiveCount: 1,
            neutralCount: 1,
            totalCount: 1
          }
        }
      ]);
    }

    default:
      throw new Error('Invalid report type');
  }
};

export const getAttendanceReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { startDate, endDate, userId } = req.query;
    const data = await compileReportData('attendance', tenantId, startDate as string, endDate as string, userId as string);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getProductivityReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { startDate, endDate, userId } = req.query;
    const data = await compileReportData('productivity', tenantId, startDate as string, endDate as string, userId as string);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getActivityReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { startDate, endDate, userId } = req.query;
    const data = await compileReportData('activity', tenantId, startDate as string, endDate as string, userId as string);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getScreenshotReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { startDate, endDate, userId } = req.query;
    const data = await compileReportData('screenshots', tenantId, startDate as string, endDate as string, userId as string);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const exportExcel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { type, startDate, endDate, userId } = req.query;

    if (!type || typeof type !== 'string') {
      res.status(400).json({ success: false, message: 'Type query parameter is required.' });
      return;
    }

    const data = await compileReportData(type, tenantId, startDate as string, endDate as string, userId as string);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${type} Report`);

    if (type === 'attendance') {
      worksheet.columns = [
        { header: 'Employee Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Total Days Tracked', key: 'totalDays', width: 18 },
        { header: 'Present Days', key: 'presentDays', width: 15 },
        { header: 'Late Days', key: 'lateDays', width: 15 },
        { header: 'Half Days', key: 'halfDays', width: 15 },
        { header: 'On Leave Days', key: 'onLeaveDays', width: 15 },
        { header: 'Total Work Minutes', key: 'totalWorkMinutes', width: 20 },
        { header: 'Total Overtime (min)', key: 'totalOvertimeMinutes', width: 20 },
        { header: 'Avg Daily Work (min)', key: 'avgWorkMinutes', width: 20 },
      ];
    } else if (type === 'productivity') {
      worksheet.columns = [
        { header: 'Employee Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Productive Minutes', key: 'productiveMinutes', width: 20 },
        { header: 'Neutral Minutes', key: 'neutralMinutes', width: 20 },
        { header: 'Unproductive Minutes', key: 'unproductiveMinutes', width: 22 },
        { header: 'Total Logged Minutes', key: 'totalMinutes', width: 22 },
      ];
    } else if (type === 'activity') {
      worksheet.columns = [
        { header: 'Application/URL Name', key: 'appName', width: 35 },
        { header: 'Employee Name', key: 'userName', width: 25 },
        { header: 'Email', key: 'userEmail', width: 30 },
        { header: 'Total Minutes Used', key: 'totalMinutes', width: 22 },
      ];
    } else if (type === 'screenshots') {
      worksheet.columns = [
        { header: 'Employee Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Productive Screen Count', key: 'productiveCount', width: 22 },
        { header: 'Neutral Screen Count', key: 'neutralCount', width: 20 },
        { header: 'Unproductive Screen Count', key: 'unproductiveCount', width: 25 },
        { header: 'Total Screenshots', key: 'totalCount', width: 18 },
      ];
    }

    worksheet.addRows(data);

    // Apply header style
    worksheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error('Excel Export failed:', error);
    next(error);
  }
};

export const exportPDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { type, startDate, endDate, userId } = req.query;

    if (!type || typeof type !== 'string') {
      res.status(400).json({ success: false, message: 'Type query parameter is required.' });
      return;
    }

    const data = await compileReportData(type, tenantId, startDate as string, endDate as string, userId as string);

    const doc = new PDFDocument({ margin: 30 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${Date.now()}.pdf`);

    doc.pipe(res);

    // Title / Header
    doc.fontSize(18).text(`EMS — ${type.toUpperCase()} REPORT`, { align: 'center' });
    doc.fontSize(10).text(`Generated At: ${new Date().toLocaleString()}`, { align: 'center' });
    if (startDate || endDate) {
      doc.text(`Period: ${startDate || 'Start'} to ${endDate || 'End'}`, { align: 'center' });
    }
    doc.moveDown(2);

    // Render tables based on type
    if (type === 'attendance') {
      data.forEach((row: any, index: number) => {
        doc.fontSize(12).text(`${index + 1}. ${row.name} (${row.email})`, { underline: true });
        doc.fontSize(10).text(`Department: ${row.department || 'N/A'}`);
        doc.text(`Days Tracked: ${row.totalDays} | Present: ${row.presentDays} | Late: ${row.lateDays} | Leave: ${row.onLeaveDays}`);
        doc.text(`Total Work Time: ${row.totalWorkMinutes} mins | Avg Work/Day: ${row.avgWorkMinutes} mins`);
        doc.moveDown(1);
      });
    } else if (type === 'productivity') {
      data.forEach((row: any, index: number) => {
        doc.fontSize(12).text(`${index + 1}. ${row.name} (${row.email})`, { underline: true });
        doc.fontSize(10).text(`Productive: ${row.productiveMinutes} mins | Neutral: ${row.neutralMinutes} mins | Unproductive: ${row.unproductiveMinutes} mins`);
        doc.text(`Total Logged Time: ${row.totalMinutes} mins`);
        doc.moveDown(1);
      });
    } else if (type === 'activity') {
      data.forEach((row: any, index: number) => {
        doc.font('Helvetica-Bold').fontSize(11).text(`${index + 1}. ${row.appName}`);
        doc.font('Helvetica');
        doc.fontSize(10).text(`User: ${row.userName} (${row.userEmail}) | Duration: ${row.totalMinutes} mins`);
        doc.moveDown(0.5);
      });
    } else if (type === 'screenshots') {
      data.forEach((row: any, index: number) => {
        doc.fontSize(12).text(`${index + 1}. ${row.name} (${row.email})`, { underline: true });
        doc.fontSize(10).text(`Productive Screenshots: ${row.productiveCount} | Neutral: ${row.neutralCount} | Unproductive: ${row.unproductiveCount}`);
        doc.text(`Total Captured Screenshots: ${row.totalCount}`);
        doc.moveDown(1);
      });
    }

    doc.end();
  } catch (error) {
    logger.error('PDF Export failed:', error);
    next(error);
  }
};
