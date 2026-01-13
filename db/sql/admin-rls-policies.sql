-- =====================================================
-- GoatMouth Admin RLS Policies
-- Run after supabase-admin-users.sql so public.is_admin() exists.
-- =====================================================

DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'banners',
        'markets',
        'bets',
        'positions',
        'transactions',
        'comments',
        'proposals',
        'contact_messages',
        'odds_guidance_config',
        'odds_guidance_overrides',
        'odds_guidance_category_stats',
        'odds_api_request_logs',
        'odds_api_health_checks'
    ] LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = tbl
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            EXECUTE format('DROP POLICY IF EXISTS "Admins full access" ON public.%I', tbl);
            EXECUTE format('CREATE POLICY "Admins full access" ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', tbl);
        END IF;
    END LOOP;
END $$;
