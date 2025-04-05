// static-test-client.ts
// Simple script to test the API with static data

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function runCompleteFlowTest() {
  try {
    console.log('Starting complete flow test with static data...');
    console.log('=============================================');
    
    // Step 1: Health check
    const healthResp = await axios.get(`${API_URL}/health`);
    console.log('1. Health check:', healthResp.data);
    
    // Step 2: Approve token (static token address used)
    const approveResp = await axios.post(`${API_URL}/approve-token`);
    console.log('2. Token approval:', approveResp.data);
    
    // Step 3: Get quote (static swap config used)
    const quoteResp = await axios.post(`${API_URL}/get-quote`);
    console.log('3. Quote received:', quoteResp.data.success);
    
    // Step 4: Generate secrets (static secrets count used)
    const secretsResp = await axios.post(`${API_URL}/generate-secrets`);
    console.log('4. Secrets generated:', secretsResp.data.success);
    
    // Step 5: Place order (static quote and secrets used)
    const placeResp = await axios.post(`${API_URL}/place-order`);
    console.log('5. Order placed:', placeResp.data);
    
    // Step 6: Check order status (static order hash used)
    const statusResp = await axios.get(`${API_URL}/order`);
    console.log('6. Order status:', statusResp.data.order.status);
    
    // Step 7: Check for fills (static order hash used)
    const fillsResp = await axios.get(`${API_URL}/fills`);
    console.log('7. Ready fills:', fillsResp.data.fills.length);
    
    // Step 8: Monitor order (static order hash and secrets used)
    const monitorResp = await axios.post(`${API_URL}/monitor`);
    console.log('8. Monitoring started:', monitorResp.data.message);
    
    // Step 9: Submit secret if needed (static order hash and secret used)
    const secretResp = await axios.post(`${API_URL}/submit-secret`);
    console.log('9. Secret submitted:', secretResp.data.success);
    
    // Step 10: Check active orders
    const ordersResp = await axios.get(`${API_URL}/active-orders`);
    console.log('10. Active orders:', ordersResp.data.count);
    
    console.log('=============================================');
    console.log('Complete flow test finished!');
    
  } catch (error: any) {
    console.error('Error during test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function testExecuteSwap() {
  try {
    console.log('Testing execute-swap endpoint...');
    
    const response = await axios.post(`${API_URL}/execute-swap`);
    console.log('Execute swap response:', response.data);
    
    // Wait a bit and check status
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusResp = await axios.get(`${API_URL}/order/${response.data.orderHash}`);
    console.log('Order status after execution:', statusResp.data.order.status);
    
  } catch (error: any) {
    console.error('Error during execute-swap test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

async function runTests() {
  // Choose which tests to run
  await runCompleteFlowTest();
  // await testExecuteSwap();
}

// Run tests
runTests().catch(console.error);