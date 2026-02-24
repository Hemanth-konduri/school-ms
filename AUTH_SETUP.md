# School Management System - Auth Setup

## Setup Instructions

### 1. Configure Google OAuth in Supabase
1. Go to your Supabase Dashboard
2. Navigate to Authentication > Providers
3. Enable Google provider
4. Add your Google OAuth credentials
5. Set redirect URL: `http://localhost:3000/api/auth/callback`

### 2. Run the application
```bash
npm run dev
```

### 3. Usage Flow

#### Admin Signup (First Time Setup)
1. Visit `http://localhost:3000/admin`
2. Fill in email, full name, and select role
3. Click "Create Admin"
4. The email is now registered in the database

#### User Login
1. Visit `http://localhost:3000/login`
2. Click "Sign in with Google"
3. The system will:
   - Check if email exists in profiles table
   - If exists: Link auth_user_id and redirect to dashboard
   - If not exists: Show error "Unauthorized email. Contact admin."

#### How It Works
- Your SQL trigger `handle_first_user()` automatically:
  - Creates super_admin for the first user
  - For subsequent users, validates email exists in profiles table
  - Links the Google auth user ID to the profile
- Only pre-registered emails can login via Google OAuth
- Unauthorized emails are rejected

## Routes
- `/` - Home page with navigation
- `/admin` - Admin signup form
- `/login` - Google OAuth login
- `/dashboard` - Protected dashboard (requires authentication)
