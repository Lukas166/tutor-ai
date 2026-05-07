This repository uses a split frontend/backend structure:

- `src/` contains the Next.js frontend.
- `backend/` contains the TypeScript API for login, register, profile sync, and role-aware sessions.

## Getting Started

1. Copy the environment files and fill in your Supabase values:

```bash
copy .env.example .env.local
copy backend\.env.example backend\.env
```

2. Install dependencies:

```bash
npm install
npm install --prefix backend
```

3. Run both apps together:

```bash
npm run dev
```

The frontend runs on [http://localhost:3000](http://localhost:3000) and the backend runs on [http://localhost:4000](http://localhost:4000).

## Role Flow

- `mahasiswa` goes to `/dashboard/mahasiswa`
- `dosen` and `admin` go to `/dashboard/staff`
- All roles share one profile page at `/profile`

## Database Update

Use [`sql/update_profiles_roles.sql`](sql/update_profiles_roles.sql) to add the `role` column, update trigger, and auth-user sync trigger for `public.profiles`.

## Notes

- The backend stores the session token in an HTTP-only cookie named `tutor_ai_token`.
- The frontend reads session state from the backend API so role logic stays server-side.