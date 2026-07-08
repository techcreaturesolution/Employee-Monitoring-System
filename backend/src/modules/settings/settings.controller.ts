import { Response } from 'express';
import { Tenant } from '../tenant/tenant.model';
import { AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

export const getSettings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user?.tenantId;
  const tenant = await Tenant.findById(tenantId);

  if (!tenant) {
    throw new ApiError(404, 'Tenant not found.');
  }

  res.json(
    new ApiResponse(200, 'Settings fetched.', {
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
    })
  );
});

export const updateSettings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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
      'enableGeofencing', 'officeLocations', 'mobileLocationInterval',
      'requireLocationForPunch',
    ];

    for (const key of allowedSettings) {
      if (monitoring[key] !== undefined) {
        settingsUpdate[`settings.${key}`] = monitoring[key];
      }
    }
    Object.assign(updateData, settingsUpdate);
  }

  const tenant = await Tenant.findByIdAndUpdate(tenantId, updateData, { new: true });
  res.json(new ApiResponse(200, 'Settings updated.', tenant));
});
