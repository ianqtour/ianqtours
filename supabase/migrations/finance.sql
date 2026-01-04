create table if not exists public.finance_payment_plans (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas (id) on delete cascade,
  passageiro_id uuid not null references public.passageiros (id) on delete cascade,
  excursao_id uuid not null references public.excursoes (id) on delete cascade,
  entrada_valor numeric(10,2) not null default 0,
  parcela_valor numeric(10,2) not null,
  parcelas_total integer not null check (parcelas_total > 0),
  primeiro_pagamento_data date not null,
  status text not null default 'ativo' check (status in ('ativo','concluido','cancelado')),
  created_at timestamptz not null default now(),
  unique (reserva_id, passageiro_id)
);

create table if not exists public.finance_installments (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references public.finance_payment_plans (id) on delete cascade,
  numero integer not null check (numero >= 0),
  vencimento date not null,
  valor numeric(10,2) not null check (valor > 0),
  status text not null default 'pendente' check (status in ('pendente','pago','atrasado','cancelado')),
  pago_em timestamptz,
  metodo text,
  created_at timestamptz not null default now(),
  unique (plano_id, numero)
);

create index if not exists idx_finance_plans_reserva on public.finance_payment_plans (reserva_id);
create index if not exists idx_finance_plans_passageiro on public.finance_payment_plans (passageiro_id);
create index if not exists idx_finance_installments_plano on public.finance_installments (plano_id);

alter table public.finance_payment_plans enable row level security;
alter table public.finance_installments enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'finance_payment_plans' and schemaname = 'public') then
    create policy "admin_all_plans"
      on public.finance_payment_plans
      for all
      using (auth.role() = 'service_role' or auth.uid() is not null)
      with check (auth.role() = 'service_role' or auth.uid() is not null);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'finance_installments' and schemaname = 'public') then
    create policy "admin_all_installments"
      on public.finance_installments
      for all
      using (auth.role() = 'service_role' or auth.uid() is not null)
      with check (auth.role() = 'service_role' or auth.uid() is not null);
  end if;
end $$;

create or replace view public.vw_finance_installments_to_collect as
select
  ex.nome as excursao_nome,
  ex.horario_partida as data,
  p.nome as passageiro_nome,
  fi.numero as numero_parcela,
  fi.vencimento,
  fi.valor,
  fi.status,
  fi.id as installment_id,
  fpp.id as plano_id,
  r.id as reserva_id
from public.finance_installments fi
join public.finance_payment_plans fpp on fi.plano_id = fpp.id
join public.reservas r on r.id = fpp.reserva_id
join public.passageiros p on p.id = fpp.passageiro_id
join public.excursoes ex on ex.id = fpp.excursao_id
where r.status = 'confirmada'
  and fi.status in ('pendente', 'atrasado');
