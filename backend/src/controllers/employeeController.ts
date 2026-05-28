import { Response } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { generateAgentKey, paginate } from '../utils/helpers';

export const listEmployees = async (req: AuthRequest, res: Response): Promise<void> => {
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
    res.status(500).json({ success: false, message: 'Failed to list employees.', error: (error as Error).message });
  }
};

export const addEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { name, email, password, role, department, designation, employeeId, phone } = req.body;

    const existing = await User.findOne({ email, tenantId });
    if (existing) {
      res.status(409).json({ success: false, message: 'Employee with this email already exists.' });
      return;
    }

    const employee = await User.create({
      name,
      email,
      password: password || 'Employee@123',
      role: role || 'employee',
      tenantId,
      department: department || '',
      designation: designation || '',
      employeeId: employeeId || '',
      phone: phone || '',
      agentKey: generateAgentKey(),
    });

    res.status(201).json({
      success: true,
      message: 'Employee added successfully.',
      data: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
        agentKey: employee.agentKey,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add employee.', error: (error as Error).message });
  }
};

export const getEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
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
    res.status(500).json({ success: false, message: 'Failed to get employee.', error: (error as Error).message });
  }
};

export const updateEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    const allowedUpdates = ['name', 'department', 'designation', 'phone', 'status', 'role', 'employeeId'];
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
    res.status(500).json({ success: false, message: 'Failed to update employee.', error: (error as Error).message });
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
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
    res.status(500).json({ success: false, message: 'Failed to delete employee.', error: (error as Error).message });
  }
};

export const regenerateAgentKey = async (req: AuthRequest, res: Response): Promise<void> => {
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
    res.status(500).json({ success: false, message: 'Failed to regenerate key.', error: (error as Error).message });
  }
};
