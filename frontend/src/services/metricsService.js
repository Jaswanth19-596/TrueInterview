/**
 * Metrics Service
 *
 * This service handles sending system metrics to the server via the API endpoint.
 */
import api from './api';

/**
 * Send process metrics to the server via API
 * @param {string} roomId - The room ID to send metrics for
 * @param {Array|Object} processData - Process data to send to the server
 * @returns {Promise<Object>} - Promise that resolves with the server response
 */
export const sendProcessMetrics = async (roomId, processData) => {
  if (!roomId) {
    console.error('Cannot send metrics: No room ID provided');
    return Promise.reject(new Error('Room ID is required'));
  }

  if (!processData) {
    console.error('Cannot send metrics: No process data provided');
    return Promise.reject(new Error('Process data is required'));
  }

  try {
    console.log(
      `Sending ${
        Array.isArray(processData) ? processData.length : 'object'
      } metrics to API for room ${roomId}`
    );

    // Use the API service to make the POST request
    const response = await api.post(`/send_processes/${roomId}`, processData);

    console.log('Metrics sent successfully to API:', response.status);
    return response.data;
  } catch (error) {
    console.error('Failed to send metrics to API:', error);
    throw error;
  }
};

/**
 * Format process data for sending to the API
 * @param {Array} processes - Array of process objects
 * @returns {Array} - Formatted array of processes
 */
export const formatProcessData = (processes) => {
  if (!Array.isArray(processes)) {
    console.error('Expected processes to be an array');
    return [];
  }

  return processes.map((process) => ({
    processName: process.name || process.processName || 'Unknown Process',
    cpu: typeof process.cpu === 'number' ? Number(process.cpu.toFixed(1)) : 0,
    memory: typeof process.memory === 'number' ? process.memory : 0,
  }));
};
