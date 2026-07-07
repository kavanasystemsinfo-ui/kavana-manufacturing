import 'dotenv/config';

async function runTests() {
  const baseUrl = 'http://localhost:3001/production/time-logs/sync';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer mock-token'
  };

  const testEvent = {
    id: '00000000-0000-0000-0000-000000000099', // Random UUID
    tenant_id: '1',
    order_id: '00000000-0000-0000-0000-000000000001',
    workstation_id: '00000000-0000-0000-0000-000000000011',
    operator_id: '00000000-0000-0000-0000-000000000021',
    event_type: 'start',
    registered_at: new Date().toISOString(),
    is_offline_event: true,
    client_device_id: 'tdd-test-runner'
  };

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(testEvent)
    });

    const text = await response.text();
    console.log(`STATUS: ${response.status}`);
    console.log(`BODY:`, text);
  } catch (error) {
    console.error('ERROR:', error);
  }
}

runTests();
