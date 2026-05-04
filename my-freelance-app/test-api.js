const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/order-ratings?completed=true');
    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', data);

    if (response.ok) {
      console.log('✅ API is working!');
    } else {
      console.log('❌ API still has issues');
    }
  } catch (error) {
    console.log('Error testing API:', error.message);
  }
}

testAPI();