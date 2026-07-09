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

  try {
    switch (config.email.mode) {
      case 'resend': {
        const client = getResendClient();
        const { error } = await client.emails.send({ from, to, subject, html, replyTo });
        if (error) throw new Error(error.message);
        logger.info(`Email sent via Resend to ${to}: "${subject}"`);
        return { success: true };
      }

      case 'smtp': {
        const transport = getSmtpTransport();
        await transport.sendMail({ from, to, subject, html, replyTo });
        logger.info(`Email sent via SMTP to ${to}: "${subject}"`);
        return { success: true };
      }

      case 'sandbox':
      default: {
        const transport = await getSandboxTransport();
        const info = await transport.sendMail({ from, to, subject, html, replyTo });
        const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
        logger.info(`📧 [SANDBOX] Email captured for ${to}: "${subject}"`);
        if (previewUrl) logger.info(`📧 [SANDBOX] Preview: ${previewUrl}`);
        return { success: true, previewUrl };
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    logger.error(`Failed to send email to ${to} ("${subject}"): ${message}`);
    return { success: false, error: message };
  }
};

export const verifyEmailConnection = async () => {
  if (config.email.mode === 'resend') {
    logger.info('📧 Email Service: Ready (Resend API)');
  } else if (config.email.mode === 'smtp') {
    try {
      const transport = getSmtpTransport();
      await transport.verify();
      logger.info('📧 Email Service: Ready (SMTP)');
    } catch (error: any) {
      logger.warn(`📧 Email Service: SMTP Verification Failed - ${error.message}`);
    }
  } else {
    logger.info('📧 Email Service: Ready (Sandbox Mode - using Ethereal)');
  }
};
