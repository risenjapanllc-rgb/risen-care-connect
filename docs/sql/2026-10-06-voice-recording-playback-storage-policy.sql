begin;

drop policy if exists
    communication_recordings_connector_voice_select
on storage.objects;

create policy
    communication_recordings_connector_voice_select
on storage.objects
for select
to authenticated
using (
    bucket_id =
        'communication-recordings'
    and (
        auth.jwt()
        -> 'app_metadata'
        ->> 'risencare_role'
    ) =
        'connector_trust_boundary'
);

commit;
