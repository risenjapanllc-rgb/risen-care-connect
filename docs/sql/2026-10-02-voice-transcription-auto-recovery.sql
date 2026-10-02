alter table
public.communication_recordings

add column
transcription_auto_recovery_eligible boolean
not null
default false;


alter table
public.communication_recordings

alter column
transcription_auto_recovery_eligible

set default true;


comment on column
public.communication_recordings.transcription_auto_recovery_eligible
is
'True only for recordings created after automatic transcription recovery rollout.';


create or replace function
public.recover_voice_transcriptions()
returns integer
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
    v_record record;
    v_request_id bigint;
    v_enqueued_count integer := 0;
begin
    /*
     * Existing recordings are deliberately excluded by
     * transcription_auto_recovery_eligible = false.
     *
     * Future recordings receive true by default.
     */
    if not exists (
        select 1
        from public.communication_recordings r
        where
            r.transcription_auto_recovery_eligible
                is true
            and r.upload_status =
                'uploaded'
            and r.started_at
                is not null
            and r.ended_at
                is not null
            and r.transcription_attempt_count < 5
            and (
                (
                    r.transcription_status =
                        'pending'
                    and (
                        r.transcription_next_attempt_at
                            is null
                        or
                        r.transcription_next_attempt_at
                            <= now()
                    )
                )
                or
                (
                    r.transcription_status =
                        'processing'
                    and
                    r.transcription_started_at
                        is not null
                    and
                    r.transcription_started_at
                        <= now() - interval '300 seconds'
                )
            )
    ) then
        return 0;
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

    for v_record in
        select
            r.id
        from public.communication_recordings r
        where
            r.transcription_auto_recovery_eligible
                is true
            and r.upload_status =
                'uploaded'
            and r.started_at
                is not null
            and r.ended_at
                is not null
            and r.transcription_attempt_count < 5
            and (
                (
                    r.transcription_status =
                        'pending'
                    and (
                        r.transcription_next_attempt_at
                            is null
                        or
                        r.transcription_next_attempt_at
                            <= now()
                    )
                )
                or
                (
                    r.transcription_status =
                        'processing'
                    and
                    r.transcription_started_at
                        is not null
                    and
                    r.transcription_started_at
                        <= now() - interval '300 seconds'
                )
            )
        order by
            r.created_at,
            r.id
        limit 5
    loop
        begin
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
                        v_record.id::text
                    ),

                timeout_milliseconds :=
                    15000
            )
            into v_request_id;

            if v_request_id is not null then
                v_enqueued_count =
                    v_enqueued_count + 1;
            end if;

        exception
            when others then
                /*
                 * Recovery dispatch failure must not
                 * abort the whole cron run.
                 */
                raise warning
                    'voice transcription recovery enqueue failed';
        end;
    end loop;

    return v_enqueued_count;
end;
$function$;


revoke all on function
public.recover_voice_transcriptions()
from public;

revoke all on function
public.recover_voice_transcriptions()
from anon;

revoke all on function
public.recover_voice_transcriptions()
from authenticated;


do $cron$
declare
    v_job_id bigint;
begin
    for v_job_id in
        select jobid
        from cron.job
        where jobname =
            'risencare-voice-transcription-recovery'
    loop
        perform cron.unschedule(
            v_job_id
        );
    end loop;

    perform cron.schedule(
        'risencare-voice-transcription-recovery',
        '* * * * *',
        'select public.recover_voice_transcriptions();'
    );
end;
$cron$;
