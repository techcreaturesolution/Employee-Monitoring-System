import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const resendClient = config.email.resendApiKey ? new Resend(config.email.resendApiKey) : null;

const smtpTransport = nodemailer.createTransport({
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  secure: config.email.smtp.port === 465,
  auth: { user: config.email.smtp.user, pass: config.email.smtp.pass },
});

export const sendEmail = async ({ to, subject, html }: SendEmailOptions): Promise<boolean> => {
  try {
    if (config.email.service === 'resend' && resendClient) {
      await resendClient.emails.send({ from: config.email.from, to, subject, html });
    } else {
      await smtpTransport.sendMail({ from: config.email.from, to, subject, html });
    }
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    return false;
  }
};
