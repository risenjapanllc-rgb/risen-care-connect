/*
 * Voice transcription dispatch tracking.
 *
 * Stores only operational correlation metadata.
 *
 * Does not store:
 * - transcript text
 * - recording URLs or paths
 * - phone numbers
 * - worker URLs
 * - worker secrets
 * - HTTP response bodies
 */

create table
public.voice_transcription_dispatches (
    request_id bigint
        primary key,

    recording_id uuid
        not null
        references
            public.communication_recordings(id)
        on delete cascade,

    dispatch_kind text
        not null,

    dispatched_at timestamptz
        not null
        default now(),

    constraint
        voice_transcription_dispatches_kind_ck
        check (
            dispatch_kind in (
                'immediate',
                'recovery'
            )
        )
);


create index
voice_transcription_dispatches_recording_time_idx
on public.voice_transcription_dispatches (
    recording_id,
    dispatched_at desc
);


create index
voice_transcription_dispatches_time_idx
on public.voice_transcription_dispatches (
    dispatched_at desc
);


alter table
public.voice_transcription_dispatches
enable row level security;


revoke all on table
public.voice_transcription_dispatches
from public;

revoke all on table
public.voice_transcription_dispatches
from anon;

revoke all on table
public.voice_transcription_dispatches
from authenticated;
