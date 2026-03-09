// SprintComparison.js - Refactored
// Detailed comparison between sprints: bugs, test cases, velocity, changes
// Normalized SQL/CSV structure, validated calculations, best practices
import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

export default function SprintComparison({ sprintData, selectedSprints }) {
  if (!sprintData || sprintData.length < 2) {
    return null; // Do not render if there is not enough data
  }

  // Refactor: normalize field names with SQL/CSV structure
  const sprints = sprintData.slice(-2);
  const [sprintA, sprintB] = sprints;

  // Function to extract metrics with normalized SQL/CSV names
  const calculateMetric = (sprint, metric) => {
    switch (metric) {
      case 'bugs':
        return sprint.bugs || sprint.bugs_encontrados || sprint.bugsFound || 0;
      case 'bugsResolved':
        return sprint.bugsResolved || sprint.bugs_resueltos || sprint.bugsClosed || 0;
      case 'testCases':
        return sprint.testCases || sprint.casosEjecutados || sprint.casos_ejecutados || sprint.testCasesExecuted || 0;
      case 'resolutionRate':
        const total = sprint.bugs || sprint.bugs_encontrados || 0;
        const resolved = sprint.bugsResolved || sprint.bugs_resueltos || 0;
        return total > 0 ? Math.round((resolved / total) * 100) : 0;
      case 'criticalBugs':
        const priorities = sprint.bugsByPriority || sprint.priorities || sprint.bugs_by_priority || {};
        if (!priorities || Object.keys(priorities).length === 0) return 0;
        const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const keys = Object.keys(priorities);
        // Find keys that explicitly look like critical/high
        const criticalKeys = keys.filter(k => {
          const kn = normalize(k);
          return kn.includes('crit') || kn.includes('highest') || kn.includes('másalta') || kn.includes('masalta') || kn.includes('más alta') || kn.includes('mas alta') || kn === 'alta' || kn.includes('\balta\b');
        });
        if (criticalKeys.length > 0) {
          return criticalKeys.reduce((sum, k) => sum + Number(priorities[k] || 0), 0);
        }
        // Fallback: sum top 1-2 priorities by count
        const sorted = keys.map(k => ({ k, v: Number(priorities[k] || 0) })).sort((a, b) => b.v - a.v);
        const take = sorted.slice(0, Math.min(2, sorted.length));
        return take.reduce((s, it) => s + it.v, 0);
      default:
        return 0;
    }
  };

  const metrics = [
    { key: 'bugs', label: 'Total Bugs', format: val => val, inverse: true },
    { key: 'bugsResolved', label: 'Bugs Resolved', format: val => val, inverse: false },
    { key: 'testCases', label: 'Executed Cases', format: val => val, inverse: false },
    { key: 'resolutionRate', label: 'Resolution Rate', format: val => `${val}%`, inverse: false },
    { key: 'criticalBugs', label: 'Critical Bugs', format: val => val, inverse: true }
  ];

  const ComparisonRow = ({ metric }) => {
    const valueA = calculateMetric(sprintA, metric.key);
    const valueB = calculateMetric(sprintB, metric.key);
    // calculate mean across all available sprints
    const meanValue = Math.round((sprintData.reduce((acc, s) => acc + calculateMetric(s, metric.key), 0) / sprintData.length) * 10) / 10;
    const delta = valueB - valueA;
    const deltaPercent = valueA !== 0 ? Math.round((delta / valueA) * 100) : 0;
    const isPositive = metric.inverse ? delta < 0 : delta > 0;
    const isNeutral = delta === 0;
    const deltaMean = Math.round((valueB - meanValue) * 10) / 10;
    const deltaMeanPercent = meanValue !== 0 ? Math.round((deltaMean / meanValue) * 100) : 0;
    const isPositiveMean = metric.inverse ? deltaMean < 0 : deltaMean > 0;
    const isNeutralMean = deltaMean === 0;

    return (
      <div className="grid grid-cols-6 gap-2 py-2 border-b border-gray-100 last:border-b-0 items-center">
        <div className="font-medium text-gray-700 text-sm">{metric.label}</div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{metric.format(valueA)}</div>
          <div className="text-xs text-gray-500">{sprintA.sprint || sprintA.name}</div>
        </div>

        <div className="flex justify-center">
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{metric.format(valueB)}</div>
          <div className="text-xs text-gray-500">{sprintB.sprint || sprintB.name}</div>
        </div>
        {/* Media column */}
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{metric.format(meanValue)}</div>
            <div className="text-xs text-gray-500">Average</div>
        </div>

        {/* Delta vs Media */}
        <div className="text-center">
          {isNeutralMean ? (
            <div className="flex items-center justify-center text-xs text-gray-500">
              <Minus className="w-4 h-4 text-gray-400" />
              <span className="ml-1">No change</span>
            </div>
          ) : (
            <div className={`flex items-center justify-center ${isPositiveMean ? 'text-success-600' : 'text-danger-600'}`}>
              {isPositiveMean ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <div className="ml-2 text-right">
                <div className="text-sm font-semibold">
                  {deltaMean > 0 ? '+' : ''}{deltaMean}
                </div>
                <div className="text-xs">
                  {deltaMeanPercent > 0 ? '+' : ''}{deltaMeanPercent}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="executive-card">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Sprint-to-Sprint Comparison</h3>
        <p className="text-xs text-gray-600">Comparison between {sprintA.sprint || sprintA.name} and {sprintB.sprint || sprintB.name}</p>
      </div>

        <div className="space-y-0">
        <div className="grid grid-cols-6 gap-2 pb-2 border-b border-executive-200 text-xs font-semibold text-gray-600">
          <div>Metric</div>
          <div className="text-center">Previous Sprint</div>
          <div className="text-center"></div>
          <div className="text-center">Current Sprint</div>
          <div className="text-center">Average</div>
          <div className="text-center">Vs Average</div>
        </div>

        {metrics.map(metric => (
          <ComparisonRow key={metric.key} metric={metric} />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-2 text-sm">Executive Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {(() => {
            const bugsA = calculateMetric(sprintA, 'bugs');
            const bugsB = calculateMetric(sprintB, 'bugs');
            const bugsDelta = bugsB - bugsA;
            
            const resolvedA = calculateMetric(sprintA, 'bugsResolved');
            const resolvedB = calculateMetric(sprintB, 'bugsResolved');
            const resolvedDelta = resolvedB - resolvedA;
            
            const rateA = calculateMetric(sprintA, 'resolutionRate');
            const rateB = calculateMetric(sprintB, 'resolutionRate');
            const rateDelta = rateB - rateA;

            return (
              <>
                {bugsDelta < 0 && (
                  <div className="flex items-start p-2 bg-success-50 rounded-lg border border-success-200">
                    <TrendingUp className="w-4 h-4 text-success-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-success-900 text-sm">Total Bugs Reduction</div>
                      <div className="text-xs text-success-700">Reduced by {Math.abs(bugsDelta)} bugs ({Math.abs(Math.round((bugsDelta / bugsA) * 100))}%)</div>
                    </div>
                  </div>
                )}

                {bugsDelta > 0 && (
                  <div className="flex items-start p-2 bg-warning-50 rounded-lg border border-warning-200">
                    <TrendingDown className="w-4 h-4 text-warning-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-warning-900 text-sm">Increase in Bugs</div>
                      <div className="text-xs text-warning-700">Increased by {bugsDelta} bugs ({Math.round((bugsDelta / bugsA) * 100)}%)</div>
                    </div>
                  </div>
                )}

                {resolvedDelta > 0 && (
                  <div className="flex items-start p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-blue-900 text-sm">Resolution Improvement</div>
                      <div className="text-xs text-blue-700">Resolved {resolvedDelta} more bugs ({Math.round((resolvedDelta / resolvedA) * 100)}%)</div>
                    </div>
                  </div>
                )}

                {rateDelta > 0 && (
                  <div className="flex items-start p-2 bg-success-50 rounded-lg border border-success-200">
                    <TrendingUp className="w-4 h-4 text-success-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-success-900 text-sm">Resolution Rate Improvement</div>
                      <div className="text-xs text-success-700">Efficiency increased by {rateDelta} pp</div>
                    </div>
                  </div>
                )}

                {rateDelta < 0 && (
                  <div className="flex items-start p-2 bg-danger-50 rounded-lg border border-danger-200">
                    <TrendingDown className="w-4 h-4 text-danger-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-danger-900 text-sm">Resolution Rate Reduction</div>
                      <div className="text-xs text-danger-700">Efficiency decreased by {Math.abs(rateDelta)} pp</div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
