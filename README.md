# LASC Workspace

React + Firebase (Firestore). No login, mobile-first, live sync.

- **Overview**: roadmap progress ring, open/overdue counts, next up, upcoming meetings
- **Tasks**: Project and Development tasks with search and filters
- **Roadmap**: the 12 default LASC development phases (about 250 tasks) with shared check-offs
- **Meetings**: agenda, minutes, decisions, and attendance (default attendees pre-loaded, tap Present or Absent)

## Run

```bash
npm install
npm run dev
```

`.env` already contains the Firebase keys for the `lasc-workspace` project.

## Firestore rules (republish after updating!)

Firebase console → Firestore Database → Rules → paste `firestore.rules` → Publish.
The Roadmap needs the `tracker` rule that is in this version.

## Deploy

```bash
npm run build
firebase deploy   # after: firebase init hosting (public dir: dist, SPA: yes)
```

## Speed

Firestore uses a local cache (instant repeat loads) and auto long-polling (fixes stuck
connections on some networks). Writes show instantly and sync in the background.

## Open access

Anyone with the link can read and edit. Keep the link inside the group.

## Host on GitHub Pages

1. Create an empty repo on GitHub (e.g. `lasc-workspace`).
2. Push this folder to the `main` branch.
3. Repo → Settings → Pages → Source: **GitHub Actions**.
4. Every push to `main` rebuilds and deploys. The URL is `https://<username>.github.io/<repo>/`.

`.env.production` is committed on purpose (Firebase web keys are public; the rules protect the data).
