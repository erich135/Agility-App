# Vercel Environment Variables Setup

## The login issues are likely due to missing Twilio environment variables in Vercel.

### 1. Go to Vercel Dashboard
- Visit: https://vercel.com/dashboard
- Select your `agility-app` project
- Go to Settings > Environment Variables

### 2. Add these environment variables in Vercel:

**IMPORTANT: Use the non-VITE_ prefixed versions for server-side API functions:**

Copy the values from your local `.env` file:

```
TWILIO_ACCOUNT_SID = [Copy from your .env file - starts with AC...]
TWILIO_AUTH_TOKEN = [Copy from your .env file - your auth token]
TWILIO_PHONE_NUMBER = [Copy from your .env file - format +12189867505]
```

### 3. Also add the VITE_ versions for client-side (optional):

```
VITE_TWILIO_ACCOUNT_SID = [Same value as above]
VITE_TWILIO_AUTH_TOKEN = [Same value as above]
VITE_TWILIO_PHONE_NUMBER = [Same value as above]
```

### 4. Redeploy after adding variables
- After adding environment variables in Vercel
- Go to Deployments tab
- Click "Redeploy" on the latest deployment
- OR push a new commit to trigger deployment

### 5. Database Setup
Run the SQL file `database/completed-sql-scripts/fix_authentication_issues.sql` in your Supabase SQL Editor:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy and paste the contents of `database/completed-sql-scripts/fix_authentication_issues.sql`
5. Click Run

### 6. Test the Login
1. Use email: `erich@lmwfinance.co.za`
2. The system will generate an OTP
3. If SMS fails, check the browser console for the OTP
4. The OTP will be logged with: `🔐 LOGIN OTP for +27836504028: 123456`

### 7. Troubleshooting
- Check browser console for detailed error messages
- OTP is always logged in console for development
- If SMS fails, you can still use the console OTP to login
- All errors are now logged with clear descriptions

### 8. Expected Login Flow
1. Enter email: `erich@lmwfinance.co.za`
2. Click "Send OTP"
3. Check console for: `🔐 LOGIN OTP for +27836504028: [6-digit-code]`
4. Enter the 6-digit code
5. Click "Verify & Login"
6. Should redirect to the main app

The login system now has comprehensive error handling and fallback mechanisms!