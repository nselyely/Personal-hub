# PersonalHub — React frontend

This React app provides the PersonalHub public website, authenticated family
portal, administrator workspace, and editor workspace. See the repository
README for backend setup, database initialization, and first-admin bootstrap.

## Requirements
- Node.js (LTS version recommended)
- npm
- VS Code (recommended)

## Run the project

1. Extract the ZIP file.
2. Open the `personalhub-frontend` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run:

```bash
npm install
npm run dev
```

5. Open the local address shown by Vite, usually:

`http://localhost:5173`

## Build for production

```bash
npm run build
npm run preview
```

## Page groups

### Public website
- `/`
- `/about`
- `/family`
- `/family-tree`
- `/gallery`
- `/publications`
- `/contact`

### Authentication
- `/login`
- `/register`
- `/forgot-password`
- `/my-account`

### Family portal
- `/family-portal`
- `/family-portal/profile`
- `/family-portal/members`
- `/family-portal/tree`
- `/family-portal/gallery`
- `/family-portal/news`
- `/family-portal/settings`

### Administrator
- `/admin`
- `/admin/users`
- `/admin/family`
- `/admin/family-tree`
- `/admin/personal-profile`
- `/admin/publications`
- `/admin/gallery`
- `/admin/albums`
- `/admin/invitations`
- `/admin/approvals`
- `/admin/reports`
- `/admin/activity`
- `/admin/website-settings`
- `/admin/privacy`

### Editor
- `/editor`
- `/editor/create-publication`
- `/editor/my-publications`
- `/editor/family-profiles`
- `/editor/upload-photos`
- `/editor/albums`
- `/editor/publication-status`
- `/editor/profile`

## Backend connection
- This frontend expects the API on `http://localhost:5000`; Vite proxies `/api`
  requests to that address.
- Account registration requires a single-use invitation. The first
  administrator must be created through the backend bootstrap endpoint.
- Publications and photos are stored in MySQL. Photo access is checked by the
  backend according to its visibility and the signed-in user's role.
- Public article comments are moderated before display. Approved family
  accounts can post and comment in the private family feed, and members can
  customize their profile photo and introduction.
- Contact, password recovery, and other unfinished dashboard actions remain
  demonstrations and do not save or send data.
- Do not add real passwords, addresses, phone numbers, children's identifying
  details, or private family photographs to this prototype.
