create or replace function
public.invoke_voice_transcription_worker(
    p_recording_id uuid
)
returns bigint
language plpgsql
security definer
set search_path =
    public,
    extensions,
    vault
as $function$
declare
    v_worker_secret text;
    v_worker_url text;
    v_request_id bigint;
begin
    if p_recording_id is null then
        return null;
    end if;

    /*
     * Immediate enqueue is only for the first
     * fully-ready transcription attempt.
     *
     * Retry/recovery is intentionally a separate concern.
     */
    if not exists (
        select 1
        from public.communication_recordings
            as recording
        where recording.id =
            p_recording_id
          and recording.upload_status =
            'uploaded'
          and recording.transcription_status =
            'pending'
          and recording.transcription_attempt_count =
            0
          and recording.transcription_claim_token
            is null
          and recording.started_at
            is not null
          and recording.ended_at
            is not null
    ) then
        return null;
    end if;

    select decrypted_secret
    into v_worker_secret
    from vault.decrypted_secrets
    where name =
        'risencare_voice_transcription_worker_secret';

    if
        v_worker_secret is null
        or length(v_worker_secret) = 0
    then
        raise exception
            'voice transcription worker secret is missing'
            using errcode = '22004';
    end if;

    select decrypted_secret
    into v_worker_url
    from vault.decrypted_secrets
    where name =
        'risencare_voice_transcription_worker_url';

    if
        v_worker_url is null
        or length(v_worker_url) = 0
        or v_worker_url !~
            '^https://[A-Za-z0-9.-]+/functions/v1/voice-transcription-worker$'
    then
        raise exception
            'voice transcription worker URL is invalid'
            using errcode = '22023';
    end if;

    select net.http_post(
        url :=
            v_worker_url,

        headers :=
            jsonb_build_object(
                'Content-Type',
                'application/json',

                'x-risencare-worker-secret',
                v_worker_secret
            ),

        body :=
            jsonb_build_object(
                'recordingId',
                p_recording_id::text
            ),

        timeout_milliseconds :=
            15000
    )
    into v_request_id;

    if v_request_id is null then
        raise exception
            'failed to enqueue voice transcription worker request';
    end if;

    return v_request_id;
end;
$function$;


create or replace function
public.enqueue_voice_transcription_after_timing()
returns trigger
language plpgsql
security definer
set search_path =
    public,
    extensions,
    vault
as $function$
begin
    /*
     * Transcription must never make persistence of
     * provider timing fail.
     *
     * A later recovery worker can pick up anything
     * that could not be enqueued here.
     */
    begin
        perform
            public.invoke_voice_transcription_worker(
                new.id
            );
    exception
        when others then
            raise warning
                'voice transcription enqueue failed';
    end;

    return new;
end;
$function$;


drop trigger if exists
communication_recordings_enqueue_transcription_tg
on public.communication_recordings;


create trigger
communication_recordings_enqueue_transcription_tg

after update of
    started_at,
    ended_at

on public.communication_recordings

for each row

when (
    new.upload_status =
        'uploaded'

    and new.transcription_status =
        'pending'

    and new.transcription_attempt_count =
        0

    and new.transcription_claim_token
        is null

    and new.started_at
        is not null

    and new.ended_at
        is not null

    and (
        old.started_at
            is null
        or old.ended_at
            is null
    )
)

execute function
public.enqueue_voice_transcription_after_timing();


revoke all on function
public.invoke_voice_transcription_worker(uuid)
from public;

revoke all on function
public.invoke_voice_transcription_worker(uuid)
from anon;

revoke all on function
public.invoke_voice_transcription_worker(uuid)
from authenticated;


revoke all on function
public.enqueue_voice_transcription_after_timing()
from public;

revoke all on function
public.enqueue_voice_transcription_after_timing()
from anon;

revoke all on function
public.enqueue_voice_transcription_after_timing()
from authenticated;
