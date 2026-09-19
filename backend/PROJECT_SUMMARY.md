# ProLance Backend Documentation

# Project Overview

**ProLance** is a clean, robust RESTful backend API for a modern freelance marketplace platform, developed using **Node.js**, **Express**, and **MongoDB** with **Mongoose**.

### 1. Problem It Solves

Hiring freelancers and managing contract-based digital work often involves fragmented communication, unclear project scopes, and disorganized proposal tracking. ProLance centralizes the entire freelancing lifecycle into a secure, structured platform. It bridges the gap between clients looking to hire talent and freelancers offering specialized services.

### 2. Main Idea

The core concept of ProLance revolves around two complementary marketplace dynamics:

1. **Client-Led Project Workflow:** Clients post customized project briefs with budgets and deadlines. Freelancers discover these projects and submit competitive proposals with delivery timelines. When a client accepts a proposal, an active contract is created, locking in the terms and transitioning the project into execution.
2. **Freelancer-Led Services Catalog:** Freelancers publish pre-packaged service offerings (gigs) at fixed prices tagged with standardized platform skills, allowing clients to browse and discover freelancer offerings directly.
3. **Collaboration & Reputation:** Active contracts enable project-scoped communication and culminate in completion and verified reciprocal ratings and reviews. Platform administrators curate the master skills taxonomy.

### 3. Main Users and Roles

The platform enforces role-based access control with three distinct user roles:

- **`CLIENT`**: Publishes and manages projects, browses freelancer services, reviews incoming proposals, accepts proposals (which automatically creates contracts), exchanges project messages, completes/cancels contracts, and reviews freelancers upon completion.
- **`FREELANCER`**: Maintains an extended profile with hourly rates and bio, publishes pre-packaged services linked to catalog skills, searches open projects, submits proposals, collaborates on active contracts, sends project messages, and reviews clients upon completion.
- **`ADMIN`**: Oversees platform integrity, manages all user accounts, and creates/manages the platform's standardized Skills catalog.

### 4. Main Features

- **User Authentication & Profiles:** Registration, credential verification with bcrypt password hashing, 7-day signed JWT tokens, authenticated password changes, email-based one-time password resets, and extended profiles for freelancers.
- **Master Skills Catalog:** Admin-curated, standardized skill records referenced across services and profiles.
- **Freelancer Services Offerings:** Publishable, browsable service offerings linked directly to valid platform skills.
- **Project Marketplace:** Full CRUD for project postings with multi-criteria filtering, text search across titles and descriptions, budget/deadline ranges, and bounded pagination.
- **Proposal Lifecycle:** Freelancers apply to open projects; clients evaluate proposals and accept or reject them.
- **Contract Management:** Automatic contract creation upon proposal acceptance, tracking start date, agreed delivery deadline, agreed price, and statuses (`ACTIVE`, `COMPLETED`, `CANCELLED`).
- **Project Messaging:** Real-time project communication restricted strictly to verified project participants, with read tracking.
- **Reputation & Review System:** Verified, one-time mutual reviews and 1–5 star ratings permitted only after successful contract completion.
- **Referential Integrity & Cascading Cleanups:** Cascading deletions remove associated projects, proposals, contracts, services, messages, and reviews when accounts or projects are deleted.

---

# User Journey

Here is how the ProLance system operates from start to finish, explained step-by-step:

```
[User Registration / Login]
         │
         ▼
[JWT Token Issued] (Client includes 'Authorization: Bearer <token>')
         │
   ┌─────┴───────────────────────────────────────────────────────┐
   │                                                             │
   ▼                                                             ▼
[CLIENT FLOW]                                            [FREELANCER FLOW]
1. Post Project (Budget, Deadline, Skills)               1. Set Freelancer Profile (Title, Rate, Bio)
2. View Proposals submitted to project                   2. Publish Services linked to Platform Skills
3. Accept winning Proposal                               3. Browse Open Projects & Submit Proposal
         │                                                       │
         └───────────────────────┬───────────────────────────────┘
                                 │
                                 ▼
                     [Proposal Acceptance]
                     - Winning proposal becomes ACCEPTED
                     - Competing pending proposals become REJECTED
                     - Contract created (ACTIVE, price, deadline)
                     - Project moves to IN_PROGRESS
                                 │
                                 ▼
                     [Active Collaboration]
                     - Project-scoped messaging between Client & Freelancer
                     - Read receipt tracking
                                 │
                                 ▼
                     [Contract Completion]
                     - Client or Freelancer marks Contract COMPLETED
                     - Project status moves to COMPLETED
                                 │
                                 ▼
                     [Reciprocal Reviews]
                     - Client reviews Freelancer (1-5 stars + feedback)
                     - Freelancer reviews Client (1-5 stars + feedback)
```

### 1. User Entry & Registration

A visitor initiates access by registering via `POST /api/auth/register`. The visitor specifies their name, email, password, and their chosen role: `CLIENT` or `FREELANCER` (the `ADMIN` role cannot be self-registered publicly). If the user registers as a `FREELANCER`, the system automatically provisions an associated `FreelancerProfile` document in MongoDB. The password is encrypted with 10 rounds of `bcrypt` hashing before storage.

### 2. Login & JWT Issuance

Existing users submit their email and password to `POST /api/auth/login`. The server verifies the credentials against MongoDB using `bcrypt.compare`. Upon success, a JSON Web Token (JWT) is generated containing the user's `userId` and `role`, signed with `JWT_SECRET`, and configured to expire in 7 days.

### 3. Authentication & Protected Requests

When making requests to protected endpoints, the client attaches the JWT in the HTTP request header:
`Authorization: Bearer <token>`
The `authMiddleware` intercepts the request, verifies the token's cryptographic signature and expiration, retrieves the user document from MongoDB (excluding password hash), and attaches the record to `req.user`.

### Registration Journey

User -> `POST /api/auth/register` -> validation -> bcrypt password hashing -> database -> JWT response.

### Login Journey

User -> `POST /api/auth/login` -> credentials verification -> JWT -> frontend.

### Authentication Journey

