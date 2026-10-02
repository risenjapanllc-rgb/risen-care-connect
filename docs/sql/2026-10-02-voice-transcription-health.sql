/*
 * Voice transcription operational health.
 *
 * Returns aggregate operational state only.
 *
 * Does not expose:
 * - recording IDs
 * - transcript text
 * - recording paths or URLs
 * - worker secrets
 * - transcription error contents
 */

create or replace function
public.get_voice_transcription_health()
returns jsonb
language sql
stable
security definer
set search_path =
    pg_catalog,
    public
as $function$
with recording_health as (
    select
        count(*)::bigint
            as eligible_recording_count,

        count(*) filter (
            where
                r.transcription_status =
                    'completed'
        )::bigint
            as completed_count,

        count(*) filter (
            where
                r.transcription_status =
                    'pending'
        )::bigint
            as pending_count,

        count(*) filter (
            where
                r.transcription_status =
                    'processing'
        )::bigint
            as processing_count,

        count(*) filter (
            where
                r.transcription_status =
                    'failed'
        )::bigint
            as failed_count,

        count(*) filter (
            where
                r.transcription_status <>
                    'completed'
                and
                r.transcription_attempt_count >= 5
        )::bigint
            as exhausted_count,

        count(*) filter (
            where
                r.upload_status =
                    'uploaded'
                and
                r.transcription_status =
                    'pending'
                and (
                    r.started_at is null
                    or
                    r.ended_at is null
                )
                and
                r.created_at <=
                    now() - interval '5 minutes'
        )::bigint
            as timing_missing_over_5m_count,

        count(*) filter (
            where
                r.upload_status =
                    'uploaded'
                and
                r.started_at is not null
                and
                r.ended_at is not null
                and
                r.transcription_status =
                    'processing'
                and
                r.transcription_started_at
                    is not null
                and
                r.transcription_started_at <=
                    now() - interval '8 minutes'
        )::bigint
            as stale_processing_over_8m_count,

        count(*) filter (
            where
                r.upload_status =
                    'uploaded'
                and
                r.started_at is not null
                and
                r.ended_at is not null
                and
                r.transcription_attempt_count < 5
                and (
                    (
                        r.transcription_status =
                            'pending'
                        and (
                            (
                                r.transcription_next_attempt_at
                                    is not null
                                and
                                r.transcription_next_attempt_at
                                    <= now()
                            )
                            or
                            (
                                r.transcription_next_attempt_at
                                    is null
                                and (
                                    r.transcription_attempt_count > 0
                                    or
                                    r.ended_at <=
                                        now() - interval '120 seconds'
                                )
                            )
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
                        r.transcription_started_at <=
                            now() - interval '300 seconds'
                    )
                )
        )::bigint
            as recovery_due_count,

        count(*) filter (
            where
                r.upload_status =
                    'uploaded'
                and
                r.started_at is not null
                and
                r.ended_at is not null
                and
                r.transcription_attempt_count < 5
                and (
                    (
                        r.transcription_status =
                            'pending'
                        and (
                            (
                                r.transcription_attempt_count = 0
                                and
                                r.transcription_next_attempt_at
                                    is null
                                and
                                r.ended_at <=
                                    now() - interval '5 minutes'
                            )
                            or
                            (
                                r.transcription_next_attempt_at
                                    is not null
                                and
                                r.transcription_next_attempt_at <=
                                    now() - interval '3 minutes'
                            )
                            or
                            (
                                r.transcription_attempt_count > 0
                                and
                                r.transcription_next_attempt_at
                                    is null
                            )
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
                        r.transcription_started_at <=
                            now() - interval '8 minutes'
                    )
                )
        )::bigint
            as recovery_overdue_count

    from public.communication_recordings r

    where
        r.transcription_auto_recovery_eligible
            is true
),

cron_health as (
    select
        count(*) filter (
            where
                j.active is true
                and
                j.schedule = '* * * * *'
        )::bigint
            as active_cron_count

    from cron.job j

    where
        j.jobname =
            'risencare-voice-transcription-recovery'
),

cron_run_health as (
    select
        max(d.end_time) filter (
            where
                d.status =
                    'succeeded'
        )
            as last_success_at,

        count(*) filter (
            where
                d.status <>
                    'succeeded'
                and
                d.start_time >=
                    now() - interval '15 minutes'
        )::bigint
            as recent_failure_count

    from cron.job_run_details d

    join cron.job j
        on j.jobid = d.jobid

    where
        j.jobname =
            'risencare-voice-transcription-recovery'
)

select
    jsonb_build_object(
        'status',
        case
            when
                c.active_cron_count <> 1
                or
                cr.last_success_at is null
                or
                cr.last_success_at <
                    now() - interval '3 minutes'
                or
                r.failed_count > 0
                or
                r.exhausted_count > 0
            then
                'critical'

            when
                r.timing_missing_over_5m_count > 0
                or
                r.stale_processing_over_8m_count > 0
                or
                r.recovery_overdue_count > 0
                or
                cr.recent_failure_count > 0
            then
                'degraded'

            else
                'healthy'
        end,

        'observed_at',
        now(),

        'recordings',
        jsonb_build_object(
            'eligible_count',
            r.eligible_recording_count,

            'completed_count',
            r.completed_count,

            'pending_count',
            r.pending_count,

            'processing_count',
            r.processing_count,

            'failed_count',
            r.failed_count,

            'exhausted_count',
            r.exhausted_count,

            'timing_missing_over_5m_count',
            r.timing_missing_over_5m_count,

            'stale_processing_over_8m_count',
            r.stale_processing_over_8m_count,

            'recovery_due_count',
            r.recovery_due_count,

            'recovery_overdue_count',
            r.recovery_overdue_count
        ),

        'cron',
        jsonb_build_object(
            'active_job_count',
            c.active_cron_count,

            'last_success_at',
            cr.last_success_at,

            'recent_failure_count',
            cr.recent_failure_count
        )
    )

from recording_health r
cross join cron_health c
cross join cron_run_health cr;
$function$;


revoke all on function
public.get_voice_transcription_health()
from public;

revoke all on function
public.get_voice_transcription_health()
from anon;

revoke all on function
public.get_voice_transcription_health()
from authenticated;
