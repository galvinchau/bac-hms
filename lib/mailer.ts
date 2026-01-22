// web/lib/mailer.ts
import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,

  // Existing
  MOBILE_APP_LOGIN_URL,

  // ✅ NEW: Mobile download links (easy to swap later)
  MOBILE_IOS_DOWNLOAD_URL,
  MOBILE_ANDROID_DOWNLOAD_URL,

  // ✅ Optional for BAC-HMS
  HMS_LOGIN_URL,
} = process.env;

/**
 * Ensure Gmail shows a friendly sender name.
 * If EMAIL_FROM is just an email address, we wrap it as:
 *   "Blue Angels Care" <email@domain.com>
 * If EMAIL_FROM already contains a name (or angle brackets), we keep it unchanged.
 */
function normalizeFrom(rawFrom: string | undefined): string | null {
  if (!rawFrom) return null;

  const from = rawFrom.trim();
  if (!from) return null;

  // If already formatted like: Name <email> or "Name" <email>, keep it.
  if (from.includes("<") && from.includes(">")) return from;

  // If contains quotes (someone already added a name), keep it.
  if (from.includes('"')) return from;

  // Otherwise treat it as plain email address.
  // Default display name:
  const displayName = "Blue Angels Care";
  return `"${displayName}" <${from}>`;
}

/**
 * Extract email address from:
 *  - "Name <email@domain.com>"
 *  - email@domain.com
 */
function extractEmailAddress(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;

  const m = v.match(/<([^>]+)>/);
  if (m && m[1]) return m[1].trim();

  // If it's just an email
  if (v.includes("@") && !v.includes(" ")) return v;

  // Fallback: try to find first email-like token
  const m2 = v.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m2 ? m2[0].trim() : null;
}

/**
 * ✅ IMPORTANT:
 * Gmail sometimes ignores display name if we pass `from` as a plain string.
 * We force RFC-friendly headers by sending `from` as an object PLUS `sender`.
 */
function buildFromHeaders(): {
  from: { name: string; address: string };
  sender: { name: string; address: string };
} | null {
  const displayName = "Blue Angels Care";

  // Prefer SMTP_USER as the actual sending mailbox.
  const address =
    extractEmailAddress(SMTP_USER) || extractEmailAddress(EMAIL_FROM) || null;

  if (!address) return null;

  const obj = { name: displayName, address };
  return { from: obj, sender: obj };
}

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
 * Send mobile app access email to employee (DSP Mobile User)
 */
