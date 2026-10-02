/*
 * RISEN CARE voice transcription operational check.
 *
 * Read-only operational summary returned as one result row.
 *
 * Does not expose:
 * - recording IDs
 * - request IDs
 * - transcript text
 * - recording paths or URLs
 * - phone numbers
 * - worker secrets
 * - HTTP response bodies
 * - HTTP error contents
 */

with health_snapshot as (
    select
        public.get_voice_transcription_health()
            as health
),

dispatch_summary as (
    select
        count(*)::bigint
            as dispatch_count_last_6h,

        count(*) filter (
            where
                d.dispatch_kind =
                    'immediate'
        )::bigint
            as immediate_count_last_6h,

        count(*) filter (
            where
                d.dispatch_kind =
                    'recovery'
        )::bigint
            as recovery_count_last_6h,

        count(*) filter (
            where
                response.status_code
                    between 200 and 299
        )::bigint
            as response_2xx_count_last_6h,

        count(*) filter (
            where
                response.status_code >= 400
        )::bigint
            as http_error_count_last_6h,

        count(*) filter (
            where
                response.timed_out is true
        )::bigint
            as timeout_count_last_6h,

        count(*) filter (
            where
                response.transport_error_present
                    is true
        )::bigint
            as transport_error_count_last_6h

    from public.voice_transcription_dispatches d

    left join lateral (
        select
            r.status_code,
            r.timed_out,
            r.error_msg is not null
                as transport_error_present

        from net._http_response r

        where
            r.id =
                d.request_id

        order by
            r.created desc

        limit 1
    ) response
        on true

    where
        d.dispatched_at >=
            now() - interval '6 hours'
),

latest_dispatch as (
    select
        d.dispatch_kind,

        d.dispatched_at,

        response.response_present,

        response.status_code,

        coalesce(
            response.timed_out,
            false
        ) as timed_out,

        coalesce(
            response.transport_error_present,
            false
        ) as transport_error_present,

        recording.transcription_status,

        recording.transcription_attempt_count,

        (
            recording.transcription_text
                is not null
            and
            length(
                recording.transcription_text
            ) > 0
        ) as transcript_present

    from public.voice_transcription_dispatches d

    join public.communication_recordings recording
        on recording.id =
            d.recording_id

    left join lateral (
        select
            true
                as response_present,

            r.status_code,

            r.timed_out,

            r.error_msg is not null
                as transport_error_present

        from net._http_response r

        where
            r.id =
                d.request_id

        order by
            r.created desc

        limit 1
    ) response
        on true

    order by
        d.dispatched_at desc

    limit 1
)

select
    h.health ->> 'status'
        as health_status,

    (
        h.health
            -> 'recordings'
            ->> 'eligible_count'
    )::bigint
        as eligible_count,

    (
        h.health
            -> 'recordings'
            ->> 'completed_count'
    )::bigint
        as completed_count,

    (
        h.health
            -> 'recordings'
            ->> 'pending_count'
    )::bigint
        as pending_count,

    (
        h.health
            -> 'recordings'
            ->> 'processing_count'
    )::bigint
        as processing_count,

    (
        h.health
            -> 'recordings'
            ->> 'failed_count'
    )::bigint
        as failed_count,

    (
        h.health
            -> 'recordings'
            ->> 'recovery_due_count'
    )::bigint
        as recovery_due_count,

    (
        h.health
            -> 'recordings'
            ->> 'recovery_overdue_count'
    )::bigint
        as recovery_overdue_count,

    (
        h.health
            -> 'cron'
            ->> 'active_job_count'
    )::bigint
        as active_cron_count,

    (
        h.health
            -> 'dispatch'
            ->> 'http_error_count'
    )::bigint
        as recent_http_error_count,

    (
        h.health
            -> 'dispatch'
            ->> 'timeout_count'
    )::bigint
        as recent_timeout_count,

    (
        h.health
            -> 'dispatch'
            ->> 'transport_error_count'
    )::bigint
        as recent_transport_error_count,

    (
        h.health
            -> 'dispatch'
            ->> 'no_response_over_3m_count'
    )::bigint
        as recent_no_response_over_3m_count,

    s.dispatch_count_last_6h,
    s.immediate_count_last_6h,
    s.recovery_count_last_6h,
    s.response_2xx_count_last_6h,
    s.http_error_count_last_6h,
    s.timeout_count_last_6h,
    s.transport_error_count_last_6h,

    l.dispatch_kind
        as latest_dispatch_kind,

    l.dispatched_at
        as latest_dispatched_at,

    l.response_present
        as latest_response_present,

    l.status_code
        as latest_status_code,

    l.timed_out
        as latest_timed_out,

    l.transport_error_present
        as latest_transport_error_present,

    l.transcription_status
        as latest_transcription_status,

    l.transcription_attempt_count
        as latest_attempt_count,

    l.transcript_present
        as latest_transcript_present

from health_snapshot h

cross join dispatch_summary s

left join latest_dispatch l
    on true;
