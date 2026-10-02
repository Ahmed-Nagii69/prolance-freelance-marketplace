const nodemailer = require("nodemailer");

const createTransporter = () => {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    const error = new Error("Email service is not configured");
    error.code = "MAILER_NOT_CONFIGURED";
    throw error;
  }

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

/**
 * Strips characters that would let visitor input break out of a mail header or
 * inject extra headers. Nodemailer folds most of this, but the subject and the
 * Reply-To address are header values, so they are cleaned before they are used.
 */
const sanitizeHeaderValue = (value) =>
  String(value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();

/**
 * Delivers a contact form submission to the support inbox.
 *
 * The body is sent as text/plain only. Nothing submitted through the form is
 * ever treated as markup, so visitor input cannot introduce HTML into the mail.
 * The submitter's address becomes Reply-To, so answering from the inbox reaches
 * the person who wrote in without any reply-to address being hardcoded here.
 */
const sendContactEmail = async ({ name, email, subject, message, topic }) => {
  const to = sanitizeHeaderValue(process.env.CONTACT_EMAIL || "");
  if (!to) {
    const error = new Error("Contact inbox is not configured");
    error.code = "MAILER_NOT_CONFIGURED";
    throw error;
  }

  const lines = [
    "New ProLance Contact Message",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject}`,
  ];

  if (topic) {
    lines.push(`Topic: ${topic}`);
  }

  lines.push("", "Message:", "", message, "", "--", "Sent from the ProLance contact form.");

  await createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    replyTo: sanitizeHeaderValue(email),
    subject: sanitizeHeaderValue(`[ProLance Contact] ${subject}`),
    text: lines.join("\n"),
  });
};

module.exports = { sendPasswordResetEmail, sendContactEmail };
