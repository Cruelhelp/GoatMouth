create extension if not exists pgcrypto;

create table if not exists odds_api_request_logs (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    endpoint text not null,
    method text not null,
    status integer not null,
    duration_ms integer,
    market_id uuid,
    user_id uuid,
    outcome text,
    amount numeric,
    error_code text,
    error_message text,
    request_meta jsonb,
    response_meta jsonb,
    ip text,
    user_agent text
);

create index if not exists odds_api_request_logs_created_at_idx
    on odds_api_request_logs (created_at desc);
create index if not exists odds_api_request_logs_market_id_idx
    on odds_api_request_logs (market_id);

create table if not exists odds_api_health_checks (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    status text not null,
    latency_ms integer,
    error_message text,
    response_meta jsonb,
    checker text
);

create index if not exists odds_api_health_checks_created_at_idx
    on odds_api_health_checks (created_at desc);

create table if not exists odds_guidance_config (
    id smallint primary key default 1,
    logging_enabled boolean not null default true,
    retention_days integer not null default 30,
    guidance_enabled boolean not null default true,
    smoothing_alpha numeric not null default 1,
    global_prior numeric not null default 0.5,
    updated_at timestamptz not null default now()
);

insert into odds_guidance_config (id)
values (1)
on conflict (id) do nothing;

create table if not exists odds_guidance_category_stats (
    category text primary key,
    total_markets integer not null default 0,
    yes_wins integer not null default 0,
    no_wins integer not null default 0,
    yes_rate numeric,
    sample_size integer not null default 0,
    last_updated timestamptz not null default now()
);

create table if not exists odds_guidance_overrides (
    id uuid primary key default gen_random_uuid(),
    scope_type text not null check (scope_type in ('market', 'category')),
    scope_value text not null,
    yes_probability numeric,
    enabled boolean not null default true,
    notes text,
    created_by uuid,
    created_at timestamptz not null default now()
);

create index if not exists odds_guidance_overrides_scope_idx
    on odds_guidance_overrides (scope_type, scope_value);
create unique index if not exists odds_guidance_overrides_unique_idx
    on odds_guidance_overrides (scope_type, scope_value);

create table if not exists market_learning_samples (
    market_id uuid primary key,
    category text,
    resolved_outcome text,
    resolution_date timestamptz,
    created_at timestamptz,
    end_date timestamptz,
    total_volume numeric,
    bettor_count integer,
    yes_price numeric,
    no_price numeric,
    liquidity numeric,
    metadata jsonb,
    inserted_at timestamptz not null default now()
);

create index if not exists market_learning_samples_category_idx
    on market_learning_samples (category);
create index if not exists market_learning_samples_resolution_date_idx
    on market_learning_samples (resolution_date desc);

create or replace function is_admin()
returns boolean
language sql
stable
as $$
    select coalesce(
        auth.jwt() ->> 'role',
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role'
    ) = 'admin';
$$;

alter table odds_api_request_logs enable row level security;
alter table odds_api_health_checks enable row level security;
alter table odds_guidance_config enable row level security;
alter table odds_guidance_category_stats enable row level security;
alter table odds_guidance_overrides enable row level security;
alter table market_learning_samples enable row level security;

create policy "admin read odds_api_request_logs"
    on odds_api_request_logs for select
    using (is_admin());
create policy "admin write odds_api_request_logs"
    on odds_api_request_logs for insert
    with check (is_admin());
create policy "admin update odds_api_request_logs"
    on odds_api_request_logs for update
    using (is_admin());
create policy "admin delete odds_api_request_logs"
    on odds_api_request_logs for delete
    using (is_admin());

create policy "admin read odds_api_health_checks"
    on odds_api_health_checks for select
    using (is_admin());
create policy "admin write odds_api_health_checks"
    on odds_api_health_checks for insert
    with check (is_admin());
create policy "admin update odds_api_health_checks"
    on odds_api_health_checks for update
    using (is_admin());
create policy "admin delete odds_api_health_checks"
    on odds_api_health_checks for delete
    using (is_admin());

