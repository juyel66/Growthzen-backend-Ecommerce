import nodemailer from "nodemailer";
import { Resend } from "resend";
import prismaClient from "../config/prisma";

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  try {
    // 1. Check SMTP settings from AppSetting in database
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
      const from = settings.senderName
        ? `"${settings.senderName}" <${settings.senderEmail || settings.smtpUsername}>`
        : settings.senderEmail || settings.smtpUsername;

      const transporter = nodemailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort || 587,
        secure: settings.smtpPort === 465,
        auth: {
          user: settings.smtpUsername,
          pass: settings.smtpPassword,
        },
      });

      await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log(`Email sent via configured SMTP to ${options.to}`);
      return;
    }

    // 2. Fallback to Resend API if configured in env
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
        console.error("RESEND ERROR:", error);
        throw new Error(error.message);
      }

      console.log(`Email sent via Resend API to ${options.to}`);
      return;
    }

    console.log(`[Email Notice] Email dispatch simulated for ${options.to}`);
  } catch (error) {
    console.error("EMAIL SEND ERROR:", error);
    throw error;
  }
};

export default sendEmail;
