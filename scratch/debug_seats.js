import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujowugielrmzvmwqenhb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqb3d1Z2llbHJtenZtd3FlbmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTMwMTQsImV4cCI6MjA3ODg4OTAxNH0.bZ9NtOq0035L5begeOc3h3xSr-kI7be3rF2DuV9o2Xs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIcaraizinho() {
  console.log('--- Checking Icaraizinho Excursion ---');
  
  // Find the excursion
  const { data: excursions } = await supabase
    .from('excursoes')
    .select('id, nome, status')
    .ilike('nome', '%Icaraizinho%');

  if (!excursions || excursions.length === 0) {
    console.log('No excursion found with name Icaraizinho');
    const { data: all } = await supabase.from('excursoes').select('nome');
    console.log('Available excursions:', all.map(a => a.nome));
    return;
  }

  for (const ex of excursions) {
    console.log(`\nExcursion: ${ex.nome} (ID: ${ex.id}, Status: ${ex.status})`);

    // Find buses
    const { data: buses } = await supabase
      .from('onibus')
      .select('id, nome, identificacao, total_assentos')
      .eq('excursao_id', ex.id);

    if (!buses || buses.length === 0) {
      console.log('  No buses found for this excursion.');
      continue;
    }

    for (const b of buses) {
      console.log(`  Bus: ${b.nome} - ${b.identificacao} (ID: ${b.id}, Total Seats: ${b.total_assentos})`);

      // Find seats
      const { data: seats } = await supabase
        .from('assentos_onibus')
        .select('numero_assento, status')
        .eq('onibus_id', b.id);

      if (!seats) {
        console.log('    Failed to fetch seats.');
        continue;
      }

      console.log(`    Total records in assentos_onibus: ${seats.length}`);
      
      const statusCounts = seats.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});

      console.log('    Status counts:', statusCounts);

      const notOccupied = seats.filter(s => s.status !== 'ocupado').length;
      console.log(`    Count of status !== 'ocupado' (Calc used in Public): ${notOccupied}`);
      
      const available = seats.filter(s => s.status === 'disponivel').length;
      console.log(`    Count of status === 'disponivel' (Calc used in Bus): ${available}`);
    }
  }
}

checkIcaraizinho();