create policy "admin read odds_guidance_config"
    on odds_guidance_config for select
    using (is_admin());
create policy "admin write odds_guidance_config"
    on odds_guidance_config for insert
    with check (is_admin());
create policy "admin update odds_guidance_config"
    on odds_guidance_config for update
    using (is_admin());

create policy "admin read odds_guidance_category_stats"
    on odds_guidance_category_stats for select
    using (is_admin());
create policy "admin write odds_guidance_category_stats"
    on odds_guidance_category_stats for insert
    with check (is_admin());
create policy "admin update odds_guidance_category_stats"
    on odds_guidance_category_stats for update
    using (is_admin());
create policy "admin delete odds_guidance_category_stats"
    on odds_guidance_category_stats for delete
    using (is_admin());

create policy "admin read odds_guidance_overrides"
    on odds_guidance_overrides for select
    using (is_admin());
create policy "admin write odds_guidance_overrides"
    on odds_guidance_overrides for insert
    with check (is_admin());
create policy "admin update odds_guidance_overrides"
    on odds_guidance_overrides for update
    using (is_admin());
create policy "admin delete odds_guidance_overrides"
    on odds_guidance_overrides for delete
    using (is_admin());

create policy "admin read market_learning_samples"
    on market_learning_samples for select
    using (is_admin());
create policy "admin write market_learning_samples"
    on market_learning_samples for insert
    with check (is_admin());
create policy "admin update market_learning_samples"
    on market_learning_samples for update
    using (is_admin());
create policy "admin delete market_learning_samples"
    on market_learning_samples for delete
    using (is_admin());

create or replace function capture_market_learning_sample()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'UPDATE' and new.status = 'resolved' and (old.status is distinct from 'resolved') then
        insert into market_learning_samples (
            market_id,
            category,
            resolved_outcome,
            resolution_date,
            created_at,
            end_date,
            total_volume,
            bettor_count,
            yes_price,
            no_price,
            liquidity,
            metadata
        ) values (
            new.id,
            new.category,
            new.resolved_outcome,
            new.resolution_date,
            new.created_at,
            new.end_date,
            new.total_volume,
            new.bettor_count,
            new.yes_price,
            new.no_price,
            new.liquidity,
            jsonb_build_object(
                'status', new.status
            )
        )
        on conflict (market_id) do update set
            category = excluded.category,
            resolved_outcome = excluded.resolved_outcome,
            resolution_date = excluded.resolution_date,
            end_date = excluded.end_date,
            total_volume = excluded.total_volume,
            bettor_count = excluded.bettor_count,
            yes_price = excluded.yes_price,
            no_price = excluded.no_price,
            liquidity = excluded.liquidity,
            metadata = excluded.metadata,
            inserted_at = now();
    end if;
    return new;
end;
$$;

do $$
begin
    if exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'markets'
    ) then
        drop trigger if exists trg_capture_market_learning_sample on public.markets;
        create trigger trg_capture_market_learning_sample
            after update on public.markets
            for each row execute function capture_market_learning_sample();
    end if;
end;
$$;

create or replace function recompute_odds_guidance_stats(p_smoothing numeric default 1)
returns void
language plpgsql
as $$
begin
    delete from odds_guidance_category_stats;

    insert into odds_guidance_category_stats (
        category,
        total_markets,
        yes_wins,
        no_wins,
        yes_rate,
        sample_size,
        last_updated
    )
    select
        category,
        count(*) as total_markets,
        sum(case when resolved_outcome = 'yes' then 1 else 0 end) as yes_wins,
        sum(case when resolved_outcome = 'no' then 1 else 0 end) as no_wins,
        (sum(case when resolved_outcome = 'yes' then 1 else 0 end) + p_smoothing)
            / (count(*) + (2 * p_smoothing)) as yes_rate,
        count(*) as sample_size,
        now()
    from market_learning_samples
    where resolved_outcome in ('yes', 'no')
      and category is not null
    group by category;
end;
$$;
