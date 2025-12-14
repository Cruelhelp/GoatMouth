-- Voting/Governance System Database Schema
-- Tables for community proposals, votes, and comments

-- ============================================
-- MIGRATION: If you already have the proposals table, run this to add image support:
-- ALTER TABLE proposals ADD COLUMN IF NOT EXISTS image_url TEXT;
-- ============================================

-- ============================================
-- 1. PROPOSALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    image_url TEXT,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

-- ============================================
-- 2. PROPOSAL VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('yes', 'no')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one vote per user per proposal
    UNIQUE(proposal_id, user_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal ON proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_user ON proposal_votes(user_id);

-- ============================================
-- 3. PROPOSAL COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal ON proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_user ON proposal_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_created_at ON proposal_comments(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;

-- PROPOSALS POLICIES
-- Anyone can view proposals
CREATE POLICY "Anyone can view proposals"
    ON proposals FOR SELECT
    USING (true);

-- Authenticated users can create proposals
CREATE POLICY "Authenticated users can create proposals"
    ON proposals FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Creators can update their own proposals (only if pending)
CREATE POLICY "Creators can update their own pending proposals"
    ON proposals FOR UPDATE
    USING (auth.uid() = created_by AND status = 'pending')
    WITH CHECK (auth.uid() = created_by AND status = 'pending');

-- Admins can update any proposal
CREATE POLICY "Admins can update proposals"
    ON proposals FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- PROPOSAL VOTES POLICIES
-- Anyone can view votes
CREATE POLICY "Anyone can view votes"
    ON proposal_votes FOR SELECT
    USING (true);

-- Authenticated users can vote
CREATE POLICY "Authenticated users can vote"
    ON proposal_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes"
    ON proposal_votes FOR DELETE
    USING (auth.uid() = user_id);

-- PROPOSAL COMMENTS POLICIES
-- Anyone can view comments
CREATE POLICY "Anyone can view comments"
    ON proposal_comments FOR SELECT
    USING (true);

-- Authenticated users can comment
CREATE POLICY "Authenticated users can comment"
    ON proposal_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
    ON proposal_comments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
    ON proposal_comments FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can delete any comment
CREATE POLICY "Admins can delete comments"
    ON proposal_comments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for proposals
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON proposals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for comments
DROP TRIGGER IF EXISTS update_proposal_comments_updated_at ON proposal_comments;
CREATE TRIGGER update_proposal_comments_updated_at
    BEFORE UPDATE ON proposal_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Example proposal (you can remove this in production)
-- INSERT INTO proposals (title, description, category, end_date, created_by, status)
-- VALUES (
--     'Will Bitcoin reach $100,000 in 2025?',
--     'This market will resolve YES if Bitcoin (BTC) trades at or above $100,000 USD on any major exchange by December 31, 2025.',
--     'Crypto',
--     '2025-12-31 23:59:59+00',
--     (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
--     'pending'
-- );

-- ============================================
-- HELPFUL QUERIES FOR ADMINS
-- ============================================

-- Get all proposals with vote counts
-- SELECT
--     p.id,
--     p.title,
--     p.status,
--     COUNT(CASE WHEN pv.vote = 'yes' THEN 1 END) as yes_votes,
--     COUNT(CASE WHEN pv.vote = 'no' THEN 1 END) as no_votes,
--     COUNT(pv.id) as total_votes,
--     COUNT(pc.id) as comment_count
-- FROM proposals p
-- LEFT JOIN proposal_votes pv ON p.id = pv.proposal_id
-- LEFT JOIN proposal_comments pc ON p.id = pc.proposal_id
-- GROUP BY p.id, p.title, p.status
-- ORDER BY p.created_at DESC;

-- Get top voted proposals
-- SELECT
--     p.*,
--     COUNT(pv.id) FILTER (WHERE pv.vote = 'yes') as yes_votes,
--     COUNT(pv.id) FILTER (WHERE pv.vote = 'no') as no_votes,
--     ROUND(
--         (COUNT(pv.id) FILTER (WHERE pv.vote = 'yes')::DECIMAL /
--         NULLIF(COUNT(pv.id), 0) * 100), 1
--     ) as approval_percentage
-- FROM proposals p
-- LEFT JOIN proposal_votes pv ON p.id = pv.proposal_id
-- WHERE p.status = 'pending'
-- GROUP BY p.id
-- ORDER BY approval_percentage DESC, yes_votes DESC
-- LIMIT 10;
