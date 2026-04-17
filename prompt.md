# Magic Link "undefined" Bug — Backend Agent Briefing

## Bug Description

Users receive magic-link emails where the URL starts with `undefined/auth/verify/token/eyJhbG...` instead of a valid host. The link is completely broken — clicking it navigates to a non-existent domain.

## Root Cause (confirmed)

The magic link URL is constructed in `src/modules/email/services/email-sender.service.ts` at two locations (lines ~58 and ~71):

```ts
const frontendUrl = this.configService.get<string>('FRONTEND_URL');
const verifyUrl = `${frontendUrl}/auth/verify/token/${token}`;
```

### Why it returns `undefined`

1. **Primary cause:** The `FRONTEND_URL` environment variable is not set on the deployed Heroku environment. The value exists only in `.env.example`, which is not deployed. `.env` is gitignored.

2. **Secondary cause (latent code bug):** The app's config factory (`src/config/configuration.ts:26`) registers the value under the **namespaced** key `app.frontendUrl`, not the raw env-var name `FRONTEND_URL`. Every other service in the codebase reads namespaced keys (`app.host`, `db.host`, `auth.jwtSecret`, etc.), but `email-sender.service.ts` reads the raw key. When the env var is absent, the namespaced path would at least return `''` (the fallback in `configuration.ts`), but the raw key returns `undefined`.

3. **Result:** JavaScript's template literal coerces `undefined` to the string `"undefined"`, producing `undefined/auth/verify/token/eyJhbG...`.

## Architecture Context

- **Backend:** NestJS (v10), deployed on Heroku via Docker (`heroku.yml`)
- **Frontend:** React + Vite, built and placed into `backend/frontend-dist/`. Served by the backend via `@nestjs/serve-static` (`ServeStaticModule`). Both run on the same Heroku dyno.
- **Config pattern:** `ConfigModule.forRoot({ load: [configuration] })` with namespaced keys (e.g., `app.host`, `db.port`, `mail.host`). All services except `email-sender.service.ts` use the namespaced form.
- **Magic link flow:** `AuthController.login()` → `AuthService.login()` → signs a JWT → `EmailSenderService.requestMagicLink()` → constructs `${frontendUrl}/auth/verify/token/${jwt}` → sends email via nodemailer.
- **Token type:** The JWT in the URL IS the final auth token. The frontend stores it directly in `localStorage` — there is no backend token-exchange endpoint.

## Key Files

| File | Role |
|------|------|
| `src/modules/email/services/email-sender.service.ts` | Builds the magic link URL and sends the email. **This is where the bug lives.** |
| `src/config/configuration.ts` | Config factory — registers `app.frontendUrl` from `process.env.FRONTEND_URL ?? ''` |
| `src/modules/auth/auth.service.ts` | Calls `emailService.requestMagicLink(email, token)` |
| `src/modules/email/templates/magic-link.template.ts` | HTML email template — receives `verifyUrl` and renders the CTA button + link |
| `src/app.module.ts` | Wires `ConfigModule`, `MailerModule`, `TypeOrmModule` |
| `.env.example` | Documents all env vars including `FRONTEND_URL` |

## Additional Bugs Discovered During Triage

These are **not** part of PR #1 (hot-fix) but are tracked in later PRs:

1. **Wrong config keys in `sendEmail()` private method:**
   - `this.configService.get<string>('SMTP_HOST')` — no such key exists. Should be `mail.host`.
   - `this.configService.get<string>('EMAIL_USER')` — no such key exists. Should be `mail.from`.
   - Port hardcoded to `587` — should be `this.configService.get<number>('mail.port')`.

2. **Dead code:** `sendMagicLink()` method (lines ~55–68) is never called. Only `requestMagicLink()` is called from `AuthService`. Both do the same thing. Keeping both creates drift risk.

3. **Redundant nodemailer transport:** `AppModule` already configures `MailerModule` with the correct SMTP settings, but `sendEmail()` creates its own `nodemailer.createTransport()` ignoring it entirely.

4. **`MAGIC_LINK_EXPIRES_IN` unused:** `.env.example` defines `MAGIC_LINK_EXPIRES_IN=900` (15 min), but no code reads it. The JWT uses `auth.jwtExpiresIn = '1h'`. The email template hardcodes `'15'` minutes. The copy and the actual token TTL are out of sync.

5. **No config validation:** Missing env vars fail silently at runtime (producing `undefined`) instead of failing at boot time.

## PR Structure

This work is split into 5 PRs. PRs #1 and #2 are the critical path. PRs #3–#5 are cleanup and hardening.

| PR | Repo | Branch | Depends On |
|----|------|--------|------------|
| #1 Hot-fix: backend sends correct URL | BE | `claude/fix-magic-link-undefined-5kCnp` | — |
| #2 Frontend: implement verify/token page | FE | `claude/fix-magic-link-undefined-5kCnp` | — (parallel) |
| #3 Email service cleanup | BE | `chore/email-sender-cleanup` | #1 merged |
| #4 Wire up MAGIC_LINK_EXPIRES_IN | BE | `feat/magic-link-expiry-from-env` | #1 merged |
| #5 Config validation + tests | BE | `chore/config-validation-and-tests` | #1 and #4 merged |

**This repo handles PRs #1, #3, #4, and #5.**
