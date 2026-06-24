-- Re-link blockers created before sales orders became line-level.
-- Old blockers store bare SO numbers (e.g. "SO-5004") in sos; expand each to the
-- line ids of that SO (e.g. "SO-5004-L10"). Idempotent: once every element
-- already contains "-L", re-running changes nothing.

DO $$
DECLARE
  b        RECORD;
  elem     text;
  lid      text;
  cnt      int;
  new_sos  jsonb;
BEGIN
  FOR b IN SELECT id, org_id, sos FROM blockers WHERE sos IS NOT NULL LOOP
    new_sos := '[]'::jsonb;
    FOR elem IN SELECT jsonb_array_elements_text(b.sos) LOOP
      IF position('-L' in elem) > 0 THEN
        new_sos := new_sos || to_jsonb(elem);
      ELSE
        cnt := 0;
        FOR lid IN
          SELECT so_number || '-L' || line_number
            FROM sales_orders
           WHERE org_id = b.org_id AND so_number = elem
        LOOP
          new_sos := new_sos || to_jsonb(lid);
          cnt := cnt + 1;
        END LOOP;
        IF cnt = 0 THEN
          -- no matching line found; assume the legacy default line 10
          new_sos := new_sos || to_jsonb(elem || '-L10');
        END IF;
      END IF;
    END LOOP;
    IF new_sos <> b.sos THEN
      UPDATE blockers SET sos = new_sos WHERE id = b.id;
    END IF;
  END LOOP;
END $$;
