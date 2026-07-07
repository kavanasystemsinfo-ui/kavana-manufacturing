import 'dotenv/config';

async function runTests() {
  console.log('🧪 Iniciando KAVANA TDD - Sincronización de Eventos Offline\n');

  const baseUrl = 'http://localhost:3001/production/time-logs/sync';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-token'
  };

  const testEvent = {
    id: '00000000-0000-0000-0000-000000000099', // Random UUID for the event
    tenant_id: '1',
    order_id: '00000000-0000-0000-0000-000000000001',
    workstation_id: '00000000-0000-0000-0000-000000000011',
    operator_id: '00000000-0000-0000-0000-000000000021',
    event_type: 'start',
    registered_at: new Date().toISOString(),
    is_offline_event: false,
    client_device_id: 'tdd-test-runner'
  };

  try {
    console.log('➡️ Enviando evento "start" al backend...');
    console.log(JSON.stringify(testEvent, null, 2));
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(testEvent)
    });

    const data = await response.json();
    
    console.log(`\n⬅️ Respuesta del Backend (Status: ${response.status}):`);
    console.dir(data, { depth: null, colors: true });

    if (response.ok) {
      console.log('\n✅ TEST PASADO: Evento registrado correctamente.');
    } else {
      console.log('\n❌ TEST FALLADO: El backend ha rechazado el evento.');
    }

  } catch (error) {
    console.error('\n💥 ERROR DE RED O CONEXIÓN:', error);
  }
}

runTests();
