export const welcomeEmailTemplate = (name: string, companyName: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Welcome to EMS, ${name}!</h2>
    <p>Your company <strong>${companyName}</strong> has been registered successfully.</p>
    <p>You can now log in and start tracking your team's attendance and productivity.</p>
  </div>
`;

export const passwordResetTemplate = (name: string, resetLink: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Password Reset Request</h2>
    <p>Hi ${name}, click the link below to reset your password. This link expires in 1 hour.</p>
    <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
    <p>If you didn't request this, you can safely ignore this email.</p>
  </div>
`;

export const employeeInviteTemplate = (name: string, tempPassword: string, loginUrl: string): string => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>You've been added to EMS</h2>
    <p>Hi ${name}, an account has been created for you.</p>
    <p><strong>Temporary password:</strong> ${tempPassword}</p>
    <p>Please log in and change your password immediately: <a href="${loginUrl}">${loginUrl}</a></p>
  </div>
`;