export async function sendMobileUserAccessEmail(
  employee: MobileUserEmployee,
): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return;

  if (!employee.email) {
    console.warn("[mail] No email on employee, skip sending.");
    return;
  }

  const fullName =
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "there";

  const to = employee.email;

  // Mobile login screen URL (OTP flow happens after entering email)
  const mobileLoginUrl =
    MOBILE_APP_LOGIN_URL || "https://blueangelscare.org/mobile-login";

  // ✅ Download links (use env so you can swap after approvals without code changes)
  const iosDownloadUrl =
    MOBILE_IOS_DOWNLOAD_URL || "https://testflight.apple.com/join/REPLACE_ME";
  const androidDownloadUrl =
    MOBILE_ANDROID_DOWNLOAD_URL ||
    "https://play.google.com/store/apps/details?id=org.blueangelscare.mobile&pcampaignid=web_share";

  const supportEmail = "Galvin.chau@gmail.com";
  const companyAddress = "3107 Beale Avenue, Altoona, PA 16601";
  const companyWebsite = "https://blueangelscare.org";

  console.log("[mail] Sending mobile access email", {
    to,
    employeeId: employee.employeeId,
  });

  const subject = "Blue Angels Care – Mobile App Access Activated";

  const text = `Hello ${fullName},

Welcome to Blue Angels Care!

Your Mobile App access has been activated.

Employee ID: ${employee.employeeId}
Login email: ${to}

Download Blue Angels Care Mobile App:
- iPhone (iOS – TestFlight): ${iosDownloadUrl}
- Android: ${androidDownloadUrl}

How to Log In (OTP):
1) Install the app
2) Open Blue Angels Care Mobile
3) Enter your employee email address
4) You will receive a One-Time Password (OTP) by email
5) Enter the OTP to securely log in

Important DSP Responsibilities & Policies:
- Follow ODP regulations and Blue Angels Care policies
- Accurately check in/out and submit Daily Notes honestly and on time
- Protect HIPAA and confidentiality at all times
- Do not share your OTP or login credentials with anyone
- No falsification of time, location, or service information

Need help?
Email: ${supportEmail}

Warm regards,
Blue Angels Care Support Team
${companyAddress}
${companyWebsite}
`;

  const html = `
<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
  <p>Hello <strong>${fullName}</strong>,</p>

  <p style="margin-top: 8px;">
    Welcome to <strong>Blue Angels Care</strong>!
  </p>

  <p>
    Your <strong>Mobile App access</strong> has been <strong>activated</strong>.
  </p>

  <div style="background:#f6f7f9; padding:12px; border-radius:10px; margin:12px 0;">
    <div><strong>Employee ID:</strong> ${employee.employeeId}</div>
    <div><strong>Login email:</strong> ${to}</div>
  </div>

  <h3 style="margin: 14px 0 8px 0;">📱 Download Blue Angels Care Mobile App</h3>

  <div style="display:flex; gap:10px; flex-wrap:wrap; margin:8px 0 14px 0;">
    <a href="${iosDownloadUrl}" target="_blank" rel="noreferrer"
       style="text-decoration:none; padding:10px 12px; border-radius:10px; background:#000; color:#fff; display:inline-block;">
      🍎 iPhone (iOS – TestFlight)
    </a>

    <a href="${androidDownloadUrl}" target="_blank" rel="noreferrer"
       style="text-decoration:none; padding:10px 12px; border-radius:10px; background:#1a8f3a; color:#fff; display:inline-block;">
      🤖 Android (Temporary Link)
    </a>
  </div>

  <p style="margin: 0 0 10px 0;">
    After installing the app, sign in using your employee email address and verify using the OTP code sent to your email.
  </p>

  <h3 style="margin: 14px 0 8px 0;">🔐 How to Log In (OTP)</h3>
  <ol style="margin-top: 6px;">
    <li>Install the app on your mobile device</li>
    <li>Open <strong>Blue Angels Care Mobile</strong></li>
    <li>Enter your <strong>employee email address</strong></li>
    <li>Check your email for a <strong>One-Time Password (OTP)</strong></li>
    <li>Enter the OTP to securely log in</li>
  </ol>

  <p style="margin: 10px 0; padding: 10px; background:#fff6e6; border-radius:10px;">
    <strong>⚠️ Security Notice:</strong> Do not share your OTP or login credentials with anyone.
  </p>

  <h3 style="margin: 14px 0 8px 0;">🧑‍⚕️ Important DSP Responsibilities & Policies</h3>
  <ul style="margin-top: 6px;">
    <li>Comply with <strong>ODP (Office of Developmental Programs)</strong> regulations and Blue Angels Care policies</li>
    <li>Accurately check in/out for visits and submit Daily Notes honestly and on time</li>
    <li>Protect <strong>HIPAA</strong> and confidentiality at all times</li>
    <li>System access is for authorized work purposes only</li>
    <li><strong>No falsification</strong> of time, location, or service information</li>
  </ul>

  <h3 style="margin: 14px 0 8px 0;">🆘 Need Help?</h3>
  <p>
    If you have trouble downloading the app or logging in, please contact support:<br/>
    <strong>Email:</strong> <a href="mailto:${supportEmail}">${supportEmail}</a>
  </p>

  <hr style="margin: 16px 0;" />

  <p style="margin:0;">
    Warm regards,<br/>
    <strong>Blue Angels Care Support Team</strong><br/>
    ${companyAddress}<br/>
    🌐 <a href="${companyWebsite}" target="_blank" rel="noreferrer">${companyWebsite}</a>
  </p>

  <p style="margin-top:10px; font-size:12px; color:#666;">
    Mobile Login Screen: <a href="${mobileLoginUrl}" target="_blank" rel="noreferrer">${mobileLoginUrl}</a>
  </p>
</div>
`;

  // ✅ Friendly From (keep existing normalize for safety, but force object headers for Gmail)
  const fromHeaders = buildFromHeaders();
  if (!fromHeaders) {
    // fallback to old behavior (still keeps system working)
    const fromFallback = normalizeFrom(EMAIL_FROM);
    if (!fromFallback) {
      console.warn("[mail] Missing EMAIL_FROM after normalize, skip sending.");
      return;
    }

    try {
      const info = await transporter.sendMail({
        from: fromFallback,
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
    return;
  }

  try {
    const info = await transporter.sendMail({
      ...fromHeaders, // ✅ from + sender as objects (forces display name)
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

  // ✅ Friendly From (keep existing normalize for safety, but force object headers for Gmail)
  const fromHeaders = buildFromHeaders();
  if (!fromHeaders) {
    // fallback to old behavior (still keeps system working)
    const fromFallback = normalizeFrom(EMAIL_FROM);
    if (!fromFallback) {
      console.warn("[mail] Missing EMAIL_FROM after normalize, skip sending.");
      return;
    }

    try {
      await transporter.sendMail({
        from: fromFallback,
        to: email,
        subject,
        text,
        html,
      });
      console.log("[mail] HMS welcome email sent.", { to: email });
    } catch (error) {
      console.error("[mail] Failed to send HMS welcome email:", error);
    }
    return;
  }

  try {
    await transporter.sendMail({
      ...fromHeaders, // ✅ from + sender as objects (forces display name)
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
