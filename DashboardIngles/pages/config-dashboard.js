import { useState, useEffect } from 'react';
import Link from 'next/link';
import UploadData from '../components/UploadData';

export default function ConfigDashboard() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => {
        setConfig({ weights: {}, thresholds: {}, visibleKpis: {} });
        setLoading(false);
      });
  }, []);

  const saveConfig = async () => {
    try {
      const resp = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (resp.ok) {
        alert('Configuration saved ✅');
        try { window.dispatchEvent(new Event('config:updated')); } catch (e) {}
      } else {
        // Fallback: persist locally if server doesn't accept POST
        try {
          localStorage.setItem('qa-config', JSON.stringify(config));
          alert('Configuration saved locally (server does not allow POST) ✅');
          try { window.dispatchEvent(new Event('config:updated')); } catch (e) {}
        } catch (e) {
          alert('Could not save configuration to server or localStorage');
        }
      }
    } catch (error) {
      // Network error: try localStorage fallback
      try {
        localStorage.setItem('qa-config', JSON.stringify(config));
        alert('Configuration saved locally (network error) ✅');
        try { window.dispatchEvent(new Event('config:updated')); } catch (e) {}
      } catch (e) {
        alert('Error saving configuration ❌');
      }
    }
  };

  if (loading) return <div>Loading configuration...</div>;

  const availableOverviewKpis = [
    { id: 'cobertura', label: 'Test Coverage (Average cases/sprint)' },
    { id: 'densidad', label: 'Finding Density' },
    { id: 'testExecutionRate', label: 'Execution Rate' },
    { id: 'bugLeakage', label: 'Leak Rate' },
    { id: 'bugsCriticos', label: 'Critical Findings' },
    { id: 'criticosPendientes', label: 'Critical Findings Status' },
    { id: 'tiempoSolucion', label: 'Average Resolution Time' },
    { id: 'resolutionEfficiency', label: 'Resolution Efficiency' },
    { id: 'regressionRate', label: 'Regression Rate' },
    { id: 'automatizacion', label: 'Automation Coverage' },
  ];

  const availableQualityKpis = [
    { id: 'defectDensity', label: 'Defect Density' },
    { id: 'testEfficiency', label: 'Test Efficiency' },
    { id: 'bugLeakage', label: 'Leak Rate' },
    { id: 'testAutomation', label: 'Test Automation' },
    { id: 'codeCoverage', label: 'Code Coverage' },
    { id: 'cycleTime', label: 'Cycle Time' },
  ];

  const ensureVisibleStructure = (cfg) => {
    const next = { ...(cfg || {}) };
    if (!next.visibleKpis) next.visibleKpis = { overview: null, quality: null };
    if (!next.visibleKpis.overview) next.visibleKpis.overview = availableOverviewKpis.map(k => k.id);
    if (!next.visibleKpis.quality) next.visibleKpis.quality = availableQualityKpis.map(k => k.id);
    return next;
  };

  const currentConfig = ensureVisibleStructure({ ...config });

  const toggleKpi = (group, id) => {
    setConfig(prev => {
      const next = { ...(prev || {}) };
      next.visibleKpis = { ...(next.visibleKpis || {}) };
      const list = new Set(next.visibleKpis[group] || []);
      if (list.has(id)) list.delete(id); else list.add(id);
      next.visibleKpis[group] = Array.from(list);
      return next;
    });
  };

  const safeSetWeight = (key, value) => {
    setConfig(prev => ({
      ...(prev || {}),
      weights: { ...(prev?.weights || {}), [key]: value }
    }));
  };

  const safeSetThreshold = (key, value) => {
    setConfig(prev => ({
      ...(prev || {}),
      thresholds: { ...(prev?.thresholds || {}), [key]: value }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Small header with back link so navigation is always available */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="inline-flex items-center px-3 py-2 border rounded-lg bg-gray-50 hover:bg-gray-100 text-sm">
              ← Back to Dashboard
            </Link>
            <h2 className="text-sm font-medium text-gray-700">Configuration</h2>
          </div>
        </div>
      </div>
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard Configuration</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">KPI Weights</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Resolution Rate</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={config?.weights?.resolutionRate ?? ''}
                onChange={(e) => safeSetWeight('resolutionRate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Test Coverage</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={config?.weights?.testCoverage ?? ''}
                onChange={(e) => safeSetWeight('testCoverage', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Card Visibility</h2>

          <p className="text-sm text-gray-600 mb-3">Select which cards are displayed in the <strong>Executive Summary</strong> and <strong>Quality Metrics</strong>.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="font-medium mb-2">Executive Summary</h3>
              <div className="space-y-2">
                {availableOverviewKpis.map(k => (
                  <label key={k.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={currentConfig.visibleKpis.overview.includes(k.id)}
                      onChange={() => toggleKpi('overview', k.id)}
                      className="w-4 h-4 text-executive-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{k.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Quality Metrics</h3>
              <div className="space-y-2">
                {availableQualityKpis.map(k => (
                  <label key={k.id} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={currentConfig.visibleKpis.quality.includes(k.id)}
                      onChange={() => toggleKpi('quality', k.id)}
                      className="w-4 h-4 text-executive-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{k.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Alert Thresholds</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Maximum Critical Bugs</label>
              <input
                type="number"
                value={config?.thresholds?.criticalBugsAlert ?? ''}
                onChange={(e) => safeSetThreshold('criticalBugsAlert', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Minimum Coverage (%)</label>
              <input
                type="number"
                value={config?.thresholds?.minTestCoverage ?? ''}
                onChange={(e) => safeSetThreshold('minTestCoverage', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <UploadData />
          
          <button
            onClick={saveConfig}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Configuration
          </button>

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
