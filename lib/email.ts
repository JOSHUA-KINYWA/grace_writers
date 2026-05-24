import nodemailer from 'nodemailer';

// Create Gmail SMTP transporter with environment variables
export const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true' || true,  // must be true for port 465
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
};

// Helper function to send email
export const sendEmail = async (to, subject, html) => {
  const transporter = createEmailTransporter();
  
  try {
    const info = await transporter.sendMail({
      from: process.env.ADMIN_EMAIL,
      to,
      subject,
      html,
    });
    
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};