Frontend -> Bearer token -> auth middleware -> user identification -> protected endpoint.

### Change Password Journey

Logged-in user -> old password -> verification -> new password hash -> database update -> refreshed JWT.

### Forgot Password Journey

User -> `POST /api/auth/forgot-password` -> 6-digit OTP email -> `POST /api/auth/verify-reset-otp` -> short-lived reset authorization -> `POST /api/auth/reset-password` -> new password hash -> login.

The OTP is generated with a cryptographic random source, only its SHA-256 hash is stored for 10 minutes, and it is cleared atomically after successful verification. Verification issues a separate short-lived authorization whose hash is stored for the password reset. Forgot-password responses do not reveal whether an account exists. Existing JWTs remain valid until their normal seven-day expiry because this project has no token revocation store.

### 4. Role Authorization

Endpoints with role restrictions use `roleMiddleware("CLIENT")`, `roleMiddleware("FREELANCER")`, or `roleMiddleware("ADMIN")`. If `req.user.role` does not match the permitted roles, the request is immediately rejected with HTTP `403 Forbidden`.

### 5. Skills and Services Catalog

- An **Admin** creates standardized skill tags (e.g., "Node.js", "MongoDB", "UI Design") via `POST /api/skills`. Any user or guest can browse all skills (`GET /api/skills`).
- A **Freelancer** publishes service packages via `POST /api/services` specifying title, description, price, and referencing valid `Skill` IDs. Clients and guests can browse available services via `GET /api/services` and view individual service details via `GET /api/services/:id`.

### 6. Project Creation & Discovery

A client creates a project via `POST /api/projects`, specifying title, description, budget, future deadline, and required skills. Freelancers browse and filter open projects using `GET /api/projects` by searching keywords, specifying budget ranges, deadlines, or filtering by required skills.

### 7. Proposal Submission

A freelancer submits a proposal to an open project via `POST /api/proposals`, supplying their proposed price, delivery time (in days), and a cover letter. A compound unique index in MongoDB guarantees that a freelancer can submit only one proposal per project. Freelancers cannot submit proposals to their own projects or to projects that are not `OPEN`.

### 8. Proposal Review & Contract Generation

The client reviews proposals submitted to their project via `GET /api/projects/:projectId/proposals`. When the client selects a proposal, they trigger `PATCH /api/proposals/:id/accept`. The server atomically:

1. Validates that the proposal is in `PENDING` status and belongs to an `OPEN` project owned by the calling client.
2. Updates the accepted proposal status to `ACCEPTED`.
3. Updates all other pending proposals on that project to `REJECTED`.
4. Creates an `ACTIVE` `Contract` record with the agreed price, start date, and a calculated deadline based on the proposal's delivery days.
5. Updates the project status to `IN_PROGRESS`.

### 9. Project Collaboration & Messaging

While a project is active (or has active proposals/contracts), participants exchange direct messages using `POST /api/messages`. The system checks project ownership and participation rules to ensure only verified participants can communicate. Receivers mark messages as read via `PATCH /api/messages/:id/read`.

### 10. Contract Completion & Reviews

Once work is delivered, either participant can mark the contract as completed via `PATCH /api/contracts/:id/complete`. This marks the contract and project as `COMPLETED`, enabling both parties to submit a verified review via `POST /api/reviews` (1–5 rating plus written comment). A unique index enforces that each participant can submit only one review per contract.

### 11. Data Movement Pipeline

Every API interaction follows a structured pipeline:

```
Client Request ──► Express Router ──► Middleware (Auth/Role/Body) ──► Controller ──► Mongoose Model ──► MongoDB
                                                                                               │
Client Response ◄── JSON Format ◄── sendResponse Envelope ◄── Controller Logic ◄───────────────┘
```

---

## C. Database & Models

ProLance uses 9 Mongoose models:

### 1. User (`src/models/User.js`)

Represents system users (clients, freelancers, administrators).

- `name` (String, required, minlength 2, maxlength 120, trimmed)
- `email` (String, required, unique, lowercase, trimmed)
- `password` (String, required — stored as bcrypt hash)
- `passwordResetOtpHash` (String, internal, excluded from normal queries)
- `passwordResetOtpExpiresAt` (Date, internal, excluded from normal queries)
- `passwordResetAuthorizationHash` (String, internal, excluded from normal queries)
- `passwordResetAuthorizationExpiresAt` (Date, internal, excluded from normal queries)
- `role` (String, enum: `["CLIENT", "FREELANCER", "ADMIN"]`, required)
- `bio` (String, maxlength 2000, default `""`)
- `skills` (Array of Strings, max 30 items, default `[]`)
- `profileImage` (String, maxlength 1000, default `""`)
- Timestamps: `createdAt`, `updatedAt`

### 2. FreelancerProfile (`src/models/FreelancerProfile.js`)

Extends the `User` model with dedicated professional details for freelancers.

- `user` (ObjectId ref `User`, required, unique — 1-to-1 relationship)
- `title` (String, maxlength 60, default `""`)
- `bio` (String, maxlength 2000, default `""`)
- `hourlyRate` (Number, min 0, default 0)
- `skills` (Array of Strings, max 30 items, default `[]`)
- Timestamps: `createdAt`, `updatedAt`

### 3. Skill (`src/models/Skill.js`)

Standardized platform skill catalog managed by administrators.

- `name` (String, required, unique, lowercase, trimmed, maxlength 80)
- `description` (String, maxlength 500, default `""`)
- Timestamps: `createdAt`, `updatedAt`

### 4. Service (`src/models/Service.js`)

Pre-packaged service offerings published by freelancers.

- `title` (String, required, minlength 3, maxlength 100, trimmed)
- `description` (String, required, maxlength 5000, trimmed)
- `price` (Number, required, min 5)
- `freelancer` (ObjectId ref `User`, required)
- `skills` (Array of ObjectIds ref `Skill`)
- Indexes: `{ freelancer: 1, createdAt: -1 }`, `{ skills: 1, createdAt: -1 }`
- Timestamps: `createdAt`, `updatedAt`

### 5. Project (`src/models/Project.js`)

