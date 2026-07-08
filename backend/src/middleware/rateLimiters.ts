import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Increased to 30 attempts to avoid blocking users
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    success: false,
    message: 'Too many login attempts. Try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: any, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Higher limit for token refreshes
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many refresh attempts.' },
});

export const screenshotLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 screenshots per minute
  skipSuccessfulRequests: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Raised to 5,000 to accommodate multi-agent background sync & admin portal live feeds
  message: 'Too many requests. Please try again later.',
});
