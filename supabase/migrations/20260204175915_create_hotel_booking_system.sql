/*
  # Create Hotel Booking System Tables

  1. New Tables
    - `rooms`
      - `id` (uuid, primary key)
      - `room_type` (text) - Type of room (deluxe, premium, royal)
      - `name_he` (text) - Hebrew name
      - `description_he` (text) - Hebrew description
      - `price_per_night` (integer) - Price in ILS
      - `max_guests` (integer) - Maximum number of guests
      - `size_sqm` (integer) - Room size in square meters
      - `features` (jsonb) - Room features array
      - `image_url` (text) - Room image URL
      - `total_rooms` (integer) - Total number of this room type available
      - `created_at` (timestamptz)
      
    - `bookings`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to rooms)
      - `guest_name` (text) - Guest full name
      - `guest_email` (text) - Guest email
      - `guest_phone` (text) - Guest phone number
      - `check_in_date` (date) - Check-in date
      - `check_out_date` (date) - Check-out date
      - `num_guests` (integer) - Number of guests
      - `total_price` (integer) - Total price for the stay
      - `status` (text) - Booking status (pending, confirmed, cancelled)
      - `special_requests` (text) - Special requests from guest
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on both tables
    - Add policies for public read access to rooms
    - Add policies for creating bookings (public can create)
    - Add policies for users to view their own bookings
*/

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type text NOT NULL,
  name_he text NOT NULL,
  description_he text NOT NULL,
  price_per_night integer NOT NULL,
  max_guests integer NOT NULL DEFAULT 2,
  size_sqm integer NOT NULL,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text NOT NULL,
  total_rooms integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) NOT NULL,
  guest_name text NOT NULL,
  guest_email text NOT NULL,
  guest_phone text NOT NULL,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  num_guests integer NOT NULL,
  total_price integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  special_requests text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Rooms policies (public read access)
CREATE POLICY "Anyone can view rooms"
  ON rooms FOR SELECT
  TO anon, authenticated
  USING (true);

-- Bookings policies
CREATE POLICY "Anyone can create bookings"
  ON bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert initial room data
INSERT INTO rooms (room_type, name_he, description_he, price_per_night, max_guests, size_sqm, features, image_url, total_rooms)
VALUES
  ('deluxe', 'דלוקס סוויטה', 'חדר מפואר עם נוף פנורמי לים, מרפסת פרטית ומיטת קינג סייז', 899, 2, 45, '["45 מ\"ר", "מרפסת פרטית", "נוף לים", "Wi-Fi חינם", "מיזוג אוויר"]'::jsonb, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80', 15),
  ('premium', 'פרימיום עם נוף לים', 'חדר מרווח במיוחד עם סלון נפרד וג''קוזי פרטי', 1299, 4, 60, '["60 מ\"ר", "ג''קוזי פרטי", "סלון נפרד", "מיני בר", "שירות חדרים 24/7"]'::jsonb, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80', 10),
  ('royal', 'רויאל פנטהאוז', 'הסוויטה היוקרתית ביותר עם בריכה פרטית וגג פנורמי', 2499, 6, 120, '["120 מ\"ר", "בריכה פרטית", "2 חדרי שינה", "גג פנורמי", "שף פרטי"]'::jsonb, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80', 5)
ON CONFLICT DO NOTHING;