import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    Target, 
    Clock, 
    TrendingUp, 
    Shield, 
    Zap, 
    CheckCircle,
    AlertTriangle,
    BarChart3
  } from 'lucide-react';
import UnderConstructionCard from './UnderConstructionCard';
import KPICard from './KPICard';

  export default function QualityMetrics({ data, visibleKeys, sprintData = [], onOpenDetail,
    sprintListProp, selectedSprintsProp, onSprintToggleProp, showFiltersProp
  }) {
      // Sprint list and selection for filtering
      const sprintList = sprintListProp || sprintData?.map(s => s.sprint || s.name || s.id) || [];
      const [localSelectedSprints, setLocalSelectedSprints] = useState(['Todos']);

      // If parent provides selectedSprints, use it; otherwise fallback to local state
      const selectedSprints = Array.isArray(selectedSprintsProp) ? selectedSprintsProp : localSelectedSprints;

      const handleSprintToggle = (sprint) => {
        if (typeof onSprintToggleProp === 'function') {
          return onSprintToggleProp(sprint);
        }
        if (sprint === 'Todos') return setLocalSelectedSprints(['Todos']);
        setLocalSelectedSprints(prev => {
          if (prev.includes('Todos')) return [sprint];
          if (prev.includes(sprint)) {
            const filtered = prev.filter(s => s !== sprint);
            return filtered.length === 0 ? ['Todos'] : filtered;
          }
          return [...prev, sprint];
        });
      };

      const filteredSprintData = useMemo(() => {
        if (!sprintData || sprintData.length === 0) return sprintData;
        if (selectedSprints.includes('Todos')) return sprintData;
        return sprintData.filter(s => selectedSprints.includes(s.sprint || s.name || s.id));
      }, [sprintData, selectedSprints]);
    // Recompute metrics from provided merged data (kpis + qualityMetrics + summary)

    // Refactor: cálculos alineados con nueva estructura SQL/CSV
    const totalBugs = (filteredSprintData && filteredSprintData.length > 0)
      ? filteredSprintData.reduce((acc, s) => acc + (s.bugs || 0), 0)
      : data?.summary?.totalBugs || 0;

    const testCasesExecuted = (filteredSprintData && filteredSprintData.length > 0)
      ? filteredSprintData.reduce((acc, s) => acc + (s.testCasesExecuted || 0), 0)
      : data?.summary?.testCasesExecuted || 0;

    const testCasesTotal = (filteredSprintData && filteredSprintData.length > 0)
      ? filteredSprintData.reduce((acc, s) => acc + (s.testCasesTotal || 0), 0)
      : data?.summary?.testCasesTotal || 1;

    const defectDensityValue = testCasesExecuted > 0 ? parseFloat((totalBugs / testCasesExecuted).toFixed(2)) : null;
    const testEfficiencyValue = data?.testExecutionRate ?? (testCasesTotal > 0 ? Math.round((testCasesExecuted / testCasesTotal) * 100) : null);
    const bugLeakageValue = data?.bugLeakage ?? data?.bugLeakageRate ?? (data?.productionBugs && totalBugs ? Math.round((data.productionBugs / totalBugs) * 100) : null);
    const testAutomationValue = data?.testAutomation ?? null;
    const codeCoverageValue = data?.codeCoverage ?? data?.testCoverage ?? null;
    const cycleTimeValue = data?.cycleTime ?? data?.averageResolutionTime ?? null;

    const metrics = [
      {
        key: 'defectDensity',
        title: 'Defect Density',
        value: defectDensityValue,
        unit: 'bugs/case',
        icon: <Target className="w-6 h-6" />,
        target: 0.15,
        status: defectDensityValue == null ? 'unknown' : (defectDensityValue <= 0.15 ? 'success' : defectDensityValue <= 0.25 ? 'warning' : 'danger'),
        description: 'Number of bugs per executed test case'
      },
      {
        key: 'testEfficiency',
        title: 'Execution Rate',
        // For now show this KPI as 'In development' (no actual data)
        value: null,
        unit: '%',
        icon: <CheckCircle className="w-6 h-6" />,
        target: 85,
        status: testEfficiencyValue == null ? 'unknown' : (testEfficiencyValue >= 85 ? 'success' : testEfficiencyValue >= 70 ? 'warning' : 'danger'),
        description: 'Percentage of test cases executed vs planned'
      },
      {
        key: 'bugLeakage',
        title: 'Leak Rate',
        value: bugLeakageValue,
        unit: '%',
        icon: <Shield className="w-6 h-6" />,
        target: 5,
        status: bugLeakageValue == null ? 'unknown' : (bugLeakageValue <= 5 ? 'success' : bugLeakageValue <= 10 ? 'warning' : 'danger'),
        description: 'Percentage of bugs that escape to production'
      },
      {
        key: 'testAutomation',
        title: 'Automation',
        // Mark automation as in development UI-wise
        value: null,
        unit: '%',
        icon: <Zap className="w-6 h-6" />,
        target: 60,
        status: testAutomationValue == null ? 'unknown' : (testAutomationValue >= 60 ? 'success' : testAutomationValue >= 40 ? 'warning' : 'danger'),
        description: 'Percentage of automated tests'
      },
      {
        key: 'codeCoverage',
        title: 'Code Coverage',
        value: codeCoverageValue,
        unit: '%',
        icon: <BarChart3 className="w-6 h-6" />,
        target: 80,
        status: codeCoverageValue == null ? 'unknown' : (codeCoverageValue >= 80 ? 'success' : codeCoverageValue >= 65 ? 'warning' : 'danger'),
        description: 'Percentage of code covered by tests'
      },
      {
        key: 'cycleTime',
        title: 'Cycle Time',
        value: cycleTimeValue,
        unit: 'days',
        icon: <Clock className="w-6 h-6" />,
        target: 2,
        status: cycleTimeValue == null ? 'unknown' : (cycleTimeValue <= 2 ? 'success' : cycleTimeValue <= 3 ? 'warning' : 'danger'),
        description: 'Average time from detection to resolution'
      }
    ];
  
    const getStatusColor = (status) => {
      switch (status) {
        case 'success':
          return {
            bg: 'bg-success-50',
            border: 'border-success-200',
            text: 'text-success-600',
            icon: 'text-success-600'
          };
        case 'warning':
          return {
            bg: 'bg-warning-50',
            border: 'border-warning-200',
            text: 'text-warning-600',
            icon: 'text-warning-600'
          };
        case 'danger':
          return {
            bg: 'bg-danger-50',
            border: 'border-danger-200',
            text: 'text-danger-600',
            icon: 'text-danger-600'
          };
        default:
          return {
            bg: 'bg-gray-50',
            border: 'border-gray-200',
            text: 'text-gray-600',
            icon: 'text-gray-600'
          };
      }
    };
  
    const getProgressPercentage = (value, target, isReverse = false) => {
      if (isReverse) {
        // For metrics where lower is better (e.g., defectDensity, bugLeakage, cycleTime)
        return Math.max(0, Math.min(100, ((target / value) * 100)));
      } else {
        // For metrics where higher is better
        return Math.max(0, Math.min(100, (value / target) * 100));
      }
    };
  
    const isReverseMetric = (key) => {
      return ['defectDensity', 'bugLeakage', 'cycleTime'].includes(key);
    };
  
    const metricsToShow = metrics.filter(m => !visibleKeys || visibleKeys.includes(m.key));

    // Tooltip state for metric cards (those with data)
    const [tooltip, setTooltip] = useState({ visible: false, content: null, pos: { top: 0, left: 0 } });

    const showMetricTooltip = (metric, e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const content = helpByKey[metric.key] || (
        <div>
          <div className="font-semibold">What it measures:</div>
          <div className="text-xs">This metric summarizes a key aspect of quality.</div>
          <div className="font-semibold mt-2">Why it&apos;s useful:</div>
          <div className="text-xs">Allows you to prioritize actions and communicate status to business.</div>
        </div>
      );
      setTooltip({ visible: true, content, pos: { top: rect.bottom + 8, left: rect.left + rect.width / 2 } });
    };

    const hideMetricTooltip = () => setTooltip({ visible: false, content: null, pos: { top: 0, left: 0 } });

    // Map help text per metric (non-technical, two short sections)
    const helpByKey = {
      defectDensity: (
        <div>
          <div className="font-semibold">What it measures:</div>
          <div className="text-xs">Average findings per executed test case.</div>
          <div className="font-semibold mt-2">Why it matters:</div>
          <div className="text-xs">Helps identify if product quality is improving or deteriorating between sprints.</div>
        </div>
      ),
      testEfficiency: (
        <div>
          <div className="font-semibold">What it measures:</div>
          <div className="text-xs">Percentage of test cases executed versus planned.</div>
          <div className="font-semibold mt-2">Why it matters:</div>
          <div className="text-xs">Shows if the team is completing planned tests and allows planning adjustments.</div>
        </div>
      ),
      bugLeakage: (
        <div>
          <div className="font-semibold">What it measures:</div>
          <div className="text-xs">Percentage of defects that reach production.</div>
          <div className="font-semibold mt-2">Why it matters:</div>
          <div className="text-xs">Indicates the risk users face and how effective failure prevention is.</div>
        </div>
      ),
      testAutomation: (
        <div>
          <div className="font-semibold">What it measures:</div>
          <div className="text-xs">Percentage of tests that are automated.</div>
          <div className="font-semibold mt-2">Why it matters:</div>
          <div className="text-xs">Accelerates regression execution and frees time for exploratory testing.</div>
        </div>
      ),
      codeCoverage: (
        <div>
          <div className="font-semibold">What it measures:</div>
          <div className="text-xs">Percentage of code covered by automated tests.</div>
          <div className="font-semibold mt-2">Why it matters:</div>
          <div className="text-xs">Helps understand confidence in code changes and areas needing more testing.</div>
        </div>
      ),
      cycleTime: (
        <div>
          <div className="font-semibold">What it measures:</div>
          <div className="text-xs">Average time from finding a defect to resolution.</div>
          <div className="font-semibold mt-2">Why it matters:</div>
          <div className="text-xs">Measures team agility in solving problems and reducing risk exposure time.</div>
        </div>
      )
    };

    // Build sparkline data from filteredSprintData for a given metric key
    function getSparklineData(key) {
      if (!filteredSprintData || filteredSprintData.length === 0) return [];
      try {
        return filteredSprintData.map(s => {
          switch (key) {
            case 'defectDensity': {
              const executed = s.testCasesExecuted || s.testCases || 0;
              const bugs = s.bugs || s.bugsFound || 0;
              return executed > 0 ? parseFloat((bugs / executed).toFixed(2)) : 0;
            }
            case 'testEfficiency': {
              const executed = s.testCasesExecuted || s.testCases || 0;
              const total = s.testCasesTotal || s.testCases || 0;
              return total > 0 ? Math.round((executed / total) * 100) : 0;
            }
            case 'bugLeakage': {
              const prod = s.productionBugs || 0;
              const total = (s.bugs || s.bugsFound || 0) || 1;
              return Math.round((prod / total) * 100);
            }
            case 'testAutomation':
              return s.testAutomation || 0;
            case 'codeCoverage':
              return s.codeCoverage || s.testCoverage || 0;
            case 'cycleTime':
              return s.cycleTime || s.averageResolutionTime || 0;
            default:
              return 0;
          }
        });
      } catch (e) {
        return [];
      }
    }

    // Helper to open detail modal with consistent payload
    const openMetricDetail = (metric) => {
      try {
        console.debug('QualityMetrics: opening detail for', metric.key);
      } catch (e) {
        // ignore in non-browser env
      }
      if (typeof onOpenDetail === 'function') {
        try {
          onOpenDetail({
            type: metric.key,
            title: metric.title,
            data: {
              value: metric.value,
              unit: metric.unit,
              target: metric.target,
              description: metric.description
            },
            sparklineData: getSparklineData(metric.key),
            sprints: filteredSprintData
          });
        } catch (err) {
          console.error('QualityMetrics: error calling onOpenDetail', err);
        }
      } else {
        try {
          console.warn('QualityMetrics: onOpenDetail is not a function');
        } catch (e) {}
      }
    };

    return (
      <div className="space-y-8">
        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metricsToShow.map((metric) => {
            if (metric.value === null || metric.value === undefined) {
              const helpContent = helpByKey[metric.key] || (
                <div>
                  <div className="font-semibold">What it measures:</div>
                  <div className="text-xs">This metric summarizes a key quality aspect.</div>
                  <div className="font-semibold mt-2">Why it matters:</div>
                  <div className="text-xs">Allows prioritizing actions and communicating status to the business.</div>
                </div>
              );

              return (
                  <UnderConstructionCard
                    key={metric.key}
                    title={metric.title}
                    value={'--'}
                    icon={metric.icon}
                    subtitle="Data not available"
                    onClick={() => openMetricDetail(metric)}
                    help={helpContent}
                  />
                );
            }

            const spark = getSparklineData(metric.key) || [];
            const trendValue = spark.length >= 2 ? Math.round(((spark[spark.length-1] - spark[0]) / (Math.abs(spark[0]) || 1)) * 100) : undefined;
            const tooltipContent = helpByKey[metric.key] || (
              <div>
                <div className="font-semibold">What it measures:</div>
                <div className="text-xs">{metric.description}</div>
                <div className="font-semibold mt-2">Why it matters:</div>
                <div className="text-xs">Allows prioritizing actions and communicating status to the business.</div>
              </div>
            );

            return (
              <KPICard
                key={metric.key}
                title={metric.title}
                value={`${metric.value}${metric.unit || ''}`}
                icon={metric.icon}
                trend={trendValue}
                status={metric.status}
                subtitle={metric.description}
                formula={metric.formula}
                tooltip={tooltipContent}
                onClick={() => openMetricDetail(metric)}
                detailData={{ value: metric.value, unit: metric.unit }}
                sparklineData={spark}
              />
            );
          })}
        </div>

        {/* Metric tooltip portal (for cards with data) */}
        {tooltip.visible && createPortal(
          <div
            className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 max-w-xs"
            style={{ top: `${tooltip.pos.top}px`, left: `${tooltip.pos.left}px`, transform: 'translateX(-50%)' }}
          >
            {tooltip.content}
          </div>,
          document.body
        )}
  
        {/* Resumen de calidad general */}
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Overall Quality Index
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Current Status</h4>
              <div className="space-y-3">
                {metricsToShow.map((metric) => (
                  <div key={metric.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{metric.title}</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        metric.status === 'success' ? 'bg-success-500' :
                        metric.status === 'warning' ? 'bg-warning-500' : 'bg-danger-500'
                      }`} />
                      <span className="text-sm font-medium text-gray-900">
                        {metric.value}{metric.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-4">2025 Targets</h4>
              <div className="space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">Q1 2025</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Automation: 45% → 60%</li>
                    <li>• Cycle time: 2.3 → 2.0 days</li>
                    <li>• Code coverage: 68% → 75%</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h5 className="font-medium text-green-800 mb-2">Annual Goal</h5>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Automation: 80%</li>
                    <li>• Bug leakage: &lt; 3%</li>
                    <li>• Test efficiency: &gt; 90%</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
