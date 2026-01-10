-- Add mobile-specific position columns to banners table
-- This enables separate positioning for mobile vs desktop views

ALTER TABLE banners
ADD COLUMN IF NOT EXISTS custom_position_x_mobile INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS custom_position_y_mobile INTEGER DEFAULT 50;

-- Add comments for documentation
COMMENT ON COLUMN banners.custom_position_x_mobile IS 'Mobile horizontal position percentage (0-100), 50 is center';
COMMENT ON COLUMN banners.custom_position_y_mobile IS 'Mobile vertical position percentage (0-100), 50 is center';

-- Update existing banners to use center position for mobile if they don't have values
UPDATE banners
SET custom_position_x_mobile = 50, custom_position_y_mobile = 50
WHERE custom_position_x_mobile IS NULL OR custom_position_y_mobile IS NULL;
