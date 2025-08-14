import { spawn } from 'child_process';

console.log('🚀 Starting Eucorail FleetOps Demo (Simple)...');

// Kill existing processes
console.log('🛑 Cleaning up...');
spawn('pkill', ['-9', '-f', 'next dev'], { stdio: 'ignore' });
spawn('pkill', ['-9', '-f', 'tsx watch'], { stdio: 'ignore' });
spawn('lsof', ['-ti:3001'], { stdio: 'pipe' }).stdout?.pipe(spawn('xargs', ['kill', '-9'], { stdio: 'ignore' }).stdin);
spawn('lsof', ['-ti:4100'], { stdio: 'pipe' }).stdout?.pipe(spawn('xargs', ['kill', '-9'], { stdio: 'ignore' }).stdin);

// Wait for cleanup
setTimeout(() => {
  console.log('🌱 Running seeds...');
  
  // Run seeds
  const seedLines = spawn('npm', ['run', 'seed:lines'], { stdio: 'inherit' });
  seedLines.on('close', (code) => {
    if (code === 0) {
      const seedFleet = spawn('npm', ['run', 'seed:fleet'], { stdio: 'inherit' });
      seedFleet.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Seeds completed');
          startServers();
        }
      });
    }
  });
}, 2000);

function startServers() {
  console.log('🔧 Starting API server...');
  const api = spawn('npm', ['--workspace', 'packages/api', 'run', 'dev'], {
    env: { ...process.env, PORT: '4100' },
    stdio: 'inherit'
  });
  
  setTimeout(() => {
    console.log('🌐 Starting Web server...');
    const web = spawn('npm', ['--workspace', 'apps/web', 'run', 'dev'], {
      env: { ...process.env, PORT: '3001' },
      stdio: 'inherit'
    });
    
    console.log('🎉 Demo starting...');
    console.log('🌐 Web: http://localhost:3001');
    console.log('🔧 API: http://localhost:4100');
    
    // Handle cleanup
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping demo...');
      api.kill('SIGKILL');
      web.kill('SIGKILL');
      process.exit(0);
    });
  }, 3000);
}


