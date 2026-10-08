CREATE OR REPLACE FUNCTION public.verify_connector_credential(
    p_connector_id uuid,
    p_credential text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_role text;
    v_credential_hash text;
BEGIN
    v_role :=
        COALESCE(
            auth.jwt()
                -> 'app_metadata'
                ->> 'risencare_role',
            ''
        );

    IF v_role <> 'facility_system' THEN
        RAISE EXCEPTION
            'facility_system role required'
            USING ERRCODE = '42501';
    END IF;

    IF
        p_connector_id IS NULL
        OR p_credential IS NULL
        OR p_credential = ''
    THEN
        RETURN false;
    END IF;

    v_credential_hash :=
        encode(
            extensions.digest(
                p_credential,
                'sha256'
            ),
            'hex'
        );

    RETURN EXISTS (
        SELECT 1
        FROM public.connector_registrations AS cr
        WHERE
            cr.connector_id = p_connector_id
            AND cr.active = true
            AND cr.credential_hash IS NOT NULL
            AND cr.credential_hash = v_credential_hash
    );
END;
$function$;

REVOKE ALL
ON FUNCTION public.verify_connector_credential(uuid, text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.verify_connector_credential(uuid, text)
TO authenticated;
