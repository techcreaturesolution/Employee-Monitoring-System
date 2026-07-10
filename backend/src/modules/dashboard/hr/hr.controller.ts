import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../../middleware/auth';
import { User } from '../../employee/employee.model';
import { Attendance } from '../../attendance/attendance.model';
import { Leave } from '../../leave/leave.model';
import { Department } from '../../department/department.model';
import { cache } from '../../../services/cache';
import { formatDate } from '../../../utils/helpers';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ApiResponse } from '../../../utils/ApiResponse';
import { ApiError } from '../../../utils/ApiError';

export const getHrDashboard = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const cacheKey = `dashboard:hr:${tenantId}`;
  const cached = await cache.get<any>(cacheKey);
  if (cached) {
    res.json(new ApiResponse(200, 'HR dashboard stats fetched (cached).', cached));
    return;
  }

  const tenantObjId = new mongoose.Types.ObjectId(String(tenantId));
  const today = formatDate(new Date());

  const [
    totalEmployees,
    activeEmployees,
    departments,
    todayAttendanceRecords,
    attendanceStats,
    todayAbsentCount,
    todayPresentCount,
    todayLateCount,
    pendingLeaveApprovals,
  ] = await Promise.all([
    User.countDocuments({ tenantId: tenantObjId, role: { $ne: 'super_admin' } }),
    User.countDocuments({ tenantId: tenantObjId, status: 'active', role: { $ne: 'super_admin' } }),
    Department.aggregate([
      { $match: { tenantId: tenantObjId } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'department',
          as: 'employees',
        }
      },
      {
        $project: {
          name: 1,
          employeeCount: { $size: '$employees' }
        }
      }
    ]),
    Attendance.countDocuments({ tenantId: tenantObjId, date: today }),
    Attendance.aggregate([
      { $match: { tenantId: tenantObjId, date: today } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'absent' }),
    Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'present' }),
    Attendance.countDocuments({ tenantId: tenantObjId, date: today, status: 'late' }),
    Leave.countDocuments({ tenantId: tenantObjId, status: 'pending' }),
  ]);

  const notMarkedAttendance = activeEmployees - todayAttendanceRecords;

  const data = {
    stats: {
      totalEmployees,
      activeEmployees,
      pendingLeaveApprovals,
      todayPresent: todayPresentCount,
      todayLate: todayLateCount,
      todayAbsent: todayAbsentCount,
      notMarked: notMarkedAttendance,
    },
    attendanceStats,
    departmentBreakdown: departments,
  };

  await cache.set(cacheKey, data, 60); // 60s cache TTL

  res.json(new ApiResponse(200, 'HR dashboard stats fetched.', data));
});
