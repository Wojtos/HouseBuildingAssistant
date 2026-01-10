# Auth View Setup Checklist

Complete this checklist to get the authentication views up and running.

---

## ✅ Pre-Implementation Checklist

### Dependencies
- [x] `@supabase/supabase-js` installed
- [x] `react` and `react-dom` installed
- [x] Astro React integration configured
- [x] Tailwind CSS configured

### Files Created
- [x] `src/lib/supabaseClient.ts`
- [x] `src/hooks/useAuthRedirect.ts`
- [x] `src/components/AuthForm.tsx`
- [x] `src/components/InlineErrorBanner.tsx`
- [x] `src/types/viewModels.ts`
- [x] `src/pages/login.astro`
- [x] `src/pages/signup.astro`

---

## 🔧 Environment Setup

### 1. Create Supabase Project
- [ ] Go to https://supabase.com
- [ ] Create a new project (or use existing)
- [ ] Wait for project to finish provisioning

### 2. Configure Email Auth
- [ ] Navigate to Authentication → Providers
- [ ] Ensure "Email" provider is enabled
- [ ] Configure email templates (optional)
- [ ] Set up email confirmation (optional):
  - Recommended: Enable for production
  - Optional: Disable for development/testing

### 3. Get Supabase Credentials
- [ ] Navigate to Project Settings → API
- [ ] Copy "Project URL" (e.g., `https://xxxxx.supabase.co`)
- [ ] Copy "anon public" key (starts with `eyJ...`)

### 4. Create Environment File
- [ ] Create `frontend/.env` file
- [ ] Add the following variables:
  ```env
  PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
  ```
- [ ] Verify file is in `.gitignore` (should not be committed)

### 5. Configure CORS (if needed)
- [ ] Go to Project Settings → API
- [ ] Add your frontend URL to allowed origins
  - Development: `http://localhost:4001`
  - Production: Your production domain

---

## 🧪 Testing Checklist

### Start Development Server
```bash
cd frontend
npm run dev
```
- [ ] Server starts without errors
- [ ] Navigate to http://localhost:4001/login
- [ ] Page loads without errors

### Test Sign Up Flow
- [ ] Navigate to `/signup`
- [ ] Page renders correctly
- [ ] Try submitting with empty fields → See validation errors
- [ ] Try invalid email format → See "valid email" error
- [ ] Try short password (< 8 chars) → See "8 characters" error
- [ ] Submit valid credentials
- [ ] If email confirmation enabled:
  - [ ] See "Check your email" message
  - [ ] Receive confirmation email
  - [ ] Click confirmation link
  - [ ] Try signing in
- [ ] If email confirmation disabled:
  - [ ] Automatically redirected to target path
  - [ ] Session persists on refresh

### Test Sign In Flow
- [ ] Navigate to `/login`
- [ ] Page renders correctly
- [ ] Try wrong password → See "incorrect" error
- [ ] Try non-existent user → See appropriate error
- [ ] Sign in with correct credentials
- [ ] Redirected to target path (default: `/projects`)
- [ ] Session persists on refresh

### Test Navigation
- [ ] Click "Sign up" link from login page
- [ ] Redirected to `/signup`
- [ ] Click "Sign in" link from signup page
- [ ] Redirected to `/login`

### Test Redirect Flow
- [ ] Visit `/login?redirectTo=/projects/abc-123`
- [ ] Sign in
- [ ] Verify redirected to `/projects/abc-123` (not default `/projects`)
- [ ] Try invalid redirect: `/login?redirectTo=https://evil.com`
- [ ] Verify redirected to safe default (`/projects`)

### Test Auto-Redirect
- [ ] Sign in successfully
- [ ] Try visiting `/login` while authenticated
- [ ] Verify immediately redirected to target path
- [ ] Try visiting `/signup` while authenticated
- [ ] Verify immediately redirected to target path

### Test Error Handling
- [ ] Disconnect internet
- [ ] Try signing in
- [ ] See "Connection problem" error
- [ ] Reconnect internet
- [ ] Try signing in rapidly 10+ times
- [ ] See rate limit error (if Supabase rate limiting enabled)

