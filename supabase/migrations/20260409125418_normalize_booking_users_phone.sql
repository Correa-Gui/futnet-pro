ALTER TABLE public.booking_users
  ADD COLUMN IF NOT EXISTS normalized_phone TEXT;

UPDATE public.booking_users
SET
  phone = regexp_replace(COALESCE(phone, ''), '\D', '', 'g'),
  normalized_phone = CASE
    WHEN length(regexp_replace(COALESCE(phone, ''), '\D', '', 'g')) >= 11
      THEN right(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 11)
    ELSE regexp_replace(COALESCE(phone, ''), '\D', '', 'g')
  END
WHERE
  normalized_phone IS NULL
  OR phone ~ '\D'
  OR normalized_phone <> CASE
    WHEN length(regexp_replace(COALESCE(phone, ''), '\D', '', 'g')) >= 11
      THEN right(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 11)
    ELSE regexp_replace(COALESCE(phone, ''), '\D', '', 'g')
  END;

DELETE FROM public.booking_users
WHERE COALESCE(normalized_phone, '') = '';

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY normalized_phone
      ORDER BY
        CASE WHEN NULLIF(btrim(name), '') IS NOT NULL THEN 0 ELSE 1 END,
        length(COALESCE(phone, '')) DESC,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM public.booking_users
)
DELETE FROM public.booking_users AS booking_user
USING ranked
WHERE booking_user.id = ranked.id
  AND ranked.rn > 1;

ALTER TABLE public.booking_users
  ALTER COLUMN normalized_phone SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS booking_users_normalized_phone_idx
  ON public.booking_users (normalized_phone);
