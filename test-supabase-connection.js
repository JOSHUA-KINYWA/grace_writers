#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pebpltwjbmrrhymztmed.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYnBsdHdqYm1ycmh5bXp0bWVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODk3NzU2MiwiZXhwIjoyMDg0NTUzNTYyfQ.8jtQgjOhWE1jhoqkmO4sw_yccKWir3VllajrBNuBUZg'
};

console.log('🔧 Testing Supabase Connection...\n');
console.log('URL:', env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Service Role Key:', env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 30) + '...\n');

async function testConnection() {
  try {
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Test 1: Check tables
    console.log('✓ Supabase client created successfully');
    
    // Test 2: Query a simple table
    const { data, error } = await supabase.from('order_ratings').select('*').limit(1);
    
    if (error) {
      console.log('❌ Error querying table:', error.message);
      console.log('Details:', error);
    } else {
      console.log('✅ Successfully connected to Supabase!');
      console.log('✅ order_ratings table exists');
      console.log(`✅ Found ${data.length} record(s) in table\n`);
      if (data.length > 0) {
        console.log('Sample data:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message);
    console.log('Stack:', err.stack);
  }
}

testConnection();
