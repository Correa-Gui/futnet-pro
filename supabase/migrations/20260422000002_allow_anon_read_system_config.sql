CREATE POLICY "Public can read system config"
  ON system_config
  FOR SELECT
  TO anon
  USING (true);
