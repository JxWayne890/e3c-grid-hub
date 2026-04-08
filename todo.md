# GridWorker OS — Project TODO

## Frontend (Complete)
- [x] Hero section with animated headline and CTA
- [x] Nav with mobile menu and Join Beta button routing to /join
- [x] Grid Expansion section
- [x] How It Works section
- [x] Ecosystem Map section
- [x] Features section
- [x] Who It's For section
- [x] Pricing / tier cards section
- [x] Commission Breakdown / 3-6-9 section
- [x] Flywheel section
- [x] Visual Gallery section
- [x] Beta CTA section (home page inline form)
- [x] Footer
- [x] /join dedicated beta onboarding landing page with full intake form
- [x] Developer notes section removed from public site

## Backend / Full-Stack (In Progress)
- [x] Upgrade to full-stack (db + server + user)
- [x] Create betaSignups table in drizzle/schema.ts
- [x] Wire /join form to tRPC mutation (beta.submit)
- [x] Save beta signup to database
- [x] Send owner notification when someone signs up
- [x] Run pnpm db:push to push schema to database
- [ ] Admin view to see all beta signups
- [ ] AI chat widget (using AIChatBox component)

## Infrastructure
- [ ] Connect custom domain in Settings → Domains
- [ ] Stripe integration for subscription tiers (Phase 1)
- [ ] XRP Gratitude Fund wallet integration (Phase 2)
- [ ] QR code generation per Carrier Profile (Phase 1)
- [ ] Referral tracking engine — 3-6-9 chain attribution
- [ ] Carrier Profile dashboard (post-login)
- [ ] Email/SMS automation sequences (Phase 2)

## Email Integration (Resend)
- [x] Add RESEND_API_KEY secret
- [x] Install resend npm package
- [x] Wire beta signup to send email to u.logistics.ed@gmail.com via Resend
- [x] Write vitest for email send on beta signup

## Bug Fixes
- [x] Fix /join form not submitting to backend — no email sent on real form submission

## CRM Dashboard
- [x] Build /crm page with signups list, user details, earnings overview, referral tracking
- [x] Add admin tRPC procedure to list all beta signups
- [x] Add /crm route to App.tsx protected by admin auth
- [x] Wire CRM to live database data

## CRM Access Fix
- [x] Remove admin-only role gate from CRM — allow any authenticated user (owner) to access
- [x] Update listSignups backend procedure to allow authenticated users (not just admin)

## CRM Notes Feature
- [x] Add contactNotes table to drizzle/schema.ts
- [x] Push schema to database with pnpm db:push
- [x] Add notes query helpers to server/db.ts
- [x] Add notes.add, notes.list, notes.delete tRPC procedures
- [x] Build notes UI in CRM detail panel with add/view/delete
- [x] Write vitest for notes procedures
