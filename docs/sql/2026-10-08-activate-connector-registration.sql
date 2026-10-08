CREATE OR REPLACE FUNCTION public.activate_connector_registration(
    p_connector_id uuid,
    p_facility_id uuid,
    p_credential_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_role text;
    v_affected_rows integer;
BEGIN
    v_role :=
        COALESCE(
            auth.jwt()
                -> 'app_metadata'
                ->> 'risencare_role',
            ''
        );

    IF v_role <> 'connector_trust_boundary' THEN
        RAISE EXCEPTION
            'connector_trust_boundary role required'
            USING ERRCODE = '42501';
    END IF;

    IF
        p_connector_id IS NULL
        OR p_facility_id IS NULL
        OR p_credential_hash IS NULL
        OR p_credential_hash !~ '^[0-9a-f]{64}$'
    THEN
        RETURN false;
    END IF;

    INSERT INTO public.connector_registrations (
        connector_id,
        facility_id,
        active,
        credential_hash
    )
    VALUES (
        p_connector_id,
        p_facility_id,
        true,
        p_credential_hash
    )
    ON CONFLICT (connector_id)
    DO UPDATE
    SET
        active = true,
        credential_hash =
            EXCLUDED.credential_hash,
        updated_at =
            now()
    WHERE
        public.connector_registrations.facility_id =
            EXCLUDED.facility_id;

    GET DIAGNOSTICS
        v_affected_rows =
            ROW_COUNT;

    RETURN
        v_affected_rows = 1;
END;
$function$;

REVOKE ALL
ON FUNCTION public.activate_connector_registration(
    uuid,
    uuid,
    text
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.activate_connector_registration(
    uuid,
    uuid,
    text
)
TO authenticated;
