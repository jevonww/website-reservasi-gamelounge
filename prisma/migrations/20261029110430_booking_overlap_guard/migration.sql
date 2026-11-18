-- Database-level double-booking protection.
-- Advisory locks in the application serialize reservation creation, and this
-- exclusion constraint guarantees that no two active bookings can ever overlap
-- for the same setup, even if application code regresses or multiple instances
-- write concurrently.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_no_overlapping_slots"
EXCLUDE USING gist (
  "setupId" WITH =,
  tstzrange("startAt", "endAt", '[)') WITH &&
)
WHERE (
  "status" IN (
    'PENDING'::"BookingStatus",
    'CONFIRMED'::"BookingStatus",
    'CHECKED_IN'::"BookingStatus",
    'ACTIVE'::"BookingStatus"
  )
);
