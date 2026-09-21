
--- BLock 1 ---
CREATE TABLE public.travel_internals (
  travel_id uuid PRIMARY KEY REFERENCES public.travels(id) ON DELETE CASCADE,
  total_operation_cost numeric,
  projected_profit numeric,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.travel_internals ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER travel_internals_updated_at
  BEFORE UPDATE ON public.travel_internals
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- Sin ningún grant a anon: es lo que hace estructural el aislamiento
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_internals TO authenticated;
GRANT ALL ON public.travel_internals TO service_role;

CREATE POLICY "travel_internals_owner" ON public.travel_internals
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.id = travel_id AND t.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.id = travel_id AND t.owner_id = (SELECT auth.uid())
  ));

---Block 2---

  -- 1. Copiar los datos existentes (solo filas con algún valor)
INSERT INTO public.travel_internals (travel_id, total_operation_cost, projected_profit, internal_notes)
SELECT id, total_operation_cost, projected_profit, internal_notes
FROM public.travels
WHERE total_operation_cost IS NOT NULL
   OR projected_profit IS NOT NULL
   OR internal_notes IS NOT NULL;

-- 2. Verificar el conteo ANTES de borrar nada
--    (correr a mano, comparar los dos números)
SELECT count(*) FROM public.travels
  WHERE total_operation_cost IS NOT NULL OR projected_profit IS NOT NULL OR internal_notes IS NOT NULL;
SELECT count(*) FROM public.travel_internals;

-- 3. Recién ahora, eliminar las columnas
ALTER TABLE public.travels
  DROP COLUMN total_operation_cost,
  DROP COLUMN projected_profit,
  DROP COLUMN internal_notes;