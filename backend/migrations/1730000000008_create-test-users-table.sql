-- Migration: Create test_users table
-- Created: 2025-11-01
-- Description: Create test_users table for testing database node functionality

CREATE TABLE IF NOT EXISTS flowmaestro.test_users (
    user_id INTEGER PRIMARY KEY,
    full_name VARCHAR(255),
    email VARCHAR(255),
    city VARCHAR(255),
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_test_users_email ON flowmaestro.test_users(email);

-- Add a comment to the table
COMMENT ON TABLE flowmaestro.test_users IS 'Test table for database node operations';

-- Insert 10 sample test users (data from JSONPlaceholder for consistency with HTTP node tests)
INSERT INTO flowmaestro.test_users (user_id, full_name, email, city, company) VALUES
(1, 'Leanne Graham', 'Sincere@april.biz', 'Gwenborough', 'Romaguera-Crona'),
(2, 'Ervin Howell', 'Shanna@melissa.tv', 'Wisokyburgh', 'Deckow-Crist'),
(3, 'Clementine Bauch', 'Nathan@yesenia.net', 'McKenziehaven', 'Romaguera-Jacobson'),
(4, 'Patricia Lebsack', 'Julianne.OConner@kory.org', 'South Elvis', 'Robel-Corkery'),
(5, 'Chelsey Dietrich', 'Lucio_Hettinger@annie.ca', 'Roscoeview', 'Keebler LLC'),
(6, 'Mrs. Dennis Schulist', 'Karley_Dach@jasper.info', 'South Christy', 'Considine-Lockman'),
(7, 'Kurtis Weissnat', 'Telly.Hoeger@billy.biz', 'Howemouth', 'Johns Group'),
(8, 'Nicholas Runolfsdottir V', 'Sherwood@rosamond.me', 'Aliyaview', 'Abernathy Group'),
(9, 'Glenna Reichert', 'Chaim_McDermott@dana.io', 'Bartholomebury', 'Yost and Sons'),
(10, 'Clementina DuBuque', 'Rey.Padberg@karina.biz', 'Lebsackbury', 'Hoeger LLC')
ON CONFLICT (user_id) DO NOTHING;
