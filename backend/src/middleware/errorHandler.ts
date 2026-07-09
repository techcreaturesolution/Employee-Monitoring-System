import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: Error | AppError, req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof AppError || (err as any).statusCode) {
    statusCode = (err as any).statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if ((err as unknown as Record<string, unknown>).code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry found';
  }

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const isDatabaseError = 
      err.name.includes('Mongo') || 
      err.name.includes('Mongoose') || 
      err.message.includes('Mongo') || 
      err.message.includes('Mongoose') ||
      err.stack?.includes('mongodb') ||
      err.stack?.includes('mongoose');

    if (isDatabaseError) {
      // Extract collection name if possible
      let collection = 'N/A';
      const collectionMatch = err.message.match(/collection:\s*([^\s]+)/i);
      if (collectionMatch) {
        collection = collectionMatch[1];
      } else {
        // Guess from URL path
        const pathParts = req.originalUrl.split('/');
        const lastPart = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
        if (lastPart && !lastPart.startsWith(':')) {
          collection = lastPart;
        }
      }

      console.log('\n❌ Database Error\n');
      console.log('Collection\n');
      console.log(collection);
      console.log('\nMessage\n');
      console.log(err.message);
      console.log('\nRetrying...\n');
    } else {
      console.log('\n❌ API Error\n');
      console.log(`Endpoint : ${req.originalUrl || req.url}`);
      console.log(`Status   : ${statusCode}`);
      console.log('\nMessage\n');
      console.log(message);
      if (err.stack) {
        console.log('\nStack\n');
        // Print first 3 lines of stack trace for readability
        console.log(err.stack.split('\n').slice(1, 4).join('\n'));
      }
      console.log('\n────────────────────────────');
    }
  } else {
    // Production JSON logging via winston
    logger.error('error', {
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'ems-api',
      event: 'api_error',
      endpoint: req.originalUrl || req.url,
      status: statusCode,
      message,
      stack: err.stack
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};
