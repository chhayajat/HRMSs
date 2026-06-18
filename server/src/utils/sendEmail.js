import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;
let transporterVerified = false;

const getTransporter = () => {
  if (transporter && transporterVerified) return transporter;

  transporter = null;
  transporterVerified = false;

  if (env.email.smtp.host && env.email.smtp.auth.user) {
    transporter = nodemailer.createTransport({
      host: env.email.smtp.host,
      port: env.email.smtp.port,
      secure: env.email.smtp.secure,
      auth: {
        user: env.email.smtp.auth.user,
        pass: env.email.smtp.auth.pass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000
    });
    transporterVerified = true;
  }

  if (!transporter) {
    console.warn('Using console-log email fallback (no SMTP configured)');
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('\n--- EMAIL (console fallback) ---');
        console.log(`From: ${mailOptions.from}`);
        console.log(`To: ${mailOptions.to}`);
        console.log(`Subject: ${mailOptions.subject}`);
        console.log(`Text: ${mailOptions.text || '(html only)'}`);
        console.log('--------------------------------\n');
        return { messageId: `console-mock-${Date.now()}` };
      },
      close: () => {}
    };
    transporterVerified = true;
  }

  return transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!env.email.enabled) {
    console.log('Email notifications are disabled (ENABLE_EMAIL_NOTIFICATIONS=false)');
    return null;
  }

  try {
    const mailTransporter = getTransporter();
    const info = await mailTransporter.sendMail({
      from: env.email.from,
      to,
      subject,
      text,
      html
    });
    console.log(`Email sent to ${to} — messageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`SMTP sending failed (to: ${to}):`, error.message);
    transporterVerified = false;
    transporter = null;
    return null;
  }
};

export const resetTransporter = () => {
  try { transporter?.close?.(); } catch (_) {}
  transporter = null;
  transporterVerified = false;
};
