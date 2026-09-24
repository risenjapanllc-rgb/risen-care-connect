-- Recipient Certificate Canonicalization v2
-- Applied to production Supabase on 2026-09-24.
--
-- Purpose:
-- 1. Preserve provenance independently for canonicalization v1 and v2.
-- 2. Support explicit recipient-certificate canonicalization v1 -> v2 migration.
-- 3. Preserve CAS protection and reject unsupported version transitions.
-- 4. Qualify record_id updates to avoid PL/pgSQL ambiguity.

begin;

alter table public.connector_semantic_logical_record_provenance
  drop constraint connector_semantic_logical_record_provenance_snapshot_key;

alter table public.connector_semantic_logical_record_provenance
  add constraint connector_semantic_logical_record_provenance_snapshot_key
  unique (
    facility_id,
    connector_id,
    resident_id,
    semantic_type,
    logical_slot,
    source_document_key,
    source_updated_at,
    source_size,
    canonicalization_version
  );

CREATE OR REPLACE FUNCTION public.persist_connector_semantic_logical_record(
  p_facility_id uuid,
  p_connector_id uuid,
  p_resident_id uuid,
  p_semantic_type text,
  p_logical_slot text,
  p_source_document_key text,
  p_source_updated_at timestamp with time zone,
  p_source_size bigint,
  p_expected_content_hash text,
  p_content_hash text,
  p_canonicalization_version text,
  p_semantic_content jsonb
)
RETURNS TABLE(status text, record_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_semantic_type text;
  v_logical_slot text;
  v_source_document_key text;

  v_record_id uuid;
  v_existing_hash text;
  v_existing_version text;

  v_provenance_record_id uuid;
  v_provenance_hash text;
  v_provenance_version text;

  v_previous_record_id uuid;
  v_previous_hash text;
  v_previous_version text;
begin
  if (auth.jwt() -> 'app_metadata' ->> 'risencare_role')
       is distinct from 'connector_trust_boundary'
  then
    raise exception 'connector_trust_boundary role required'
      using errcode = '42501';
  end if;

  if p_facility_id is null
     or p_connector_id is null
     or p_resident_id is null
  then
    raise exception 'facility, connector and resident are required'
      using errcode = '22004';
  end if;

  v_semantic_type :=
    nullif(btrim(coalesce(p_semantic_type, '')), '');

  v_logical_slot :=
    nullif(btrim(coalesce(p_logical_slot, '')), '');

  v_source_document_key :=
    nullif(btrim(coalesce(p_source_document_key, '')), '');

  if v_semantic_type is null
     or v_logical_slot is null
     or v_source_document_key is null
     or p_source_updated_at is null
     or p_source_size is null
     or p_source_size < 0
     or p_content_hash !~ '^[0-9a-f]{64}$'
     or nullif(
       btrim(coalesce(p_canonicalization_version, '')),
       ''
     ) is null
     or jsonb_typeof(p_semantic_content) <> 'object'
  then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  if p_expected_content_hash is not null
     and p_expected_content_hash !~ '^[0-9a-f]{64}$'
  then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  perform 1
  from public.connector_registrations as cr
  where cr.connector_id = p_connector_id
    and cr.facility_id = p_facility_id
    and cr.active = true
  for key share;

  if not found then
    return query select 'denied'::text, null::uuid;
    return;
  end if;

  perform 1
  from public.users as u
  where u.id = p_resident_id
    and u.facility_id = p_facility_id
  for key share;

  if not found then
    return query select 'denied'::text, null::uuid;
    return;
  end if;

  perform 1
  from public.connector_source_documents as d
  where d.facility_id = p_facility_id
    and d.connector_id = p_connector_id
    and d.source_document_key = v_source_document_key
    and d.source_updated_at is not distinct from p_source_updated_at
    and d.source_size is not distinct from p_source_size
  for key share;

  if not found then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_facility_id::text || E'\x1f' ||
      p_resident_id::text || E'\x1f' ||
      v_semantic_type || E'\x1f' ||
      v_logical_slot,
      0
    )
  );

  select
    p.record_id,
    p.content_hash,
    p.canonicalization_version
  into
    v_provenance_record_id,
    v_provenance_hash,
    v_provenance_version
  from public.connector_semantic_logical_record_provenance as p
  where p.facility_id = p_facility_id
    and p.connector_id = p_connector_id
    and p.resident_id = p_resident_id
    and p.semantic_type = v_semantic_type
    and p.logical_slot = v_logical_slot
    and p.source_document_key = v_source_document_key
    and p.source_updated_at is not distinct from p_source_updated_at
    and p.source_size is not distinct from p_source_size
    and p.canonicalization_version = p_canonicalization_version
  for update;

  if found then
    if v_provenance_hash is distinct from p_content_hash then
      return query
      select 'conflict'::text, v_provenance_record_id;
      return;
    end if;

    select
      i.record_id,
      s.content_hash,
      s.canonicalization_version
    into
      v_record_id,
      v_existing_hash,
      v_existing_version
    from public.semantic_record_logical_identities as i
    join public.semantic_record_states as s
      on s.facility_id = i.facility_id
     and s.record_id = i.record_id
    where i.facility_id = p_facility_id
      and i.resident_id = p_resident_id
      and i.semantic_type = v_semantic_type
      and i.logical_slot = v_logical_slot
    for update of i, s;

    if found
       and v_record_id = v_provenance_record_id
       and v_existing_hash = v_provenance_hash
       and v_existing_version = v_provenance_version
    then
      return query
      select 'unchanged'::text, v_record_id;
      return;
    end if;

    return query
    select 'stale'::text, v_provenance_record_id;
    return;
  end if;

  select
    i.record_id,
    s.content_hash,
    s.canonicalization_version
  into
    v_record_id,
    v_existing_hash,
    v_existing_version
  from public.semantic_record_logical_identities as i
  join public.semantic_record_states as s
    on s.facility_id = i.facility_id
   and s.record_id = i.record_id
  where i.facility_id = p_facility_id
    and i.resident_id = p_resident_id
    and i.semantic_type = v_semantic_type
    and i.logical_slot = v_logical_slot
  for update of i, s;

  if not found then
    if p_expected_content_hash is not null then
      return query select 'conflict'::text, null::uuid;
      return;
    end if;

    v_record_id := gen_random_uuid();

    insert into public.semantic_records (
      facility_id,
      record_id,
      resident_id,
      semantic_type,
      semantic_content
    )
    values (
      p_facility_id,
      v_record_id,
      p_resident_id,
      v_semantic_type,
      p_semantic_content
    );

    insert into public.semantic_record_states (
      facility_id,
      record_id,
      content_hash,
      canonicalization_version
    )
    values (
      p_facility_id,
      v_record_id,
      p_content_hash,
      p_canonicalization_version
    );

    insert into public.semantic_record_logical_identities (
      facility_id,
      resident_id,
      semantic_type,
      logical_slot,
      record_id
    )
    values (
      p_facility_id,
      p_resident_id,
      v_semantic_type,
      v_logical_slot,
      v_record_id
    );

    insert into public.connector_semantic_logical_record_provenance (
      facility_id,
      connector_id,
      resident_id,
      semantic_type,
      logical_slot,
      record_id,
      source_document_key,
      source_updated_at,
      source_size,
      content_hash,
      canonicalization_version,
      persistence_action
    )
    values (
      p_facility_id,
      p_connector_id,
      p_resident_id,
      v_semantic_type,
      v_logical_slot,
      v_record_id,
      v_source_document_key,
      p_source_updated_at,
      p_source_size,
      p_content_hash,
      p_canonicalization_version,
      'created'
    );

    return query select 'created'::text, v_record_id;
    return;
  end if;

  if p_expected_content_hash is null
     or v_existing_hash is distinct from p_expected_content_hash
  then
    return query select 'conflict'::text, v_record_id;
    return;
  end if;

  if v_existing_hash = p_content_hash
     and v_existing_version = p_canonicalization_version
  then
    insert into public.connector_semantic_logical_record_provenance (
      facility_id,
      connector_id,
      resident_id,
      semantic_type,
      logical_slot,
      record_id,
      source_document_key,
      source_updated_at,
      source_size,
      content_hash,
      canonicalization_version,
      persistence_action
    )
    values (
      p_facility_id,
      p_connector_id,
      p_resident_id,
      v_semantic_type,
      v_logical_slot,
      v_record_id,
      v_source_document_key,
      p_source_updated_at,
      p_source_size,
      p_content_hash,
      p_canonicalization_version,
      'unchanged'
    );

    return query select 'unchanged'::text, v_record_id;
    return;
  end if;

  select
    p.record_id,
    p.content_hash,
    p.canonicalization_version
  into
    v_previous_record_id,
    v_previous_hash,
    v_previous_version
  from public.connector_semantic_logical_record_provenance as p
  where p.facility_id = p_facility_id
    and p.connector_id = p_connector_id
    and p.resident_id = p_resident_id
    and p.semantic_type = v_semantic_type
    and p.logical_slot = v_logical_slot
    and p.source_document_key = v_source_document_key
    and p.source_updated_at is not distinct from p_source_updated_at
    and p.source_size is not distinct from p_source_size
    and p.canonicalization_version =
      'risen-recipient-certificate-canonicalization-1'
  for update;

  if found then
    if p_canonicalization_version is distinct from
         'risen-recipient-certificate-canonicalization-2'
       or v_existing_version is distinct from
         'risen-recipient-certificate-canonicalization-1'
       or v_previous_version is distinct from
         'risen-recipient-certificate-canonicalization-1'
       or v_previous_record_id is distinct from v_record_id
       or v_previous_hash is distinct from v_existing_hash
       or p_expected_content_hash is distinct from v_existing_hash
    then
      return query select 'conflict'::text, v_record_id;
      return;
    end if;
  else
    if
      v_existing_version is distinct from p_canonicalization_version
      and not (
        v_existing_version =
          'risen-recipient-certificate-canonicalization-1'
        and p_canonicalization_version =
          'risen-recipient-certificate-canonicalization-2'
      )
    then
      return query select 'conflict'::text, v_record_id;
      return;
    end if;
  end if;

  update public.semantic_records as sr
  set semantic_content = p_semantic_content,
      updated_at = now()
  where sr.facility_id = p_facility_id
    and sr.record_id = v_record_id;

  update public.semantic_record_states as srs
  set content_hash = p_content_hash,
      canonicalization_version = p_canonicalization_version,
      updated_at = now()
  where srs.facility_id = p_facility_id
    and srs.record_id = v_record_id;

  insert into public.connector_semantic_logical_record_provenance (
    facility_id,
    connector_id,
    resident_id,
    semantic_type,
    logical_slot,
    record_id,
    source_document_key,
    source_updated_at,
    source_size,
    content_hash,
    canonicalization_version,
    persistence_action
  )
  values (
    p_facility_id,
    p_connector_id,
    p_resident_id,
    v_semantic_type,
    v_logical_slot,
    v_record_id,
    v_source_document_key,
    p_source_updated_at,
    p_source_size,
    p_content_hash,
    p_canonicalization_version,
    'updated'
  );

  return query select 'updated'::text, v_record_id;
  return;
end;
$function$;

commit;
