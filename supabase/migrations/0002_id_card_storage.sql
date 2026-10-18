-- ที่เก็บรูปบัตรประชาชน (ไม่เปิดสาธารณะ)
insert into storage.buckets (id, name, public) values ('id-cards', 'id-cards', false)
on conflict (id) do nothing;

create policy id_cards_read on storage.objects for select
  using (bucket_id = 'id-cards' and (storage.foldername(name))[1] = current_branch()::text);
create policy id_cards_insert on storage.objects for insert
  with check (bucket_id = 'id-cards' and (storage.foldername(name))[1] = current_branch()::text);
