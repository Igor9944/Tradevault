#!/usr/bin/env node

/**
 * Tradevault Driver Script
 * Provides basic functionality to start, stop, and check status of the Tradevault application
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const APP_DIR = process.cwd();
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
let serverProcess = null;

function log(message) {
  console.log(`[Driver] ${message}`);
}

function runCommand(command) {
  try {
    const output = execSync(command, {
      cwd: APP_DIR,
      stdio: 'pipe'
    });
    return output.toString().trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function isBuilt() {
  return existsSync(join(APP_DIR, 'dist', 'server.cjs'));
}

async function build() {
  log('Building application...');

  // Install dependencies if needed
  if (!existsSync(join(APP_DIR, 'node_modules'))) {
    log('Installing dependencies...');
    try {
      execSync('npm ci', { cwd: APP_DIR, stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }

  // Build the application
  try {
    execSync('npm run build', {
      cwd: APP_DIR,
      stdio: 'pipe',
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }

  log('Application built successfully');
}

async function start() {
  if (serverProcess) {
    log('Server is already running');
    return;
  }

  // Ensure application is built
  if (!isBuilt()) {
    await build();
  }

  log(`Starting application server on port ${PORT}...`);

  // Start the server process
  serverProcess = spawn('node', ['dist/server.cjs'], {
    cwd: APP_DIR,
    detached: true,
    stdio: 'ignore'
  });

  // Give it a moment to start
  setTimeout(() => {
    log(`Application started!`);
    log(`- API: ${BASE_URL}`);
    log(`- Health check: ${BASE_URL}/api/health`);
    log('Press Ctrl+C to stop the server');
  }, 2000);

  // Keep the process alive
  process.on('SIGINT', () => {
    log('\nShutting down...');
    stop();
    process.exit(0);
  });
}

function stop() {
  if (!serverProcess) {
    log('No server running to stop');
    return;
  }

  log('Stopping application server...');
  serverProcess.kill();
  serverProcess = null;
  log('Application stopped');
}

async function status() {
  const built = isBuilt();
  let running = false;

  // Simple process check (this is approximate)
  try {
    // Try to connect to the server to see if it's responding
    const response = await fetch(`${BASE_URL}/api/health`, { timeout: 2000 });
    running = response.ok;
  } catch (error) {
    // Not responding or not running
  }

  console.log(JSON.stringify({
    built,
    running,
    url: BASE_URL
  }, null, 2));
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'build':
    (async () => {
      if (!await isBuilt()) {
        await build();
      } else {
        log('Application is already built');
      }
    })();
    break;

  case 'start':
    start();
    break;

  case 'stop':
    stop();
    break;

  case 'restart':
    stop();
    setTimeout(() => start(), 1000);
    break;

  case 'status':
    status();
    break;

  case 'request':
    (async () => {
      const method = args[1];
      let endpoint = args[2];
      let data = null;

      if (!method || !endpoint) {
        console.log('Usage: node driver.mjs request <method> <endpoint> [data]');
        process.exit(1);
      }

      // Parse JSON data if provided
      if (args[3]) {
        try {
          data = JSON.parse(args[3]);
        } catch (error) {
          console.error('Error parsing JSON data:', error.message);
          process.exit(1);
        }
      }

      // Fix for Git Bash on Windows converting /path to C:/Program Files/Git/path
      // Detect if the argument looks like it's been mangled by MSYS
      if (endpoint.match(/^[a-zA-Z]:[\\\/]/) && endpoint.toLowerCase().includes('git')) {
        // This looks like a Windows path that may have been mangled by MSYS
        // Extract the part after the last occurrence of "/git/" or "\git\"
        const gitRegex = /[\\\/]git[\\\/]/i;
        const match = endpoint.match(gitRegex);
        if (match) {
          // Get everything after the last match
          const pos = endpoint.lastIndexOf(match[0]);
          if (pos !== -1) {
            let afterGit = endpoint.substring(pos + match[0].length);
            // Ensure it starts with /
            afterGit = afterGit.replace(/^[\\\/]/, '');
            endpoint = '/' + afterGit;
          }
        }
      }

      try {
        const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        console.log(`[DEBUG] Making request to: ${url}`); // Debug line
        const response = await fetch(url, {
          method: method.toUpperCase(),
          headers: {
            'Content-Type': 'application/json'
          },
          body: data ? JSON.stringify(data) : undefined
        });

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          console.log(JSON.stringify(result, null, 2));
        } else {
          const text = await response.text();
          console.log(`Response (${response.status}):`);
          console.log(text);
        }
      } catch (error) {
        console.error('Error making request:', error.message);
        process.exit(1);
      }
    })();
    break;

  case 'health':
    (async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/health`, { timeout: 2000 });
        if (response.ok) {
          const data = await response.json();
          console.log('Application is healthy:', JSON.stringify(data, null, 2));
        } else {
          console.error(`Health check failed with status: ${response.status}`);
          process.exit(1);
        }
      } catch (error) {
        console.error('Error checking health:', error.message);
        process.exit(1);
      }
    })();
    break;

  case 'help':
  default:
    console.log(`
Tradevault Driver Script

Usage:
  node driver.mjs <command> [options]

Commands:
  build                   - Build the application if not already built
  start                   - Build (if needed) and start the application server
  stop                    - Stop the running application server
  restart                 - Restart the application server
  status                  - Check application build and runtime status
  request <method> <endpoint> [data] - Make HTTP requests to the API
  health                  - Check application health
  help                    - Show this help message

Examples:
  node driver.mjs start
  node driver.mjs status
  node driver.mjs request GET /api/health
  node driver.mjs request POST /api/auth/login '{"email":"test@example.com","password":"password"}'

Note: For HTTP requests to the API, you can also use standard tools like curl or fetch:
  curl http://localhost:3000/api/health
  fetch('http://localhost:3000/api/health').then(r => r.json())
`);
}