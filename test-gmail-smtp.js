#!/usr/bin/env node
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load from .env.local
let env = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: 587,
  SMTP_SECURE: false,
  SMTP_USER: 'gracewriters82@gmail.com',
  SMTP_PASS: 'ajvg ahug ggly hdjz',
  ADMIN_EMAIL: 'gracewriters82@gmail.com'
};

try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
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
  }
} catch (e) {
  console.log('Using default config');
}

console.log('🔧 Testing Gmail SMTP Configuration\n');
console.log('Host:', env.SMTP_HOST);
console.log('Port:', env.SMTP_PORT);
console.log('User:', env.SMTP_USER);
console.log('From Email:', env.ADMIN_EMAIL);
console.log('---\n');

async function testGmailConnection() {
  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: parseInt(env.SMTP_PORT),
      secure: false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });

    console.log('⏳ Testing connection...');
    await transporter.verify();
    console.log('✅ SMTP Connection Verified!\n');

    console.log('⏳ Sending test email...');
    const mailOptions = {
      from: env.ADMIN_EMAIL,
      to: env.ADMIN_EMAIL,
      subject: '✅ Gmail SMTP Test - Grace Writers',
      html: `
        <h2>Email Configuration Test</h2>
        <p>Your Gmail SMTP is now working with your freelance app!</p>
        <p><strong>Status:</strong> ✅ SUCCESS</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
        <hr>
        <p><small>From: Grace Writers App</small></p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email Sent Successfully!\n');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n✅ Gmail SMTP is ready to use!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.code === 'EAUTH') {
      console.log('\n💡 AUTHENTICATION ERROR - Check your Gmail app password');
      console.log('Verify: https://myaccount.google.com/apppasswords');
    }
  }
}

testGmailConnection();
