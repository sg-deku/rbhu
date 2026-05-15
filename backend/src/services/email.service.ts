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
