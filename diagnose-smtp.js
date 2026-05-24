#!/usr/bin/env node
const dns = require('dns').promises;
const net = require('net');

console.log('🔍 SMTP Connectivity Diagnostics\n');

async function testConnectivity() {
  const host = 'smtp-relay.brevo.com';
  const port = 587;

  try {
    // Test 1: DNS Resolution
    console.log('1️⃣  Testing DNS Resolution...');
    const addresses = await dns.resolve4(host);
    console.log(`   ✅ DNS resolved to: ${addresses.join(', ')}\n`);

    // Test 2: Port connectivity
    console.log('2️⃣  Testing port connectivity on :587...');
    const socket = net.createConnection({ host, port, timeout: 5000 });
    
    socket.on('connect', () => {
      console.log('   ✅ Successfully connected to port 587\n');
      socket.destroy();
    });

    socket.on('error', (err) => {
      console.log(`   ❌ Connection error: ${err.message}\n`);
      socket.destroy();
    });

    socket.on('timeout', () => {
      console.log('   ❌ Connection timeout (firewall/network issue)\n');
      socket.destroy();
    });

  } catch (error) {
    console.log(`   ❌ DNS Error: ${error.message}`);
    console.log('   This means your system cannot resolve smtp-relay.brevo.com\n');
  }

  // Test 3: Try alternative port
  console.log('3️⃣  Testing alternative port 25...');
  const socket25 = net.createConnection({ host, port: 25, timeout: 5000 });
  
  socket25.on('connect', () => {
    console.log('   ✅ Successfully connected to port 25\n');
    socket25.destroy();
  });

  socket25.on('error', (err) => {
    console.log(`   ❌ Connection error on port 25: ${err.message}\n`);
    socket25.destroy();
  });

  socket25.on('timeout', () => {
    console.log('   ❌ Connection timeout on port 25\n');
    socket25.destroy();
  });

  // Test 4: Network info
  console.log('4️⃣  Network Information:');
  const os = require('os');
  const interfaces = os.networkInterfaces();
  Object.keys(interfaces).forEach(name => {
    interfaces[name].forEach(iface => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`   IP Address: ${iface.address}`);
      }
    });
  });

  console.log('\n📋 Recommendations:');
  console.log('   1. Check your firewall/antivirus - may be blocking outbound SMTP');
  console.log('   2. Check with your ISP - they may block port 587');
  console.log('   3. Verify Brevo account credentials in Supabase');
  console.log('   4. Try using Supabase built-in email service instead');
  console.log('   5. Contact Brevo support for IP whitelisting');
}

testConnectivity();
