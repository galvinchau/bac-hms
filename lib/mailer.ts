// web/lib/mailer.ts
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  MOBILE_APP_LOGIN_URL,
} = process.env;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    console.warn("[mail] Missing SMTP config, skip sending email.", {
      host: SMTP_HOST,
      user: SMTP_USER,
      from: EMAIL_FROM,
    });
    return null;
  }

  const portNumber = SMTP_PORT ? Number(SMTP_PORT) : 587;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: portNumber,
    secure: portNumber === 465, // 587 = STARTTLS, 465 = SSL
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

interface MobileUserEmployee {
  firstName: string;
  lastName?: string | null;
  email: string;
  employeeId: string;
}

/**
 * Send mobile app access email to employee
 */
export async function sendMobileUserAccessEmail(
  employee: MobileUserEmployee
): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;

  if (!employee.email) {
    console.warn("[mail] No email on employee, skip sending.");
    return;
  }

  const fullName =
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "there";

  const loginUrl =
    MOBILE_APP_LOGIN_URL || "https://blueangelscare.org/mobile-login";

  const to = employee.email;

  console.log("[mail] Sending mobile access email", {
    to,
    employeeId: employee.employeeId,
  });

  const subject = "Blue Angels Care - Mobile App Access";

  const text = `Hello ${fullName},

Your mobile access for Blue Angels Care has been activated.

Employee ID: ${employee.employeeId}
Login email: ${to}

Please click the link below to open the mobile login screen and sign in:
${loginUrl}

If this message was not intended for you or you have trouble logging in, please contact the Blue Angels Care office.

Thank you,
Blue Angels Care Support Team
`;

  const html = `
<p>Hello <strong>${fullName}</strong>,</p>

<p>Your mobile access for <strong>Blue Angels Care</strong> has been activated.</p>

<ul>
  <li><strong>Employee ID:</strong> ${employee.employeeId}</li>
  <li><strong>Login email:</strong> ${to}</li>
</ul>

<p>Please click the link below to open the mobile login screen and sign in:</p>

<p><a href="${loginUrl}" target="_blank">${loginUrl}</a></p>

<p>If this message was not intended for you or you have trouble logging in, please contact the Blue Angels Care office.</p>

<p>Thank you,<br/>
Blue Angels Care Support Team</p>
`;

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });

    console.log("[mail] Email sent successfully.", {
      to,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error("[mail] Failed to send mobile user email:", error);
  }
}
