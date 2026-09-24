BEGIN;

CREATE OR REPLACE FUNCTION public.persist_recipient_certificate_import_entry(
  p_facility_id uuid,
  p_connector_id uuid,
  p_resolution text,
  p_identifier_type text,
  p_identifier_digest text,
  p_resident_id uuid,
  p_display_name text,
  p_resident_profile jsonb,
  p_semantic_type text,
  p_logical_slot text,
  p_semantic_content jsonb,
  p_content_hash text,
  p_canonicalization_version text,
  p_expected_content_hash text,
  p_source_document_key text,
  p_source_updated_at timestamptz,
  p_source_size bigint
)
RETURNS TABLE(
  status text,
  resident_id uuid,
  record_id uuid,
  resident_created boolean
)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_resident_id uuid;
  v_record_id uuid;
  v_resident_created boolean := false;

  v_admission_status text;
  v_profile_status text;
  v_semantic_status text;

  v_failure_status text := null;

  v_name text;
  v_birth_date date;
  v_gender text;
  v_user_code text;
BEGIN
  IF p_resolution NOT IN ('existing', 'planned_new') THEN
    RETURN QUERY
    SELECT
      'invalid'::text,
      null::uuid,
      null::uuid,
      false;
    RETURN;
  END IF;

  IF p_identifier_type NOT IN ('name', 'user_code') THEN
    RETURN QUERY
    SELECT
      'invalid'::text,
      null::uuid,
      null::uuid,
      false;
    RETURN;
  END IF;

  IF
    p_resident_profile IS NULL
    OR jsonb_typeof(p_resident_profile) <> 'object'
  THEN
    RETURN QUERY
    SELECT
      'invalid'::text,
      null::uuid,
      null::uuid,
      false;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_resident_profile) AS k(key)
    WHERE k.key NOT IN (
      'name',
      'birth_date',
      'gender',
      'user_code'
    )
  ) THEN
    RETURN QUERY
    SELECT
      'invalid'::text,
      null::uuid,
      null::uuid,
      false;
    RETURN;
  END IF;

  v_name :=
    nullif(btrim(p_resident_profile ->> 'name'), '');

  v_gender :=
    nullif(btrim(p_resident_profile ->> 'gender'), '');

  v_user_code :=
    nullif(btrim(p_resident_profile ->> 'user_code'), '');

  BEGIN
    IF nullif(
      btrim(p_resident_profile ->> 'birth_date'),
      ''
    ) IS NOT NULL THEN
      v_birth_date :=
        (p_resident_profile ->> 'birth_date')::date;
    END IF;
  EXCEPTION
    WHEN invalid_datetime_format OR datetime_field_overflow THEN
      RETURN QUERY
      SELECT
        'invalid'::text,
        null::uuid,
        null::uuid,
        false;
      RETURN;
  END;

  BEGIN
    IF p_resolution = 'planned_new' THEN
      SELECT
        a.status,
        a.resident_id,
        a.resident_created
      INTO
        v_admission_status,
        v_resident_id,
        v_resident_created
      FROM public.admit_connector_resident(
        p_facility_id,
        p_connector_id,
        p_source_document_key,
        p_identifier_type,
        p_identifier_digest,
        coalesce(v_name, p_display_name),
        v_birth_date,
        v_gender,
        v_user_code,
        p_source_updated_at,
        p_source_size
      ) AS a;

      IF v_admission_status NOT IN ('created', 'existing') THEN
        v_failure_status := v_admission_status;
        RAISE EXCEPTION
          USING
            ERRCODE = 'P0001',
            MESSAGE = 'recipient_certificate_atomic_abort';
      END IF;

      IF v_resident_id IS NULL THEN
        v_failure_status := 'conflict';
        RAISE EXCEPTION
          USING
            ERRCODE = 'P0001',
            MESSAGE = 'recipient_certificate_atomic_abort';
      END IF;
    ELSE
      IF p_resident_id IS NULL THEN
        v_failure_status := 'invalid';
        RAISE EXCEPTION
          USING
            ERRCODE = 'P0001',
            MESSAGE = 'recipient_certificate_atomic_abort';
      END IF;

      SELECT
        f.status,
        f.resident_id
      INTO
        v_profile_status,
        v_resident_id
      FROM public.fill_connector_resident_profile(
        p_facility_id,
        p_connector_id,
        p_source_document_key,
        p_identifier_type,
        p_identifier_digest,
        v_name,
        v_birth_date,
        v_gender,
        v_user_code,
        p_source_updated_at,
        p_source_size
      ) AS f;

      IF v_profile_status NOT IN ('filled', 'unchanged') THEN
        v_failure_status := v_profile_status;
        RAISE EXCEPTION
          USING
            ERRCODE = 'P0001',
            MESSAGE = 'recipient_certificate_atomic_abort';
      END IF;

      IF
        v_resident_id IS NULL
        OR v_resident_id IS DISTINCT FROM p_resident_id
      THEN
        v_failure_status := 'conflict';
        RAISE EXCEPTION
          USING
            ERRCODE = 'P0001',
            MESSAGE = 'recipient_certificate_atomic_abort';
      END IF;
    END IF;

    SELECT
      s.status,
      s.record_id
    INTO
      v_semantic_status,
      v_record_id
    FROM public.persist_connector_semantic_logical_record(
      p_facility_id,
      p_connector_id,
      v_resident_id,
      p_semantic_type,
      p_logical_slot,
      p_source_document_key,
      p_source_updated_at,
      p_source_size,
      p_expected_content_hash,
      p_content_hash,
      p_canonicalization_version,
      p_semantic_content
    ) AS s;

    IF v_semantic_status NOT IN (
      'created',
      'updated',
      'unchanged'
    ) THEN
      v_failure_status := v_semantic_status;
      RAISE EXCEPTION
        USING
          ERRCODE = 'P0001',
          MESSAGE = 'recipient_certificate_atomic_abort';
    END IF;

  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'recipient_certificate_atomic_abort' THEN
        RAISE;
      END IF;
  END;

  IF v_failure_status IS NOT NULL THEN
    RETURN QUERY
    SELECT
      v_failure_status,
      null::uuid,
      null::uuid,
      false;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    v_semantic_status,
    v_resident_id,
    v_record_id,
    v_resident_created;
END;
$function$;

COMMIT;
