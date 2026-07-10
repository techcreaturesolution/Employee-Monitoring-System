import { Resend } from 'resend';
import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

interface SendEmailResult {
  success: boolean;
  previewUrl?: string;
  error?: string;
}

let resendClient: Resend | null = null;
const getResendClient = (): Resend => {
  if (!config.email.resendApiKey) {
    throw new Error('RESEND_API_KEY is not set but EMAIL_MODE=resend.');
  }
  if (!resendClient) {
    resendClient = new Resend(config.email.resendApiKey);
  }
  return resendClient;
};

let smtpTransport: Transporter | null = null;
const getSmtpTransport = (): Transporter => {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: { user: config.email.smtp.user, pass: config.email.smtp.pass },
    });
  }
  return smtpTransport;
};

let sandboxTransportPromise: Promise<Transporter> | null = null;
const getSandboxTransport = (): Promise<Transporter> => {
  if (!sandboxTransportPromise) {
    sandboxTransportPromise = nodemailer.createTestAccount().then((testAccount) => {
      logger.info(`📧 Sandbox email account created: ${testAccount.user}`);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
    });
  }
  return sandboxTransportPromise;
};

export const sendEmail = async ({ to, subject, html, replyTo }: SendEmailOptions): Promise<SendEmailResult> => {
  const from = `${config.email.fromName} <${config.email.fromAddress}>`;

  let lastError: any = null;

  // 1. Try SMTP First
  try {
    if (config.email.smtp.user && config.email.smtp.pass) {
      const transport = getSmtpTransport();
      await transport.sendMail({ from, to, subject, html, replyTo });
      logger.info(`Email sent via SMTP to ${to}: "${subject}"`);
      return { success: true };
    }
  } catch (error) {
    lastError = error;
    logger.warn(`SMTP failed for ${to}, falling back to Resend API. Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // 2. Fallback to Resend API
  try {
    if (config.email.resendApiKey) {
      const client = getResendClient();
      const { error } = await client.emails.send({ from, to, subject, html, replyTo });
      if (error) throw new Error(error.message);
      logger.info(`Email sent via Resend to ${to}: "${subject}"`);
      return { success: true };
    }
  } catch (error) {
    lastError = error;
    logger.warn(`Resend failed for ${to}, falling back to Sandbox. Error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  // 3. Fallback to Sandbox (Ethereal)
  try {
    const transport = await getSandboxTransport();
    const info = await transport.sendMail({ from, to, subject, html, replyTo });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    logger.info(`📧 [SANDBOX] Email captured for ${to}: "${subject}"`);
    if (previewUrl) logger.info(`📧 [SANDBOX] Preview: ${previewUrl}`);
    return { success: true, previewUrl };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    logger.error(`Failed to send email to ${to} ("${subject}") even with sandbox: ${message}`);
    return { success: false, error: message };
  }
};

export const verifyEmailConnection = async () => {
  logger.info('📧 Email Service Initializing...');

  if (config.email.smtp.user && config.email.smtp.pass) {
    try {
      const transport = getSmtpTransport();
      await transport.verify();
      logger.info('📧 Email Service: SMTP Ready (Primary)');
    } catch (error: any) {
      logger.warn(`📧 Email Service: SMTP Verification Failed - ${error.message}`);
    }
  } else {
    logger.info('📧 Email Service: SMTP Not Configured');
  }

  if (config.email.resendApiKey) {
    logger.info('📧 Email Service: Resend API Configured (Fallback)');
  }

  logger.info('📧 Email Service: Sandbox Mode (Ethereal) available as final fallback');
};
