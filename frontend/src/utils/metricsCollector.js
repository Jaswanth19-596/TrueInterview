/**
 * System Metrics Collector Utility
 *
 * This utility handles collection and formatting of system metrics
 * for the interview platform. It standardizes the metrics format
 * before sending to the server.
 */

/**
 * Format metrics data to ensure consistent format for display
 * @param {Array|Object} metricsData - Raw metrics data from system monitoring
 * @returns {Array} Formatted metrics data
 */
export const formatMetricsData = (metricsData) => {
  let formattedMetrics = [];

  try {
    // Handle array of processes
    if (Array.isArray(metricsData) && metricsData.length > 0) {
      formattedMetrics = metricsData.map((process) => ({
        processName: process.processName || process.name || 'Unknown Process',
        cpu:
          typeof process.cpu === 'number' ? Number(process.cpu.toFixed(1)) : 0,
        memory: typeof process.memory === 'number' ? process.memory : 0,
      }));
    }
    // Handle object with processes property
    else if (typeof metricsData === 'object' && metricsData !== null) {
      const processes = metricsData.processes || [];
      formattedMetrics = Array.isArray(processes)
        ? processes.map((p) => ({
            processName: p.name || p.processName || 'Unknown',
            cpu: typeof p.cpu === 'number' ? Number(p.cpu.toFixed(1)) : 0,
            memory: typeof p.memory === 'number' ? p.memory : 0,
          }))
        : [];
    }

    // Filter out entries without a process name
    formattedMetrics = formattedMetrics.filter((p) => p.processName);

    // Sort by CPU usage (highest first)
    formattedMetrics.sort((a, b) => b.cpu - a.cpu);

    // Limit to top 15 processes to avoid overwhelming the UI
    formattedMetrics = formattedMetrics.slice(0, 15);

    return formattedMetrics;
  } catch (err) {
    console.error('Error formatting metrics data:', err);
    return [];
  }
};

/**
 * Send metrics data to the server
 * @param {Object} socket - Socket.io client instance
 * @param {string} roomId - Room ID for the interview session
 * @param {Array|Object} metricsData - Raw metrics data from system monitoring
 */
export const sendMetricsToServer = (socket, roomId, metricsData) => {
  if (!socket || !socket.connected) {
    console.error('Cannot send metrics: Socket not connected');
    return;
  }

  if (!roomId) {
    console.error('Cannot send metrics: No room ID provided');
    return;
  }

  try {
    // Format the metrics data before sending
    const formattedMetrics = formatMetricsData(metricsData);

    // Send the formatted metrics to the server with roomId included
    console.log(
      `Sending ${formattedMetrics.length} process metrics to room ${roomId}`
    );
    socket.emit('handle-metrics', {
      roomId: roomId,
      data: formattedMetrics,
    });

    return true;
  } catch (err) {
    console.error('Failed to send metrics to server:', err);
    return false;
  }
};

/**
 * Initialize periodic metrics collection and sending
 * @param {Object} socket - Socket.io client instance
 * @param {string} roomId - Room ID for the interview session
 * @param {Function} metricsProvider - Function that returns metrics data
 * @param {number} interval - Collection interval in milliseconds (default: 10000)
 * @returns {Function} Cleanup function to stop collection
 */
export const initMetricsCollection = (
  socket,
  roomId,
  metricsProvider,
  interval = 10000
) => {
  if (!socket || !metricsProvider || typeof metricsProvider !== 'function') {
    console.error('Cannot initialize metrics collection: Invalid parameters');
    return () => {};
  }

  if (!roomId) {
    console.error('Cannot initialize metrics collection: Missing roomId');
    return () => {};
  }

  console.log(
    `Starting metrics collection for room ${roomId}, interval: ${interval}ms`
  );

  // Send initial metrics
  try {
    console.log(`Collecting initial metrics for room ${roomId}`);
    const initialMetrics = metricsProvider();
    console.log(
      `Initial metrics collected:`,
      Array.isArray(initialMetrics)
        ? `${initialMetrics.length} items`
        : typeof initialMetrics
    );
    const result = sendMetricsToServer(socket, roomId, initialMetrics);
    console.log(`Initial metrics sent successfully: ${result}`);
  } catch (err) {
    console.error('Failed to collect initial metrics:', err);
  }

  // Set up interval for periodic collection
  const intervalId = setInterval(() => {
    try {
      if (socket.connected) {
        console.log(`Collecting metrics for room ${roomId} (interval)`);
        const metrics = metricsProvider();
        const result = sendMetricsToServer(socket, roomId, metrics);
        if (!result) {
          console.warn(`Failed to send metrics for room ${roomId}`);
        }
      } else {
        console.warn(
          `Skipping metrics collection - socket disconnected for room ${roomId}`
        );
      }
    } catch (err) {
      console.error(`Error during metrics collection for room ${roomId}:`, err);
    }
  }, interval);

  // Return cleanup function
  return () => {
    console.log(`Stopping metrics collection for room ${roomId}`);
    clearInterval(intervalId);
  };
};
