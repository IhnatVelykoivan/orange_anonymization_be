# Backend Tasks — Magic Link Fix

---

## PR #1 — Hot-fix: email sends correct URL

**Branch:** `claude/fix-magic-link-undefined-5kCnp`
**Priority:** Critical — users cannot log in
**Max diff size:** ~10 changed lines (excluding comments)

### Task 1.1: Fix config key in `requestMagicLink`

**File:** `src/modules/email/services/email-sender.service.ts` (line ~71)

Replace:
```ts
const frontendUrl = this.configService.get<string>('FRONTEND_URL');
const verifyUrl = `${frontendUrl}/auth/verify/token/${token}`;
```

With:
```ts
const frontendUrl = (this.configService.get<string>('app.frontendUrl') ?? '').replace(/\/$/, '');
if (!frontendUrl) {
  throw new InternalServerErrorException('FRONTEND_URL is not configured');
}
const verifyUrl = `${frontendUrl}/auth/verify/token/${token}`;
```

Add `InternalServerErrorException` to the existing `@nestjs/common` import at the top of the file.

### Task 1.2: Fix config key in `sendMagicLink`

**File:** `src/modules/email/services/email-sender.service.ts` (line ~58)

Apply the exact same change as Task 1.1 to the `sendMagicLink` method. (This method is dead code that will be removed in PR #3, but we fix it now so both paths are safe if someone calls it before PR #3 lands.)

### Task 1.3: Document `FRONTEND_URL` as required

**File:** `.env.example`

Replace:
```
FRONTEND_URL=http://localhost:5173
```

With:
```
# REQUIRED — base URL of the deployed app, no trailing slash (e.g. https://your-app.herokuapp.com)
FRONTEND_URL=http://localhost:5173
```

### Scope fence

- Do NOT delete `sendMagicLink` — that is PR #3
- Do NOT touch `sendEmail`, `SMTP_HOST`, `EMAIL_USER`, or the nodemailer transporter — that is PR #3
- Do NOT touch `MAGIC_LINK_EXPIRES_IN` or the template — that is PR #4
- Do NOT add tests or Joi validation — that is PR #5
- Do NOT modify any file other than `email-sender.service.ts` and `.env.example`

### Verification

```bash
npx tsc --noEmit
# Must pass with zero errors

grep -rn "get<string>('FRONTEND_URL')" src/
# Must return zero results

grep -rn "app.frontendUrl" src/modules/email/services/email-sender.service.ts
# Must return exactly 2 results (one per method)
```

### Commit

```
fix(auth): resolve undefined in magic link email URL
```

---

## PR #3 — Email service cleanup

**Branch:** `chore/email-sender-cleanup` (needs user authorization)
**Priority:** Medium
**Depends on:** PR #1 merged

### Task 3.1: Delete dead `sendMagicLink` method

**File:** `src/modules/email/services/email-sender.service.ts`

Remove the entire `sendMagicLink` method (lines ~55–68). Only `requestMagicLink` is called (from `AuthService.login`). Keeping both creates drift risk.

### Task 3.2: Fix config keys in `sendEmail` private method

**File:** `src/modules/email/services/email-sender.service.ts`

In the `sendEmail` method:

| Current (broken) | Replace with |
|---|---|
| `this.configService.get<string>('SMTP_HOST') \|\| 'smtp.gmail.com'` | `this.configService.get<string>('mail.host') ?? 'smtp.gmail.com'` |
| `port: 587` | `port: this.configService.get<number>('mail.port') ?? 587` |
| `this.configService.get<string>('EMAIL_USER')` (in `from:`) | `this.configService.get<string>('mail.from')` |

### Task 3.3: Replace manual nodemailer transport with MailerService

**File:** `src/modules/email/services/email-sender.service.ts`

The `AppModule` (lines 43–68 of `src/app.module.ts`) already configures `MailerModule` with the correct SMTP settings. But `sendEmail()` ignores it and creates its own `nodemailer.createTransport()`.

Changes:
1. Add `MailerService` from `@nestjs-modules/mailer` to the constructor injection (it's already exported by `EmailModule` via `MailerModule`).
2. Replace the body of `sendEmail()` with:
   ```ts
   await this.mailerService.sendMail({ to, subject, html });
   ```
3. Remove the `import * as nodemailer from 'nodemailer';` line.

### Scope fence

- Do NOT touch `requestMagicLink` logic (already fixed in PR #1)
- Do NOT touch `MAGIC_LINK_EXPIRES_IN` or the template
- Do NOT add tests

### Verification

```bash
npx tsc --noEmit

grep -rn "SMTP_HOST\|EMAIL_USER\|sendMagicLink\|createTransport\|from 'nodemailer'" src/
# Must return zero results
```

### Commit

```
refactor(email): clean up email sender service config and remove dead code
```

---

## PR #4 — Wire up `MAGIC_LINK_EXPIRES_IN`

**Branch:** `feat/magic-link-expiry-from-env` (needs user authorization)
**Priority:** Medium
**Depends on:** PR #1 merged

### Task 4.1: Add `magicLink` section to configuration

**File:** `src/config/configuration.ts`

Add after the `encryption` section:
```ts
magicLink: {
  expiresInSeconds: toInt(process.env.MAGIC_LINK_EXPIRES_IN, 900),
},
```

### Task 4.2: Override JWT expiry for magic-link tokens

**File:** `src/modules/auth/auth.service.ts`

1. Add `ConfigService` from `@nestjs/config` to the constructor:
   ```ts
   constructor(
     private readonly usersService: UsersService,
     private readonly jwtService: JwtService,
     private readonly emailService: EmailSenderService,
     private readonly configService: ConfigService,
   ) {}
   ```

2. In `login()`, read the configured expiry and pass it to `jwtService.sign`:
   ```ts
   async login(email: string) {
     const user = await this.usersService.upsert(email);
     const expiresIn = this.configService.get<number>('magicLink.expiresInSeconds') ?? 900;
     const payload = { sub: user.id, email: user.email };
     const token = this.jwtService.sign(payload, { expiresIn });
     return this.emailService.requestMagicLink(email, token, expiresIn);
   }
   ```

3. Add the import: `import { ConfigService } from '@nestjs/config';`

### Task 4.3: Update `requestMagicLink` signature

**File:** `src/modules/email/services/email-sender.service.ts`

Change the method signature to accept `expiresInSeconds`:
```ts
async requestMagicLink(email: string, token: string, expiresInSeconds: number): Promise<{ message: string }>
```

Compute and pass `validityMinutes` to the template:
```ts
const validityMinutes = Math.round(expiresInSeconds / 60);
const html = renderMagicLinkTemplate({ verifyUrl, validityMinutes });
```

### Task 4.4: Update the email template to accept `validityMinutes`

**File:** `src/modules/email/templates/magic-link.template.ts`

1. Remove the constant: `const MAGIC_LINK_VALIDITY = '15';`
2. Update the interface:
   ```ts
   interface MagicLinkTemplateInput {
     verifyUrl: string;
     validityMinutes: number;
   }
   ```
3. Update the function signature:
   ```ts
   export function renderMagicLinkTemplate({ verifyUrl, validityMinutes }: MagicLinkTemplateInput): string {
   ```
4. Replace `${magicLinkValidity}` in the template body with `${validityMinutes}`.
5. Remove the local variable `const magicLinkValidity = MAGIC_LINK_VALIDITY;`.

### Scope fence

- Do NOT touch `sendEmail()` or the nodemailer transport — that is PR #3
- Do NOT add Joi validation or tests — that is PR #5

### Verification

```bash
npx tsc --noEmit

grep -rn "MAGIC_LINK_VALIDITY\|'15'" src/modules/email/templates/magic-link.template.ts
# Must return zero results
```

### Commit

```
feat(auth): wire MAGIC_LINK_EXPIRES_IN env var to JWT TTL and email template
```

---

## PR #5 — Config validation + regression tests

**Branch:** `chore/config-validation-and-tests` (needs user authorization)
**Priority:** Low
**Depends on:** PR #1 and PR #4 merged

### Task 5.1: Install Joi

`joi` is NOT in `package.json`. Run:
```bash
npm install joi
```

### Task 5.2: Create validation schema

**New file:** `src/config/validation.schema.ts`

```ts
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  FRONTEND_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  MAIL_USER: Joi.string().required(),
  MAIL_PASS: Joi.string().required(),
  ENCRYPTION_KEY: Joi.string().min(16).required(),
  DB_HOST: Joi.string().required(),
  DB_NAME: Joi.string().required(),
}).options({ allowUnknown: true });
```

### Task 5.3: Wire validation into ConfigModule

**File:** `src/app.module.ts`

Add import:
```ts
import { validationSchema } from './config/validation.schema';
```

Update `ConfigModule.forRoot`:
```ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [configuration],
  envFilePath: '.env',
  validationSchema,
  validationOptions: { abortEarly: false },
}),
```

### Task 5.4: Add unit tests for `EmailSenderService`

**New file:** `src/modules/email/services/email-sender.service.spec.ts`

Three test cases using `@nestjs/testing`:

1. **Happy path:** Mock `ConfigService` to return `'https://example.com'` for `app.frontendUrl`. Call `requestMagicLink`. Assert the HTML passed to `sendMail` contains `href="https://example.com/auth/verify/token/` and does NOT contain the substring `'undefined'`.

2. **Missing config:** Mock `ConfigService` to return `''` for `app.frontendUrl`. Call `requestMagicLink`. Assert it throws `InternalServerErrorException`.

3. **Trailing slash normalization:** Mock `ConfigService` to return `'https://example.com/'` for `app.frontendUrl`. Call `requestMagicLink`. Assert the URL in the HTML does NOT contain `//auth`.

Mock `MailerService.sendMail` to resolve and capture the `html` argument.

### Scope fence

- Do NOT modify `email-sender.service.ts` logic — only add the test file
- Do NOT modify `configuration.ts`

### Verification

```bash
npx tsc --noEmit
npm test -- --testPathPattern=email-sender
# All 3 tests must pass
```

### Commit

```
chore: add config validation schema and email sender tests
```
