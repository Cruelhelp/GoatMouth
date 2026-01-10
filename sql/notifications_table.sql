-- =====================================================
-- GoatMouth Notifications System
-- Global, Role-Based Notification System
-- =====================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),

    -- Targeting
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Specific user (nullable for global)
    target_role TEXT, -- Target specific role: 'admin', 'member', etc.
    is_global BOOLEAN DEFAULT false, -- Send to all users

    -- Action
    action_url TEXT, -- Optional URL to navigate when clicked
    action_label TEXT, -- Optional label for action button

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional data

    -- Expiry
    expires_at TIMESTAMPTZ -- Optional expiry date
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_global ON public.notifications(is_global);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update read_at when is_read changes to true
CREATE OR REPLACE FUNCTION update_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = true AND OLD.is_read = false THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_read_at_trigger
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_read_at();

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own notifications, role-based notifications, and global notifications
CREATE POLICY "Users can view their notifications"
    ON public.notifications
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR is_global = true
        OR target_role IN (
            SELECT role FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update their notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Only admins can create notifications
CREATE POLICY "Admins can create notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Only admins can delete notifications
CREATE POLICY "Admins can delete notifications"
    ON public.notifications
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- =====================================================
-- Helper Functions for Creating Notifications
-- =====================================================

-- Function to create a notification for a specific user
CREATE OR REPLACE FUNCTION create_user_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_action_url TEXT DEFAULT NULL,
    p_action_label TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        action_url,
        action_label
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_action_url,
        p_action_label
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a role-based notification
CREATE OR REPLACE FUNCTION create_role_notification(
    p_target_role TEXT,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_action_url TEXT DEFAULT NULL,
    p_action_label TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        target_role,
        title,
        message,
        type,
        action_url,
        action_label
    ) VALUES (
        p_target_role,
        p_title,
        p_message,
        p_type,
        p_action_url,
        p_action_label
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a global notification
CREATE OR REPLACE FUNCTION create_global_notification(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_action_url TEXT DEFAULT NULL,
    p_action_label TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        is_global,
        title,
        message,
        type,
        action_url,
        action_label
    ) VALUES (
        true,
        p_title,
        p_message,
        p_type,
        p_action_url,
        p_action_label
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Sample Notifications (for testing)
-- =====================================================

-- Uncomment below to create sample notifications for testing

-- -- Global notification
-- SELECT create_global_notification(
--     'Welcome to GoatMouth!',
--     'We''ve launched a new notification system to keep you updated on important events.',
--     'success',
--     'index.html',
--     'Explore'
-- );

-- -- Admin-only notification
-- SELECT create_role_notification(
--     'admin',
--     'New Admin Features',
--     'Check out the new admin dashboard with enhanced analytics and user management.',
--     'info',
--     'admin.html',
--     'View Dashboard'
-- );

COMMENT ON TABLE public.notifications IS 'Global, role-based notification system for GoatMouth';
COMMENT ON COLUMN public.notifications.user_id IS 'Specific user to notify (null for role-based or global)';
COMMENT ON COLUMN public.notifications.target_role IS 'Role to target (admin, member, etc.)';
COMMENT ON COLUMN public.notifications.is_global IS 'Send to all users regardless of role';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional custom data in JSON format';
