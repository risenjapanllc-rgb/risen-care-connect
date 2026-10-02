begin;

do $block$
begin
    if exists (
        select 1
        from public.communication_recordings
        where provider_recording_id is not null
        group by
            facility_id,
            provider_recording_id
        having count(*) > 1
    ) then
        raise exception
            'duplicate provider recording ids already exist';
    end if;
end;
$block$;


create unique index if not exists
    communication_recordings_facility_provider_recording_uidx
on public.communication_recordings (
    facility_id,
    provider_recording_id
)
where provider_recording_id is not null;


create or replace function public.prepare_voice_recording_storage(
    p_facility_id uuid,
    p_case_id uuid,
    p_contact_id uuid,
    p_communication_log_id uuid,
    p_provider_recording_id text,
    p_mime_type text,
    p_size_bytes bigint
)
returns table(
    recording_id uuid,
    storage_bucket text,
    storage_path text,
    upload_status text
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_provider_recording_id text;
    v_mime_type text;
    v_expected_path text;
    v_inserted_id uuid;
    v_existing public.communication_recordings%rowtype;
begin
    if (
        auth.jwt() -> 'app_metadata' ->> 'risencare_role'
    ) is distinct from 'connector_trust_boundary'
    then
        raise exception
            'connector_trust_boundary role required'
            using errcode = '42501';
    end if;

    if
        p_facility_id is null
        or p_case_id is null
        or p_contact_id is null
        or p_communication_log_id is null
    then
        raise exception
            'voice recording context is required'
            using errcode = '22004';
    end if;

    v_provider_recording_id =
        btrim(
            coalesce(
                p_provider_recording_id,
                ''
            )
        );

    if
        v_provider_recording_id = ''
        or length(v_provider_recording_id) > 128
        or v_provider_recording_id !~
            '^[A-Za-z0-9_-]+$'
    then
        raise exception
            'provider recording id is invalid'
            using errcode = '22023';
    end if;

    v_mime_type =
        lower(
            btrim(
                split_part(
                    coalesce(
                        p_mime_type,
                        ''
                    ),
                    ';',
                    1
                )
            )
        );

    if v_mime_type <> 'audio/wave' then
        raise exception
            'voice recording mime type is invalid'
            using errcode = '22023';
    end if;

    if
        p_size_bytes is null
        or p_size_bytes <= 0
        or p_size_bytes >
            25 * 1024 * 1024
    then
        raise exception
            'voice recording size is invalid'
            using errcode = '22023';
    end if;

    if not exists (
        select 1
        from public.communication_logs as cl
        where cl.id =
            p_communication_log_id
          and cl.facility_id =
            p_facility_id
          and cl.case_id =
            p_case_id
          and cl.contact_id =
            p_contact_id
          and cl.communication_type =
            'phone'
          and cl.communication_route =
            'risen_care_telephony'
          and cl.direction =
            'outbound'
          and cl.telephony_provider =
            'vonage'
    ) then
        raise exception
            'voice communication log not found'
            using errcode = 'P0002';
    end if;

    v_expected_path =
        p_facility_id::text ||
        '/' ||
        p_communication_log_id::text ||
        '/' ||
        v_provider_recording_id ||
        '.wav';

    insert into public.communication_recordings (
        communication_log_id,
        facility_id,
        provider_recording_id,
        storage_bucket,
        storage_path,
        mime_type,
        size_bytes,
        duration_ms,
        upload_status,
        transcription_status
    )
    values (
        p_communication_log_id,
        p_facility_id,
        v_provider_recording_id,
        'communication-recordings',
        v_expected_path,
        'audio/wave',
        p_size_bytes,
        0,
        'pending',
        'pending'
    )
    on conflict do nothing
    returning id
    into v_inserted_id;

    if v_inserted_id is not null then
        return query
        select
            v_inserted_id,
            'communication-recordings'::text,
            v_expected_path,
            'pending'::text;

        return;
    end if;

    select cr.*
    into v_existing
    from public.communication_recordings as cr
    where cr.facility_id =
        p_facility_id
      and cr.provider_recording_id =
        v_provider_recording_id
    limit 1;

    if not found then
        raise exception
            'voice recording idempotency conflict'
            using errcode = '23505';
    end if;

    if
        v_existing.communication_log_id
            is distinct from
            p_communication_log_id
        or v_existing.storage_bucket
            is distinct from
            'communication-recordings'
        or v_existing.storage_path
            is distinct from
            v_expected_path
        or v_existing.mime_type
            is distinct from
            'audio/wave'
        or v_existing.size_bytes
            is distinct from
            p_size_bytes
    then
        raise exception
            'voice recording idempotency conflict'
            using errcode = '23505';
    end if;

    return query
    select
        v_existing.id,
        v_existing.storage_bucket,
        v_existing.storage_path,
        v_existing.upload_status;
end;
$function$;


create or replace function public.voice_recording_storage_insert_allowed(
    p_bucket_id text,
    p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
    select
        (
            auth.jwt()
                -> 'app_metadata'
                ->> 'risencare_role'
        ) = 'connector_trust_boundary'
        and p_bucket_id =
            'communication-recordings'
        and exists (
            select 1
            from public.communication_recordings as cr
            where cr.storage_bucket =
                p_bucket_id
              and cr.storage_path =
                p_object_name
              and cr.upload_status =
                'pending'
              and cr.mime_type =
                'audio/wave'
              and cr.size_bytes > 0
              and cr.size_bytes <=
                  25 * 1024 * 1024
        );
$function$;


drop policy if exists
    communication_recordings_connector_voice_insert
on storage.objects;

create policy
    communication_recordings_connector_voice_insert
on storage.objects
for insert
to authenticated
with check (
    public.voice_recording_storage_insert_allowed(
        bucket_id,
        name
    )
);


create or replace function public.finalize_voice_recording_storage(
    p_recording_id uuid,
    p_facility_id uuid,
    p_provider_recording_id text,
    p_storage_path text
)
returns table(
    status text,
    recording_id uuid,
    storage_reference text
)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_provider_recording_id text;
    v_storage_path text;
    v_record public.communication_recordings%rowtype;
begin
    if (
        auth.jwt() -> 'app_metadata' ->> 'risencare_role'
    ) is distinct from 'connector_trust_boundary'
    then
        raise exception
            'connector_trust_boundary role required'
            using errcode = '42501';
    end if;

    if
        p_recording_id is null
        or p_facility_id is null
    then
        raise exception
            'voice recording identity is required'
            using errcode = '22004';
    end if;

    v_provider_recording_id =
        btrim(
            coalesce(
                p_provider_recording_id,
                ''
            )
        );

    v_storage_path =
        btrim(
            coalesce(
                p_storage_path,
                ''
            )
        );

    if
        v_provider_recording_id = ''
        or v_storage_path = ''
    then
        raise exception
            'voice recording storage identity is invalid'
            using errcode = '22023';
    end if;

    select cr.*
    into v_record
    from public.communication_recordings as cr
    where cr.id =
        p_recording_id
      and cr.facility_id =
        p_facility_id
      and cr.provider_recording_id =
        v_provider_recording_id
      and cr.storage_bucket =
        'communication-recordings'
      and cr.storage_path =
        v_storage_path
    for update;

    if not found then
        raise exception
            'voice recording metadata not found'
            using errcode = 'P0002';
    end if;

    if v_record.upload_status = 'uploaded' then
        return query
        select
            'uploaded'::text,
            v_record.id,
            v_record.storage_bucket ||
                '/' ||
                v_record.storage_path;

        return;
    end if;

    if v_record.upload_status <> 'pending' then
        raise exception
            'voice recording is not pending'
            using errcode = '23514';
    end if;

    if not exists (
        select 1
        from storage.objects as so
        where so.bucket_id =
            v_record.storage_bucket
          and so.name =
            v_record.storage_path
    ) then
        raise exception
            'voice recording storage object not found'
            using errcode = 'P0002';
    end if;

    update public.communication_recordings
    set
        upload_status =
            'uploaded',
        updated_at =
            now()
    where id =
        v_record.id;

    return query
    select
        'uploaded'::text,
        v_record.id,
        v_record.storage_bucket ||
            '/' ||
            v_record.storage_path;
end;
$function$;


revoke all
on function public.prepare_voice_recording_storage(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text,
    bigint
)
from public;

revoke all
on function public.prepare_voice_recording_storage(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text,
    bigint
)
from anon;

grant execute
on function public.prepare_voice_recording_storage(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text,
    bigint
)
to authenticated;


revoke all
on function public.voice_recording_storage_insert_allowed(
    text,
    text
)
from public;

revoke all
on function public.voice_recording_storage_insert_allowed(
    text,
    text
)
from anon;

grant execute
on function public.voice_recording_storage_insert_allowed(
    text,
    text
)
to authenticated;


revoke all
on function public.finalize_voice_recording_storage(
    uuid,
    uuid,
    text,
    text
)
from public;

revoke all
on function public.finalize_voice_recording_storage(
    uuid,
    uuid,
    text,
    text
)
from anon;

grant execute
on function public.finalize_voice_recording_storage(
    uuid,
    uuid,
    text,
    text
)
to authenticated;

commit;
