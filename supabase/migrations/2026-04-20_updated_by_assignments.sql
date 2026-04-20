-- 1) Ajouter la colonne updated_by sur case_assignments
ALTER TABLE case_assignments ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 2) Trigger pour auto-remplir updated_by quand un cas passe en "done"
CREATE OR REPLACE FUNCTION trg_set_assignment_updated_by()
RETURNS TRIGGER AS $fn$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_updated_by_on_complete ON case_assignments;
CREATE TRIGGER set_updated_by_on_complete
  BEFORE UPDATE ON case_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_assignment_updated_by();
