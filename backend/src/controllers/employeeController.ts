import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { generateAgentKey, paginate } from '../utils/helpers';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const listEmployees = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { page = 1, limit = 20, status, department, search } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const [employees, total] = await Promise.all([
      User.find(filter).skip(skip).limit(lim).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          total,
          page: Number(page),
          limit: lim,
          pages: Math.ceil(total / lim),
        },
      },
    });
  } catch (error) {
    logger.error('listEmployees failed:', error);
    next(error);
  }
};

const addEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { name, email, password, role, department, designation, employeeId, phone } = req.body;

    const existing = await User.findOne({ email, tenantId });
    if (existing) {
      res.status(409).json({ success: false, message: 'Employee with this email already exists.' });
      return;
    }

    const tempPassword = crypto.randomBytes(12).toString('base64url');
    const finalPassword = password || tempPassword;

    const employee = await User.create({
      name,
      email,
      password: finalPassword,
      mustChangePassword: !password, // force change on first login if no password provided
      role: role || 'employee',
      tenantId,
      department: department || '',
      designation: designation || '',
      employeeId: employeeId || '',
      phone: phone || '',
      agentKey: generateAgentKey(),
    });

    const responseData: any = {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      designation: employee.designation,
      agentKey: employee.agentKey,
    };

    if (!password) {
      responseData.tempPassword = tempPassword; // Send it back to the client once
    }

    res.status(201).json({
      success: true,
      message: 'Employee added successfully.',
      data: responseData,
    });
  } catch (error) {
    logger.error('addEmployee failed:', error);
    next(error);
  }
};

const getEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const employee = await User.findOne({ _id: id, tenantId });
    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    logger.error('getEmployee failed:', error);
    next(error);
  }
};

const updateEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const allowedUpdates = ['name', 'department', 'designation', 'phone', 'status', 'role', 'employeeId', 'workMode'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const employee = await User.findOneAndUpdate(
      { _id: id, tenantId },
      updates,
      { new: true }
    );

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    res.json({ success: true, message: 'Employee updated.', data: employee });
  } catch (error) {
    logger.error('updateEmployee failed:', error);
    next(error);
  }
};

const deleteEmployee = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const employee = await User.findOneAndUpdate(
      { _id: id, tenantId },
      { status: 'inactive' },
      { new: true }
    );

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    res.json({ success: true, message: 'Employee deactivated.' });
  } catch (error) {
    logger.error('deleteEmployee failed:', error);
    next(error);
  }
};

const regenerateAgentKey = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const newKey = generateAgentKey();

    const employee = await User.findOneAndUpdate(
      { _id: id, tenantId },
      { agentKey: newKey },
      { new: true }
    );

    if (!employee) {
      res.status(404).json({ success: false, message: 'Employee not found.' });
      return;
    }

    res.json({ success: true, message: 'Agent key regenerated.', data: { agentKey: newKey } });
  } catch (error) {
    logger.error('regenerateAgentKey failed:', error);
    next(error);
  }
};

export {
  listEmployees,
  addEmployee,
  getEmployee,
  updateEmployee,
  deleteEmployee,
  regenerateAgentKey,
};
