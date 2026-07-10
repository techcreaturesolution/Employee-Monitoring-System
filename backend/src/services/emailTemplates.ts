const wrapper = (title: string, bodyHtml: string): string => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#4f46e5;padding:20px 32px;">
                <span style="color:#fff;font-size:20px;font-weight:bold;">EMS</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#1f2937;">
                <h2 style="margin:0 0 16px;font-size:18px;">${title}</h2>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f9fafb;color:#9ca3af;font-size:12px;">
                This is an automated message from EMS. Please do not reply directly to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const button = (url: string, label: string): string => `
  <a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
    ${label}
  </a>
`;

export const welcomeEmailTemplate = (name: string, companyName: string): string =>
  wrapper(
    `Welcome, ${name}! 👋`,
    `<p>Your company <strong>${companyName}</strong> has been registered successfully on EMS.</p>
     <p>You can now log in and start managing your team's attendance, tasks, and productivity.</p>`
  );

export const verificationEmailTemplate = (name: string, verifyLink: string): string =>
  wrapper(
    `Verify Your Email`,
    `<p>Hi ${name},</p>
     <p>Please verify your email address to access your EMS account.</p>
     ${button(verifyLink, 'Verify Email')}`
  );

export const passwordResetTemplate = (name: string, resetLink: string): string =>
  wrapper(
    `Password Reset Request`,
    `<p>Hi ${name},</p>
     <p>We received a request to reset your password. This link expires in <strong>1 hour</strong>.</p>
     ${button(resetLink, 'Reset Password')}
     <p style="margin-top:20px;font-size:13px;color:#6b7280;">
       If you didn't request this, you can safely ignore this email — your password will remain unchanged.
     </p>`
  );

export const employeeInviteTemplate = (name: string, tempPassword: string, verifyLink: string): string =>
  wrapper(
    `You've been added to EMS`,
    `<p>Hi ${name},</p>
     <p>An account has been created for you. Use the temporary password below to log in:</p>
     <p style="background:#f3f4f6;padding:10px 14px;border-radius:6px;font-family:monospace;font-size:15px;">
       ${tempPassword}
     </p>
     <p>Please verify your email and change your password immediately after your first login.</p>
     ${button(verifyLink, 'Verify Email & Log In')}`
  );

export const passwordChangedTemplate = (name: string): string =>
  wrapper(
    `Your password was changed`,
    `<p>Hi ${name}, this is a confirmation that your EMS account password was just changed.</p>
     <p style="font-size:13px;color:#6b7280;">
       If you didn't make this change, contact your company admin immediately.
     </p>`
  );

export const leaveStatusTemplate = (name: string, status: 'approved' | 'rejected', dates: string, reason?: string): string =>
  wrapper(
    `Leave Request ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
    `<p>Hi ${name},</p>
     <p>Your leave request for <strong>${dates}</strong> has been <strong>${status}</strong>.</p>
     ${reason ? `<p style="color:#6b7280;font-size:14px;">Reason: ${reason}</p>` : ''}`
  );

export const emailChangeVerificationTemplate = (name: string, verifyLink: string): string =>
  wrapper(
    `Confirm your new email address`,
    `<p>Hi ${name},</p>
     <p>We received a request to change your email address for EMS.</p>
     <p>Please click the button below to confirm this change:</p>
     ${button(verifyLink, 'Confirm New Email')}
     <p style="margin-top:20px;font-size:13px;color:#6b7280;">
       If you did not request this change, you can safely ignore this email.
     </p>`
  );

export const oldEmailSecurityAlertTemplate = (name: string): string =>
  wrapper(
    `Security Alert: Email Change Requested`,
    `<p>Hi ${name},</p>
     <p>A request was made to change the email address associated with your EMS account.</p>
     <p>If this was you, no further action is needed.</p>
     <p style="margin-top:20px;font-size:13px;color:#ef4444;">
       <strong>If this wasn't you, please contact support immediately as your account may be compromised.</strong>
     </p>`
  );

export const profileUpdatedTemplate = (name: string, changedFields: string[]): string =>
  wrapper(
    `Your EMS profile was updated`,
    `<p>Hi ${name},</p>
     <p>Your EMS profile details were recently updated.</p>
     <p><strong>Fields updated:</strong></p>
     <ul>
       ${changedFields.map(field => `<li>${field}</li>`).join('')}
     </ul>
     <p style="margin-top:20px;font-size:13px;color:#6b7280;">
       If this wasn't you, contact your company admin immediately.
     </p>`
  );

export const companyUpdatedTemplate = (companyName: string, changedFields: string[]): string =>
  wrapper(
    `Your company details were updated`,
    `<p>Hello,</p>
     <p>The company details for <strong>${companyName}</strong> were recently updated.</p>
     <p><strong>Fields updated:</strong></p>
     <ul>
       ${changedFields.map(field => `<li>${field}</li>`).join('')}
     </ul>
     <p style="margin-top:20px;font-size:13px;color:#6b7280;">
       If this wasn't authorized, please check your admin logs or contact support.
     </p>`
  );
