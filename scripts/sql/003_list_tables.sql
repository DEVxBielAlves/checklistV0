-- Liste as tabelas por schema (para rodar no SQL Editor do Supabase)
select table_schema, table_name
from information_schema.tables
where table_type = 'BASE TABLE'
  and table_schema in ('public', 'storage', 'auth', 'extensions')
order by 1, 2;

-- Apenas do schema public
-- select table_name from information_schema.tables where table_schema = 'public' order by 1;

-- Colunas de uma tabela específica
-- select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = '<sua_tabela>' order by 1;
