-- Contact Messages System
-- This schema handles user contact messages and admin replies

-- Contact messages table (for general inquiries and issue reports)
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'resolved', 'archived')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    admin_notes TEXT
);

-- User notifications/messages table (for admin-to-user communication)
CREATE TABLE IF NOT EXISTS public.user_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'info' CHECK (message_type IN ('info', 'warning', 'success', 'announcement', 'reply')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    related_contact_id UUID REFERENCES public.contact_messages(id) ON DELETE SET NULL
);

-- Message replies table (thread-based conversation)
CREATE TABLE IF NOT EXISTS public.message_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_message_id UUID NOT NULL REFERENCES public.contact_messages(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'admin')),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reply_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id ON public.contact_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_messages_user_id ON public.user_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_is_read ON public.user_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_message_replies_contact_id ON public.message_replies(contact_message_id);

-- Row Level Security Policies

-- Contact Messages RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own contact messages
CREATE POLICY "Users can view own contact messages"
    ON public.contact_messages FOR SELECT
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id)
        OR
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    );

-- Any authenticated user can create contact messages
CREATE POLICY "Authenticated users can create contact messages"
    ON public.contact_messages FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can update contact messages
CREATE POLICY "Admins can update contact messages"
    ON public.contact_messages FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Only admins can delete contact messages
CREATE POLICY "Admins can delete contact messages"
    ON public.contact_messages FOR DELETE
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- User Messages RLS
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own messages"
    ON public.user_messages FOR SELECT
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id)
        OR
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    );

-- Only admins can create user messages
CREATE POLICY "Admins can create user messages"
    ON public.user_messages FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update own messages"
    ON public.user_messages FOR UPDATE
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE id = user_id));

-- Message Replies RLS
ALTER TABLE public.message_replies ENABLE ROW LEVEL SECURITY;

-- Users can view replies to their contact messages
CREATE POLICY "Users can view related replies"
    ON public.message_replies FOR SELECT
    USING (
        contact_message_id IN (
            SELECT id FROM public.contact_messages
            WHERE user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid())
        )
        OR
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
    );

-- Authenticated users and admins can create replies
CREATE POLICY "Users and admins can create replies"
    ON public.message_replies FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            -- User replying to their own message
            (sender_type = 'user' AND contact_message_id IN (
                SELECT id FROM public.contact_messages
                WHERE user_id IN (SELECT id FROM public.profiles WHERE id = auth.uid())
            ))
            OR
            -- Admin replying to any message
            (sender_type = 'admin' AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contact_messages updated_at
CREATE TRIGGER update_contact_messages_updated_at
    BEFORE UPDATE ON public.contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to mark message as read when status changes
CREATE OR REPLACE FUNCTION set_read_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status AND NEW.status IN ('read', 'replied', 'resolved') AND OLD.read_at IS NULL THEN
        NEW.read_at = NOW();
    END IF;
    IF NEW.status = 'replied' AND OLD.replied_at IS NULL THEN
        NEW.replied_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-setting read/replied timestamps
CREATE TRIGGER auto_set_timestamps
    BEFORE UPDATE ON public.contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION set_read_timestamp();

-- Grant permissions
GRANT SELECT, INSERT ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
GRANT SELECT, UPDATE ON public.user_messages TO authenticated;
GRANT ALL ON public.user_messages TO service_role;
GRANT SELECT, INSERT ON public.message_replies TO authenticated;
GRANT ALL ON public.message_replies TO service_role;
