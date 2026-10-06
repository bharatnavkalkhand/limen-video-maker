#!/usr/bin/env node
// Preview management script
const command = process.argv[2];

if (command === 'stop') {
  console.log('Preview stop command - no-op for now');
  process.exit(0);
} else if (command === 'restart') {
  console.log('Preview restart command - no-op for now');
  process.exit(0);
} else {
  console.log('Unknown command:', command);
  process.exit(1);
}
