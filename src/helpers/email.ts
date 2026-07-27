// import nodemailer from "nodemailer";

// interface SendEmailOptions {
//   to: string;
//   subject: string;
//   text: string;
//   html?: string;
// }

// // 

// const sendEmail = async (options: SendEmailOptions): Promise<void> => {

//   const emailUser = process.env.EMAIL_USER;
//   const emailPass = process.env.EMAIL_PASS;
//   const emailFrom = process.env.EMAIL_FROM;
//   const emailHost = process.env.EMAIL_HOST ?? "smtp.gmail.com";
//   const emailPort = Number(process.env.EMAIL_PORT) || 587;



//   console.log("EMAIL_USER:", process.env.EMAIL_USER);
// console.log("EMAIL_FROM:", process.env.EMAIL_FROM);
// console.log("EMAIL_PASS EXISTS:", !!process.env.EMAIL_PASS);
// console.log("Sending email to:", options.to);



//   if (!emailUser || !emailPass || !emailFrom) {
//     throw new Error("Email configuration is incomplete");
//   }

//   try {

    
//   const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: emailUser,
//     pass: emailPass,
//   },
// });



//     await transporter.sendMail({
//       from: emailFrom,
//       to: options.to,
//       subject: options.subject,
//       text: options.text,
//       html: options.html,
//     });

//  } catch (error) {
//   console.error("EMAIL ERROR:", error);

//   const message =
//     error instanceof Error ? error.message : "Failed to send email";

//   throw new Error(message);
// }
// };

// export default sendEmail;z




// email send using by resent api 


import { Resend } from "resend";

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

// new about our self and the another sometimes and the anothe

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  const emailFrom = process.env.EMAIL_FROM;

  if (!process.env.RESEND_API_KEY) { 
    throw new Error("RESEND_API_KEY is missing");
  }

  if (!emailFrom) {
    throw new Error("EMAIL_FROM is missing");
  }

  try {
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

    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    throw error;
  }
};

export default sendEmail;
