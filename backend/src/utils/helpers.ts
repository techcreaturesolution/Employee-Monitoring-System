import { v4 as uuidv4 } from "uuid";
import jwt, { SignOptions } from "jsonwebtoken";
import { config } from "../config";
import { IUser } from "../modules/users/User.model";

const generateAgentKey = (): string => {
  return `ems_${uuidv4().replace(/-/g, "")}`;
};

const generateTokens = (user: IUser) => {
  const payload = {
    userId: user._id,
    role: user.role,
    tenantId: user.tenantId,
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expire,
  } as SignOptions);

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire,
  } as SignOptions);

  return { accessToken, refreshToken };
};

const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

const calculateWorkMinutes = (punchIn: Date, punchOut: Date): number => {
  const diff = punchOut.getTime() - punchIn.getTime();
  return Math.round(diff / (1000 * 60));
};

const getPlanLimits = (plan: string) => {
  const limits: Record<
    string,
    {
      maxEmployees: number;
      maxScreenshotsPerDay: number;
      screenshotInterval: number;
      dataRetentionDays: number;
    }
  > = {
    free: {
      maxEmployees: 5,
      maxScreenshotsPerDay: 50,
      screenshotInterval: 30,
      dataRetentionDays: 7,
    },
    starter: {
      maxEmployees: 25,
      maxScreenshotsPerDay: 500,
      screenshotInterval: 2,
      dataRetentionDays: 30,
    },
    business: {
      maxEmployees: 100,
      maxScreenshotsPerDay: 2000,
      screenshotInterval: 5,
      dataRetentionDays: 90,
    },
    enterprise: {
      maxEmployees: 9999,
      maxScreenshotsPerDay: 99999,
      screenshotInterval: 1,
      dataRetentionDays: 365,
    },
  };
  return limits[plan] || limits.free;
};

const paginate = (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  return { skip, limit: Math.min(limit, 100) };
};

const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const isInsideGeofence = (
  lat: number,
  lon: number,
  officeLocations: Array<{
    latitude: number;
    longitude: number;
    radiusMeters: number;
  }>
): boolean => {
  for (const office of officeLocations) {
    const distance = haversineDistance(
      lat,
      lon,
      office.latitude,
      office.longitude
    );
    if (distance <= office.radiusMeters) return true;
  }
  return false;
};

export {
  generateAgentKey,
  generateTokens,
  formatDate,
  calculateWorkMinutes,
  getPlanLimits,
  paginate,
  haversineDistance,
  isInsideGeofence,
};
