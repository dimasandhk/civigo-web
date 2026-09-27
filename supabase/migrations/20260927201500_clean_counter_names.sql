-- Migration: Clean parenthesis and descriptions from counter_name on public.counters
-- Example: "Loket 1 (Perekaman)" -> "Loket 1"

update public.counters
set counter_name = trim(regexp_replace(counter_name, '\s*\(.*?\)', '', 'g'))
where counter_name ~ '\(.*\)';
