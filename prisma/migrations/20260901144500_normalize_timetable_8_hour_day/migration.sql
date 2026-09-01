-- Normalize legacy timetable rows to the new 8-hour college day.
-- New schedule: 09:00-17:00, seven 60-minute lectures, 13:00-14:00 lunch.
-- The old 15-minute break is removed. Existing lecture rows that used the
-- old shifted 11:15/12:15 slots are moved back onto the new hourly grid.

UPDATE "timetable_slots"
SET "startTime" = '11:00', "endTime" = '12:00'
WHERE "startTime" = '11:15' AND "endTime" = '12:15';

UPDATE "timetable_slots"
SET "startTime" = '12:00', "endTime" = '13:00'
WHERE "startTime" = '12:15' AND "endTime" = '13:15';

-- The previous lunch period is not a lecture and should not exist as a slot.
DELETE FROM "timetable_slots"
WHERE "startTime" = '13:15' AND "endTime" = '14:00';

-- The old 14:00-15:00 and 15:00-16:00 slots remain valid.
-- 16:00-17:00 is the newly available final lecture slot.
