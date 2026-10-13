create or replace function public.get_source_template_semantic_authority(
    p_facility_id uuid,
    p_template_id uuid
)
returns table (
    template_field_key text,
    confirmed_meaning text,
    standard_entity_name text,
    standard_field_name text,
    interpretation_status text,
    mapping_status text
)
language sql
security definer
set search_path = ''
as $function$
    select
        m.template_field_key,
        m.confirmed_meaning,
        m.standard_entity_name,
        m.standard_field_name,
        m.interpretation_status,
        m.mapping_status
    from public.source_template_semantic_mappings as m
    where m.facility_id = p_facility_id
      and m.template_id = p_template_id
    order by m.template_field_key;
$function$;

revoke all
on function public.get_source_template_semantic_authority(
    uuid,
    uuid
)
from public;

grant execute
on function public.get_source_template_semantic_authority(
    uuid,
    uuid
)
to authenticated;

grant execute
on function public.get_source_template_semantic_authority(
    uuid,
    uuid
)
to service_role;
