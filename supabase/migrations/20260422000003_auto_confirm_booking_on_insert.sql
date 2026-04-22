-- Trigger: auto-confirm any new booking regardless of source (landing page, chatbot, backend)
-- If a booking is inserted with status 'requested', upgrade it to 'confirmed'.
-- Bookings inserted already as 'paid' or 'cancelled' are left untouched.

CREATE OR REPLACE FUNCTION auto_confirm_booking()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'requested' THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_confirm_booking ON court_bookings;

CREATE TRIGGER trg_auto_confirm_booking
  BEFORE INSERT ON court_bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_booking();
