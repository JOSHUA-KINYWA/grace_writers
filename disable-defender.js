#!/usr/bin/env node
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

console.log('🔧 Disabling Windows Defender Real-Time Protection (Temporary)\n');

async function disableDefender() {
  try {
    console.log('⏳ Attempting to disable Real-time Protection...\n');
    
    // Disable real-time protection
    const { stdout, stderr } = await execPromise(
      'powershell.exe -Command "Set-MpPreference -DisableRealtimeMonitoring $true"',
      { shell: true }
    );
    
    console.log('✅ Real-time Protection DISABLED\n');
    console.log('Now test SMTP: node test-gmail-smtp.js\n');
    console.log('⚠️  IMPORTANT: Re-enable protection after testing:');
    console.log('   - Run: node enable-defender.js');
    console.log('   - Or manually: Settings → Windows Security → Turn on');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('\n💡 Alternative: Disable manually:');
    console.log('1. Settings → Privacy & Security → Windows Security');
    console.log('2. Virus & threat protection');
    console.log('3. Click "Manage settings"');
    console.log('4. Toggle OFF "Real-time protection"');
    console.log('5. Run: node test-gmail-smtp.js');
  }
}

disableDefender();
