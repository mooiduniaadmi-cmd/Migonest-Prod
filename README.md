# Migonest - Study Abroad Platform (Technical Documentation)

Migonest is a professional ecosystem connecting international students with vetted "Uni Experts." This documentation covers the hybrid backend architecture, database schema, and core business logic.

## 1. Architecture Overview

Migonest utilizes a **Hybrid Backend Architecture**:
- **Data Layer (Supabase REST):** The frontend communicates directly with Supabase for standard operations (fetching posts, profiles, and notifications) using standard Row Level Security (RLS).
- **Logic Layer (Custom Express Server):** A Node.js/Express server (`server.ts`) handles complex operations requiring "Elevated Privileges," specifically financial escrow movements and roadmap handshake validations.

## 2. Core Business Logic

### The Escrow System & Payment Plans

Students can hire an expert using one of two payment plans:
1. **One-Time Payment ($599.00)**
2. **5-Month Installment Plan ($119.80/month)**

Regardless of the payment plan chosen, the funds are distributed proportionally on every successful payment:
- **20% (e.g., $119.80 total or $23.96/month):** Retained conceptually by the platform (Service Fee).
- **40% (e.g., $239.60 total or $47.92/month):** Released immediately to the Expert's wallet to initiate/continue work.
- **40% (e.g., $239.60 total or $47.92/month):** Held in **Escrow** (tracked via the `service_requests.fee` and `wallet_entries`) pending the final Visa outcome.

*Note on Installments:* If a student fails to pay a monthly installment, their admission journey is automatically locked until the payment method is updated and the charge succeeds.

### The 8-Stage Handshake
Admissions progress through 8 stages (Requirements -> ... -> Accommodation).
- **Expert Move:** Expert calls `/api/requests/:id/handshake/expert` to mark a stage done.
- **Student Move:** Student calls `/api/requests/:id/handshake/student` to verify work and move the roadmap to the next ID.

### Visa Denial Protection
If a visa is denied, the student uploads proof. Once the expert confirms:
- **Student Refund:** 20% ($119.80) is automatically moved from Escrow to Student Wallet.
- **Expert Rest Fee:** 20% ($119.80) is moved from Escrow to Expert Wallet (Expert keeps 60% total).

## 3. API Reference (Custom Backend - Port 3001)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/hire` | Initiates journey, creates request, and triggers initial 40% payout. |
| `PUT` | `/api/requests/:id/handshake/expert` | Expert marks milestone complete; sets `is_pending_student_confirmation`. |
| `PUT` | `/api/requests/:id/handshake/student` | Student approves milestone; advances `current_step` and releases final 40% if stage is final. |
| `POST` | `/api/requests/:id/deny-confirm` | Expert validates denial proof; triggers 20% student refund and 20% expert rest fee. |

## 4. Database Schema (`supabase_schema.sql`)

### Key Tables
- **`profiles`:** Extends Auth metadata. Includes `wallet_balance`, `earnings`, and `role`.
- **`service_requests`:** The state machine for admissions journeys. Tracks steps, status, and agreement data.
- **`wallet_entries`:** A ledger-based history of all EARNINGS, REFUNDS, and UNLOCKS.
- **`posts` / `connections`:** Drives the social graph and networking feed.

### Custom RPC Functions
The backend relies on a specific PostgreSQL function to update balances securely:
```sql
-- Used by server.ts to increment wallet amounts
increment_wallet(row_id uuid, val numeric)
```

## 5. Local Setup Instructions

1. **Supabase Setup:**
   - Create a new project at [supabase.com](https://supabase.com).
   - Run the full SQL script from `supabase_schema.sql` in the **SQL Editor**.
2. **Environment Variables:**
   Create a `.env` file in the root with:
   ```env
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_public_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_private_service_role_key (CRITICAL FOR BE)
   BE_PORT=3001
   ```
3. **Start Services:**
   - Frontend: `npm run dev` (Port 3000)
   - Backend: `ts-node server.ts` (Port 3001)

## 6. Financial Security Note
The frontend is strictly forbidden from updating `wallet_balance` or `earnings` columns directly. These updates must only be performed through the custom Node.js backend using the `SERVICE_ROLE_KEY` to ensure the integrity of the escrow system.
