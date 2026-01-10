# Auth View - Quick Reference

## 🚀 Quick Start

### 1. Environment Setup
```bash
cd frontend
cp .env.example .env  # Then fill in Supabase credentials
```

### 2. Required Environment Variables
```env
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
```

### 3. Start Development Server
```bash
npm run dev
# Visit: http://localhost:4001/login
```

---

## 📍 Routes

| Route | Description | Query Params |
|-------|-------------|--------------|
| `/login` | Sign in page | `redirectTo` (optional) |
| `/signup` | Sign up page | `redirectTo` (optional) |

**Example with redirect:**
```
/login?redirectTo=/projects/abc-123
```

---

## 🧩 Component Usage

### AuthForm
```tsx
import { AuthForm } from '@/components/AuthForm';

// Sign in mode
<AuthForm mode="login" redirectTo="/dashboard" />

// Sign up mode
<AuthForm mode="signup" />
```

### InlineErrorBanner
```tsx
import { InlineErrorBanner } from '@/components/InlineErrorBanner';

<InlineErrorBanner
  title="Error"
  message="Something went wrong"
  actionLabel="Try again"
  onAction={() => retry()}
/>
```

---

## 🔧 Utilities

### Supabase Client
```typescript
import { supabase, getAccessToken, isAuthenticated, signOut } from '@/lib/supabaseClient';

// Check auth status
const authenticated = await isAuthenticated();

// Get access token for API calls
const token = await getAccessToken();

// Sign out
await signOut();
```

### useAuthRedirect Hook
```typescript
import { useAuthRedirect } from '@/hooks/useAuthRedirect';

const { redirectTo, performRedirect, buildUrlWithRedirect } = useAuthRedirect();

// Execute redirect
performRedirect();

// Build URL with redirect preserved
const signupUrl = buildUrlWithRedirect('/signup');
```

---

## 🔐 Authentication API

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});
```

### Get Session
```typescript
const { data: { session } } = await supabase.auth.getSession();
```

### Sign Out
```typescript
await supabase.auth.signOut();
```

---

## ✅ Validation Rules

### Email
- Must be non-empty
- Must match email format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)

### Password
- **Sign In**: Non-empty
- **Sign Up**: Minimum 8 characters

---

## 🎯 Error Messages

| Error Type | User Message |
|------------|--------------|
| Invalid credentials | "Email or password is incorrect." |
| Email not confirmed | "Check your email to confirm your account." |
| Rate limited | "Too many attempts. Try again later." |
| User exists | "An account with this email already exists." |
| Network error | "Connection problem. Please try again." |
| Generic | "An error occurred. Please try again." |

---

## 🧪 Testing Scenarios

### Happy Path
1. ✅ Sign up with valid email/password
2. ✅ Sign in with valid credentials
3. ✅ Redirect to target after auth
4. ✅ Auto-redirect if already authenticated

### Error Cases
1. ❌ Invalid email format
2. ❌ Short password (< 8 chars)
3. ❌ Wrong password
4. ❌ Non-existent user
5. ❌ Network failure

### Edge Cases
1. 🔄 Switch between login/signup
2. 🔄 Preserve redirect param when switching
3. 🔄 Handle email confirmation flow
4. 🔄 Handle rate limiting

---

## 📝 Type Definitions

### AuthFormVM
```typescript
interface AuthFormVM {
  mode: 'login' | 'signup';
  email: string;
  password: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  redirectTo: string;
}
```

### ErrorBannerVM
```typescript
interface ErrorBannerVM {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}
```

---

## 🔗 File Locations

```
frontend/src/
├── components/
│   ├── AuthForm.tsx          # Main auth component
│   └── InlineErrorBanner.tsx # Error display
├── hooks/
│   └── useAuthRedirect.ts    # Redirect logic
├── lib/
│   └── supabaseClient.ts     # Supabase config
├── pages/
│   ├── login.astro           # /login route
│   └── signup.astro          # /signup route
└── types/
    ├── viewModels.ts         # View model types
    └── index.ts              # Type exports
```

---

## 🐛 Debugging Tips

### Auth not working?
1. Check environment variables are set
2. Verify Supabase URL/key are correct
3. Check browser console for errors
4. Verify Supabase project email auth is enabled

### Redirect not working?
1. Check `redirectTo` query param format
2. Verify path starts with `/`
3. Check for console warnings about invalid paths

### TypeScript errors?
```bash
npx tsc --noEmit
```

### Build errors?
```bash
npm run build
```

---

## 📚 Documentation

- **Implementation Guide**: `AUTH_IMPLEMENTATION.md`
- **Summary**: `AUTH_IMPLEMENTATION_SUMMARY.md`
- **Plan**: `.ai/auth-view-implementation-plan.md`

---

**Quick Links:**
- [Supabase Docs](https://supabase.com/docs/guides/auth)
- [Astro Docs](https://docs.astro.build)
- [React Docs](https://react.dev)
