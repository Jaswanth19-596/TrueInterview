/**
 * Demo Metrics Provider
 *
 * This module provides simulated system metrics for testing purposes.
 * It generates random processes with realistic CPU and memory usage patterns.
 */

// List of common process names to use in the demo
const PROCESS_NAMES = [
  'chrome',
  'firefox',
  'safari',
  'node',
  'java',
  'python',
  'vscode',
  'slack',
  'spotify',
  'discord',
  'docker',
  'npm',
  'mongodb',
  'redis',
  'postgres',
  'mysql',
  'nginx',
  'apache',
  'systemd',
  'kernel',
  'finder',
  'explorer',
  'terminal',
  'bash',
  'zsh',
];

// Common memory sizes (in MB)
const MEMORY_SIZES = [32, 64, 128, 256, 512, 1024, 2048, 4096];

/**
 * Create a single simulated process with random properties
 * @param {string} name - Process name (optional, will use random if not provided)
 * @returns {Object} Simulated process data
 */
const createDemoProcess = (name) => {
  const processName =
    name || PROCESS_NAMES[Math.floor(Math.random() * PROCESS_NAMES.length)];
  const cpu = Math.random() * 20; // 0-20% CPU usage
  const memory =
    MEMORY_SIZES[Math.floor(Math.random() * MEMORY_SIZES.length)] * 1024; // Convert to KB

  return {
    processName,
    cpu,
    memory,
    pid: Math.floor(Math.random() * 10000),
  };
};

/**
 * Generate a list of demo processes with realistic metrics
 * @param {number} count - Number of processes to generate
 * @returns {Array} Array of simulated processes
 */
export const generateDemoProcesses = (count = 20) => {
  const processes = [];

  // Add some high CPU usage processes with low probability
  if (Math.random() < 0.3) {
    const highCpuProcess = createDemoProcess();
    highCpuProcess.cpu = 50 + Math.random() * 50; // 50-100% CPU
    processes.push(highCpuProcess);
  }

  // Add remaining random processes
  for (let i = 0; i < count - processes.length; i++) {
    processes.push(createDemoProcess());
  }

  return processes;
};

/**
 * Provide simulated system metrics
 * @returns {Object} Metrics object with processes array
 */
export const getDemoMetrics = () => {
  const processes = generateDemoProcesses();

  return {
    processes,
    timestamp: Date.now(),
  };
};

/**
 * Demo metrics provider function suitable for use with the metrics collector
 * @returns {Array} Array of simulated processes
 */
export const demoMetricsProvider = () => {
  return generateDemoProcesses();
};
