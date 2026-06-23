import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  userId: string;
  role: string;
  tenantId: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    const user = await User.findById(decoded.userId);

    if (!user || user.status !== 'active') {
      res.status(401).json({ success: false, message: 'Invalid token or user inactive.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Not authorized to access this resource.' });
      return;
    }
    next();
  };
};

export const authenticateAgent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agentKey = req.headers['x-agent-key'] as string;
    if (!agentKey) {
      res.status(401).json({ success: false, message: 'Agent key required.' });
      return;
    }

    const user = await User.findOne({ agentKey, status: 'active' });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid agent key.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Agent authentication failed.' });
  }
};
