-- Create function to generate bill instances for a fixed bill
CREATE OR REPLACE FUNCTION public.generate_bill_instances(
  p_fixed_bill_id uuid,
  p_months int DEFAULT 12
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fb record;
  i int;
  base_month date;
  due date;
  last_day int;
BEGIN
  -- Get the fixed bill, ensuring user owns it
  SELECT * INTO fb
  FROM public.fixed_bills
  WHERE id = p_fixed_bill_id
    AND user_id = auth.uid();

  IF fb.id IS NULL THEN
    RAISE EXCEPTION 'Fixed bill not found or access denied';
  END IF;

  -- Base month = first day of the month from start_date
  base_month := date_trunc('month', fb.start_date)::date;

  -- Generate instances for the next p_months months
  FOR i IN 0..(p_months - 1) LOOP
    -- Calculate target month
    DECLARE
      target_month date;
    BEGIN
      target_month := (base_month + (i || ' month')::interval)::date;
      
      -- Get last day of target month
      last_day := EXTRACT(day FROM (target_month + interval '1 month' - interval '1 day'))::int;
      
      -- Calculate due date (handling months with fewer days than due_day)
      due := make_date(
        EXTRACT(year FROM target_month)::int,
        EXTRACT(month FROM target_month)::int,
        LEAST(fb.due_day, last_day)
      );
      
      -- Don't generate instances before start_date
      IF due < fb.start_date THEN
        CONTINUE;
      END IF;
      
      -- Don't generate instances after end_date if set
      IF fb.end_date IS NOT NULL AND due > fb.end_date THEN
        CONTINUE;
      END IF;
      
      -- Insert instance (on conflict do nothing to avoid duplicates)
      INSERT INTO public.bills_instances (
        user_id, 
        fixed_bill_id, 
        due_date, 
        amount,
        reference_month
      )
      VALUES (
        fb.user_id, 
        fb.id, 
        due, 
        fb.amount,
        target_month
      )
      ON CONFLICT (fixed_bill_id, due_date) DO NOTHING;
    END;
  END LOOP;
END $$;

-- Grant execute permission to authenticated users only
REVOKE ALL ON FUNCTION public.generate_bill_instances(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_bill_instances(uuid, int) TO authenticated;