/*
  # Add Admin Booking Management Policies
  
  1. Changes
    - Add policy to allow updating booking status
    - Add policy to allow deleting bookings
    
  2. Security
    - Allow public update for demo purposes (in production, this should be restricted to admin users only)
    - Allow public delete for demo purposes (in production, this should be restricted to admin users only)
    
  Note: In a production environment, you would want to add proper authentication
  and restrict these operations to authenticated admin users only.
*/

-- Policy for updating bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' 
    AND policyname = 'Anyone can update bookings'
  ) THEN
    CREATE POLICY "Anyone can update bookings"
      ON bookings FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Policy for deleting bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bookings' 
    AND policyname = 'Anyone can delete bookings'
  ) THEN
    CREATE POLICY "Anyone can delete bookings"
      ON bookings FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
