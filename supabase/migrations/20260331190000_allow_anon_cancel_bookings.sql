-- Permite que o role anon (chatbot) cancele reservas via Supabase REST API.
-- Restrições de segurança:
--   USING:      só atualiza linhas com status 'requested' ou 'confirmed'
--   WITH CHECK: só permite setar status = 'cancelled' (impede qualquer outro update)
CREATE POLICY "Anon can cancel bookings"
ON public.court_bookings
FOR UPDATE
TO anon
USING (status IN ('requested'::booking_status, 'confirmed'::booking_status))
WITH CHECK (status = 'cancelled'::booking_status);
