import nodemailer from "nodemailer";
import { Resend } from "resend";
import prismaClient from "../config/prisma";
import AppError from "../utils/AppError";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Normalizes error messages from Nodemailer into user-safe AppError instances
 */
const handleSmtpError = (error: unknown, providerLabel: string): never => {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error as { code?: string })?.code;
  const responseCode = (error as { responseCode?: number })?.responseCode;

  if (errCode === "EAUTH" || responseCode === 535 || errMessage.includes("535")) {
    console.error(`[SMTP Error] Authentication Failed (${providerLabel}): Invalid credentials.`);
    throw new AppError(500, "SMTP Authentication Failed: Invalid email username or password.");
  }

  if (errCode === "ECONNREFUSED" || errCode === "ETIMEDOUT" || errCode === "ESOCKET") {
    console.error(`[SMTP Error] SMTP Connection Failed (${providerLabel}): ${errMessage}`);
    throw new AppError(500, "SMTP Connection Failed: Unable to connect to mail server.");
  }

  if (errCode === "EENVELOPE" || errMessage.includes("recipient")) {
    console.error(`[SMTP Error] Invalid Recipient (${providerLabel}): ${errMessage}`);
    throw new AppError(400, "Invalid recipient email address.");
  }

  console.error(`[SMTP Error] Email Dispatch Failed (${providerLabel}): ${errMessage}`);
  throw new AppError(500, `Failed to send email: ${errMessage}`);
};

const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  try {
    // 1. Environment Variables (.env) Priority
    const envHost = process.env.EMAIL_HOST || process.env.SMTP_HOST;
    const envPort = process.env.EMAIL_PORT || process.env.SMTP_PORT;
    const envUser = process.env.EMAIL_USER || process.env.SMTP_USER;
    const rawEnvPass = process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;
    const envFrom = process.env.EMAIL_FROM;

    if (envHost && envUser && rawEnvPass) {
      const port = parseInt(String(envPort || "587"), 10);
      const pass = rawEnvPass.replace(/\s+/g, "");
      const from = envFrom || `"${envUser}" <${envUser}>`;

      const transporter = nodemailer.createTransport({
        host: envHost,
        port,
        secure: port === 465,
        requireTLS: port === 587,
        auth: {
          user: envUser,
          pass,
        },
      });

      // Verify SMTP Transporter Connection
      try {
        await transporter.verify();
      } catch (verifyError) {
        handleSmtpError(verifyError, "SMTP (.env)");
      }

      // Send Email
      try {
        await transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        console.log(`Email sent via SMTP (.env) to ${options.to}`);
        return;
      } catch (sendError) {
        handleSmtpError(sendError, "SMTP (.env)");
      }
    }

    // 2. Database AppSetting Priority (Fallback when .env is missing)
    const settings = await prismaClient.appSetting.findFirst({
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUsername: true,
        smtpPassword: true,
        senderName: true,
        senderEmail: true,
      },
    });

    if (settings?.smtpHost && settings?.smtpUsername && settings?.smtpPassword) {
      const port = settings.smtpPort || 587;
      const pass = settings.smtpPassword.replace(/\s+/g, "");
      const from = settings.senderName
        ? `"${settings.senderName}" <${settings.senderEmail || settings.smtpUsername}>`
        : settings.senderEmail || settings.smtpUsername;

      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port,
        secure: port === 465,
        requireTLS: port === 587,
        auth: {
          user: settings.smtpUsername,
          pass,
        },
      });

      // Verify Database SMTP Connection
      try {
        await transporter.verify();
      } catch (verifyError) {
        handleSmtpError(verifyError, "SMTP (Database)");
      }

      // Send Email
      try {
        await transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        console.log(`Email sent via SMTP (Database) to ${options.to}`);
        return;
      } catch (sendError) {
        handleSmtpError(sendError, "SMTP (Database)");
      }
    }

    // 3. Resend API Priority (Fallback when env SMTP & DB SMTP are missing)
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailFrom = process.env.EMAIL_FROM;

      const { error } = await resend.emails.send({
        from: emailFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      if (error) {
        console.error("RESEND ERROR:", error.message);
        throw new AppError(500, `Resend API Error: ${error.message}`);
      }

      console.log(`Email sent via Resend API to ${options.to}`);
      return;
    }

    // Missing Environment Variables / No email provider available
    console.error("[SMTP Error] Missing Environment Variables: No valid SMTP or Resend email configuration found.");
    throw new AppError(500, "Email service is not configured. Missing environment variables.");
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Unknown email error";
    console.error("EMAIL SEND ERROR:", message);
    throw new AppError(500, message);
  }
};

export default sendEmail;