Work published by clients seeking freelancer bids.

- `title` (String, required, maxlength 160, trimmed)
- `description` (String, required, maxlength 5000, trimmed)
- `budget` (Number, required, min 0)
- `deadline` (Date, required — must be in the future)
- `skills` (Array of Strings, max 30 items)
- `status` (String, enum: `["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]`, default `"OPEN"`)
- `client` (ObjectId ref `User`, required)
- Indexes: `{ client: 1, createdAt: -1 }`, `{ status: 1, createdAt: -1 }`
- Timestamps: `createdAt`, `updatedAt`

### 6. Proposal (`src/models/Proposal.js`)

A freelancer's application and bid on an open client project.

- `project` (ObjectId ref `Project`, required)
- `freelancer` (ObjectId ref `User`, required)
- `coverLetter` (String, required, maxlength 5000, trimmed)
- `price` (Number, required, min 0)
- `deliveryTime` (Number, required, min 1 day)
- `status` (String, enum: `["PENDING", "ACCEPTED", "REJECTED"]`, default `"PENDING"`)
- Compound unique index: `{ project: 1, freelancer: 1 }` (prevents multiple proposals from the same freelancer on the same project)
- Indexes: `{ freelancer: 1, createdAt: -1 }`, `{ project: 1, status: 1 }`
- Timestamps: `createdAt`, `updatedAt`

### 7. Contract (`src/models/Contract.js`)

The formal engagement agreement created upon accepting a proposal.

- `project` (ObjectId ref `Project`, required)
- `proposal` (ObjectId ref `Proposal`, required)
- `client` (ObjectId ref `User`, required)
- `freelancer` (ObjectId ref `User`, required)
- `agreedPrice` (Number, required, min 0)
- `startDate` (Date, required, default `Date.now`)
- `deadline` (Date, required)
- `status` (String, enum: `["ACTIVE", "COMPLETED", "CANCELLED"]`, default `"ACTIVE"`)
- Compound unique index: `{ project: 1, proposal: 1 }`
- Indexes: `{ client: 1, createdAt: -1 }`, `{ freelancer: 1, createdAt: -1 }`
- Timestamps: `createdAt`, `updatedAt`

### 8. Message (`src/models/Message.js`)

Project-related communication exchanged between participants.

- `sender` (ObjectId ref `User`, required)
- `receiver` (ObjectId ref `User`, required)
- `project` (ObjectId ref `Project`, required)
- `content` (String, required, maxlength 5000, trimmed)
- `isRead` (Boolean, default `false`)
- Indexes: `{ project: 1, createdAt: 1 }`, `{ receiver: 1, isRead: 1, createdAt: -1 }`
- Timestamps: `createdAt`, `updatedAt`

### 9. Review (`src/models/Review.js`)

Post-contract performance review and rating.

- `contract` (ObjectId ref `Contract`, required)
- `reviewer` (ObjectId ref `User`, required)
- `reviewee` (ObjectId ref `User`, required)
- `rating` (Number, required, integer min 1, max 5)
- `comment` (String, required, maxlength 2000, trimmed)
- Compound unique index: `{ contract: 1, reviewer: 1 }` (prevents multiple reviews by the same party for a contract)
- Timestamps: `createdAt`, `updatedAt`

---

## D. API Endpoints

