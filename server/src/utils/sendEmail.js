import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (env.email.smtp.host && env.email.smtp.auth.user && env.email.smtp.auth.pass) {
    const isGmail = env.email.smtp.host.includes('gmail');
    transporter = nodemailer.createTransport(
      isGmail
        ? { service: 'gmail', auth: { user: env.email.smtp.auth.user, pass: env.email.smtp.auth.pass } }
        : { host: env.email.smtp.host, port: env.email.smtp.port || 587, secure: env.email.smtp.port === 465, auth: { user: env.email.smtp.auth.user, pass: env.email.smtp.auth.pass }, tls: { rejectUnauthorized: false } }
    );
  }

  if (!transporter) {
    console.warn('SMTP not configured — emails logged to console');
    transporter = {
      sendMail: async (opts) => { console.log('EMAIL:', opts.subject, '->', opts.to); return { messageId: 'mock-' + Date.now() }; },
    };
  }

  return transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!env.email.enabled) { console.log('Email disabled'); return null; }

  const from = { name: 'Gravity HRMS', address: env.email.smtp.auth.user || 'noreply@gravityhrms.com' };

  try {
    const info = await getTransporter().sendMail({ from, to, subject, text, html });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email failed:', error.message);
    transporter = null;
    return null;
  }
};
