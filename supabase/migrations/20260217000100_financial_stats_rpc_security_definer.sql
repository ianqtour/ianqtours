CREATE OR REPLACE FUNCTION get_financial_dashboard_metrics(
  p_excursao_id INT DEFAULT NULL,
  p_onibus_id INT DEFAULT NULL
)
RETURNS TABLE (
  total_passengers BIGINT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  overdue_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH PassengerFinancials AS (
     SELECT
         pr.passageiro_id,
         r.id,
         pr.is_guide,
         COALESCE(fpp.valor_creditos, 0) AS credit_amount,
         COALESCE(SUM(CASE WHEN fi.status = 'pago' THEN fi.valor ELSE 0 END), 0) AS paid_installments,
         COALESCE(SUM(CASE WHEN fi.status = 'atrasado' THEN fi.valor ELSE 0 END), 0) AS overdue_installments,
         COALESCE(SUM(fi.valor), 0) AS total_installments
     FROM
         public.reservas r
     JOIN
         public.passageiros_reserva pr ON r.id = pr.reserva_id
     LEFT JOIN
         public.finance_payment_plans fpp ON pr.reserva_id = fpp.reserva_id AND pr.passageiro_id = fpp.passageiro_id
     LEFT JOIN
         public.finance_installments fi ON fpp.id = fi.plano_id
     WHERE
        r.status <> 'cancelada'
        AND (p_excursao_id IS NULL OR r.excursao_id = p_excursao_id)
        AND (p_onibus_id IS NULL OR r.onibus_id = p_onibus_id)
     GROUP BY
         r.id, pr.passageiro_id, pr.is_guide, fpp.valor_creditos
 )
 SELECT
     COUNT(*)::BIGINT as total_passengers,
     COALESCE(SUM(pf.total_installments + pf.credit_amount), 0) AS total_amount,
     COALESCE(SUM(pf.paid_installments + pf.credit_amount), 0) AS paid_amount,
     COALESCE(SUM(pf.overdue_installments), 0) AS overdue_amount
 FROM
     PassengerFinancials pf;
END;
$$;
