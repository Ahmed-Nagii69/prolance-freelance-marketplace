# ProLance

End-to-end freelance marketplace: clients post projects and hire freelancers, freelancers bid with proposals and get hired under contracts, everyone communicates in project conversations and leaves reviews.

Monorepo with two apps:

- `backend/` — Express + Mongoose REST API (JWT auth, role-based access, project/proposal/contract/review/message flows)
- `frontend/` — Angular 22 standalone single-page app (Bootstrap grid/utilities only, custom design system, Tabler icons)

## Requirements

- Node.js 20+ (tested with 24)
- MongoDB Atlas cluster (`MONGODB_URI` in `backend/.env`, see `backend/.env.example`)

## Getting started

### Backend

```bash
cd backend
npm install
cp .env.example .env   # if present; otherwise create from server/.env conventions
npm run seed           # optional: destructive demo data
npm start              # http://127.0.0.1:5000
```

The API exposes `GET /health` and mounts routes under `/api/*`. All endpoints respond with the envelope `{ success, message, data, error? }`; authenticated routes expect a `Bearer` JWT.

### Frontend

```bash
cd frontend
npm install
npm start              # http://localhost:4200 (proxies to the API via environments)
npm run build          # production build to dist/frontend
npm test               # unit tests
```

The API base URL lives in `frontend/src/environments/environment.ts` (`apiUrl`).

## Demo accounts

| Role      | Email                        | Password      |
| --------- | ---------------------------- | ------------- |
| Client    | client@prolance.dev          | Password123!  |
| Freelancer| freelancer@prolance.dev      | Password123!  |
| Admin     | admin@prolance.dev           | AdminPass123! |

## Feature overview

- **Clients**: create/edit projects, review proposals, open contracts, complete/cancel contracts, rate freelancers.
- **Freelancers**: browse projects by skill/budget, submit proposals, manage active contracts, message clients.
- **Everyone**: profiles (bio, skills, avatar), password change, account deletion, project conversations, user browsing.
- **Admin**: user management only — no access to private client/freelancer conversations.

## Security notes

- `backend/.env` holds real secrets — never commit it.
- Passwords are hashed; JWT auth guards every protected route.
- Self-review is blocked server-side; deleting your account is a hard cascade.

## Stack

- Backend: Express, Mongoose, JWT, bcrypt, nodemailer
- Frontend: Angular 22 (standalone components, signals, Angular `router` guards), Bootstrap 5, Tabler Icons, Sass