begin;

create or replace function
public.get_connector_source_document_template_binding(
    p_facility_id uuid,
    p_connector_id uuid,
    p_source_document_key text,
    p_source_updated_at timestamp with time zone,
    p_source_size bigint
)
returns table(
    template_id uuid,
    match_method text,
    match_confidence text,
    confirmed_by_human boolean,
    confirmed_at timestamp with time zone
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
    v_source_document_key text;
begin
    if (
        auth.jwt()
            -> 'app_metadata'
            ->> 'risencare_role'
    ) is distinct from
        'connector_trust_boundary'
    then
        raise exception
            'connector_trust_boundary role required'
            using errcode = '42501';
    end if;

    v_source_document_key :=
        nullif(
            btrim(
                coalesce(
                    p_source_document_key,
                    ''
                )
            ),
            ''
        );

    if
        p_facility_id is null
        or p_connector_id is null
        or v_source_document_key is null
        or p_source_updated_at is null
        or p_source_size is null
        or p_source_size < 0
    then
        return;
    end if;

    return query
    select
        b.template_id,
        b.match_method,
        b.match_confidence,
        b.confirmed_by_human,
        b.confirmed_at
    from
        public.source_document_template_bindings
            as b
    where
        b.facility_id =
            p_facility_id
        and b.connector_id =
            p_connector_id
        and b.source_document_key =
            v_source_document_key
        and b.source_updated_at =
            p_source_updated_at
        and b.source_size =
            p_source_size;
end;
$function$;

revoke all
on function
public.get_connector_source_document_template_binding(
    uuid,
    uuid,
    text,
    timestamp with time zone,
    bigint
)
from public;

grant execute
on function
public.get_connector_source_document_template_binding(
    uuid,
    uuid,
    text,
    timestamp with time zone,
    bigint
)
to authenticated, service_role;

commit;
