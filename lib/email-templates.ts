// Professional email templates for Grace Tutors

export const emailTemplates = {
  // Professional header and footer
  getHeader: () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 40px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #7c3aed; font-size: 20px; margin-top: 0; }
        .button { background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin: 20px 0; }
        .button:hover { background-color: #6d28d9; }
        .details { background-color: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #7c3aed; }
        .details li { margin: 10px 0; }
        .footer { background-color: #f3f4f6; padding: 30px 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 8px 0; }
        .divider { height: 1px; background-color: #e5e7eb; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Grace Tutors</h1>
        </div>
        <div class="content">
  `,

  getFooter: () => `
        </div>
        <div class="footer">
          <p><strong>Grace Tutors</strong></p>
          <p>Professional Tutoring & Educational Services</p>
          <div class="divider"></div>
          <p>© ${new Date().getFullYear()} Grace Tutors. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // New Account Notification (to admin)
  newAccountNotification: (clientName: string, clientEmail: string, clientPhone?: string, clientCompany?: string) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>🎉 New Client Account Created</h2>
        <p>A new client has registered on Grace Tutors and is ready to place orders.</p>
      </div>

      <div class="details">
        <strong>Client Information:</strong>
        <ul style="list-style: none; padding-left: 0;">
          <li><strong>Name:</strong> ${clientName || 'Not provided'}</li>
          <li><strong>Email:</strong> ${clientEmail}</li>
          ${clientPhone ? `<li><strong>Phone:</strong> ${clientPhone}</li>` : ''}
          ${clientCompany ? `<li><strong>Company:</strong> ${clientCompany}</li>` : ''}
        </ul>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/clients" class="button">View Client Profile</a>
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        The client can now browse services and place orders.
      </p>
    ${emailTemplates.getFooter()}`;
  },

  contactInquiryNotification: (
    name: string,
    email: string,
    phone: string | undefined,
    serviceInterest: string | undefined,
    message: string
  ) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>📬 New contact form message</h2>
        <p>Someone submitted the website contact form.</p>
      </div>
      <div class="details">
        <ul style="list-style: none; padding-left: 0;">
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          ${phone ? `<li><strong>Phone:</strong> ${phone}</li>` : ''}
          ${serviceInterest ? `<li><strong>Service interest:</strong> ${serviceInterest}</li>` : ''}
        </ul>
      </div>
      <div class="section">
        <strong>Message:</strong>
        <p style="white-space: pre-wrap;">${message}</p>
      </div>
      <p style="text-align: center; margin-top: 30px;">
        <a href="${appUrl}/admin/inquiries" class="button">View inquiries</a>
      </p>
    ${emailTemplates.getFooter()}`
  },

  // New Order Notification (to admin)
  newOrderNotificationAdmin: (clientName: string, clientEmail: string, orderTitle: string, serviceTitle: string, wordCount?: number, deadline?: string, description?: string, requirements?: string, orderId?: string) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>📋 New Order Received</h2>
        <p>A new order has been placed and requires your attention.</p>
      </div>

      <div class="details">
        <strong>Order Details:</strong>
        <ul style="list-style: none; padding-left: 0;">
          <li><strong>Client:</strong> ${clientName}</li>
          <li><strong>Email:</strong> ${clientEmail}</li>
          <li><strong>Order Title:</strong> ${orderTitle}</li>
          <li><strong>Service:</strong> ${serviceTitle || 'N/A'}</li>
          ${wordCount ? `<li><strong>Word Count:</strong> ${wordCount.toLocaleString()}</li>` : ''}
          ${deadline ? `<li><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</li>` : ''}
        </ul>
      </div>

      ${description ? `<div class="section">
        <strong>Description:</strong>
        <p>${description}</p>
      </div>` : ''}

      ${requirements ? `<div class="section">
        <strong>Special Requirements:</strong>
        <p>${requirements}</p>
      </div>` : ''}

      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/orders/${orderId || ''}" class="button">Review Order</a>
      </p>
    ${emailTemplates.getFooter()}`;
  },

  // Order Confirmation (to client)
  orderConfirmation: (clientName: string, orderTitle: string, serviceTitle: string, wordCount?: number, deadline?: string, orderId?: string) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>✅ Order Received Successfully</h2>
        <p>Thank you for placing your order with Grace Tutors! We've received your request and our team is reviewing the details.</p>
      </div>

      <div class="details">
        <strong>Your Order Summary:</strong>
        <ul style="list-style: none; padding-left: 0;">
          <li><strong>Order Title:</strong> ${orderTitle}</li>
          <li><strong>Service:</strong> ${serviceTitle || 'Custom Service'}</li>
          ${wordCount ? `<li><strong>Word Count:</strong> ${wordCount.toLocaleString()}</li>` : ''}
          ${deadline ? `<li><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</li>` : ''}
        </ul>
      </div>

      <div class="section">
        <h3 style="color: #666; font-size: 16px;">What happens next?</h3>
        <ul style="color: #666;">
          <li>Our team will review your order within 2 hours</li>
          <li>You'll receive a quote and timeline via WhatsApp or email</li>
          <li>We'll contact you if we need any clarifications</li>
          <li>Work begins immediately upon your approval</li>
        </ul>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/orders/${orderId || ''}" class="button">Track Your Order</a>
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Questions? Contact us via the chat feature in your dashboard or reach out via WhatsApp.
      </p>
    ${emailTemplates.getFooter()}`;
  },

  // Order Status Update
  orderStatusUpdate: (clientName: string, orderTitle: string, newStatus: string, message?: string, orderId?: string) => {
    const statusColors: { [key: string]: { color: string; emoji: string; text: string } } = {
      'pending': { color: '#f59e0b', emoji: '⏳', text: 'Pending Review' },
      'quote_sent': { color: '#3b82f6', emoji: '💰', text: 'Quote Sent' },
      'in_progress': { color: '#3b82f6', emoji: '⚙️', text: 'In Progress' },
      'completed': { color: '#10b981', emoji: '✅', text: 'Completed' },
      'revision': { color: '#f59e0b', emoji: '📝', text: 'Revision Required' },
      'delivered': { color: '#10b981', emoji: '📦', text: 'Delivered' },
      'cancelled': { color: '#ef4444', emoji: '✕', text: 'Cancelled' },
      'on_hold': { color: '#ef4444', emoji: '⏸️', text: 'On Hold' },
      'order_update': { color: '#7c3aed', emoji: '📋', text: 'Order Updated' },
      'paid': { color: '#10b981', emoji: '💳', text: 'Payment Received' },
      'partial': { color: '#f59e0b', emoji: '💳', text: 'Partial Payment' },
      'unpaid': { color: '#6b7280', emoji: '💳', text: 'Payment Pending' },
    };

    const status = statusColors[newStatus] || { color: '#7c3aed', emoji: '📊', text: newStatus.replace('_', ' ').toUpperCase() };

    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>📊 Order Status Updated</h2>
        <p>Hi ${clientName},</p>
        <p>Your order "<strong>${orderTitle}</strong>" has been updated with a new status.</p>
      </div>

      <div style="background-color: ${status.color}; color: white; padding: 30px 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
        <div style="font-size: 40px; margin-bottom: 10px;">${status.emoji}</div>
        <div style="font-size: 24px; font-weight: 600;">${status.text}</div>
      </div>

      ${message ? `<div class="section">
        <p><strong>Note from our team:</strong></p>
        <p>${message}</p>
      </div>` : ''}

      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/orders/${orderId || ''}" class="button">View Full Details</a>
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Thank you for choosing Grace Tutors!
      </p>
    ${emailTemplates.getFooter()}`;
  },

  // Revision Requested Notification (to admin)
  revisionRequestedAdmin: (clientName: string, orderTitle: string, revisionNumber: number, reason?: string, orderId?: string) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>📝 Revision Request Received</h2>
        <p>A client has requested a revision for their order.</p>
      </div>

      <div class="details">
        <strong>Revision Information:</strong>
        <ul style="list-style: none; padding-left: 0;">
          <li><strong>Client:</strong> ${clientName}</li>
          <li><strong>Order:</strong> ${orderTitle}</li>
          <li><strong>Revision #:</strong> ${revisionNumber}</li>
          ${reason ? `<li><strong>Reason:</strong> ${reason}</li>` : ''}
        </ul>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/orders/${orderId || ''}" class="button">Review Revision Request</a>
      </p>
    ${emailTemplates.getFooter()}`;
  },

  // Revision Uploaded Notification (to admin)
  revisionUploadedAdmin: (orderTitle: string, orderId?: string) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>📦 Revised Work Uploaded</h2>
        <p>A client has uploaded a revised version of their order. Please review the updated files.</p>
      </div>

      <div class="details">
        <strong>Order Details:</strong>
        <ul style="list-style: none; padding-left: 0;">
          <li><strong>Order Title:</strong> ${orderTitle}</li>
        </ul>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/orders/${orderId || ''}" class="button">Review Revision</a>
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Please verify that all changes have been implemented correctly and approve or request further modifications.
      </p>
    ${emailTemplates.getFooter()}`;
  },

  // Client confirmation when they submit a revision request
  revisionRequestReceivedClient: (
    clientName: string,
    orderTitle: string,
    revisionNumber: number,
    reason?: string,
    orderId?: string
  ) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>✅ Revision Request Received</h2>
        <p>Hi ${clientName},</p>
        <p>We have received your revision request for <strong>${orderTitle}</strong> (revision #${revisionNumber}). Our team will review it and get back to you shortly.</p>
      </div>

      ${reason ? `<div class="details">
        <strong>Your notes:</strong>
        <p>${reason}</p>
      </div>` : ''}

      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/orders/${orderId || ''}" class="button">View Order</a>
      </p>
    ${emailTemplates.getFooter()}`;
  },

  // Admin uploaded revised files for client review
  revisionFilesReadyClient: (
    clientName: string,
    orderTitle: string,
    revisionNumber: number,
    orderId?: string
  ) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>📦 Revised Files Ready</h2>
        <p>Hi ${clientName},</p>
        <p>Updated files for <strong>${orderTitle}</strong> (revision #${revisionNumber}) are ready for your review.</p>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/orders/${orderId || ''}" class="button">Review Revision</a>
      </p>
    ${emailTemplates.getFooter()}`;
  },

  // Revision Notification (to client) — admin asks client to revise
  revisionNotification: (clientName: string, orderTitle: string, revisionNumber: number, reason?: string, orderId?: string) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>📝 Revision Requested</h2>
        <p>Hi ${clientName},</p>
        <p>We've reviewed your order and have some suggestions to make it even better. Please review revision #${revisionNumber}:</p>
      </div>

      ${reason ? `<div class="details">
        <strong>What needs to be revised:</strong>
        <p>${reason}</p>
      </div>` : ''}

      <div class="section">
        <h3 style="color: #666; font-size: 16px;">Next Steps:</h3>
        <ul style="color: #666;">
          <li>Review the revision notes and guidelines</li>
          <li>Upload your revised work</li>
          <li>We'll review and provide final approval</li>
        </ul>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/orders/${orderId || ''}" class="button">Upload Revision</a>
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Need help? Contact us via the chat feature or WhatsApp for immediate assistance.
      </p>
    ${emailTemplates.getFooter()}`;
  },

  // Password Changed Notification
  passwordChanged: (userEmail: string) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>🔒 Password Changed Successfully</h2>
        <p>This is a confirmation that the password for your Grace Tutors account has been successfully changed.</p>
      </div>

      <div class="details">
        <strong>Account Information:</strong>
        <ul style="list-style: none; padding-left: 0;">
          <li><strong>Email:</strong> ${userEmail}</li>
          <li><strong>Changed at:</strong> ${new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</li>
        </ul>
      </div>

      <div class="section">
        <p style="color: #ef4444; font-weight: 600;">⚠️ Security Note:</p>
        <p>If you did not make this change, please <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/forgot-password" style="color: #7c3aed; text-decoration: underline;">reset your password immediately</a> or contact our support team.</p>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Your account security is important to us. Keep your password safe and never share it with others.
      </p>
    ${emailTemplates.getFooter()}`;
  },

  // Email Verification
  emailVerification: (verificationLink: string) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>✉️ Verify Your Email Address</h2>
        <p>Thank you for signing up for Grace Tutors! To complete your registration, please verify your email address by clicking the button below:</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" class="button">Verify Email Address</a>
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        This link will expire in 24 hours. If you didn't sign up for Grace Tutors, please ignore this email.
      </p>

      <div class="section" style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px;">
        <p style="margin: 0; color: #16a34a;"><strong>💡 Tip:</strong> If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="margin: 10px 0 0 0; color: #666; word-break: break-all; font-size: 12px;">${verificationLink}</p>
      </div>
    ${emailTemplates.getFooter()}`;
  },

  // Password Reset
  passwordReset: (resetLink: string) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>🔄 Reset Your Password</h2>
        <p>We received a request to reset the password for your Grace Tutors account. Click the button below to create a new password:</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" class="button">Reset Password</a>
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        This link will expire in 1 hour. If you didn't request a password reset, please ignore this email. Your account is secure.
      </p>

      <div class="section" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px;">
        <p style="margin: 0; color: #b45309;"><strong>⚠️ Important:</strong> If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="margin: 10px 0 0 0; color: #666; word-break: break-all; font-size: 12px;">${resetLink}</p>
      </div>
    ${emailTemplates.getFooter()}`;
  },

  orderMessageNotification: (
    recipientName: string,
    orderTitle: string,
    messagePreview: string,
    href: string,
    fromLabel: string
  ) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>💬 New message</h2>
        <p>Hi ${recipientName},</p>
        <p>You have a new message from <strong>${fromLabel}</strong> regarding "<strong>${orderTitle}</strong>".</p>
      </div>

      <div class="details">
        <p style="margin: 0;">${messagePreview}</p>
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="${href}" class="button">Open conversation</a>
      </p>

      <p style="color: #666; font-size: 14px; margin-top: 20px;">
        Reply in your dashboard to continue the conversation.
      </p>
    ${emailTemplates.getFooter()}`;
  },

  liveChatMessageClient: (clientName: string, preview: string, appUrl: string) => {
    return `${emailTemplates.getHeader()}
      <div class="section">
        <h2>💬 Support message</h2>
        <p>Hi ${clientName},</p>
        <p>Grace Tutors support sent you a message in live chat:</p>
      </div>
      <div class="details"><p style="margin:0;">${preview}</p></div>
      <p style="text-align: center; margin-top: 30px;">
        <a href="${appUrl}/dashboard" class="button">Open live chat</a>
      </p>
    ${emailTemplates.getFooter()}`;
  },
}
