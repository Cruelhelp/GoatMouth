-- Add custom position columns to banners table
-- This enables precise positioning of banner images

ALTER TABLE banners
ADD COLUMN IF NOT EXISTS custom_position_x INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS custom_position_y INTEGER DEFAULT 50;

-- Add comment for documentation
COMMENT ON COLUMN banners.custom_position_x IS 'Horizontal position percentage (0-100), 50 is center';
COMMENT ON COLUMN banners.custom_position_y IS 'Vertical position percentage (0-100), 50 is center';

-- Update existing banners to use center position if they don't have values
UPDATE banners
SET custom_position_x = 50, custom_position_y = 50
WHERE custom_position_x IS NULL OR custom_position_y IS NULL;
