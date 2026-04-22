ALTER TABLE courts ADD COLUMN IF NOT EXISTS slot_offset_minutes INTEGER NOT NULL DEFAULT 30;

-- GR SEGUROS = horários cheios (:00), TOTAL WOMAN = mantém :30
UPDATE courts SET slot_offset_minutes = 0  WHERE id = '666e61e0-8eef-48b2-bdeb-1abd32cf3349';
UPDATE courts SET slot_offset_minutes = 30 WHERE id = 'e28a024b-0d83-4043-81d7-aeb16416d349';
