// web/lib/mailer.ts
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;
const MOBILE_APP_LOGIN_URL =
  process.env.MOBILE_APP_LOGIN_URL || "https://blueangelscare.org/mobile-login";

function isEmailConfigValid() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      "[MAILER] Missing SMTP config (SMTP_HOST / SMTP_USER / SMTP_PASS). Email will not be sent."
    );
    return false;
  }
  return true;
}

export async function sendMobileUserWelcomeEmail(args: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  employeeId: string;
}) {
  if (!isEmailConfigValid()) return;
  if (!args.email) {
    console.warn("[MAILER] Missing employee email. Skip sending.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // port 587 -> TLS
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const fullName =
    [args.firstName, args.lastName].filter(Boolean).join(" ") || "Team Member";

  const subject = "Blue Angels Care - Mobile App Access";

  const textBody = `
Hello ${fullName},

Your mobile access for Blue Angels Care has been activated.

Employee ID: ${args.employeeId}
Login email: ${args.email}

Please use the link below to open the mobile login screen and sign in:

${MOBILE_APP_LOGIN_URL}

If this message was not intended for you or you have trouble logging in,
please contact the Blue Angels Care office.

Thank you,
Blue Angels Care Support Team
`;

  const htmlBody = `
<p>Hello <strong>${fullName}</strong>,</p>

<p>Your mobile access for <strong>Blue Angels Care</strong> has been activated.</p>

<ul>
  <li><strong>Employee ID:</strong> ${args.employeeId}</li>
  <li><strong>Login email:</strong> ${args.email}</li>
</ul>

<p>Please click the link below to open the mobile login screen and sign in:</p>

<p><a href="${MOBILE_APP_LOGIN_URL}" target="_blank" rel="noopener noreferrer">
  ${MOBILE_APP_LOGIN_URL}
</a></p>

<p>If this message was not intended for you or you have trouble logging in,
please contact the Blue Angels Care office.</p>

<p>Thank you,<br/>
Blue Angels Care Support Team</p>
`;

  await transporter.sendMail({
    from: EMAIL_FROM || SMTP_USER,
    to: args.email,
    subject,
    text: textBody,
    html: htmlBody,
  });

  console.log("[MAILER] Mobile user welcome email sent to", args.email);
}
