begin;

/*
 * 2026-10-07 migration:
 * 初版で revised_by を public.users(id) FK付きuuidとして
 * 作成した環境を、既存の case_record_revisions と同じく
 * auth.uid() を記録できる text 型へ安全に移行する。
 */
do $migration$
declare
    v_constraint_name text;
    v_data_type text;
begin
    if to_regclass(
        'public.communication_log_revisions'
    ) is not null then

        select
            c.data_type
        into
            v_data_type
        from information_schema.columns as c
        where c.table_schema = 'public'
          and c.table_name =
              'communication_log_revisions'
          and c.column_name =
              'revised_by';

        if v_data_type = 'uuid' then

            select
                con.conname
            into
                v_constraint_name
            from pg_constraint as con
            join pg_class as rel
              on rel.oid = con.conrelid
            join pg_namespace as n
              on n.oid = rel.relnamespace
            join unnest(con.conkey)
              with ordinality as key(attnum, ord)
              on true
            join pg_attribute as a
              on a.attrelid = rel.oid
             and a.attnum = key.attnum
            where n.nspname = 'public'
              and rel.relname =
                  'communication_log_revisions'
              and con.contype = 'f'
              and a.attname = 'revised_by'
            limit 1;

            if v_constraint_name is not null then
                execute format(
                    'alter table public.communication_log_revisions drop constraint %I',
                    v_constraint_name
                );
            end if;

            alter table
            public.communication_log_revisions
            alter column revised_by
            type text
            using revised_by::text;

        end if;
    end if;
end;
$migration$;

/*
 * 初版の旧6引数RPCを削除する。
 * CASCADEは使用しない。
 */
drop function if exists
public.revise_voice_communication_transcript(
    uuid,
    uuid,
    text,
    uuid,
    text,
    text
);

drop function if exists
public.confirm_voice_communication_summary(
    uuid,
    uuid,
    text,
    uuid,
    text,
    text
);

create table if not exists public.communication_log_revisions (
    id uuid primary key default gen_random_uuid(),

    communication_log_id uuid not null
        references public.communication_logs(id)
        on delete cascade,

    facility_id uuid not null
        references public.facilities(id),

    field_name text not null
        check (
            field_name in (
                'transcript',
                'confirmed_summary'
            )
        ),

    revision_no integer not null
        check (revision_no >= 1),

    previous_value text,
    new_value text,

    revision_reason text,

    revised_by text,

    revised_by_name text,

    revised_at timestamptz not null
        default now(),

    unique (
        communication_log_id,
        field_name,
        revision_no
    )
);

create index if not exists
communication_log_revisions_communication_log_id_idx
on public.communication_log_revisions(
    communication_log_id
);

create index if not exists
communication_log_revisions_facility_id_idx
on public.communication_log_revisions(
    facility_id
);

alter table
public.communication_log_revisions
enable row level security;


/*
 * 人による文字起こし訂正。
 *
 * ・元音声は変更しない
 * ・訂正前後を履歴保存
 * ・文字起こし変更後はAI要約を無効化
 * ・確定要約が存在する場合は履歴へ残して無効化
 */
