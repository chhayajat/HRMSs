import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';

// Load env variables
dotenv.config();

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid('production', 'development', 'test').default('development'),
  PORT: Joi.number().default(5000),
  MONGODB_URI: Joi.string().allow('').default('memory'),
  JWT_SECRET: Joi.string().required().description('JWT access token secret'),
  JWT_REFRESH_SECRET: Joi.string().required().description('JWT refresh token secret'),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
  SMTP_HOST: Joi.string().description('SMTP server host'),
  SMTP_PORT: Joi.number().description('SMTP server port'),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().description('SMTP server username'),
  SMTP_PASS: Joi.string().description('SMTP server password'),
  EMAIL_FROM: Joi.string().default('Gravity HRMS <noreply@gravityhrms.com>'),
  ENABLE_EMAIL_NOTIFICATIONS: Joi.boolean().default(true),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),
  CLIENT_URL: Joi.string().uri().default('http://localhost:5173'),
  SERVER_BASE_URL: Joi.string().uri().default('http://localhost:5000')
}).unknown();

const { value: envVars, error } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Populate process.env with Joi defaults
process.env.CLIENT_URL = envVars.CLIENT_URL;
process.env.SERVER_BASE_URL = envVars.SERVER_BASE_URL;

export const env = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  clientUrl: envVars.CLIENT_URL,
  serverBaseUrl: envVars.SERVER_BASE_URL,
  mongoose: {
    uri: envVars.MONGODB_URI,
    options: {}
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessExpiration: envVars.JWT_ACCESS_EXPIRY,
    refreshExpiration: envVars.JWT_REFRESH_EXPIRY
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST || 'smtp.gmail.com',
      port: envVars.SMTP_PORT || 587,
      secure: envVars.SMTP_SECURE || false,
      auth: {
        user: envVars.SMTP_USER,
        pass: envVars.SMTP_PASS
      }
    },
    from: envVars.EMAIL_FROM || 'Gravity HRMS <noreply@gravityhrms.com>',
    enabled: envVars.ENABLE_EMAIL_NOTIFICATIONS
  },
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET
  }
};
