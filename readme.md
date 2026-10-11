# Fixtrail

A simple way for apartment residents to report maintenance problems, and for service teams to track them until they are fixed.

**Live test build:** https://fixtrail-4k10.onrender.com/login

> This is a proof of concept (test build). Sign-in uses only a name and email, with no passwords. Do not enter real personal data.

## What it does

- **Residents** raise a ticket with a category, urgency, flat details and a short description. Each ticket gets a reference like `FT-0001`.
- **Residents** see the status of their tickets right after signing in, with a progress tracker.
- **Service workers** see the queue of open tickets, take one with "Assign to me", log progress, and mark it as fixed.
- **Residents** confirm the fix with a 1 to 5 star rating and a short review, or reopen the ticket if the problem is not solved.

## How a ticket moves

Open → Assigned → In progress → Fixed → Closed

If a resident reopens a ticket, it goes back to Assigned for the same service worker.

## Try it yourself

Use two browser windows so both roles stay signed in.

1. Sign in as a **resident** and raise a ticket (for example, Plumbing).
2. In a second window, sign in as a **service worker**, open the queue, and click **Assign to me**.
3. Click **Start work**, add a progress update, then **Mark as fixed**.
4. Back in the resident window, confirm with a rating and review.

Free hosting may take 30 to 60 seconds to wake up on the first visit.

## Not included yet

- Passwords and manager approval of resident accounts
- Manager dashboard and monthly report
- Photo uploads
- Email notifications (status is shown in the app)
- Automatic escalation for overdue tickets
- Assigning tickets by category

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB Atlas
- **Hosting:** Render

## Run locally

```bash
npm install
npm run dev
```

See `DEPLOY.md` for database setup and deployment steps.