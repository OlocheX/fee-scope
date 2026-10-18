# Fix sign-in, sign-up emails, and add password recovery

## Likely causes
- Email/password sign-in may never have been switched on for the project, so every sign-up silently fails and every sign-in returns "invalid login credentials". Accounts that never got confirmed also fail with the same message.
- No sender domain is set up yet, so confirmation emails come from the default sender. These are slow, often land in spam, and have a low hourly limit.
- The sign-up message says "confirmation link", but the user expects a code.

## Changes
1. **Turn on email sign-in** and check the sign-in logs to confirm the exact failure.
2. **Sign-up with a 6-digit code**: after creating an account, show a "Enter the code we emailed you" step with a code box, a "Resend code" button (with a cooldown), and a hint to check spam. A link in the email still works too.
3. **Clearer sign-in errors**: if the email isn't confirmed yet, say so and offer to resend the code, instead of "invalid credentials".
4. **Forgot password**:
   - A "Forgot password?" link under the password field, which also shows up highlighted after a failed sign-in.
   - A form that sends a reset email.
   - A new public `/reset-password` page to set a new password, then sign in.
5. **Better delivery (optional, recommended)**: set up your own sender domain so emails arrive reliably and look branded, then raise the hourly email limit.

## Technical details
- Run `enable_email_auth`; query auth logs for `invalid_credentials` vs `email_not_confirmed`.
- `src/routes/auth.tsx`: add `verifyOtp({ email, token, type: "signup" })`, `resend({ type: "signup" })`, error mapping, forgot-password view with `resetPasswordForEmail(email, { redirectTo: origin + "/reset-password" })`.
- New `src/routes/reset-password.tsx` (public): wait for the recovery session, then `updateUser({ password })`.
- Email domain setup + branded auth templates that include the `{{ .Token }}` code, after the user finishes the domain dialog.
