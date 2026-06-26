import { Response } from 'express';
import { LocationLog } from '../models/LocationLog';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { AuthRequest } from '../middleware/auth';
import { isInsideGeofence, paginate } from '../utils/helpers';

export const trackLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const { latitude, longitude, accuracy, address, source, batteryLevel, networkType } = req.body;

    if (!latitude || !longitude) {
      res.status(400).json({ success: false, message: 'Latitude and longitude are required.' });
      return;
    }

    const tenant = await Tenant.findById(tenantId);
    const officeLocations = tenant?.settings?.officeLocations || [];
    const insideGeofence = isInsideGeofence(latitude, longitude, officeLocations);
    const workMode = req.user?.workMode || 'office';

    const locationLog = await LocationLog.create({
      userId,
      tenantId,
      latitude,
      longitude,
      accuracy: accuracy || 0,
      address: address || '',
      source: source || 'mobile',
      workMode,
      isInsideGeofence: insideGeofence,
      batteryLevel: batteryLevel ?? -1,
      networkType: networkType || '',
      timestamp: new Date(),
    });

    await User.findByIdAndUpdate(userId, {
      lastKnownLocation: {
        latitude,
        longitude,
        address: address || '',
        updatedAt: new Date(),
      },
      lastActive: new Date(),
      isOnline: true,
    });

    res.status(201).json({
      success: true,
      data: {
        locationLog,
        isInsideGeofence: insideGeofence,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Location tracking failed.', error: (error as Error).message });
  }
};

export const batchTrackLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      res.status(400).json({ success: false, message: 'Locations array is required.' });
      return;
    }

    const tenant = await Tenant.findById(tenantId);
    const officeLocations = tenant?.settings?.officeLocations || [];
    const workMode = req.user?.workMode || 'office';

    const docs = locations.map((loc: Record<string, unknown>) => ({
      userId,
      tenantId,
      latitude: loc.latitude as number,
      longitude: loc.longitude as number,
      accuracy: (loc.accuracy as number) || 0,
      address: (loc.address as string) || '',
      source: (loc.source as string) || 'mobile',
      workMode,
      isInsideGeofence: isInsideGeofence(
        loc.latitude as number,
        loc.longitude as number,
        officeLocations
      ),
      batteryLevel: (loc.batteryLevel as number) ?? -1,
      networkType: (loc.networkType as string) || '',
      timestamp: loc.timestamp ? new Date(loc.timestamp as string) : new Date(),
    }));

    await LocationLog.insertMany(docs);

    const last = locations[locations.length - 1];
    await User.findByIdAndUpdate(userId, {
      lastKnownLocation: {
        latitude: last.latitude,
        longitude: last.longitude,
        address: last.address || '',
        updatedAt: new Date(),
      },
      lastActive: new Date(),
      isOnline: true,
    });

    res.status(201).json({ success: true, message: `${docs.length} locations logged.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Batch location tracking failed.', error: (error as Error).message });
  }
};

export const getLocationHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { userId, startDate, endDate, page = 1, limit = 50 } = req.query;
    const { skip, limit: lim } = paginate(Number(page), Number(limit));

    const filter: Record<string, unknown> = { tenantId };

    if (req.user?.role === 'employee') {
      filter.userId = req.user._id;
    } else if (userId) {
      filter.userId = userId;
    }

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) (filter.timestamp as Record<string, unknown>).$gte = new Date(startDate as string);
      if (endDate) (filter.timestamp as Record<string, unknown>).$lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      LocationLog.find(filter)
        .populate('userId', 'name email employeeId department workMode')
        .skip(skip)
        .limit(lim)
        .sort({ timestamp: -1 }),
      LocationLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { total, page: Number(page), limit: lim, pages: Math.ceil(total / lim) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get location history.', error: (error as Error).message });
  }
};

export const getLiveLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;

    const employees = await User.find(
      { tenantId, status: 'active', isOnline: true },
      'name email department workMode lastKnownLocation isOnline lastActive'
    );

    const liveData = employees
      .filter((e) => e.lastKnownLocation?.latitude && e.lastKnownLocation?.longitude)
      .map((e) => ({
        userId: e._id,
        name: e.name,
        email: e.email,
        department: e.department,
        workMode: e.workMode,
        location: e.lastKnownLocation,
        isOnline: e.isOnline,
        lastActive: e.lastActive,
      }));

    res.json({ success: true, data: liveData });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get live locations.', error: (error as Error).message });
  }
};

export const checkGeofence = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      res.status(400).json({ success: false, message: 'Latitude and longitude are required.' });
      return;
    }

    const tenant = await Tenant.findById(tenantId);
    const officeLocations = tenant?.settings?.officeLocations || [];
    const inside = isInsideGeofence(latitude, longitude, officeLocations);

    res.json({
      success: true,
      data: {
        isInsideGeofence: inside,
        officeLocations: officeLocations.map((o) => ({
          name: o.name,
          latitude: o.latitude,
          longitude: o.longitude,
          radiusMeters: o.radiusMeters,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Geofence check failed.', error: (error as Error).message });
  }
};

export const getLocationTrail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tenantId = req.user?.tenantId;
    const { userId, date } = req.query;

    if (!userId || !date) {
      res.status(400).json({ success: false, message: 'userId and date are required.' });
      return;
    }

    const startOfDay = new Date(date as string);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date as string);
    endOfDay.setHours(23, 59, 59, 999);

    const trail = await LocationLog.find({
      tenantId,
      userId,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ timestamp: 1 });

    res.json({ success: true, data: trail });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get location trail.', error: (error as Error).message });
  }
};
