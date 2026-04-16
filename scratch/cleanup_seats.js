import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujowugielrmzvmwqenhb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqb3d1Z2llbHJtenZtd3FlbmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTMwMTQsImV4cCI6MjA3ODg4OTAxNH0.bZ9NtOq0035L5begeOc3h3xSr-kI7be3rF2DuV9o2Xs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupGhostSeats() {
  console.log('--- Cleaning up ghost seats ---');
  
  // Find seats that are beyond the bus capacity
  const { data: ghosts, error } = await supabase
    .from('assentos_onibus')
    .select('id, onibus_id, numero_assento, onibus(nome, total_assentos)')
    .csv(); // CSV just to get a combined result easily or just join

  // Better way: get all buses and their seat counts
  const { data: buses } = await supabase.from('onibus').select('id, nome, total_assentos');
  
  let totalDeleted = 0;

  for (const b of buses) {
    const { data: deleted, error: delError } = await supabase
      .from('assentos_onibus')
      .delete()
      .eq('onibus_id', b.id)
      .gt('numero_assento', b.total_assentos)
      .select();

    if (deleted && deleted.length > 0) {
      console.log(`Deleted ${deleted.length} ghost seats from bus: ${b.nome}`);
      totalDeleted += deleted.length;
    }
  }

  console.log(`Total ghost seats deleted: ${totalDeleted}`);
}

cleanupGhostSeats();
