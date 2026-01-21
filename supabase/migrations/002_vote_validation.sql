-- Vote validation: Ensure total points per voter doesn't exceed event max_points
-- This trigger runs before INSERT or UPDATE on the votes table

CREATE OR REPLACE FUNCTION validate_vote_total()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_id UUID;
  v_max_points INTEGER;
  v_current_total INTEGER;
  v_new_total INTEGER;
BEGIN
  -- Get the event_id for this beer
  SELECT event_id INTO v_event_id
  FROM public.beers
  WHERE id = NEW.beer_id;

  -- Beer must exist (FK constraint should prevent this, but defense in depth)
  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'VOTE_INVALID_BEER: Beer does not exist'
      USING ERRCODE = 'P0001';
  END IF;

  -- Get the max_points for this event
  SELECT max_points INTO v_max_points
  FROM public.events
  WHERE id = v_event_id;

  -- Event must exist and have max_points set
  IF v_max_points IS NULL THEN
    RAISE EXCEPTION 'VOTE_INVALID_EVENT: Event does not exist or has no max_points'
      USING ERRCODE = 'P0001';
  END IF;

  -- Calculate current total for this voter (excluding the beer being updated)
  SELECT COALESCE(SUM(points), 0) INTO v_current_total
  FROM public.votes v
  JOIN public.beers b ON v.beer_id = b.id
  WHERE v.voter_id = NEW.voter_id
    AND b.event_id = v_event_id
    AND v.beer_id != NEW.beer_id;

  -- Calculate new total
  v_new_total := v_current_total + NEW.points;

  -- Reject if over limit
  IF v_new_total > v_max_points THEN
    RAISE EXCEPTION 'VOTE_LIMIT_EXCEEDED: Total points (%) would exceed maximum (%) for this event', v_new_total, v_max_points
      USING ERRCODE = 'P0002';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only fire on INSERT or UPDATE (not DELETE, which has no NEW record)
CREATE TRIGGER trigger_validate_vote_total
  BEFORE INSERT OR UPDATE ON votes
  FOR EACH ROW
  WHEN (pg_trigger_depth() = 0)  -- Prevent recursive trigger calls
  EXECUTE FUNCTION validate_vote_total();
