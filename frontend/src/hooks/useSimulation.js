import { useState } from 'react';
import { buildSimulationRequest } from '../utils/schema';

export function useSimulation() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const clearError = () => setError(null);

  const runSimulation = async (nodes, edges, fluidProperties, totalFlow) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestPayload = buildSimulationRequest(nodes, edges, fluidProperties, totalFlow);

      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });
 
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned ${response.status} ${response.statusText}. Is the backend running?`);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Server response is not valid JSON. Check backend logs.');
      }

      if (!response.ok) {
        throw new Error(data?.error || `Simulation failed (HTTP ${response.status}).`);
      }

      setResult(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { runSimulation, loading, result, error, setResult, setError, clearError };
}
