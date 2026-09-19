const nodemailer = require("nodemailer");

const createTransporter = () => {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

const sendPasswordResetEmail = async ({ email, otp }) => {
  await createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Your ProLance password reset code",
    text: [
      "We received a request to reset your ProLance password.",
      "",
      "Your ProLance password reset code is:",
      "",
      otp,
      "",
      "This code expires in 10 minutes and can only be used once.",
      "If you did not request a password reset, you can safely ignore this email.",
    ].join("\n"),
  });
};

module.exports = { sendPasswordResetEmail };
