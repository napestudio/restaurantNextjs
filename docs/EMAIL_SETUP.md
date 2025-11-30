# Email Notification Setup

This guide explains how to set up email notifications for reservations created through the website.

## Overview

When a customer creates a reservation through the website ([/reservas](../app/reservas/page.tsx)), the system automatically sends a beautifully formatted HTML email to `kikureservas@gmail.com` with all the reservation details.

## Features

- **Automatic Email Notifications**: Emails are sent only for reservations created through the website (not from the admin dashboard)
- **Beautiful HTML Template**: Professional, responsive email design with restaurant branding
- **Complete Reservation Details**: Includes customer info, date/time, party size, assigned tables, and special requirements
- **Status Indicators**: Visual badges showing whether the reservation is confirmed or pending
- **Special Requirements**: Highlights dietary restrictions, accessibility needs, and additional notes
- **Non-Blocking**: Email sending failures won't prevent reservation creation

## Setup Instructions

### 1. Create a Gmail App Password

To send emails via Gmail, you need to generate an App Password:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Click **Select app** → Choose "Mail"
5. Click **Select device** → Choose "Other (Custom name)" and enter "Restaurant Reservations"
6. Click **Generate**
7. Copy the 16-character password (shown without spaces)

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
EMAIL_USER=your-gmail-address@gmail.com
EMAIL_APP_PASSWORD=your-16-character-app-password
```

**Example:**

```env
EMAIL_USER=kikureservas@gmail.com
EMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

⚠️ **Important**: Use the App Password, NOT your regular Gmail password!

### 3. Restart Your Development Server

After adding the environment variables, restart your development server:

```bash
npm run dev
```

## How It Works

### Workflow

1. Customer fills out the reservation form on [/reservas](../app/reservas/page.tsx)
2. Reservation is created in the database via [`createReservation()`](../actions/Reservation.ts:47)
3. System attempts to auto-assign tables
4. If `createdBy === "WEB"`, an email notification is sent to `kikureservas@gmail.com`
5. Email includes all reservation details and table assignments (if available)

### Email Content

The email includes:

- **Reservation Status**: Visual badge (Confirmed/Pending)
- **Reservation Details**:
  - Date (formatted in Spanish)
  - Time and time slot name
  - Number of guests
  - Assigned table names (if auto-assigned)
- **Customer Information**:
  - Name
  - Email (clickable mailto link)
  - Phone (clickable tel link, if provided)
- **Special Requirements** (if any):
  - Dietary restrictions
  - Accessibility needs
  - Additional notes
- **Action Required**: Alert if tables need manual assignment

### File Structure

```
lib/
├── email.ts                              # Nodemailer transporter configuration
├── send-reservation-email.ts             # Email sending function
└── email-templates/
    └── reservation-notification.ts       # HTML email template

actions/
└── Reservation.ts                        # Integration point for email sending
```

## Testing

### Test the Email Setup

1. Ensure environment variables are configured
2. Create a test reservation through the website: `http://localhost:3000/reservas`
3. Check the server console for:
   ```
   📧 Email notification sent for reservation <id>
   ```
4. Check the inbox at `kikureservas@gmail.com`

### Test Without Email Configuration

If `EMAIL_USER` or `EMAIL_APP_PASSWORD` are not set, the system will:
- Log a warning: `Email configuration missing. Skipping email notification.`
- Continue creating the reservation normally
- Not fail or throw errors

## Troubleshooting

### Emails Not Sending

1. **Check Environment Variables**:
   ```bash
   # Verify they're set
   echo $EMAIL_USER
   echo $EMAIL_APP_PASSWORD
   ```

2. **Check Console Logs**:
   - Look for `📧 Email notification sent for reservation <id>` (success)
   - Look for `Failed to send email notification` (error)

3. **Verify Gmail Settings**:
   - 2-Step Verification is enabled
   - App Password is correctly generated
   - App Password doesn't have spaces when pasted

4. **Test the Transporter**:
   You can verify the email configuration by calling the verification function:
   ```typescript
   import { verifyEmailConfig } from '@/lib/email';
   await verifyEmailConfig();
   ```

### Common Issues

- **"Invalid login"**: App Password is incorrect or has spaces
- **"Less secure app access"**: You need to use App Password, not regular password
- **"Timeout"**: Check your network/firewall settings
- **Email sends but not received**: Check spam folder

## Customization

### Change Recipient Email

To send emails to a different address, edit [`send-reservation-email.ts`](../lib/send-reservation-email.ts:63):

```typescript
to: "your-email@example.com",  // Change this line
```

### Customize Email Template

The HTML email template is in [`reservation-notification.ts`](../lib/email-templates/reservation-notification.ts).

You can customize:
- Colors (search for hex codes like `#dc2626`)
- Layout and sections
- Language (currently Spanish)
- Branding and logos

### Disable Emails for Testing

To temporarily disable emails without removing environment variables, comment out the email sending block in [`Reservation.ts`](../actions/Reservation.ts:163-193).

## Production Deployment

When deploying to production (Vercel, Railway, etc.):

1. Add environment variables to your hosting platform:
   - `EMAIL_USER`
   - `EMAIL_APP_PASSWORD`

2. Verify the email configuration works in production

3. Monitor email sending logs for any issues

## Security Notes

- ✅ App Passwords are safer than using your main Gmail password
- ✅ App Passwords can be revoked independently
- ✅ Environment variables are not committed to Git
- ⚠️ Never commit `.env` file or expose App Passwords
- ⚠️ Use different credentials for development and production if possible

## Future Enhancements

Potential improvements:

- [ ] Send confirmation email to customer as well
- [ ] Add email templates for reservation updates/cancellations
- [ ] Support multiple email notification recipients
- [ ] Add email queue for better reliability
- [ ] Include QR code or confirmation number
- [ ] Add calendar invite attachment (.ics file)
