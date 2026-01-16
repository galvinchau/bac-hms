// web/lib/mailer.ts
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  MOBILE_APP_LOGIN_URL,

  // ✅ Optional for BAC-HMS
  HMS_LOGIN_URL,
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

// ✅ NEW: Welcome email for BAC-HMS Office/Admin user
export async function sendHmsWelcomeEmail(args: {
  email: string;
  firstName: string;
  lastName?: string | null;
  tempPassword: string;
}): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;

  const { email, firstName, lastName, tempPassword } = args;
  if (!email) return;

  const fullName = `${firstName || ""} ${lastName || ""}`.trim() || "there";

  // ✅ Always prefer production URL; fallback to env; fallback to localhost
  const loginUrl =
    "https://hms.blueangelscare.org" ||
    HMS_LOGIN_URL ||
    "http://localhost:3000/login";

  const subject = "Welcome to Blue Angels Care – BAC-HMS Account Access";

  const text = `Hello ${fullName},

Welcome to Blue Angels Care.

Your BAC-HMS (Blue Angels Care – Health Management System) account has been created to support your work and collaboration within our organization.

Your Login Information
- Username / Email: ${email}
- Temporary Password: ${tempPassword}

Login here:
${loginUrl}

First-Time Login Requirement
For security and compliance purposes, you will be required to change your password upon your first login.

Policies & Acceptable Use
By using your BAC-HMS account, you acknowledge and agree to:
- Comply with Blue Angels Care policies, procedures, and confidentiality standards
- Protect all client, staff, and organizational information
- Use system access only for authorized, work-related purposes
- Keep your login credentials secure and never share them with others

Support & Assistance
If you have questions or experience any issues accessing BAC-HMS, please contact our support team:
Email: galvin.chau@gmail.com

If you did not expect to receive this email, please notify us immediately.

Warm regards,
Blue Angels Care Support Team
`;

  const html = `
<p>Hello <strong>${fullName}</strong>,</p>

<p>Welcome to <strong>Blue Angels Care</strong>.</p>

<p>
  Your <strong>BAC-HMS (Blue Angels Care – Health Management System)</strong> account has been created to support your work and collaboration within our organization.
</p>

<hr/>

<h3 style="margin: 12px 0 6px 0;">🔐 Your Login Information</h3>
<ul>
  <li><strong>Username / Email:</strong> ${email}</li>
  <li><strong>Temporary Password:</strong> ${tempPassword}</li>
</ul>

<p><strong>Login here:</strong><br/>
<a href="${loginUrl}" target="_blank" rel="noreferrer">${loginUrl}</a></p>

<hr/>

<h3 style="margin: 12px 0 6px 0;">🔄 First-Time Login Requirement</h3>
<p>
  For security and compliance purposes, you will be required to <strong>change your password upon your first login</strong>.
</p>

<h3 style="margin: 12px 0 6px 0;">📋 Policies &amp; Acceptable Use</h3>
<p>By using your BAC-HMS account, you acknowledge and agree to:</p>
<ul>
  <li>Comply with <strong>Blue Angels Care policies, procedures, and confidentiality standards</strong></li>
  <li>Protect all client, staff, and organizational information</li>
  <li>Use system access <strong>only for authorized, work-related purposes</strong></li>
  <li>Keep your login credentials secure and never share them with others</li>
</ul>
<p>Any misuse of system access may result in corrective action in accordance with company policy.</p>

<h3 style="margin: 12px 0 6px 0;">🛠 Support &amp; Assistance</h3>
<p>
  If you have questions or experience any issues accessing BAC-HMS, please contact our support team:<br/>
  <strong>Email:</strong> <a href="mailto:galvin.chau@gmail.com">galvin.chau@gmail.com</a>
</p>

<p>If you did not expect to receive this email, please notify us immediately.</p>

<p>
  Warm regards,<br/>
  <strong>Blue Angels Care Support Team</strong><br/>
  Blue Angels Care – Health Management System (BAC-HMS)<br/>
  <a href="${loginUrl}" target="_blank" rel="noreferrer">${loginUrl}</a>
</p>
`;

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject,
      text,
      html,
    });
    console.log("[mail] HMS welcome email sent.", { to: email });
  } catch (error) {
    console.error("[mail] Failed to send HMS welcome email:", error);
  }
}