create or replace function
public.revise_voice_communication_transcript(
    p_facility_id uuid,
    p_communication_log_id uuid,
    p_new_transcript text,
    p_revised_by_name text default null,
    p_revision_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_log public.communication_logs%rowtype;

    v_transcript_revision_no integer;

    v_summary_revision_no integer;
begin
    if coalesce(
        auth.jwt()
            -> 'app_metadata'
            ->> 'risencare_role',
        ''
    ) not in (
        'facility_system',
        'connector_trust_boundary'
    )
    then
        raise exception
            'trusted voice system role required'
            using errcode = '42501';
    end if;

    if
        p_facility_id is null
        or p_communication_log_id is null
        or p_new_transcript is null
    then
        raise exception
            'voice transcript revision context is required'
            using errcode = '22004';
    end if;

    select *
    into v_log
    from public.communication_logs
    where id =
        p_communication_log_id
      and facility_id =
        p_facility_id
      and communication_type =
        'phone'
      and communication_route =
        'risen_care_telephony'
    for update;

    if not found then
        raise exception
            'voice communication log not found'
            using errcode = 'P0002';
    end if;

    /*
     * 同一内容なら履歴を増やさない。
     */
    if
        v_log.transcript
        is not distinct from
        p_new_transcript
    then
        return;
    end if;

    select
        coalesce(
            max(revision_no),
            0
        ) + 1
    into
        v_transcript_revision_no
    from public.communication_log_revisions
    where communication_log_id =
        p_communication_log_id
      and field_name =
        'transcript';

    insert into
    public.communication_log_revisions (
        communication_log_id,
        facility_id,
        field_name,
        revision_no,
        previous_value,
        new_value,
        revision_reason,
        revised_by,
        revised_by_name
    )
    values (
        p_communication_log_id,
        p_facility_id,
        'transcript',
        v_transcript_revision_no,
        v_log.transcript,
        p_new_transcript,
        p_revision_reason,
        auth.uid()::text,
        nullif(
            trim(
                coalesce(
                    p_revised_by_name,
                    ''
                )
            ),
            ''
        )
    );

    /*
     * 既に確定要約がある場合は、
     * 文字起こし訂正により内容が古くなるため
     * 無効化も履歴として残す。
     */
    if v_log.confirmed_summary is not null then

        select
            coalesce(
                max(revision_no),
                0
            ) + 1
        into
            v_summary_revision_no
        from public.communication_log_revisions
        where communication_log_id =
            p_communication_log_id
          and field_name =
            'confirmed_summary';

        insert into
        public.communication_log_revisions (
            communication_log_id,
            facility_id,
            field_name,
            revision_no,
            previous_value,
            new_value,
            revision_reason,
            revised_by,
            revised_by_name
        )
        values (
            p_communication_log_id,
            p_facility_id,
            'confirmed_summary',
            v_summary_revision_no,
            v_log.confirmed_summary,
            null,
            'transcript_revised',
            auth.uid()::text,
            nullif(
                trim(
                    coalesce(
                        p_revised_by_name,
                        ''
                    )
                ),
                ''
            )
        );

    end if;

    update public.communication_logs
    set
        transcript =
            p_new_transcript,

        /*
         * 新しい文字起こしに対して
         * AI要約を再生成するため一旦無効化。
         */
        ai_summary =
            null,

        confirmed_summary =
            null

    where id =
        p_communication_log_id
      and facility_id =
        p_facility_id;
end;
$function$;


/*
 * AI要約を人が確認・修正して
 * 「確定要約」として保存する。
 *
 * ai_summary 自体は機械生成値なので変更しない。
 */
create or replace function
public.confirm_voice_communication_summary(
    p_facility_id uuid,
    p_communication_log_id uuid,
    p_confirmed_summary text,
    p_revised_by_name text default null,
    p_revision_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_log public.communication_logs%rowtype;

    v_revision_no integer;
begin
    if coalesce(
        auth.jwt()
            -> 'app_metadata'
            ->> 'risencare_role',
        ''
    ) not in (
        'facility_system',
        'connector_trust_boundary'
    )
    then
        raise exception
            'trusted voice system role required'
            using errcode = '42501';
    end if;

    if
        p_facility_id is null
        or p_communication_log_id is null
        or p_confirmed_summary is null
    then
        raise exception
            'voice summary confirmation context is required'
            using errcode = '22004';
    end if;

    select *
    into v_log
    from public.communication_logs
    where id =
        p_communication_log_id
      and facility_id =
        p_facility_id
      and communication_type =
        'phone'
      and communication_route =
        'risen_care_telephony'
    for update;

    if not found then
        raise exception
            'voice communication log not found'
            using errcode = 'P0002';
    end if;

    if v_log.transcript is null then
        raise exception
            'voice transcript is required before summary confirmation'
            using errcode = '22004';
    end if;

    if
        v_log.confirmed_summary
        is not distinct from
        p_confirmed_summary
        and v_log.result_confirmed_at
            is not null
    then
        return;
    end if;

    select
        coalesce(
            max(revision_no),
            0
        ) + 1
    into
        v_revision_no
    from public.communication_log_revisions
    where communication_log_id =
        p_communication_log_id
      and field_name =
        'confirmed_summary';

    insert into
    public.communication_log_revisions (
        communication_log_id,
        facility_id,
        field_name,
        revision_no,
        previous_value,
        new_value,
        revision_reason,
        revised_by,
        revised_by_name
    )
    values (
        p_communication_log_id,
        p_facility_id,
        'confirmed_summary',
        v_revision_no,
        v_log.confirmed_summary,
        p_confirmed_summary,
        p_revision_reason,
        auth.uid()::text,
        nullif(
            trim(
                coalesce(
                    p_revised_by_name,
                    ''
                )
            ),
            ''
        )
    );

    update public.communication_logs
    set
        confirmed_summary =
            p_confirmed_summary,

        result_confirmed_at =
            now()
    where id =
        p_communication_log_id
      and facility_id =
        p_facility_id;
end;
$function$;


revoke all
on function
public.revise_voice_communication_transcript(
    uuid,
    uuid,
    text,
    text,
    text
)
from public;

revoke all
on function
public.revise_voice_communication_transcript(
    uuid,
    uuid,
    text,
    text,
    text
)
from anon;

grant execute
on function
public.revise_voice_communication_transcript(
    uuid,
    uuid,
    text,
    text,
    text
)
to authenticated;


revoke all
on function
public.confirm_voice_communication_summary(
    uuid,
    uuid,
    text,
    text,
    text
)
from public;

revoke all
on function
public.confirm_voice_communication_summary(
    uuid,
    uuid,
    text,
    text,
    text
)
from anon;

grant execute
on function
public.confirm_voice_communication_summary(
    uuid,
    uuid,
    text,
    text,
    text
)
to authenticated;

commit;
