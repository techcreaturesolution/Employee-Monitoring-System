import { Response } from 'express';
import { Tenant } from '../models/Tenant';
import { AuthRequest } from '../middleware/auth';

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const tenant = await Tenant.findById(tenantId);

    if (!tenant) {
      res.status(404).json({ success: false, message: 'Tenant not found.' });
      return;
    }

    res.json({
      success: true,
      data: {
        company: {
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone,
          domain: tenant.domain,
          address: tenant.address,
          logo: tenant.logo,
        },
        monitoring: tenant.settings,
        plan: tenant.plan,
        status: tenant.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get settings.', error: (error as Error).message });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { company, monitoring } = req.body;

    const updateData: Record<string, unknown> = {};

    if (company) {
      if (company.name) updateData.name = company.name;
      if (company.email) updateData.email = company.email;
      if (company.phone) updateData.phone = company.phone;
      if (company.domain) updateData.domain = company.domain;
      if (company.address) updateData.address = company.address;
      if (company.logo) updateData.logo = company.logo;
    }

    if (monitoring) {
      const settingsUpdate: Record<string, unknown> = {};
      const allowedSettings = [
        'screenshotInterval', 'trackApps', 'trackUrls', 'blurScreenshots',
        'workStartTime', 'workEndTime', 'timezone', 'allowManualPunch',
        'autoStopTracking', 'idleTimeThreshold',
      ];

      for (const key of allowedSettings) {
        if (monitoring[key] !== undefined) {
          settingsUpdate[`settings.${key}`] = monitoring[key];
        }
      }
      Object.assign(updateData, settingsUpdate);
    }

    const tenant = await Tenant.findByIdAndUpdate(tenantId, updateData, { new: true });

    res.json({ success: true, message: 'Settings updated.', data: tenant });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings.', error: (error as Error).message });
  }
};
