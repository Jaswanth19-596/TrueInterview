// /**
//  * System Metrics Collector Utility
//  *
//  * This utility handles collection and formatting of system metrics
//  * for the interview platform. It standardizes the metrics format
//  * before sending to the server.
//  */

// /**
//  * Format metrics data to ensure consistent format for display
//  * @param {Object} metricsData - Raw metrics data from system monitoring
//  * @returns {Array} Formatted metrics data
//  */
// export const formatMetricsData = (metricsData) => {
//   try {
//     if (typeof metricsData === 'object' && metricsData !== null) {
//       return Object.entries(metricsData).map(([appName, isRunning]) => ({
//         processName: appName,
//         isRunning: isRunning,
//       }));
//     }
//     return [];
//   } catch (err) {
//     console.error('Error formatting metrics data:', err);
//     return [];
//   }
// };

// /**
//  * Send metrics data to the server
//  * @param {Object} socket - Socket.io client instance
//  * @param {string} roomId - Room ID for the interview session
//  * @param {Array|Object} metricsData - Raw metrics data from system monitoring
//  */
// export const sendMetricsToServer = (socket, roomId, metricsData) => {
//   if (!socket || !socket.connected) {
//     console.error('Cannot send metrics: Socket not connected');
//     return;
//   }

//   if (!roomId) {
//     console.error('Cannot send metrics: No room ID provided');
//     return;
//   }

//   try {
//     // Format the metrics data before sending
//     const formattedMetrics = formatMetricsData(metricsData);

//     // Send the formatted metrics to the server with roomId included

//     socket.emit('handle-metrics', {
//       roomId: roomId,
//       data: formattedMetrics,
//     });

//     return true;
//   } catch (err) {
//     console.error('Failed to send metrics to server:', err);
//     return false;
//   }
// };

// /**
//  * Initialize periodic metrics collection and sending
//  * @param {Object} socket - Socket.io client instance
//  * @param {string} roomId - Room ID for the interview session
//  * @param {Function} metricsProvider - Function that returns metrics data
//  * @param {number} interval - Collection interval in milliseconds (default: 10000)
//  * @returns {Function} Cleanup function to stop collection
//  */
// export const initMetricsCollection = (
//   socket,
//   roomId,
//   metricsProvider,
//   interval = 10000
// ) => {
//   if (!socket || !metricsProvider || typeof metricsProvider !== 'function') {
//     console.error('Cannot initialize metrics collection: Invalid parameters');
//     return () => {};
//   }

//   if (!roomId) {
//     console.error('Cannot initialize metrics collection: Missing roomId');
//     return () => {};
//   }

//   // Send initial metrics
//   try {
//     const initialMetrics = metricsProvider();
//     const result = sendMetricsToServer(socket, roomId, initialMetrics);
//   } catch (err) {
//     console.error('Failed to collect initial metrics:', err);
//   }

//   // Set up interval for periodic collection
//   const intervalId = setInterval(() => {
//     try {
//       if (socket.connected) {
//         const metrics = metricsProvider();
//         const result = sendMetricsToServer(socket, roomId, metrics);
//         if (!result) {
//           console.warn(`Failed to send metrics for room ${roomId}`);
//         }
//       } else {
//         console.warn(
//           `Skipping metrics collection - socket disconnected for room ${roomId}`
//         );
//       }
//     } catch (err) {
//       console.error(`Error during metrics collection for room ${roomId}:`, err);
//     }
//   }, interval);

//   // Return cleanup function
//   return () => {
//     clearInterval(intervalId);
//   };
// };
