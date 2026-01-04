create extension if not exists pg_cron;

create or replace function public.finance_mark_overdue()
returns void
language plpgsql
security definer
as $$
begin
  update public.finance_installments i
  set status = 'atrasado'
  where i.status in ('pendente')
    and i.vencimento < (now() at time zone 'America/Sao_Paulo')::date
    and exists (
      select 1
      from public.finance_payment_plans p
      where p.id = i.plano_id
        and p.status = 'ativo'
    );
end
$$;

create index if not exists idx_finance_installments_status_venc
  on public.finance_installments (status, vencimento);

select cron.schedule(
  'finance_mark_overdue_daily',
  '0 3 * * *',
  'SELECT public.finance_mark_overdue();'
);
