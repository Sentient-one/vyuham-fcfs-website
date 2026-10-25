# Vyuham Esports — eFootball FCFS Club Draft

A mobile-friendly Next.js + Supabase website for FCFS selection of the previously prepared 32-club roster. Players enter their WhatsApp group name, choose one available club, and see the live roster refresh every three seconds. Admins can correct a name or clear a claim.

## Important limitation

This version uses a public link and a name field. It prevents duplicate normalized names and duplicate club claims, but **it does not verify that a person owns that WhatsApp identity**. Someone can impersonate another player's name before they claim. For stronger identity assurance, privately issue each player a unique claim code or use authenticated accounts.

## Requirements

- Node.js 20 or newer
- A Supabase account/project
- A Vercel account for deployment (or another Node host)

## 1. Create the Supabase database

1. Create a project at https://supabase.com.
2. Open **SQL Editor** in the Supabase dashboard.
3. Open `supabase.sql` from this project, copy all its contents, paste into a new SQL query, and run it.
4. Confirm that `public.clubs` contains exactly 32 rows and `public.claims` contains zero rows.
5. In **Project Settings → API**, copy the Project URL and the `service_role` key. Treat the service-role key like a password.

The SQL creates tables, enables row-level security without public table policies, seeds all 32 clubs, and adds an atomic database function for claims. API routes use the service-role key only on the server.

## 2. Configure environment variables

From this project folder:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
ADMIN_PASSWORD=use-a-long-unique-random-password-here
```

Generate a strong admin password; do not use a tournament name, date, or a password already used elsewhere. Never add `SUPABASE_SERVICE_ROLE_KEY` to a variable named `NEXT_PUBLIC_*`. Never commit `.env.local` to Git.

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Test with two separate browsers or phones. Claim a club in one; within a few seconds it should show as claimed in the other. Test that a second claim with the same name (even different letter case) is rejected and that two people cannot claim the same club.

To check a production build locally:

```bash
npm run build
npm start
```

## 4. Deploy the website

1. Create a private GitHub repository and push this project. Do not commit `.env.local`.
2. Import the repository into https://vercel.com.
3. In Vercel project settings, add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_PASSWORD` under **Environment Variables** for Production (and Preview only if you need it).
4. Deploy. Open the resulting Vercel URL and run the tests below.
5. Share the public URL in the WhatsApp group. Players do not need an account or app installation.

If you change environment variables, redeploy so the new values are loaded.

## 5. Admin use

1. Open the same public webpage.
2. Scroll to the bottom and select **Admin** / **Open admin tools**.
3. Enter `ADMIN_PASSWORD` and choose **Load claims**.
4. Edit the player name and press **Save**, or press **Clear** to release a club back into availability.

Admin routes compare the supplied password server-side. Anyone who knows that password can modify claims, so share it only with admins. Use HTTPS (Vercel provides it) and rotate the password if it is exposed.

## 6. Final test checklist

- [ ] All 32 correct clubs are listed.
- [ ] A player can claim one available club.
- [ ] A club immediately becomes unavailable after confirmation.
- [ ] A second player cannot claim the same club.
- [ ] A normalized duplicate player name is rejected.
- [ ] Two simultaneous claims for one club result in exactly one winner.
- [ ] Admin can correct a name.
- [ ] Admin can clear a claim and make the club available again.
- [ ] Wrong admin password cannot load or edit claims.
- [ ] The site works on a phone using mobile data, not just the local Wi-Fi.

## FCFS behavior

The official ordering is the order in which the database accepts successful claims, not the time a player taps the button or the time a request leaves their phone. If two requests arrive together, one transaction wins and the other receives a conflict response. The UI then refreshes the roster.

## Database reset before the tournament

Only if you intentionally want to clear every claim and start over, run this in Supabase SQL Editor:

```sql
-- WARNING: permanently clears all player selections.
delete from public.claims;
```

Do not run this once the tournament's selections are final unless the admins explicitly decide to reset the draft.
