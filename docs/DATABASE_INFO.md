# Migonest Backend Setup Guide

This document explains how to set up the Supabase database and connect it to your Migonest frontend.

## 1. Supabase Project Setup
1. Go to [Supabase](https://supabase.com/) and create a new project.
2. Once the project is ready, navigate to the **SQL Editor** in the left sidebar.
3. Click **New Query** and paste the entire contents of the `supabase_schema.sql` file (provided in this project).
4. Click **Run**. This will create all tables, relationships, and the auto-profile trigger.

## 2. Environment Variables
Add the following to your environment configuration (e.g., in your deployment platform or a local `.env` file):

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Storage Buckets (Optional but Recommended)
For document uploads, create the following buckets in the **Storage** section of Supabase:
- `locker`: Set to private. For student personal documents.
- `journeys`: Set to private. For documents shared between students and experts.
- `avatars`: Set to public. For profile pictures.

## 4. Database Architecture Overview

### Handshake Logic (`service_requests`)
The admission journey uses a collaborative handshake. 
- **Expert** updates `is_pending_student_confirmation` to `true`.
- **Student** updates `current_step` and sets `is_pending_student_confirmation` to `false` to advance.

### Financial Escrow (`wallet_entries`)
Funds are tracked using a ledger system.
- Initial payment creates a `LOCKED` entry.
- Milestone completions trigger `RELEASE` entries from the platform to the expert's available balance.

### Social Graph (`connections`)
A simple many-to-many table that allows the Home Feed to filter posts only from people the user is connected with.
