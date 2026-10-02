const { sendContactEmail } = require("../utils/mailer");
const sendResponse = require("../utils/response");

// The project validates by hand in its controllers (there is no validator
// dependency), so the contact form follows the same approach.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = {
  name: { min: 2, max: 80 },
  email: { max: 254 },
  subject: { min: 3, max: 120 },
  message: { min: 10, max: 4000 },
};

// The topics the support inbox actually routes on. The client sends the same
// strings, and anything unrecognised is simply dropped rather than rejected so
// an old or hand-written client cannot fail a valid submission.
const TOPICS = [
  "Account",
  "Project",
  "Contract",
  "Delivery",
  "Dispute",
  "Payments",
  "General question",
];

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");

const sendContactMessage = async (req, res, next) => {
  try {
    const name = cleanString(req.body?.name);
    const email = cleanString(req.body?.email);
    const subject = cleanString(req.body?.subject);
    const message = cleanString(req.body?.message);
    const topic = TOPICS.includes(cleanString(req.body?.topic))
      ? cleanString(req.body?.topic)
      : "";

    if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) {
      return sendResponse(
        res,
        400,
        `Name must be between ${LIMITS.name.min} and ${LIMITS.name.max} characters`,
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    if (!emailPattern.test(email) || email.length > LIMITS.email.max) {
      return sendResponse(
        res,
        400,
        "A valid email address is required",
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    if (subject.length < LIMITS.subject.min || subject.length > LIMITS.subject.max) {
      return sendResponse(
        res,
        400,
        `Subject must be between ${LIMITS.subject.min} and ${LIMITS.subject.max} characters`,
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    if (message.length < LIMITS.message.min || message.length > LIMITS.message.max) {
      return sendResponse(
        res,
        400,
        `Message must be between ${LIMITS.message.min} and ${LIMITS.message.max} characters`,
        null,
        { code: "VALIDATION_ERROR" },
      );
    }

    try {
      await sendContactEmail({ name, email, subject, message, topic });
    } catch (mailError) {
      // The cause is logged rather than returned. A visitor must not be able to
      // learn the SMTP host, the configured account, or a provider stack trace
      // from the error text.
      console.error("Contact form delivery failed:", mailError.message);
      return sendResponse(
        res,
        503,
        "Your message could not be sent right now. Please try again shortly.",
        null,
        { code: "MAIL_DELIVERY_FAILED" },
      );
    }

    return sendResponse(
      res,
      200,
      "Message sent successfully",
      { topic: topic || null },
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = { sendContactMessage };
