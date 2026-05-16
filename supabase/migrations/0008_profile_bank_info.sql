-- Bank info per student so withdrawal requests can target a stored CBU / alias
-- instead of asking on every retiro.

alter table profiles add column if not exists bank_cbu text;
alter table profiles add column if not exists bank_alias text;