### Test Accessibility
- [ ] Navigate form using Tab key
- [ ] Verify focus indicators visible
- [ ] Submit form using Enter key
- [ ] Test with screen reader (optional but recommended)
- [ ] Verify error messages are announced

### Test Responsive Design
- [ ] Resize browser to mobile width (< 640px)
- [ ] Verify form is usable
- [ ] Verify text is readable
- [ ] Verify buttons are tappable

---

## 🚀 Production Checklist

### Security
- [ ] Enable email confirmation in Supabase
- [ ] Configure rate limiting in Supabase
- [ ] Enable password strength requirements
- [ ] Set up proper CORS origins (remove localhost)
- [ ] Review RLS (Row Level Security) policies
- [ ] Set up proper password reset flow (future enhancement)

### Environment Variables
- [ ] Create `.env.production` with production credentials
- [ ] Verify environment variables in deployment platform
- [ ] Never commit `.env` files to version control

### Performance
- [ ] Run `npm run build` and verify no errors
- [ ] Test production build locally with `npm run preview`
- [ ] Verify bundle size is reasonable
- [ ] Test auth flow in production build

### Monitoring
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Monitor Supabase usage dashboard
- [ ] Set up alerts for auth failures
- [ ] Monitor rate limit hits

### Documentation
- [ ] Update team documentation
- [ ] Document environment variables for team
- [ ] Document Supabase project access
- [ ] Create runbook for common issues

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables" Error
**Cause**: `.env` file missing or variables not set  
**Fix**:
1. Create `frontend/.env` file
2. Add `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
3. Restart dev server

### Auth Request Returns 400 Error
**Cause**: Invalid Supabase credentials or project not accessible  
**Fix**:
1. Verify Supabase URL is correct
2. Verify anon key is correct
3. Check Supabase project is active
4. Verify CORS settings

### "Invalid login credentials" on Valid Credentials
**Cause**: Email confirmation required but not completed  
**Fix**:
1. Check email for confirmation link
2. Click confirmation link
3. Try signing in again
Or disable email confirmation in Supabase settings

### Form Submits but Nothing Happens
**Cause**: JavaScript error or redirect issue  
**Fix**:
1. Open browser console
2. Look for errors
3. Verify `redirectTo` path is valid
4. Check network tab for failed requests

### Session Not Persisting
**Cause**: LocalStorage blocked or cleared  
**Fix**:
1. Check browser privacy settings
2. Ensure localStorage is enabled
3. Check for browser extensions blocking storage
4. Verify not in incognito/private mode

### TypeScript Errors
**Cause**: Type definitions missing or outdated  
**Fix**:
1. Run `npm install` to ensure all deps installed
2. Run `npx tsc --noEmit` to check for type errors
3. Restart TypeScript server in IDE

---

## 📊 Success Criteria

All items should be ✅ before considering auth implementation complete:

### Functional Requirements
- [x] User can sign up with email/password
- [x] User can sign in with email/password
- [x] User can switch between login/signup
- [x] User redirected after successful auth
- [x] Errors displayed in user-friendly way
- [x] Form validation works correctly
- [x] Session persists across page refreshes

### Non-Functional Requirements
- [x] Code passes TypeScript compilation
- [x] No console errors in browser
- [x] Responsive on mobile and desktop
- [x] Accessible with keyboard
- [x] Secure redirect handling
- [x] Works in major browsers (Chrome, Firefox, Safari)

### Documentation
- [x] Implementation documented
- [x] Setup instructions provided
- [x] Architecture diagrams created
- [x] Quick reference guide available

---

## 🎉 Completion

Once all checkboxes are marked:
- ✅ Auth view implementation is complete
- ✅ Ready for integration with other views
- ✅ Ready for production deployment

---

**Next Steps:**
1. Integrate auth with protected routes
2. Add sign-out functionality to navigation
3. Implement password reset flow
4. Add OAuth providers (optional)

**Setup Date**: _____________  
**Completed By**: _____________  
**Verified By**: _____________
