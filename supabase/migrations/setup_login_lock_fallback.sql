-- 1. Create a secure tracking table
create table if not exists public.login_attempts_tracker (
    email text primary key,
    failed_count integer not null default 0,
    locked_until timestamp with time zone
);

-- Protect table from direct access (so only our backend functions can read/write)
alter table public.login_attempts_tracker enable row level security;
-- No policies mean the table is completely locked down from the public API

-- 2. Create RPC to gracefully check if an account is currently locked out
create or replace function public.check_login_lockout(p_email text)
returns boolean
language plpgsql
security definer -- Security Definer gives the function powers to bypass the table's RLS protection
as $$
declare
    v_locked_until timestamp with time zone;
begin
    select locked_until into v_locked_until
    from public.login_attempts_tracker
    where email = lower(p_email);
    
    if v_locked_until is not null and v_locked_until > now() then
        return true;
    end if;
    
    return false;
end;
$$;

-- 3. Create RPC to track failed logins and enforce 24-hr lockout
create or replace function public.record_failed_login(p_email text)
returns integer
language plpgsql
security definer
as $$
declare
    v_count integer;
begin
    insert into public.login_attempts_tracker (email, failed_count)
    values (lower(p_email), 1)
    on conflict (email) do update
    set failed_count = public.login_attempts_tracker.failed_count + 1
    returning failed_count into v_count;

    -- If the count hits 10, slap on exactly a 24-hour lockout
    if v_count >= 10 then
        update public.login_attempts_tracker
        set locked_until = now() + interval '24 hours'
        where email = lower(p_email);
    end if;

    return v_count;
end;
$$;

-- 4. Create RPC to reset tracking upon successful login
create or replace function public.reset_login_attempts(p_email text)
returns void
language plpgsql
security definer
as $$
begin
    -- Clear failed attempts and wipe the lockout status
    update public.login_attempts_tracker
    set failed_count = 0,
        locked_until = null
    where email = lower(p_email);
end;
$$;

-- 5. Grant anonymous and authenticated users permission to call these specific RPC wrappers
grant execute on function public.check_login_lockout(text) to anon, authenticated;
grant execute on function public.record_failed_login(text) to anon, authenticated;
grant execute on function public.reset_login_attempts(text) to anon, authenticated;
