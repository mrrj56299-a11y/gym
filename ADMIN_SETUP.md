# First administrator setup

The chosen first admin account is `mrrj56299@gmail.com`. No password or secret is stored in the repository. The project deliberately has no public admin registration or hard-coded credential.

1. Configure Google OAuth (or register a normal email/password account) for `mrrj56299@gmail.com` and sign in once so the account exists in the application database. Google OAuth credentials must be added through the Webdev project's protected secrets form, not committed to files.
2. In the project shell, run exactly:

   ```bash
   pnpm admin:bootstrap -- mrrj56299@gmail.com
   ```

3. The command promotes only the existing matching account. It refuses to proceed if an admin already exists, so first-admin bootstrap is one-time. There is no browser endpoint for this operation.
4. Sign out and back in if needed, then open `/admin`.

The Google sign-in return URL must be configured in Google Cloud as `https://<your-site-origin>/api/auth/google/callback`; add the deployed origin to `GOOGLE_ALLOWED_ORIGINS` if that optional allowlist is enabled. For a local HTTP-only development host, use `http://localhost:<port>/api/auth/google/callback`.
