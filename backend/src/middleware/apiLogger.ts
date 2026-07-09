import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface ExtendedRequest extends Request {
  _startTime?: [number, number];
  user?: any;
}

export const apiLogger = (req: ExtendedRequest, res: Response, next: NextFunction): void => {
  req._startTime = process.hrtime();

  res.on('finish', () => {
    const isDev = process.env.NODE_ENV !== 'production';
    const durationHR = process.hrtime(req._startTime);
    const durationMs = Math.round(durationHR[0] * 1000 + durationHR[1] / 1e6);

    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;
    const ip = req.ip || req.socket.remoteAddress || '::1';
    
    // Attempt to retrieve user info if authenticated
    const employeeId = req.user?.employeeId || 'N/A';

    if (isDev) {
      // Development console logging
      const arrow = method === 'GET' ? '📥' : '📤';
      console.log(`\n${arrow} ${method} ${url}\n`);
      console.log(`Status      : ${status}`);
      console.log(`Duration    : ${durationMs} ms`);
      console.log(`Employee    : ${employeeId}`);
      console.log(`IP          : ${ip}`);

      // If method is POST/PUT/DELETE/PATCH and request has body, print payload
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && req.body && Object.keys(req.body).length > 0) {
        console.log('Payload\n');
        console.log(JSON.stringify(req.body, null, 2));
      }
      console.log('\n────────────────────────────');
    } else {
      // Production logging (compact JSON via winston)
      logger.info('api_request', {
        timestamp: new Date().toISOString(),
        level: 'info',
        service: 'ems-api',
        event: 'api_request',
        method,
        url,
        status,
        duration: durationMs,
        employeeId,
        ip
      });
    }
  });

  next();
};