All endpoints use a unified JSON response envelope:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {},
  "error": null
}
```

Errors return `success: false`, `data: null`, and an `error: { code: "ERROR_CODE" }` object.

---

### 1. System & Health Endpoints

#### GET /

- **Purpose:** Root health check returning API readiness and MongoDB connectivity status.
- **Authentication:** Not required.
- **Role:** Any.
- **Request Body/Params:** None.
- **What happens:** Checks if `mongoose.connection.readyState === 1`.
- **Response:** HTTP `200` with `{ database: "connected" }` when ready; HTTP `503` if disconnected.
- **Errors:** `DATABASE_UNAVAILABLE` (503).

#### GET /health

- **Purpose:** Health check endpoint identical to `/` for uptime monitors.
- **Authentication:** Not required.
- **Role:** Any.
- **Response:** HTTP `200` or `503`.

---

### 2. Authentication Endpoints

#### POST /api/auth/register

- **Purpose:** Registers a new client or freelancer account.
- **Authentication:** Not required.
- **Request Body:**
  - `name` (String, required, 2-120 chars)
  - `email` (String, required, valid email format)
  - `password` (String, required, 6-128 chars)
  - `role` (String, required, must be `"CLIENT"` or `"FREELANCER"`)
  - `bio` (String, optional, max 2000 chars)
  - `skills` (Array of Strings, optional, max 30)
  - `profileImage` (String, optional, max 1000 chars)
- **What happens:**
  1. Validates inputs and confirms role is `CLIENT` or `FREELANCER` (blocks self-registration of `ADMIN`).
  2. Checks for existing email in `User` collection.
  3. Hashes password using bcrypt.
  4. Creates `User` document.
  5. If `role === "FREELANCER"`, creates default `FreelancerProfile` document.
  6. Generates 7-day JWT token.
- **Response:** HTTP `201` with `user` (without password) and `token`.
- **Errors:** `VALIDATION_ERROR` (400), `USER_EXISTS` (409).

#### POST /api/auth/login

- **Purpose:** Authenticates existing users and issues a JWT.
- **Authentication:** Not required.
- **Request Body:**
  - `email` (String, required)
  - `password` (String, required)
- **What happens:**
  1. Validates email and password presence.
  2. Queries user by lowercase email.
  3. Compares password hash using `bcrypt.compare`.
  4. Generates and returns a 7-day JWT.
- **Response:** HTTP `200` with `user` object (without password) and `token`.
- **Errors:** `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS` (401).

#### POST /api/auth/forgot-password

- **Purpose:** Starts an email-based password reset without requiring authentication.
- **Authentication:** Not required.
- **Request Body:** `email` (String, required, valid email format).
- **What happens:** Generates a cryptographically secure 6-digit OTP, stores only its SHA-256 hash for 10 minutes, and sends the code through SMTP.
- **Response:** HTTP `200` with a generic message whether or not the account exists.
- **Errors:** `VALIDATION_ERROR` (400), `SERVER_ERROR` (500 if email delivery fails).

#### POST /api/auth/verify-reset-otp

- **Purpose:** Verifies the emailed password reset code without authentication.
- **Authentication:** Not required.
- **Request Body:** `email` (String, required), `otp` (exactly 6 digits, required).
- **What happens:** Atomically validates the account, OTP hash, and 10-minute expiry, clears the OTP, and issues a separate short-lived reset authorization.
- **Response:** HTTP `200` with a reset authorization; the OTP is never returned.
- **Errors:** `VALIDATION_ERROR` (400), `INVALID_RESET_OTP` (400).

#### POST /api/auth/reset-password

- **Purpose:** Sets a new password using reset authorization issued after OTP verification.
- **Authentication:** Not required.
- **Request Body:** `resetAuthorization` (String, required), `newPassword` (String, required, 6-128 chars).
- **What happens:** Validates authorization ownership and expiry, hashes the new password with bcrypt, clears authorization fields atomically, and returns a fresh JWT.
- **Response:** HTTP `200` with a fresh JWT and no password or reset authorization data.
- **Errors:** `VALIDATION_ERROR` (400), `INVALID_RESET_AUTHORIZATION` (400).

#### PATCH /api/auth/change-password

- **Purpose:** Changes the authenticated user's password.
- **Authentication:** Required (`Bearer <token>`).
- **Request Body:**
  - `currentPassword` (String, required)
  - `newPassword` (String, required, min 6 chars)
- **What happens:**
  1. Validates inputs.
  2. Verifies `currentPassword` matches stored hash.
  3. Hashes `newPassword` and saves user.
  4. Issues a refreshed JWT token.
- **Response:** HTTP `200` with refreshed `token`.
- **Errors:** `UNAUTHORIZED` (401), `VALIDATION_ERROR` (400), `INVALID_PASSWORD` (400).

---

### 3. User Management Endpoints

#### GET /api/users/profile

- **Purpose:** Fetches the authenticated user's profile.
- **Authentication:** Required.
- **What happens:** Retrieves user by `req.user._id` without password.
- **Response:** HTTP `200` with user object.
- **Errors:** `UNAUTHORIZED` (401).

#### PUT /api/users/profile

- **Purpose:** Updates the authenticated user's profile details.
- **Authentication:** Required.
- **Request Body:** Optional fields: `name`, `bio`, `skills` (array of strings), `profileImage`.
- **What happens:** Validates inputs and updates `User` document.
- **Response:** HTTP `200` with updated user object.
- **Errors:** `VALIDATION_ERROR` (400).

#### GET /api/users/freelancer-profile

- **Purpose:** Fetches extended freelancer profile.
- **Authentication:** Required.
- **Role:** `FREELANCER`.
- **What happens:** Finds `FreelancerProfile` by user ID and populates user info.
- **Response:** HTTP `200` with freelancer profile object.
- **Errors:** `FORBIDDEN` (403), `PROFILE_NOT_FOUND` (404).

#### PUT /api/users/freelancer-profile

- **Purpose:** Updates extended freelancer profile.
- **Authentication:** Required.
- **Role:** `FREELANCER`.
- **Request Body:** Optional fields: `title`, `bio`, `hourlyRate`, `skills`.
- **What happens:** Updates `FreelancerProfile` document.
- **Response:** HTTP `200` with updated profile.
- **Errors:** `VALIDATION_ERROR` (400), `PROFILE_NOT_FOUND` (404).

#### DELETE /api/users/account

- **Purpose:** Deletes own user account and all related marketplace data.
- **Authentication:** Required.
- **What happens:** Cascades deletion across FreelancerProfile, Services, Projects, Proposals, Contracts, Messages, and Reviews associated with the user, then deletes the User record.
- **Response:** HTTP `200` with success message.
- **Errors:** `USER_NOT_FOUND` (404).

#### GET /api/users/admin/all

- **Purpose:** Lists all users with pagination.
- **Authentication:** Required.
- **Role:** `ADMIN`.
- **Query Parameters:** `page` (default 1), `limit` (default 20, max 100).
- **Response:** HTTP `200` with `users`, `count`, and `pagination`.
- **Errors:** `FORBIDDEN` (403), `VALIDATION_ERROR` (400).

#### GET /api/users/admin/:id

- **Purpose:** Admin endpoint to retrieve any user by ID.
- **Authentication:** Required.
- **Role:** `ADMIN`.
- **Response:** HTTP `200` with user object (excluding password).
- **Errors:** `FORBIDDEN` (403), `USER_NOT_FOUND` (404), `INVALID_ID` (400).

#### DELETE /api/users/admin/:id

- **Purpose:** Admin endpoint to delete any user and cascade-delete their data.
- **Authentication:** Required.
- **Role:** `ADMIN`.
- **What happens:** Prevents admin from deleting their own account via this endpoint. Cascades deletion across all associated records.
- **Response:** HTTP `200` with success message.
- **Errors:** `FORBIDDEN` (403), `INVALID_OPERATION` (400), `USER_NOT_FOUND` (404).

#### GET /api/users/:id/reviews

- **Purpose:** Returns all reviews received by a user.
- **Authentication:** Required.
- **Response:** HTTP `200` with array of populated review objects.
- **Errors:** `INVALID_ID` (400).

#### GET /api/users/:id

- **Purpose:** Returns public information for any user.
- **Authentication:** Required.
- **Response:** HTTP `200` with user object (excluding password).
- **Errors:** `USER_NOT_FOUND` (404), `INVALID_ID` (400).

---

### 4. Skills Endpoints

#### GET /api/skills

- **Purpose:** Lists all standardized skills in the platform catalog sorted alphabetically.
- **Authentication:** Not required (Public).
- **Response:** HTTP `200` with array of skill objects.

#### GET /api/skills/:id

- **Purpose:** Retrieves a single skill by ID.
- **Authentication:** Not required (Public).
- **Response:** HTTP `200` with skill object.
- **Errors:** `SKILL_NOT_FOUND` (404), `INVALID_ID` (400).

#### POST /api/skills

- **Purpose:** Creates a new standardized skill in the catalog.
- **Authentication:** Required.
- **Role:** `ADMIN`.
- **Request Body:**
  - `name` (String, required, max 80 chars)
  - `description` (String, optional, max 500 chars)
- **What happens:** Checks for existing skill by lowercase name, then creates Skill.
- **Response:** HTTP `201` with created skill object.
- **Errors:** `FORBIDDEN` (403), `VALIDATION_ERROR` (400), `SKILL_EXISTS` (409).

---

### 5. Services Endpoints

#### GET /api/services

- **Purpose:** Lists all freelancer service packages sorted by newest first.
- **Authentication:** Not required (Public).
- **What happens:** Finds all services, populates `freelancer` (name, email, role, profileImage) and `skills` (name, description).
- **Response:** HTTP `200` with array of service objects.

#### GET /api/services/:id

- **Purpose:** Retrieves a single service offering by ID with populated details.
- **Authentication:** Not required (Public).
- **Response:** HTTP `200` with service object.
- **Errors:** `SERVICE_NOT_FOUND` (404), `INVALID_ID` (400).

#### POST /api/services

- **Purpose:** Creates a new pre-packaged service offering.
- **Authentication:** Required.
- **Role:** `FREELANCER`.
- **Request Body:**
  - `title` (String, required, 3-100 chars)
  - `description` (String, required, max 5000 chars)
  - `price` (Number, required, min 5)
  - `skills` (Array of Skill ObjectIds, optional, max 30)
- **What happens:**
  1. Validates input lengths and price.
  2. Verifies that all provided skill IDs are valid ObjectIds.
  3. Verifies each skill ID exists in the `Skill` catalog.
  4. Creates service linked to `req.user._id`.
  5. Populates freelancer and skill details.
- **Response:** HTTP `201` with created service object.
- **Errors:** `FORBIDDEN` (403), `VALIDATION_ERROR` (400).

---

### 6. Projects Endpoints

#### GET /api/projects

- **Purpose:** Browses projects with search, filtering, sorting, and pagination.
- **Authentication:** Not required (Public).
- **Query Parameters:** `search`, `status`, `skill`, `minBudget`, `maxBudget`, `deadlineFrom`, `deadlineTo`, `sortBy` (`createdAt`, `budget`, `deadline`, `title`), `sortOrder` (`asc`, `desc`), `page` (default 1), `limit` (default 20, max 100).
- **Response:** HTTP `200` with `projects` array and `pagination` object.
- **Errors:** `VALIDATION_ERROR` (400).

#### GET /api/projects/my

- **Purpose:** Lists all projects created by the authenticated client.
- **Authentication:** Required.
- **Role:** `CLIENT`.
- **Response:** HTTP `200` with array of owned projects.
- **Errors:** `FORBIDDEN` (403).

#### GET /api/projects/:projectId/proposals

- **Purpose:** Lists proposals submitted to a specific project.
- **Authentication:** Required.
- **Role:** `CLIENT` (must own the project).
- **Query Parameters:** `page`, `limit`.
- **Response:** HTTP `200` with `proposals` array and `pagination`.
- **Errors:** `FORBIDDEN` (403), `PROJECT_NOT_FOUND` (404), `INVALID_ID` (400).

#### GET /api/projects/:id

- **Purpose:** Retrieves project details by ID.
- **Authentication:** Not required (Public).
- **Response:** HTTP `200` with project object (populated client).
- **Errors:** `PROJECT_NOT_FOUND` (404), `INVALID_ID` (400).

#### POST /api/projects

- **Purpose:** Creates a new client project.
- **Authentication:** Required.
- **Role:** `CLIENT`.
- **Request Body:**
  - `title` (String, required, max 160 chars)
  - `description` (String, required, max 5000 chars)
  - `budget` (Number, required, > 0)
  - `deadline` (Date String, required, must be in future)
  - `skills` (Array of Strings, optional, max 30)
- **Response:** HTTP `201` with created project object (`status: "OPEN"`).
- **Errors:** `FORBIDDEN` (403), `VALIDATION_ERROR` (400).

#### PUT /api/projects/:id

- **Purpose:** Updates an owned project.
- **Authentication:** Required.
- **Role:** `CLIENT` (must be project owner).
- **Request Body:** Optional fields: `title`, `description`, `budget`, `deadline`, `skills`. (Direct status modifications are rejected).
- **Response:** HTTP `200` with updated project object.
- **Errors:** `FORBIDDEN` (403), `PROJECT_NOT_FOUND` (404), `VALIDATION_ERROR` (400).

#### DELETE /api/projects/:id

- **Purpose:** Deletes an owned project and cascades deletions across proposals, contracts, messages, and reviews.
- **Authentication:** Required.
- **Role:** `CLIENT` (must be project owner).
- **Response:** HTTP `200` with success message.
- **Errors:** `FORBIDDEN` (403), `PROJECT_NOT_FOUND` (404).

---

### 7. Proposals Endpoints

#### POST /api/proposals

- **Purpose:** Submits a proposal for an open project.
- **Authentication:** Required.
- **Role:** `FREELANCER`.
- **Request Body:**
  - `project` (Project ObjectId, required)
  - `coverLetter` (String, required, max 5000 chars)
  - `price` (Number, required, > 0)
  - `deliveryTime` (Number in days, required, >= 1)
- **What happens:**
  1. Validates inputs.
  2. Ensures project exists and is in `OPEN` status.
  3. Ensures freelancer is not the project client.
  4. Checks that freelancer has not already submitted a proposal for this project.
  5. Creates Proposal document with status `PENDING`.
- **Response:** HTTP `201` with created proposal object.
- **Errors:** `FORBIDDEN` (403), `PROJECT_NOT_FOUND` (404), `PROJECT_NOT_OPEN` (409), `PROPOSAL_EXISTS` (409), `VALIDATION_ERROR` (400).

#### GET /api/proposals/my

- **Purpose:** Lists all proposals submitted by the authenticated freelancer.
- **Authentication:** Required.
- **Role:** `FREELANCER`.
- **Query Parameters:** `page`, `limit`.
- **Response:** HTTP `200` with `proposals` array and `pagination`.
- **Errors:** `FORBIDDEN` (403).

#### GET /api/proposals/projects/:projectId

- **Purpose:** Lists all proposals submitted to a client's project (alternative route).
- **Authentication:** Required.
- **Role:** `CLIENT` (must own project).
- **Response:** HTTP `200` with proposals and pagination.
- **Errors:** `FORBIDDEN` (403), `PROJECT_NOT_FOUND` (404).

#### GET /api/proposals/:id

- **Purpose:** Retrieves a single proposal by ID.
- **Authentication:** Required.
- **What happens:** Access is restricted to the proposing freelancer or project owner.
- **Response:** HTTP `200` with proposal object.
- **Errors:** `FORBIDDEN` (403), `PROPOSAL_NOT_FOUND` (404), `INVALID_ID` (400).

#### PATCH /api/proposals/:id/accept

- **Purpose:** Accepts a proposal, creates a contract, and starts the project.
- **Authentication:** Required.
- **Role:** `CLIENT` (must own project).
- **What happens:**
  1. Verifies proposal is `PENDING` and project is `OPEN`.
  2. Sets proposal status to `ACCEPTED`.
  3. Rejects all other pending proposals on this project (`REJECTED`).
  4. Creates an active `Contract` with deadline = now + deliveryTime days.
  5. Updates project status to `IN_PROGRESS`.
- **Response:** HTTP `200` with accepted proposal object.
- **Errors:** `FORBIDDEN` (403), `PROPOSAL_NOT_FOUND` (404), `PROPOSAL_NOT_PENDING` (409), `PROJECT_NOT_OPEN` (409).

#### PATCH /api/proposals/:id/reject

- **Purpose:** Rejects a pending proposal.
- **Authentication:** Required.
- **Role:** `CLIENT` (must own project).
- **What happens:** Verifies proposal is `PENDING` and sets status to `REJECTED`.
- **Response:** HTTP `200` with rejected proposal object.
- **Errors:** `FORBIDDEN` (403), `PROPOSAL_NOT_FOUND` (404), `PROPOSAL_NOT_PENDING` (409).

---

### 8. Contracts Endpoints

#### GET /api/contracts

- **Purpose:** Lists all contracts where the authenticated user is either client or freelancer.
- **Authentication:** Required.
- **Query Parameters:** `page`, `limit`.
- **Response:** HTTP `200` with `contracts` array and `pagination`.
- **Errors:** `VALIDATION_ERROR` (400).

#### GET /api/contracts/:id

- **Purpose:** Retrieves details for a specific contract.
- **Authentication:** Required (must be contract client or freelancer).
- **Response:** HTTP `200` with populated contract object.
- **Errors:** `FORBIDDEN` (403), `CONTRACT_NOT_FOUND` (404), `INVALID_ID` (400).

#### PATCH /api/contracts/:id/complete

- **Purpose:** Marks an active contract as completed.
- **Authentication:** Required (must be contract client or freelancer).
- **What happens:** Verifies contract status is `ACTIVE`. Sets contract and project statuses to `COMPLETED`.
- **Response:** HTTP `200` with updated contract object.
- **Errors:** `FORBIDDEN` (403), `CONTRACT_NOT_FOUND` (404), `CONTRACT_NOT_ACTIVE` (409).

#### PATCH /api/contracts/:id/cancel

- **Purpose:** Cancels an active contract.
- **Authentication:** Required (must be contract client or freelancer).
- **What happens:** Verifies contract status is `ACTIVE`. Sets contract and project statuses to `CANCELLED`.
- **Response:** HTTP `200` with updated contract object.
- **Errors:** `FORBIDDEN` (403), `CONTRACT_NOT_FOUND` (404), `CONTRACT_NOT_ACTIVE` (409).

---

### 9. Reviews Endpoints

#### POST /api/reviews

- **Purpose:** Submits a review and 1–5 star rating for the other party on a completed contract.
- **Authentication:** Required (must be contract client or freelancer).
- **Request Body:**
  - `contract` (Contract ObjectId, required)
  - `rating` (Integer, required, 1 to 5)
  - `comment` (String, required, max 2000 chars)
- **What happens:**
  1. Validates rating is integer between 1 and 5.
  2. Confirms contract is `COMPLETED`.
  3. Automatically designates the other contract participant as `reviewee`.
  4. Checks that the caller has not already reviewed this contract.
  5. Creates Review document.
- **Response:** HTTP `201` with review object.
- **Errors:** `VALIDATION_ERROR` (400), `CONTRACT_NOT_FOUND` (404), `INVALID_REVIEW` (400), `FORBIDDEN` (403), `REVIEW_EXISTS` (409).

#### GET /api/reviews/user/:id

- **Purpose:** Retrieves paginated reviews received by a user.
- **Authentication:** Required.
- **Query Parameters:** `page`, `limit`.
- **Response:** HTTP `200` with `reviews` array and `pagination`.
- **Errors:** `VALIDATION_ERROR` (400), `INVALID_ID` (400).

---

### 10. Messages Endpoints

#### POST /api/messages

- **Purpose:** Sends a direct message tied to a specific project.
- **Authentication:** Required.
- **Request Body:**
  - `receiver` (User ObjectId, required)
  - `project` (Project ObjectId, required)
  - `content` (String, required, max 5000 chars)
- **What happens:**
  1. Verifies caller is not messaging themselves.
  2. Verifies project and receiver exist.
  3. Validates that sender and receiver have a valid relationship on the project (as client, proposal applicant, or contract participant).
  4. Creates Message document with `isRead: false`.
- **Response:** HTTP `201` with created message object.
- **Errors:** `VALIDATION_ERROR` (400), `PROJECT_NOT_FOUND` (404), `USER_NOT_FOUND` (404), `FORBIDDEN` (403).

#### GET /api/messages/project/:projectId

- **Purpose:** Retrieves all messages exchanged on a project.
- **Authentication:** Required (caller must be project client or participant).
- **Query Parameters:** `page`, `limit`.
- **Response:** HTTP `200` with `messages` array sorted chronologically and `pagination`.
- **Errors:** `PROJECT_NOT_FOUND` (404), `FORBIDDEN` (403), `INVALID_ID` (400).

#### PATCH /api/messages/:id/read

- **Purpose:** Marks a received message as read.
- **Authentication:** Required (caller must be the `receiver`).
- **What happens:** Verifies `req.user._id` matches `message.receiver`. Sets `isRead = true`.
- **Response:** HTTP `200` with updated message.
- **Errors:** `MESSAGE_NOT_FOUND` (404), `FORBIDDEN` (403), `INVALID_ID` (400).

---

## E. Authentication & Authorization

### 1. How Authentication Works

Authentication is stateless and implemented using **JSON Web Tokens (JWT)**:

1. **Token Generation:** When a user registers (`POST /api/auth/register`) or logs in (`POST /api/auth/login`), `jwt.sign()` generates a signed token:
   ```javascript
   jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
     expiresIn: "7d",
   });
   ```
2. **Token Transmission:** The client transmits the token in the HTTP `Authorization` header:
   ```
   Authorization: Bearer <token>
   ```
3. **Token Validation (`authMiddleware.js`):**
   - Checks if header starts with `"Bearer "`.
   - Decodes and cryptographically verifies token using `process.env.JWT_SECRET`.
   - Queries MongoDB for the user: `User.findById(decoded.userId)`.
   - Attaches the sanitized user document to `req.user`.
   - Rejects with HTTP `401 Unauthorized` if missing, expired, invalid, or user no longer exists.

### 2. How Authorization & Roles Work

Role-based access control is enforced by `roleMiddleware(...roles)`:

```javascript
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json(...);
    if (!roles.includes(req.user.role)) return res.status(403).json(...);
    next();
  };
};
```

### 3. Permissions Matrix

- **Public (No Auth Required):**
  - `GET /`, `GET /health`
  - `POST /api/auth/register`, `POST /api/auth/login`
  - `POST /api/auth/forgot-password`, `POST /api/auth/verify-reset-otp`, `POST /api/auth/reset-password`
  - `GET /api/skills`, `GET /api/skills/:id`
  - `GET /api/services`, `GET /api/services/:id`
  - `GET /api/projects`, `GET /api/projects/:id`
- **Authenticated (Any Role):**
  - `PATCH /api/auth/change-password`
  - `GET /api/users/profile`, `PUT /api/users/profile`
  - `DELETE /api/users/account`
  - `GET /api/users/:id`, `GET /api/users/:id/reviews`
  - `GET /api/proposals/:id` (participant check)
  - `GET /api/contracts`, `GET /api/contracts/:id` (participant check)
  - `PATCH /api/contracts/:id/complete`, `PATCH /api/contracts/:id/cancel` (participant check)
  - `POST /api/reviews`, `GET /api/reviews/user/:id`
  - `POST /api/messages`, `GET /api/messages/project/:projectId`, `PATCH /api/messages/:id/read`
- **Client Role Only (`roleMiddleware("CLIENT")`):**
  - `GET /api/projects/my`
  - `POST /api/projects`, `PUT /api/projects/:id`, `DELETE /api/projects/:id`
  - `GET /api/projects/:projectId/proposals`, `GET /api/proposals/projects/:projectId`
  - `PATCH /api/proposals/:id/accept`, `PATCH /api/proposals/:id/reject`
- **Freelancer Role Only (`roleMiddleware("FREELANCER")`):**
  - `GET /api/users/freelancer-profile`, `PUT /api/users/freelancer-profile`
  - `POST /api/services`
  - `POST /api/proposals`, `GET /api/proposals/my`
- **Admin Role Only (`roleMiddleware("ADMIN")`):**
  - `GET /api/users/admin/all`, `GET /api/users/admin/:id`, `DELETE /api/users/admin/:id`
  - `POST /api/skills`

---

## F. Error Handling

Error handling in ProLance is centralized in `src/middleware/errorMiddleware.js` and supported by `src/utils/response.js`.

### 1. Central Error Handling Middleware

Whenever an error occurs in asynchronous route handlers, `next(error)` delegates to `errorMiddleware`. The middleware translates errors into uniform JSON error payloads:

```json
{
  "success": false,
  "message": "Human readable error description",
  "data": null,
  "error": {
    "code": "ERROR_CODE"
  }
}
```

### 2. Mapped Failure Types

- **CastError (`INVALID_ID` - HTTP 400):** Triggered when an invalid MongoDB ObjectId string is supplied in parameters or queries.
- **ValidationError (`VALIDATION_ERROR` - HTTP 400):** Triggered when Mongoose schema validation constraints fail.
- **Duplicate Key Error (`DUPLICATE_RESOURCE` - HTTP 409):** Triggered on MongoDB error code `11000` when unique constraints are violated.
- **Application Validation Errors (HTTP 400):** Explicitly returned with `VALIDATION_ERROR` for malformed bodies, query bounds, or invalid dates.
- **Authentication Errors (`UNAUTHORIZED` - HTTP 401):** Missing, expired, or corrupted Bearer tokens.
- **Credentials Errors (`INVALID_CREDENTIALS` - HTTP 401):** Wrong email or password during login.
- **Authorization Errors (`FORBIDDEN` - HTTP 403):** Role insufficiency or attempting to access resources belonging to other participants.
- **Resource Not Found (HTTP 404):** Returned when documents do not exist (`USER_NOT_FOUND`, `PROJECT_NOT_FOUND`, `PROPOSAL_NOT_FOUND`, `CONTRACT_NOT_FOUND`, `SERVICE_NOT_FOUND`, `SKILL_NOT_FOUND`, `MESSAGE_NOT_FOUND`, `NOT_FOUND`).
- **Conflict / Business Rule Errors (HTTP 409):** State machine conflicts such as `USER_EXISTS`, `SKILL_EXISTS`, `PROPOSAL_EXISTS`, `REVIEW_EXISTS`, `PROJECT_NOT_OPEN`, `PROPOSAL_NOT_PENDING`, `CONTRACT_NOT_ACTIVE`.
- **Internal Server Errors (`SERVER_ERROR` - HTTP 500):** Catches unexpected exceptions and hides sensitive stack traces from clients.

---

## G. Complete Endpoint Summary

The ProLance backend provides **46 active API endpoints**:

| Method   | Endpoint                             | Authentication | Role        | Purpose                                                |
| :------- | :----------------------------------- | :------------- | :---------- | :----------------------------------------------------- |
| `GET`    | `/`                                  | None (Public)  | Any         | Root health check & DB readiness status                |
| `GET`    | `/health`                            | None (Public)  | Any         | Health check endpoint                                  |
| `POST`   | `/api/auth/register`                 | None (Public)  | Any         | Register new Client or Freelancer account              |
| `POST`   | `/api/auth/login`                    | None (Public)  | Any         | Authenticate user and obtain 7-day JWT                 |
| `POST`   | `/api/auth/forgot-password`          | None (Public)  | Any         | Send a 10-minute single-use 6-digit password reset OTP |
| `POST`   | `/api/auth/verify-reset-otp`         | None (Public)  | Any         | Verify OTP and issue short-lived reset authorization   |
| `POST`   | `/api/auth/reset-password`           | None (Public)  | Any         | Use reset authorization to set a new password          |
| `PATCH`  | `/api/auth/change-password`          | Required       | Any         | Change password and receive refreshed JWT              |
| `GET`    | `/api/users/profile`                 | Required       | Any         | Fetch current user's profile                           |
| `PUT`    | `/api/users/profile`                 | Required       | Any         | Update current user's profile                          |
| `GET`    | `/api/users/freelancer-profile`      | Required       | Freelancer  | Fetch extended freelancer profile                      |
| `PUT`    | `/api/users/freelancer-profile`      | Required       | Freelancer  | Update extended freelancer profile                     |
| `DELETE` | `/api/users/account`                 | Required       | Any         | Delete own account and all associated marketplace data |
| `GET`    | `/api/users/admin/all`               | Required       | Admin       | List all registered users (paginated)                  |
| `GET`    | `/api/users/admin/:id`               | Required       | Admin       | Fetch any user by ID                                   |
| `DELETE` | `/api/users/admin/:id`               | Required       | Admin       | Delete user by ID and cascade related data             |
| `GET`    | `/api/users/:id/reviews`             | Required       | Any         | Get all reviews received by a user                     |
| `GET`    | `/api/users/:id`                     | Required       | Any         | Fetch public profile for any user                      |
| `GET`    | `/api/skills`                        | None (Public)  | Any         | List all standardized platform skills                  |
| `GET`    | `/api/skills/:id`                    | None (Public)  | Any         | Get details for a specific skill                       |
| `POST`   | `/api/skills`                        | Required       | Admin       | Create a new skill in the master catalog               |
| `GET`    | `/api/services`                      | None (Public)  | Any         | List all published freelancer services                 |
| `GET`    | `/api/services/:id`                  | None (Public)  | Any         | Get details for a specific service package             |
| `POST`   | `/api/services`                      | Required       | Freelancer  | Create a new service package linked to skills          |
| `GET`    | `/api/projects`                      | None (Public)  | Any         | Browse projects with search, filter, and pagination    |
| `GET`    | `/api/projects/my`                   | Required       | Client      | List projects owned by the calling client              |
| `GET`    | `/api/projects/:projectId/proposals` | Required       | Client      | View proposals submitted to client's project           |
| `GET`    | `/api/projects/:id`                  | None (Public)  | Any         | Get project details                                    |
| `POST`   | `/api/projects`                      | Required       | Client      | Create a new project posting                           |
| `PUT`    | `/api/projects/:id`                  | Required       | Client      | Update owned project posting                           |
| `DELETE` | `/api/projects/:id`                  | Required       | Client      | Delete owned project and cascade data                  |
| `POST`   | `/api/proposals`                     | Required       | Freelancer  | Submit a proposal to an open project                   |
| `GET`    | `/api/proposals/my`                  | Required       | Freelancer  | List proposals submitted by the calling freelancer     |
| `GET`    | `/api/proposals/projects/:projectId` | Required       | Client      | View proposals submitted to client's project           |
| `GET`    | `/api/proposals/:id`                 | Required       | Participant | View details of a specific proposal                    |
| `PATCH`  | `/api/proposals/:id/accept`          | Required       | Client      | Accept proposal, reject others, create contract        |
| `PATCH`  | `/api/proposals/:id/reject`          | Required       | Client      | Reject a pending proposal                              |
| `GET`    | `/api/contracts`                     | Required       | Participant | List contracts involving current user                  |
| `GET`    | `/api/contracts/:id`                 | Required       | Participant | View contract details                                  |
| `PATCH`  | `/api/contracts/:id/complete`        | Required       | Participant | Mark an active contract as completed                   |
| `PATCH`  | `/api/contracts/:id/cancel`          | Required       | Participant | Cancel an active contract                              |
| `POST`   | `/api/reviews`                       | Required       | Participant | Submit review & rating for completed contract          |
| `GET`    | `/api/reviews/user/:id`              | Required       | Any         | Get paginated reviews for a user                       |
| `POST`   | `/api/messages`                      | Required       | Participant | Send project-related message to participant            |
| `GET`    | `/api/messages/project/:projectId`   | Required       | Participant | Get all messages for a project                         |
| `PATCH`  | `/api/messages/:id/read`             | Required       | Recipient   | Mark received message as read                          |

---

## H. Configuration & Running the Application

### 1. Prerequisites

- Node.js (v18 or newer)
- MongoDB running locally (default: `mongodb://127.0.0.1:27017/prolance`) or via MongoDB Atlas

### 2. Environment Variables (`.env`)

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/prolance
JWT_SECRET=supersecretkey12541254
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password
MAIL_FROM=no-reply@example.com
```

### 3. Startup Commands

- Start server:
  ```bash
  npm start
  ```
- Development server with auto-reload:
  ```bash
  npm run dev
  ```
