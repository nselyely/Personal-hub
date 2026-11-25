# Personal & Family Hub

A family website starter with a public-facing storybook home page, invitation-based accounts, a MySQL-backed content studio, and a database connection indicator.

## Requirements

- Node.js 20+
- MySQL 8+

## Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). Vite proxies `/api` requests to the backend on port 5000. The connection indicator checks both the API and MySQL. Publications and photos are stored by the backend; photos are saved under `backend/uploads` and are served through permission-checked API routes.

## Start the API

1. Create the MySQL database and tables by running `backend/database/schema.sql`.
   If you already created the database using the older schema, apply
   `backend/database/migrations/001-post-content-fields.sql` if it has not
   already been applied, then apply
   `backend/database/migrations/002-social-features.sql` once.
2. Copy `backend/.env.example` to `backend/.env`, set your local MySQL credentials,
   and replace `BOOTSTRAP_ADMIN_KEY` with a random value of at least 32
   characters. Keep `.env` private.
3. Run:

```powershell
cd backend
npm install
npm run dev
```

After the backend is running, create the first administrator once through
`POST /api/auth/bootstrap`. Send `fullName`, `email`, and a password of at least
10 characters as JSON, and send the configured `BOOTSTRAP_ADMIN_KEY` in the
`X-Bootstrap-Key` header. This endpoint is disabled without the key and refuses
to create an account after the first user exists. Sign in with that admin, open
**Administration → Family Invitations**, and create an invitation. The
invitation link is single-use, expires after seven days, and is bound to the
entered email. Email delivery is not configured; share the generated link
securely.

For a local bootstrap, enter the same key configured in `backend/.env` when
prompted, then replace the name, email, and password values:

```powershell
$bootstrapKey = Read-Host "Bootstrap key"
$body = @{ fullName = "Your Name"; email = "you@example.com"; password = "choose-a-long-password" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:5000/api/auth/bootstrap" -Method Post `
  -Headers @{ "X-Bootstrap-Key" = $bootstrapKey } -ContentType "application/json" -Body $body
```

The API supports account bootstrap, invitation-based family registration,
database-backed sessions with sign-in/sign-out, health checks, and
publication/photo reads and writes. Visitors can submit comments on public
articles; comments stay hidden until an administrator approves them. Approved
family accounts can share posts and comments in a private family feed, and
members can edit their own display name, introduction, visibility, and profile
photo. Administrators can moderate comments and edit family profiles.
Public visitors only receive public published content; family accounts receive
family-visible content; these permissions are enforced by the API. Other
dashboard sections remain UI previews. Password-reset email and invitation
email delivery are not implemented yet.

## Roles and privacy

The schema includes `super_admin`, `editor`, `family_member`, and `visitor` roles, account status, and `public` / `family` / `private` visibility fields. The demo uses sample copy and remotely hosted Unsplash images; visitors' browsers request those image URLs from Unsplash. Keep `.env` local and never commit credentials.

## Deploy the frontend only with GitHub Pages

The `Deploy frontend to GitHub Pages` workflow builds the React/Vite site from
`frontend/` whenever `main` changes. Enable **Settings → Pages → Build and
deployment → Source → GitHub Actions** if GitHub Pages is not enabled for the
repository. After the workflow succeeds, the site is available at
`https://nselyely.github.io/Personal-hub/`.

This publishes the frontend only. Sign-in, registration, comments, family
content, and other API-backed features require a separately deployed backend
and will not work until one is connected.

## Deploying with GitHub, Netlify, and Railway

Netlify serves the Vite frontend and rewrites `/api/*` requests to the Express
API. This keeps sign-in cookies same-origin in the browser. Railway hosts the
API and MySQL database.

1. Push this project to GitHub. In Netlify, import the repository; the root
   `netlify.toml` configures the `frontend` base directory, build, SPA fallback,
   and API proxy.
2. In Railway, create a MySQL database and a Node service from the same
   repository. Set the Node service's root directory to `backend`, build with
   `npm ci`, and start with `npm start`.
3. Configure the Railway service variables using the MySQL service's connection
   values: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Also set
   `NODE_ENV=production`, `BOOTSTRAP_ADMIN_KEY` (at least 32 random characters),
   and `CLIENT_ORIGIN` to your Netlify site URL. Railway provides the listening
   `PORT`. Add a Railway volume mounted at `/app/uploads` so uploaded photos
   survive service restarts and redeploys.
4. Initialize the Railway database with `backend/database/schema.sql`. If
   importing existing data, migrate a database dump instead of creating a fresh
   empty schema. Create the production administrator through the bootstrap
   endpoint after the API is healthy.
5. Add `RAILWAY_API_URL` as a Netlify build environment variable, using the Railway
API's public origin without a trailing slash or `/api` suffix. The frontend
build writes the API rewrite to `dist/_redirects`. Deploy the Netlify site
and verify its connection indicator reports a healthy API.

The redirect-generation script is `frontend/scripts/write-netlify-redirects.mjs`.
Do not put database passwords, bootstrap keys, or other secrets in GitHub;
configure them in Railway/Netlify environment settings. The local `.env` files
are ignored by `.gitignore`.
