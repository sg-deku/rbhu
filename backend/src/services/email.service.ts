import nodemailer from 'nodemailer';

// Use Ethereal Email for testing if no SMTP config is provided
const createTransporter = async () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to test account
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });
};

export const sendWelcomeEmail = async (to: string, name: string, role: string) => {
  try {
    const transporter = await createTransporter();
    
    const info = await transporter.sendMail({
      from: '"rbhu Admin" <no-reply@rbhu.ai>',
      to,
      subject: 'Welcome to rbhu!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to rbhu!</h2>
          <p>Hi ${name},</p>
          <p>An administrator has invited you to join rbhu with the role of <strong>${role}</strong>.</p>
          <p>You can now log in to the platform and access your workspace.</p>
          <br/>
          <p>Best regards,</p>
          <p>The rbhu Team</p>
        </div>
      `,
    });

    console.log('Welcome email sent: %s', info.messageId);
    if (!process.env.SMTP_HOST) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

export const sendResetPasswordEmail = async (to: string, name: string, token: string) => {
  try {
    const transporter = await createTransporter();
    
    // In production, this should be an environment variable
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    
    const info = await transporter.sendMail({
      from: '"rbhu Admin" <no-reply@rbhu.ai>',
      to,
      subject: 'Reset your rbhu password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click the link below to set a new one:</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <br/>
          <p>Best regards,</p>
          <p>The rbhu Team</p>
        </div>
      `,
    });

    console.log('Password reset email sent: %s', info.messageId);
    if (!process.env.SMTP_HOST) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (error) {
    console.error('Error sending reset password email:', error);
    return false;
  }
};
