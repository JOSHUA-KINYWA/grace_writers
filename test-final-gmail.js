#!/usr/bin/env node
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load .env.local
let env = {};
try {
  const envPath = path.join(__dirname, '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key) {
        env[key.trim()] = valueParts.join('=').trim().replace(/['"]/g, '');
      }
    }
  });
} catch (e) {
  console.log('Error loading .env.local');
  process.exit(1);
}

console.log('🔧 Testing Gmail SMTP - Port 465 with Environment Variables\n');
console.log('Configuration:');
console.log('  Host:', env.SMTP_HOST);
console.log('  Port:', env.SMTP_PORT);
console.log('  Secure:', env.SMTP_SECURE);
console.log('  User:', env.GMAIL_USER);
console.log('---\n');

async function testGmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(env.SMTP_PORT || '465'),
      secure: env.SMTP_SECURE === 'true' || true,
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_PASS,
      },
    });

    console.log('⏳ Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ Connection verified!\n');

    console.log('⏳ Sending test email...');
    const info = await transporter.sendMail({
      from: env.ADMIN_EMAIL,
      to: env.ADMIN_EMAIL,
      subject: '✅ Gmail SMTP Test - Port 465 SSL',
      html: `
        <h2>Email System Test</h2>
        <p>Your Gmail SMTP configuration is working!</p>
        <ul>
          <li><strong>Host:</strong> ${env.SMTP_HOST}</li>
          <li><strong>Port:</strong> ${env.SMTP_PORT}</li>
          <li><strong>Secure (SSL):</strong> true</li>
          <li><strong>Test Time:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>✅ Status: <strong>SUCCESS</strong></p>
      `,
    });

    console.log('✅ Email sent successfully!\n');
    console.log('Message ID:', info.messageId);
    console.log('\n🎉 Gmail SMTP is ready for production!');
    console.log('\nUse in your app:');
    console.log('  import { sendEmail } from "@/lib/email";');
    console.log('  await sendEmail("user@example.com", "Subject", "<html>...</html>");');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication error - check app password');
    } else if (error.message.includes('ETIMEOUT')) {
      console.log('\n💡 Firewall/network issue - disable Windows Defender');
    }
  }
}

testGmail();
