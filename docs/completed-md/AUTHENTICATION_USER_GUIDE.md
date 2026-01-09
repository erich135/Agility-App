# Authentication System - Quick Reference Guide

## 🎯 For Administrators

### How to Invite a New User

1. Navigate to **Admin → User Management** (`/settings/users`)
2. Click **"Invite User"** button (top right)
3. Fill in the form:
   - **First Name** - User's first name
   - **Last Name** - User's last name
   - **Email** - User's email address
   - **Role** - Select appropriate role:
     - `Admin` - Full system access
     - `Consultant` - Can log time and view assigned customers
     - `Accounts` - Can access billing and financial reports
     - `User` - Basic access to customer information
4. Click **"Send Invitation"**
5. Email is sent to user with setup link

### User Roles & Permissions

| Role | Access | Typical Use |
|------|--------|------------|
| **Admin** | Everything - User management, system settings, billing, customers | Company managers, technical leads |
| **Consultant** | Customers, calendar, time logging, own data | Service consultants, contractors |
| **Accounts** | Billing dashboard, financial statements, invoicing | Finance/accounting team |
| **User** | Customers, documents, basic viewing | Client portal users, limited access |

---

## 👤 For End Users

### First Time Setup

1. **Check your email** for invitation from Agility App
2. **Click the setup link** in the email
3. **Set your password** (must be at least 8 characters)
4. **Click "Create Account"**
5. **Go to login page** and sign in with:
   - Email: Your email address
   - Password: The password you just created

### Logging In

1. Go to login page: `https://agility-app.vercel.app/login`
2. Enter your email address
3. Enter your password
4. Click **"Sign In"**

### Forgot Your Password?

1. Go to login page
2. Click **"Forgot Password?"** (below password field)
3. Enter your email address in the modal
4. Click **"Send Reset Link"**
5. Check your email for password reset link
6. Click link in email
7. Enter your new password (at least 8 characters)
8. Click **"Reset Password"**
9. Log in with new password

---

## 🔐 Security Best Practices

✅ **DO:**
- Use a strong, unique password (8+ characters, mix of upper/lower/numbers/symbols)
- Never share your password with anyone
- Log out when finished, especially on shared computers
- Change password if you suspect compromise
- Use "Remember Device" on personal computers only

❌ **DON'T:**
- Share your login credentials
- Write passwords down
- Use same password as other accounts
- Click suspicious email links
- Leave your computer unattended while logged in

---

## 🆘 Troubleshooting

### "Invalid email or password"
- Check that email is correct
- Password is case-sensitive - try again
- Verify Caps Lock is off
- Try "Forgot Password" if you can't remember password

### "Please complete your account setup using the invitation link"
- Check email for setup link
- Ask admin to resend invitation if link is expired
- Link works for 24 hours

### "Invalid or expired password reset link"
- Password reset links expire after 1 hour
- Go to login page and click "Forgot Password?" again
- Request new reset link

### "Access Denied - You don't have permission"
- You don't have permission for that page
- Contact your administrator to grant access
- Check your user role is correct

### Email Not Received
- Check spam/junk folder
- Ask admin to resend invitation
- Verify email address is correct
- Check with IT if email domain is blocked

---

## 📧 Email Security

Emails from Agility App will come from:
- **From:** noreply@agility-app.com (or similar)
- **Subject:** Invitation to join Agility App / Reset Password

**Always verify:**
- Email comes from official Agility App address
- Never click links from emails you didn't expect
- Never reply to automated emails with sensitive info

---

## 🔄 Account Lifecycle

### New User
1. Admin sends invitation
2. User receives email
3. User clicks link and creates password
4. User can now login
5. User status shows "Active" in admin panel

### Password Reset
1. User clicks "Forgot Password" on login
2. Verification email sent
3. User clicks link and creates new password
4. User can login with new password

### Deactivation
1. Admin can deactivate user in User Management
2. Deactivated user cannot login
3. Can be reactivated by admin

### Account Deletion
1. Admin can delete user in User Management
2. User account and data cannot be recovered
3. Use with caution!

---

## 💡 Tips

- **Bookmark the login page** for easy access
- **Enable browser autofill** for password (if on private computer)
- **Use a password manager** like Bitwarden, 1Password, or LastPass
- **Clear browser cache** if experiencing login issues
- **Test login after first setup** to make sure everything works

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Contact your administrator
3. System administrator contact: [Your email/phone here]

