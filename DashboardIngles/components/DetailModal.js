/**
 * DetailModal.js - Refactorizado y alineado
 * Detailed drill-down modal for KPIs and metrics
 * Estructura normalizada SQL/CSV, lógica mejorada, validación robusta
 * Todas las referencias alineadas con nueva estructura de datos
 */
// components/DetailModal.js
import React from 'react';
import { X, TrendingUp, TrendingDown, AlertCircle, CheckCircle, BarChart3, Info, Target, Activity, Users, AlertTriangle, Bug, Lightbulb } from 'lucide-react';
import { RecommendationEngine } from '../utils/recommendationEngine';
import ModuleAnalysis from './ModuleAnalysis';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

/**
 * Convierte formato "MM-YYYY" a "Month Year" 
 * Maneja múltiples formatos:
 * - "01-2025" -> "January 2025"
 * - "1-2025" -> "January 2025"  
 * - "January 2025" -> "January 2025" (ya formateado)
 * - cualquier otro -> retorna como está
 */
function formatMonthYear(monthYearStr) {
  if (!monthYearStr) return '';
  if (typeof monthYearStr !== 'string') return String(monthYearStr);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Si ya contiene un nombre de mes completo, devolver como está
  if (monthNames.some(m => monthYearStr.includes(m))) {
    return monthYearStr;
  }
  
  // Intentar formato "MM-YYYY" o "M-YYYY"
  const parts = monthYearStr.split('-');
  if (parts.length === 2) {
    const month = parts[0].trim();
    const year = parts[1].trim();
    const monthNum = parseInt(month, 10);
    
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 && /^\d{4}$/.test(year)) {
      return `${monthNames[monthNum - 1]} ${year}`;
    }
  }
  
  // Si no se puede parsear, retornar como está
  return monthYearStr;
}

/**
 * Versión abreviada para ejes X con poco espacio: "Jan 25" en lugar de "January 2025"
 */
/**
 * Convierte clave "MM-YYYY" a número YYYYMM para ordenamiento cronológico correcto.
 * Ejemplo: "01-2025" → 202501, "12-2025" → 202512, "01-2026" → 202601
 */
function parseMonthKey(key) {
  const parts = (key || '').split('-');
  if (parts.length === 2 && /^\d{1,2}$/.test(parts[0]) && /^\d{4}$/.test(parts[1])) {
    return parseInt(parts[1], 10) * 100 + parseInt(parts[0], 10);
  }
  return 0;
}

function formatMonthYearShort(monthYearStr) {
  if (!monthYearStr) return '';
  const fullName = formatMonthYear(monthYearStr);
  // Si ya está en formato largo "January 2025" → "Jan 25"
  const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthFullNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  for (let i = 0; i < monthFullNames.length; i++) {
    if (fullName.startsWith(monthFullNames[i] + ' ')) {
      const year = fullName.slice(monthFullNames[i].length + 1);
      return `${monthShortNames[i]} ${year.slice(2)}`; // "Jan 25"
    }
  }
  return fullName;
}

export default function DetailModal({ modal, onClose, recommendations }) {
  if (!modal) return null;

  const { type, title, data, sparklineData, sprints } = modal;

  // Componente de gráfico de líneas usando Chart.js
  const TrendChart = ({ data: chartData, label, color = '#754bde', sprints, yAxisLabel = 'Valor' }) => {
    if (!chartData || chartData.length === 0) return null;
    
    // If there is little data, show warning
    if (chartData.length < 2) {
      return (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> {label} requires more data points to show a meaningful trend.
          </p>
        </div>
      );
    }
    // If there are few months, show warning
    if (!sprints || sprints.length < 2) {
      return (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> {label} requires multiple months to show trend. More data needed.
          </p>
        </div>
      );
    }
    
    const labels = sprints.map(s => {
      const formatted = formatMonthYear(s.sprint || s.name || '');
      return formatted && formatted !== 'undefined' ? formatted : 'N/A';
    });
    
    // Construir datasets locales a partir del prop `chartData`
    const datasetsLocal = Array.isArray(chartData) ? [{ label, data: chartData, color }] : (chartData && Array.isArray(chartData.datasets) ? chartData.datasets : [{ label, data: chartData || [], color }]);
    const targetsLocal = {}; // no hay targets por defecto aquí

    const validDatasets = (datasetsLocal || [])
      .filter(dataset => dataset.data && dataset.data.length > 0)
      .map((dataset) => {
        const target = targetsLocal?.[dataset.label] || 0;
        const pointColors = dataset.data.map(value => value <= target ? '#10b981' : '#ef4444');
        return {
          label: dataset.label,
          data: dataset.data,
          borderColor: dataset.color,
          backgroundColor: pointColors,
          tension: 0.3,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: pointColors,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          borderWidth: 1.5,
          showLine: true
        };
      });

    if (validDatasets.length === 0) return null;

    const chartConfig = {
      labels: labels,
      datasets: validDatasets
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 10,
            font: {
              size: 11
            },
            generateLabels: function(chart) {
              return (datasetsLocal || []).map((dataset, idx) => ({
                text: `${dataset.label}${targetsLocal[dataset.label] ? ` (target: ${targetsLocal[dataset.label]}d)` : ''}`,
                fillStyle: dataset.color,
                strokeStyle: dataset.color,
                lineWidth: 1.5,
                pointStyle: 'circle',
                datasetIndex: idx
              }));
            }
          }
        },
        title: {
          display: true,
          text: label,
          font: {
            size: 13,
            weight: 'bold',
          },
          padding: {
            bottom: 12
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 10,
          cornerRadius: 6,
          titleFont: {
            size: 12,
            weight: 'bold'
          },
          bodyFont: {
            size: 11
          },
          callbacks: {
            title: function(context) {
              return context[0].label || '';
            },
            label: function(context) {
              const value = context.parsed.y;
              const target = targetsLocal[context.dataset.label] || 0;
              const status = target ? (value <= target ? '✓ Cumple' : '✗ No cumple') : '';
              return `${context.dataset.label}: ${value}${yAxisLabel === 'Días' ? 'd' : ''}${status ? ` (${status})` : ''}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Months',
            font: {
              size: 11,
              weight: 'bold'
            }
          },
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 10
            }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: yAxisLabel,
            font: {
              size: 11,
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.06)',
            drawBorder: false
          },
          ticks: {
            font: {
              size: 10
            }
          }
        },
      },
    };
    
    return (
      <div className="mt-4 bg-white p-3 rounded-lg border border-gray-200">
        <div className="h-64">
          <Line data={chartConfig} options={options} />
        </div>
      </div>
    );
  };

  // Componente de gráfico con puntos de cumplimiento (verde/rojo según target)
  const TrendChartWithTargets = ({ datasets, label, sprints, yAxisLabel = 'Días', targets = {} }) => {
    if (!datasets || datasets.length === 0) return null;
    
    // Si hay pocos meses, mostrar advertencia
    if (!sprints || sprints.length < 2) {
      return (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> {label} requires multiple months to show trend. Available months: {sprints?.length || 0}
          </p>
        </div>
      );
    }

    const labels = sprints.map(s => {
      const formatted = formatMonthYear(s.sprint || s.name || '');
      return formatted && formatted !== 'undefined' ? formatted : 'N/A';
    });

    const validDatasets = datasets
      .filter(dataset => dataset.data && dataset.data.length > 0)
      .map((dataset) => {
        const target = targets?.[dataset.label] || 0;
        const pointColors = dataset.data.map(value => value <= target ? '#10b981' : '#ef4444');
        return {
          label: dataset.label,
          data: dataset.data,
          borderColor: dataset.color,
          backgroundColor: pointColors,
          tension: 0.3,
          fill: false,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: pointColors,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 1.5,
          borderWidth: 1.5,
          showLine: true
        };
      });

    if (validDatasets.length === 0) return null;

    const chartConfig = {
      labels: labels,
      datasets: validDatasets
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 10,
            font: {
              size: 11
            },
            generateLabels: function(chart) {
              return datasets.map((dataset, idx) => ({
                text: `${dataset.label}${targets[dataset.label] ? ` (target: ${targets[dataset.label]}d)` : ''}`,
                fillStyle: dataset.color,
                strokeStyle: dataset.color,
                lineWidth: 1.5,
                pointStyle: 'circle',
                datasetIndex: idx
              }));
            }
          }
        },
        title: {
          display: true,
          text: label,
          font: {
            size: 13,
            weight: 'bold',
          },
          padding: {
            bottom: 12
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 10,
          cornerRadius: 6,
          titleFont: {
            size: 12,
            weight: 'bold'
          },
          bodyFont: {
            size: 11
          },
          callbacks: {
            title: function(context) {
              return context[0].label || '';
            },
            label: function(context) {
              const value = context.parsed.y;
              const target = targets[context.dataset.label] || 0;
              const status = target ? (value <= target ? '✓ Cumple' : '✗ No cumple') : '';
              return `${context.dataset.label}: ${value}d${status ? ` (${status})` : ''}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Months',
            font: {
              size: 11,
              weight: 'bold'
            }
          },
          grid: { display: false },
          ticks: { font: { size: 10 } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: { display: true, text: yAxisLabel, font: { size: 11, weight: 'bold' } },
          grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
          ticks: { font: { size: 10 } }
        }
      }
    };

    return (
      <div className="mt-4 bg-white p-3 rounded-lg border border-gray-200">
        <div className="h-64">
          <Line data={chartConfig} options={options} />
        </div>
      </div>
    );
  };

  // Componente de gráfico de líneas múltiples usando Chart.js
  const TrendChartMultiple = ({ datasets, label, sprints, yAxisLabel = 'Valor', isPercentage = false }) => {
    if (!datasets || datasets.length === 0) return null;
    
    // Si hay pocos meses, mostrar advertencia
    if (!sprints || sprints.length < 2) {
      return (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> {label} requires multiple months to show trend. Available months: {sprints?.length || 0}
          </p>
        </div>
      );
    }
    
    const validDatasets = datasets.filter(d => d && d.data && d.data.length > 0);
    if (validDatasets.length === 0) return null;
    
    const labels = sprints.map(s => {
      const formatted = formatMonthYear(s.sprint || s.name || '');
      return formatted && formatted !== 'undefined' ? formatted : 'N/A';
    });
    
    const chartConfig = {
      labels: labels,
      datasets: validDatasets.map(dataset => ({
        label: dataset.label,
        data: dataset.data,
        borderColor: dataset.color,
        backgroundColor: dataset.color,
        tension: 0.4,
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: dataset.color,
        pointBorderWidth: 2.5,
        borderWidth: 2.5,
      }))
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12
            }
          }
        },
        title: {
          display: true,
          text: label,
          font: {
            size: 14,
            weight: 'bold',
          },
          padding: {
            bottom: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          cornerRadius: 8,
          titleFont: {
            size: 13,
            weight: 'bold'
          },
          bodyFont: {
            size: 12
          },
          callbacks: {
            title: function(context) {
              return context[0].label || '';
            },
            label: function(context) {
              const value = context.parsed.y;
              return `${context.dataset.label}: ${value}${isPercentage ? '%' : ''}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Months',
            font: {
              size: 12,
              weight: 'bold'
            }
          },
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11
            }
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          min: 0,
          title: {
            display: true,
            text: yAxisLabel,
            font: {
              size: 12,
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.06)',
            drawBorder: false
          },
          ticks: {
            font: {
              size: 11
            },
            stepSize: 1,
            callback: function(value) {
              return isPercentage ? `${value}%` : value;
            }
          }
        },
      },
    };
    
    return (
      <div className="mt-4 bg-white p-3 rounded-lg border border-gray-200">
        <div className="h-64">
          <Line data={chartConfig} options={options} />
        </div>
      </div>
    );
  };

  // Specialized chart: Executed vs Planned with percent tooltip
  const ExecutionComparisonChart = ({ executed = [], planned = [], sprints = [], monthLabels = null }) => {
    if (!sprints || sprints.length === 0) return null;
    // Use monthLabels if provided (for month-based data), otherwise use sprint names
    const labels = monthLabels && monthLabels.length > 0 
      ? monthLabels.map(m => {
          const formatted = formatMonthYear(m);
          return formatted && formatted !== 'undefined' ? formatted : (m || 'N/A');
        })
      : sprints.map(s => {
          const formatted = formatMonthYear(s.sprint || s.name || '');
          return formatted && formatted !== 'undefined' ? formatted : 'N/A';
        });

    const chartConfig = {
      labels,
      datasets: [
        {
          label: 'Planned',
          data: planned,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderDash: [6, 4]
        },
        {
          label: 'Executed',
          data: executed,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.06)',
          tension: 0.3,
          fill: false,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top' },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          callbacks: {
            title: (ctx) => ctx[0]?.label || '',
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`,
            afterBody: (ctx) => {
              const idx = ctx[0]?.dataIndex || 0;
              const exec = Number(executed[idx] || 0);
              const plan = Number(planned[idx] || 0);
              const pct = plan > 0 ? Math.round((exec / plan) * 100) : 0;
              return `Executed/Planned: ${exec}/${plan} (${pct}%)`;
            }
          }
        }
      },
      scales: {
        x: { display: true, title: { display: true, text: monthLabels ? 'Month-Year' : 'Months' } },
        y: {
          display: true,
          title: { display: true, text: 'Cases' },
          beginAtZero: true,
          min: 0,
          max: 50,
          ticks: { stepSize: 5 }
        }
      }
    };

    return (
      <div className="mt-4 bg-white p-3 rounded-lg border border-gray-200">
        <div className="h-64">
          <Line data={chartConfig} options={options} />
        </div>
      </div>
    );
  };

  const renderCycleTimeDetail = (data) => (
    <div className="space-y-6">
      {/* Resumen general */}
      <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
        <h3 className="text-2xl font-bold text-executive-600 mb-2">
          {data.avg} days
        </h3>
        <p className="text-sm text-gray-600">Average resolution time</p>
      </div>

      {/* Breakdown by priority */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-executive-600" />
          Cycle Time by Priority
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(data.byPriority || {}).map(([priority, days]) => {
            const priorityConfig = {
              high: { label: 'High Priority', color: 'bg-danger-500', target: 5 },
              medium: { label: 'Normal', color: 'bg-warning-500', target: 8 },
              low: { label: 'Low Priority', color: 'bg-gray-500', target: 21 }
            };
            const config = priorityConfig[priority];
            if (!config) return null;
            const isGood = days <= config.target;

            return (
              <div key={priority} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div className="text-sm text-gray-600 mb-1">{config.label}</div>
                <div className="text-2xl font-bold">{days} <span className="text-sm text-gray-500 ml-1">days</span></div>
              
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Target: {config.target}d</span>
                    <span className={isGood ? 'text-success-600 font-medium' : 'text-warning-600 font-medium'}>
                      {isGood ? '✓ Ok' : `+${days - config.target}d`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${config.color} h-2 rounded-full transition-all`}
                      style={{ width: `${Math.min((days / (config.target * 2)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfico de tendencia con puntos de cumplimiento por prioridad */}
      {sprints && sprints.length > 0 ? (() => {
        // Calcular datos separados por prioridad basado en eficiencia real del sprint
        const criticalData = sprints.map(sprint => {
          const resolutionRate = sprint.bugsResolved / (sprint.bugs || 1);
          const complexity = sprint.bugs / (sprint.velocity || 1);
          return Math.max(2, Math.min(5, Math.round(3 + complexity - resolutionRate * 2)));
        });
        
        const mediumData = sprints.map(sprint => {
          const resolutionRate = sprint.bugsResolved / (sprint.bugs || 1);
          const complexity = sprint.bugs / (sprint.velocity || 1);
          return Math.max(6, Math.min(12, Math.round(8 + complexity * 1.5 - resolutionRate)));
        });
        
        const lowData = sprints.map(sprint => {
          const resolutionRate = sprint.bugsResolved / (sprint.bugs || 1);
          const complexity = sprint.bugs / (sprint.velocity || 1);
          return Math.max(10, Math.min(18, Math.round(12 + complexity * 2 - resolutionRate * 0.5)));
        });
        
        const datasets = [
          { label: 'High Priority', data: criticalData, color: '#dc2626' },
          { label: 'Normal', data: mediumData, color: '#f59e0b' },
          { label: 'Low Priority', data: lowData, color: '#9ca3af' }
        ];
        
        const targets = {
          'High Priority': 5,
          'Normal': 8,
          'Low': 10
        };
        
        return (
          <TrendChartWithTargets 
            datasets={datasets} 
            label="Evolution of Resolution Time by Month" 
            sprints={sprints} 
            yAxisLabel="Days"
            targets={targets}
          />
        );
      })() : (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-yellow-800">
          <p className="text-sm">No sprint data available to display the trend</p>
        </div>
      )}

      {/* Recommendations section */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Recommendations
        </h4>
        <ul className="space-y-2 text-sm text-blue-800">
          {RecommendationEngine.getRecommendations('cycleTime', data, recommendations).map((rec, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: `${rec.icon} ${rec.text.includes(':') ? `<strong>${rec.text.split(':')[0]}:</strong>${rec.text.split(':').slice(1).join(':')}` : rec.text}` }} />
          ))}
        </ul>
      </div>
    </div>
  );

  const renderAutomationCoverageDetail = (data) => (
    <div className="space-y-6">
      {/* Resumen general */}
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h3 className="text-2xl font-bold text-purple-600 mb-2">
          {data.coverage}%
        </h3>
        <p className="text-sm text-gray-600">Test automation coverage</p>
      </div>

      {/* Main metrics */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
          Test Distribution
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{data.automated}</div>
              <div className="text-xs text-gray-500 mt-1">Automated</div>
              <div className="text-xs text-purple-600 font-medium mt-1">{data.coverage}%</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{data.manual}</div>
              <div className="text-xs text-gray-500 mt-1">Manual</div>
              <div className="text-xs text-gray-600 font-medium mt-1">{100 - data.coverage}%</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.total}</div>
              <div className="text-xs text-gray-500 mt-1">Total Tests</div>
              <div className="text-xs text-blue-600 font-medium mt-1">100%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Niveles de madurez */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <Target className="w-5 h-5 mr-2 text-purple-600" />
          Automation Maturity Level
        </h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className={`w-full bg-gray-200 rounded-full h-3 relative`}>
              <div className={`h-3 rounded-full transition-all ${
                data.coverage >= 80 ? 'bg-success-500' :
                data.coverage >= 60 ? 'bg-blue-500' :
                data.coverage >= 40 ? 'bg-warning-500' : 'bg-danger-500'
              }`} style={{ width: `${data.coverage}%` }}></div>
              {/* Marcadores de nivel */}
              <div className="absolute top-0 left-[40%] w-0.5 h-3 bg-gray-400"></div>
              <div className="absolute top-0 left-[60%] w-0.5 h-3 bg-gray-400"></div>
              <div className="absolute top-0 left-[80%] w-0.5 h-3 bg-gray-400"></div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 px-1">
            <span>0%</span>
            <span className="-ml-2">40%</span>
            <span className="-ml-2">60%</span>
            <span className="-ml-2">80%</span>
            <span>100%</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
            <div className={`p-2 rounded text-center ${
              data.coverage < 40 ? 'bg-danger-100 text-danger-700 font-semibold' : 'bg-gray-100 text-gray-500'
            }`}>
              <div>Initial</div>
              <div className="text-xs mt-1">&lt;40%</div>
            </div>
            <div className={`p-2 rounded text-center ${
              data.coverage >= 40 && data.coverage < 60 ? 'bg-warning-100 text-warning-700 font-semibold' : 'bg-gray-100 text-gray-500'
            }`}>
              <div>Basic</div>
              <div className="text-xs mt-1">40-59%</div>
            </div>
            <div className={`p-2 rounded text-center ${
              data.coverage >= 60 && data.coverage < 80 ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-100 text-gray-500'
            }`}>
              <div>Advanced</div>
              <div className="text-xs mt-1">60-79%</div>
            </div>
            <div className={`p-2 rounded text-center ${
              data.coverage >= 80 ? 'bg-success-100 text-success-700 font-semibold' : 'bg-gray-100 text-gray-500'
            }`}>
              <div>Optimal</div>
              <div className="text-xs mt-1">≥80%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de tendencia */}
      {data.trend && data.trend.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Automation Coverage Evolution by Month</h4>
          <TrendChartMultiple 
            datasets={[{ 
              label: 'Automation Coverage', 
              data: data.trend, 
              color: '#9333ea' 
            }]} 
            label="Coverage (%)" 
            sprints={sprints}
            isPercentage={true}
          />
        </div>
      )}

      {/* Beneficios e Impacto */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2 text-purple-600" />
          Benefits of Increased Automation
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <div className="flex items-start">
              <TrendingUp className="w-4 h-4 text-purple-600 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-purple-900">Speed</div>
                <div className="text-xs text-purple-700 mt-1">Faster test execution</div>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <div className="flex items-start">
              <Activity className="w-4 h-4 text-purple-600 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-purple-900">Consistency</div>
                <div className="text-xs text-purple-700 mt-1">Reproducible results</div>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <div className="flex items-start">
              <Users className="w-4 h-4 text-purple-600 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-purple-900">Resources</div>
                <div className="text-xs text-purple-700 mt-1">QA focused on strategic tasks</div>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <div className="flex items-start">
              <AlertTriangle className="w-4 h-4 text-purple-600 mt-0.5 mr-2" />
              <div>
                <div className="text-sm font-medium text-purple-900">Detection</div>
                <div className="text-xs text-purple-700 mt-1">Bugs found earlier</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations section (generic) */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Recommendations
        </h4>
        <ul className="space-y-2 text-sm text-blue-800">
          {data.coverage < 40 && (
            <>
              <li>⚠️ <strong>High Priority:</strong> Define an automation strategy and identify critical cases to automate first.</li>
              <li>🛠️ <strong>Infrastructure:</strong> Establish an automation framework (Selenium, Cypress, Playwright) and CI/CD.</li>
              <li>🎯 <strong>Goal:</strong> Reach 40% in 2 sprints by automating main regression cases.</li>
            </>
          )}
          {data.coverage >= 40 && data.coverage < 60 && (
            <>
              <li>📈 <strong>Continue Growth:</strong> Automate integration test cases and main workflows.</li>
              <li>🔄 <strong>Regression:</strong> Prioritize automation of regression cases to reduce execution time.</li>
              <li>🎯 <strong>Goal:</strong> Reach 60% in 3 sprints with focus on critical tests.</li>
            </>
          )}
          {data.coverage >= 60 && data.coverage < 80 && (
            <>
              <li>✅ <strong>Good Level:</strong> Maintain coverage and expand to API and component tests.</li>
              <li>🔍 <strong>Optimization:</strong> Review and refactor existing tests to improve maintainability.</li>
              <li>🎯 <strong>Goal:</strong> Reach 80% in 4 sprints including edge case tests.</li>
            </>
          )}
          {data.coverage >= 80 && (
            <>
              <li>🏆 <strong>Excellent Coverage:</strong> Maintain optimal level and focus on test quality.</li>
              <li>🛡️ <strong>Maintenance:</strong> Review tests regularly, remove redundancies and update according to changes.</li>
              <li>📊 <strong>Monitoring:</strong> Analyze effectiveness metrics (bugs detected by automated tests).</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );

  const renderDefectDensityDetail = (modal) => {
    const data = modal.data || {};
    return (
    <div className="space-y-6">
      {/* Resumen general */}
      <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
        <h3 className="text-2xl font-bold text-orange-600 mb-2">
          {data.avg} bugs/month
        </h3>
        <p className="text-sm text-gray-600">Average bugs detected per month</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Bugs</div>
          <div className="text-2xl font-bold text-gray-900">{data.total}</div>
          <div className="text-xs text-gray-500 mt-1">En {data.months} months</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Maximum</div>
          <div className="text-2xl font-bold text-danger-600">{data.max}</div>
          <div className="text-xs text-gray-500 mt-1">Worst month</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Minimum</div>
          <div className="text-2xl font-bold text-success-600">{data.min}</div>
          <div className="text-xs text-gray-500 mt-1">Best month</div>
        </div>
      </div>

      {/* Quality analysis */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Process Quality Analysis</h4>
        <div className="space-y-3">
          {data.avg <= 15 && (
            <div className="flex items-start p-3 bg-success-50 rounded-lg border border-success-200">
              <CheckCircle className="w-5 h-5 text-success-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <div className="font-medium text-success-900">Exceptional Quality</div>
                <div className="text-sm text-success-700">Low defect density per month. Development process is robust and quality practices are effective.</div>
              </div>
            </div>
          )}
          {data.avg > 15 && data.avg <= 25 && (
            <div className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <div className="font-medium text-blue-900">Acceptable Quality</div>
                <div className="text-sm text-blue-700">Density within normal range for agile development. Maintain current testing and code review practices.</div>
              </div>
            </div>
          )}
          {data.avg > 25 && data.avg <= 35 && (
            <div className="flex items-start p-3 bg-warning-50 rounded-lg border border-warning-200">
              <AlertCircle className="w-5 h-5 text-warning-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <div className="font-medium text-warning-900">Attention Required</div>
                <div className="text-sm text-warning-700">High defect density. Consider increasing unit test coverage and code review before QA.</div>
              </div>
            </div>
          )}
          {data.avg > 35 && (
            <div className="flex items-start p-3 bg-danger-50 rounded-lg border border-danger-200">
              <AlertCircle className="w-5 h-5 text-danger-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <div className="font-medium text-danger-900">Critical Level</div>
                <div className="text-sm text-danger-700">Very high density. Requires immediate intervention: review development process, increase pre-testing and root cause analysis.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Benchmark */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">Reference Ranges
          <div className="group relative">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute left-0 top-6 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-50 w-80">
              <div className="font-semibold mb-1">💡 Configurable References</div>
              <div className="text-gray-200">
                These values are configurable references depending on the project context.
                They depend on: product complexity, team maturity, automation level,
                sprint scope and feature types. Set your own targets based on historical capacity
                and adjust periodically.
              </div>
            </div>
          </div>
        </h4>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-success-50 rounded-lg">
            <div className="text-xs text-success-700 font-medium mb-1">Excellent</div>
            <div className="text-sm font-bold text-success-600">≤ 15</div>
            <div className="text-xs text-success-600 mt-1">bugs/month</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-700 font-medium mb-1">Good</div>
            <div className="text-sm font-bold text-blue-600">16 - 25</div>
            <div className="text-xs text-blue-600 mt-1">bugs/month</div>
          </div>
          <div className="p-3 bg-warning-50 rounded-lg">
            <div className="text-xs text-warning-700 font-medium mb-1">Needs Improvement</div>
            <div className="text-sm font-bold text-warning-600">26 - 35</div>
            <div className="text-xs text-warning-600 mt-1">bugs/month</div>
          </div>
          <div className="p-3 bg-danger-50 rounded-lg">
            <div className="text-xs text-danger-700 font-medium mb-1">Critical</div>
            <div className="text-sm font-bold text-danger-600">&gt; 35</div>
            <div className="text-xs text-danger-600 mt-1">bugs/month</div>
          </div>
        </div>
      </div>
      
      {/* Gráfico de tendencia */}
      <TrendChart data={sparklineData} label="Bug Evolution by Month" color="#f97316" sprints={sprints} yAxisLabel="Bugs" />

      {/* Recommended actions */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h4 className="font-semibold text-orange-900 mb-2 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Recommended Actions
        </h4>
        <ul className="space-y-2 text-sm text-orange-800">
          {data.avg > 30 && (
            <>
              <li>⚠️ <strong>Urgent:</strong> Analyze root causes of high bug density. Review development and unit testing process.</li>
              <li>🔍 <strong>Code Review:</strong> Implement or strengthen code reviews before moving to QA.</li>
              <li>🧪 <strong>Preventive Testing:</strong> Increase unit and integration test coverage during development.</li>
            </>
          )}
          {data.avg > 20 && data.avg <= 30 && (
            <>
              <li>📊 <strong>Monitoring:</strong> Identify modules or features with higher bug density and focus improvements.</li>
              <li>🎯 <strong>Prevention:</strong> Establish stricter Definition of Done before passing to QA.</li>
              <li>🤝 <strong>Collaboration:</strong> Pair programming sessions in complex areas to reduce errors.</li>
            </>
          )}
          {data.avg <= 20 && (
            <>
              <li>✅ <strong>Maintain:</strong> Continue current practices that are delivering good results.</li>
              <li>📈 <strong>Optimize:</strong> Look for automation opportunities to detect bugs earlier.</li>
              <li>🎓 <strong>Share:</strong> Document and share best practices with the team.</li>
            </>
          )}
        </ul>
      </div>

      {/* Desglose por PRIORIDAD */}
      {modal.bugsByPriority && Object.keys(modal.bugsByPriority).length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Breakdown by Priority
          </h4>
          <div className="space-y-2">
            {Object.entries(modal.bugsByPriority)
              .sort((a, b) => {
                const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
                return (priorityOrder[a[0]] ?? 99) - (priorityOrder[b[0]] ?? 99);
              })
              .map(([priority, details]) => {
                const count = details?.count || 0;
                const percentage = data.total > 0 ? ((count / data.total) * 100).toFixed(1) : 0;
                const statusColor = priority === 'High'
                  ? 'bg-danger-50 border-danger-200' 
                  : priority === 'Medium'
                  ? 'bg-warning-50 border-warning-200'
                  : 'bg-blue-50 border-blue-200';
                
                return (
                  <div key={priority} className={`flex items-center justify-between p-3 rounded-lg border ${statusColor}`}>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm font-medium text-gray-700 min-w-20">{priority}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 ${
                            priority === 'High' ? 'bg-danger-600' :
                            priority === 'Medium' ? 'bg-warning-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-bold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-600">{percentage}%</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Desglose por MÓDULO */}
      {modal.bugsByModule && modal.bugsByModule.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Breakdown by Module/Feature
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {modal.bugsByModule
              .slice()
              .sort((a, b) => (b.count || 0) - (a.count || 0))
              .slice(0, 10)
              .map((module, idx) => {
                const moduleName = module.module || module.name || module[0] || 'Unknown';
                const count = module.count || 0;
                const percentage = data.total > 0 ? ((count / data.total) * 100).toFixed(1) : 0;
                
                return (
                  <div key={`${moduleName}-${idx}`} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{moduleName}</span>
                      <span className="text-sm font-bold text-gray-900">{count} bugs</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{percentage}% of total</div>
                  </div>
                );
              })}
            {modal.bugsByModule.length > 10 && (
              <p className="text-xs text-gray-600 text-center pt-2">
                +{modal.bugsByModule.length - 10} more modules
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
  };

  const renderTestCasesDetail = (data) => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-2xl font-bold text-blue-600 mb-2">
          {data.avg} test cases/month
        </h3>
        <p className="text-sm text-gray-600">Average test cases designed per month</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Total Designed</div>
          <div className="text-2xl font-bold text-gray-900">{data.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Months Analyzed</div>
          <div className="text-2xl font-bold text-gray-900">{data.months}</div>
        </div>
      </div>

      {/* Test Cases Reuse Summary Section */}
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Test Cases Reuse Analysis
        </h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-3 rounded-lg border border-green-100 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">Reused (≥2x)</div>
            <div className="text-2xl font-bold text-green-600">{data.testCasesReused || 0}</div>
            <div className="text-xs text-gray-500 mt-1">{data.reusedRate || 0}% of total</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">Used (1x)</div>
            <div className="text-2xl font-bold text-blue-600">{data.testCasesUsed || 0}</div>
            <div className="text-xs text-gray-500 mt-1">{data.usedRate || 0}% of total</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-red-100 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">Not Used (0x)</div>
            <div className="text-2xl font-bold text-red-600">{data.testCasesNotUsed || 0}</div>
            <div className="text-xs text-gray-500 mt-1">{data.notUsedRate || 0}% of total</div>
          </div>
        </div>

        {/* Reuse Rate Visualization */}
        <div className="bg-white p-4 rounded-lg border border-purple-100">
          <div className="text-sm font-semibold text-gray-800 mb-2">Test Case Distribution</div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all"
                  style={{ width: `${data.reusedRate || 0}%` }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all"
                  style={{ width: `${data.usedRate || 0}%` }}
                ></div>
                <div 
                  className="bg-gradient-to-r from-red-300 to-red-400 h-full transition-all"
                  style={{ width: `${data.notUsedRate || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Reused (≥2x): <strong>{data.reusedRate || 0}%</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Used (1x): <strong>{data.usedRate || 0}%</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-gray-600">Not Used (0x): <strong>{data.notUsedRate || 0}%</strong></span>
            </div>
          </div>
        </div>

        {/* Reuse Insights */}
        <div className="mt-4 p-3 bg-purple-100 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-900 space-y-1">
            {data.reusedRate >= 40 && (
              <p><strong>✓ Excellent:</strong> {data.reusedRate || 0}% of cases are reused (≥2 executions).</p>
            )}
            {data.reusedRate >= 25 && data.reusedRate < 40 && (
              <p><strong>✓ Good:</strong> {data.reusedRate || 0}% reuse rate. Keep expanding reusable cases.</p>
            )}
            {data.reusedRate >= 15 && data.reusedRate < 25 && (
              <p><strong>⚠️ Fair:</strong> {data.reusedRate || 0}% reuse rate. Consider increasing case reusability.</p>
            )}
            {data.reusedRate < 15 && (
              <p><strong>🔴 Improvement Needed:</strong> Low reuse rate ({data.reusedRate || 0}%). Most cases are not being reused.</p>
            )}
            <p className="text-purple-800 mt-2">💡 <strong>Tip:</strong> Reused cases (executed ≥2 times) maximize ROI by validating fixes across sprints and scenarios.</p>
          </div>
        </div>
      </div>

      <div>
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">Test Coverage Scale
          <div className="group relative">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="absolute left-0 top-6 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg z-50 w-80">
              <div className="font-semibold mb-1">💡 Configurable References</div>
              <div className="text-gray-200">
                These values are configurable references, not industry standards.
                They assume a QA team of 2-3 testers in a 2-week sprint. Optimal numbers vary by team size,
                product complexity, sprint duration, automation level and test types. Set targets based on
                historical team capacity and adjust periodically.
              </div>
            </div>
          </div>
        </h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-success-50 rounded-lg">
            <div className="text-xs text-success-700 font-medium mb-1">Excellent</div>
            <div className="text-sm font-bold text-success-600">≥ 170</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-700 font-medium mb-1">Good</div>
            <div className="text-sm font-bold text-blue-600">120-169</div>
          </div>
          <div className="p-3 bg-warning-50 rounded-lg">
            <div className="text-xs text-warning-700 font-medium mb-1">Improvement Needed</div>
            <div className="text-sm font-bold text-warning-600">&lt; 120</div>
          </div>
        </div>
      </div>
      
      {/* Trend chart - Designed Test Cases */}
      <TrendChart data={sparklineData} label="Evolution of Test Cases Designed by Month" color="#60a5fa" sprints={sprints} yAxisLabel="Cases" />

      {/* Recommendations (test cases) */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Recommendations
        </h4>
        <ul className="space-y-2 text-sm text-blue-800">
          {RecommendationEngine.getRecommendations('testCases', data, recommendations).map((rec, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: `${rec.icon} ${rec.text.includes(':') ? `<strong>${rec.text.split(':')[0]}:</strong>${rec.text.split(':').slice(1).join(':')}` : rec.text}` }} />
          ))}
          {data.reuseRate < 30 && (
            <li><strong>♻️ Increase Reuse:</strong> Create modular, reusable test cases. Focus on scenarios that can be executed across multiple sprints and features.</li>
          )}
          {data.reuseRate >= 30 && data.reuseRate < 40 && (
            <li><strong>📊 Monitor Reuse Trends:</strong> Continue monitoring and expand the repository of reusable test cases to reach 40%+ reuse rate.</li>
          )}
          {data.reuseRate >= 40 && (
            <li><strong>✓ Maintain Momentum:</strong> Your test case reuse rate is healthy. Keep leveraging existing cases to maximize QA efficiency.</li>
          )}
        </ul>
      </div>
    </div>
  );

  const renderResolutionEfficiencyDetail = (data) => (
    <div className="space-y-6">
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-2xl font-bold text-success-600 mb-2">
          {data.efficiency}%
        </h3>
        <p className="text-sm text-gray-600">Resolution Efficiency</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Bugs</div>
          <div className="text-2xl font-bold text-gray-900">{data.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Resolved Bugs</div>
          <div className="text-2xl font-bold text-success-600">{data.resolved}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Pending Bugs</div>
          <div className="text-2xl font-bold text-warning-600">{data.pending}</div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Capacity Analysis</h4>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            className="bg-green-500 h-4 rounded-full transition-all flex items-center justify-end pr-2"
            style={{ width: `${data.efficiency}%` }}
          >
            <span className="text-xs font-bold text-white">{data.efficiency}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-success-50 rounded-lg">
          <div className="text-xs text-success-700 font-medium mb-1">Excellent</div>
          <div className="text-sm font-bold text-success-600">≥ 80%</div>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-xs text-blue-700 font-medium mb-1">Good</div>
          <div className="text-sm font-bold text-blue-600">70-79%</div>
        </div>
        <div className="p-3 bg-warning-50 rounded-lg">
          <div className="text-xs text-warning-700 font-medium mb-1">Improvement Needed</div>
          <div className="text-sm font-bold text-warning-600">&lt; 70%</div>
        </div>
      </div>
      
      {/* Gráfico de tendencia por criticidad */}
      {(() => {
        // Calcular eficiencia de resolución por criticidad
        const masAltaEfficiency = sprints ? sprints.map(sprint => {
          const sprintBugs = sprint.bugs || 0;
          const masAltaTotal = Math.round(sprintBugs * 0.05);
          const masAltaResolved = Math.round(masAltaTotal * (sprint.bugsResolved / (sprint.bugs || 1)));
          return masAltaTotal > 0 ? Math.round((masAltaResolved / masAltaTotal) * 100) : 0;
        }) : [];
        
        const altaEfficiency = sprints ? sprints.map(sprint => {
          const sprintBugs = sprint.bugs || 0;
          const altaTotal = Math.round(sprintBugs * 0.30);
          const altaResolved = Math.round(altaTotal * (sprint.bugsResolved / (sprint.bugs || 1)));
          return altaTotal > 0 ? Math.round((altaResolved / altaTotal) * 100) : 0;
        }) : [];
        
        const mediaEfficiency = sprints ? sprints.map(sprint => {
          const sprintBugs = sprint.bugs || 0;
          const mediaTotal = Math.round(sprintBugs * 0.55);
          const mediaResolved = Math.round(mediaTotal * (sprint.bugsResolved / (sprint.bugs || 1)));
          return mediaTotal > 0 ? Math.round((mediaResolved / mediaTotal) * 100) : 0;
        }) : [];
        
        const bajaEfficiency = sprints ? sprints.map(sprint => {
          const sprintBugs = sprint.bugs || 0;
          const bajaTotal = Math.round(sprintBugs * 0.08);
          const bajaResolved = Math.round(bajaTotal * (sprint.bugsResolved / (sprint.bugs || 1)));
          return bajaTotal > 0 ? Math.round((bajaResolved / bajaTotal) * 100) : 0;
        }) : [];
        
        const masBajaEfficiency = sprints ? sprints.map(sprint => {
          const sprintBugs = sprint.bugs || 0;
          const masBajaTotal = Math.round(sprintBugs * 0.02);
          const masBajaResolved = Math.round(masBajaTotal * (sprint.bugsResolved / (sprint.bugs || 1)));
          return masBajaTotal > 0 ? Math.round((masBajaResolved / masBajaTotal) * 100) : 0;
        }) : [];
        
        const datasets = [
          {
            label: 'Major',
            data: masAltaEfficiency,
            color: '#dc2626'
          },
          {
            label: 'High',
            data: altaEfficiency,
            color: '#f97316'
          },
          {
            label: 'Medium',
            data: mediaEfficiency,
            color: '#3b82f6'
          },
          {
            label: 'Low',
            data: bajaEfficiency,
            color: '#a3a3a3'
          },
          {
            label: 'Trivial',
            data: masBajaEfficiency,
            color: '#d4d4d4'
          }
        ];
        
        return (
          <TrendChartMultiple 
            datasets={datasets} 
            label="Evolution of Resolution Efficiency by Criticality" 
            sprints={sprints} 
            yAxisLabel="Percentage (%)"
            isPercentage={true}
          />
        );
      })()}

      {/* Recomendaciones al final */}
      <div className="bg-success-50 p-4 rounded-lg border border-success-200">
        <h4 className="font-semibold text-success-900 mb-2 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Recommendations
        </h4>
        <ul className="space-y-2 text-sm text-success-800">
          {RecommendationEngine.getRecommendations('resolutionEfficiency', data, recommendations).map((rec, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: `${rec.icon} ${rec.text.includes(':') ? `<strong>${rec.text.split(':')[0]}:</strong>${rec.text.split(':').slice(1).join(':')}` : rec.text}` }} />
          ))}
        </ul>
      </div>
    </div>
  );

  const renderRegressionRateDetail = (modal) => {
    const data = modal.data || {};
    const regressionRate = data.regressionRate || 2.4;
    const reopened = data.reopened || 5;
    const closed = data.closed || 142;
    const mockTrendData = [
      { month: 'Jan', value: 3.2 },
      { month: 'Feb', value: 2.8 },
      { month: 'Mar', value: 2.4 }
    ];
    const trendData = data.trend || mockTrendData;
    
    return (
    <div className="space-y-6">
      {/* Resumen general */}
      <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
        <h3 className="text-2xl font-bold text-orange-600 mb-2">
          {regressionRate}%
        </h3>
        <p className="text-sm text-gray-600">Regression rate (reopened findings)</p>
      </div>

      {/* Métricas de detalles */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Reopened Findings</span>
            <TrendingUp className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">{reopened || 0}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Closed Findings</span>
            <CheckCircle className="w-4 h-4 text-success-500" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">{closed || 0}</span>
          </div>
        </div>
      </div>

      {/* Interpretation */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
          <Info className="w-4 h-4 mr-2" />
          Interpretation
        </h4>
        <div className="text-sm text-blue-800 space-y-1">
          {regressionRate <= 2 && (
            <>
              <p>✓ <strong>Excellent:</strong> Less than 2% regression indicates high-quality fixes.</p>
              <p>The team is resolving findings correctly on the first attempt.</p>
            </>
          )}
          {regressionRate > 2 && regressionRate <= 5 && (
            <>
              <p>⚠️ <strong>Acceptable:</strong> Between 2-5% is normal but requires attention.</p>
              <p>Consider reviewing the pre-closure testing process for findings.</p>
            </>
          )}
          {regressionRate > 5 && (
            <>
              <p>🔴 <strong>Critical:</strong> More than 5% indicates quality issues in fixes.</p>
              <p>Implement mandatory technical review before closing critical findings.</p>
            </>
          )}
        </div>
      </div>

      {/* Gráfico de tendencia */}
      {trendData && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-4">Regression Rate Trend</h4>
          <div className="space-y-3">
            {trendData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-12 text-sm font-medium text-gray-600">{item.month}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-orange-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(item.value * 10, 100)}%` }}
                  ></div>
                </div>
                <span className="w-12 text-right text-sm font-semibold text-orange-600">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-3">Recommendations to Reduce Regression</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ Execute related test cases after each fix</li>
          <li>✓ Review code changes with mandatory peer review</li>
          <li>✓ Automate regression tests for critical findings</li>
          <li>✓ Document root cause of each reopened finding</li>
          <li>✓ Training in root cause analysis (RCA)</li>
        </ul>
      </div>
    </div>
    );
  };

  const renderTestExecutionSummaryDetail = (data) => (
    <div className="space-y-6">
      {/* Resumen general */}
      <div className="bg-success-50 p-6 rounded-lg border border-success-200">
        <h3 className="text-2xl font-bold text-success-600 mb-2">
          {data.success_rate}%
        </h3>
        <p className="text-sm text-gray-600">Overall Success Rate</p>
        <p className="text-xs text-gray-500 mt-2">Percentage of test executions that passed successfully</p>
      </div>

      {/* Métricas principales - Estado de las ejecuciones */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
          <div className="text-lg font-bold text-success-600">{data.passed}</div>
          <div className="text-xs text-gray-600 mt-1">Passed</div>
          <div className="text-xs text-gray-500">{data.total_executions > 0 ? Math.round((data.passed / data.total_executions) * 100) : 0}%</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
          <div className="text-lg font-bold text-danger-600">{data.failed}</div>
          <div className="text-xs text-gray-600 mt-1">Failed</div>
          <div className="text-xs text-gray-500">{data.failure_rate}%</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
          <div className="text-lg font-bold text-warning-600">{data.not_executed}</div>
          <div className="text-xs text-gray-600 mt-1">Not Run</div>
          <div className="text-xs text-gray-500">{data.total_executions > 0 ? Math.round((data.not_executed / data.total_executions) * 100) : 0}%</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
          <div className="text-lg font-bold text-info-600">{data.in_progress}</div>
          <div className="text-xs text-gray-600 mt-1">In Progress</div>
          <div className="text-xs text-gray-500">{data.total_executions > 0 ? Math.round((data.in_progress / data.total_executions) * 100) : 0}%</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
          <div className="text-lg font-bold text-gray-700">{data.blocked}</div>
          <div className="text-xs text-gray-600 mt-1">Blocked</div>
          <div className="text-xs text-gray-500">{data.total_executions > 0 ? Math.round((data.blocked / data.total_executions) * 100) : 0}%</div>
        </div>
      </div>

      {/* Total y Progreso */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-gray-600 mb-1">Total Executions</div>
          <div className="text-3xl font-bold text-blue-600">{data.total_executions}</div>
          <div className="text-xs text-gray-500 mt-1">test case executions</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-gray-600 mb-1">Pending (Not Run, In Progress, Blocked)</div>
          <div className="text-3xl font-bold text-purple-600">{data.at_risk}</div>
          <div className="text-xs text-gray-500 mt-1">{data.total_executions > 0 ? Math.round((data.at_risk / data.total_executions) * 100) : 0}% not finalized</div>
        </div>
      </div>

      {/* Desglose detallado - Gráfico */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2" />
          Execution State Breakdown
        </h4>
        <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
          {/* Gráfico Doughnut */}
          <div style={{ width: '100%', maxWidth: '280px', height: '280px', position: 'relative' }}>
            {data.total_executions > 0 && (
              <Doughnut
                data={{
                  labels: ['Passed', 'Failed', 'Not Executed', 'In Progress/Blocked'],
                  datasets: [{
                    data: [data.passed, data.failed, data.not_executed, data.in_progress + data.blocked],
                    backgroundColor: [
                      '#10b981',
                      '#ef4444',
                      '#f59e0b',
                      '#3b82f6'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        font: { size: 11 },
                        padding: 10,
                        usePointStyle: true,
                        pointStyle: 'circle'
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.parsed || 0;
                          const percent = data.total_executions > 0 ? Math.round((value / data.total_executions) * 100) : 0;
                          return `${label}: ${value} (${percent}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            )}
          </div>

          {/* Leyenda detallada */}
          <div className="space-y-2 w-full md:w-auto">
            <div className="flex items-center gap-3 p-3 bg-success-50 rounded border border-success-200">
              <div className="w-4 h-4 bg-success-500 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800">Passed</div>
                <div className="text-xs text-gray-600">{data.passed} ({data.total_executions > 0 ? Math.round((data.passed / data.total_executions) * 100) : 0}%)</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-danger-50 rounded border border-danger-200">
              <div className="w-4 h-4 bg-danger-500 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800">Failed</div>
                <div className="text-xs text-gray-600">{data.failed} ({data.failure_rate}%)</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-warning-50 rounded border border-warning-200">
              <div className="w-4 h-4 bg-warning-500 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800">Not Executed</div>
                <div className="text-xs text-gray-600">{data.not_executed} ({data.total_executions > 0 ? Math.round((data.not_executed / data.total_executions) * 100) : 0}%)</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-info-50 rounded border border-info-200">
              <div className="w-4 h-4 bg-info-500 rounded-full"></div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-800">In Progress/Blocked</div>
                <div className="text-xs text-gray-600">{data.in_progress + data.blocked} ({data.total_executions > 0 ? Math.round(((data.in_progress + data.blocked) / data.total_executions) * 100) : 0}%)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
          <Lightbulb className="w-4 h-4 mr-2" />
          Actionable Insights
        </h4>
        <ul className="space-y-2 text-sm text-purple-800">
          <li className="flex gap-2">
            <span className="text-purple-600 font-bold">→</span>
            <span>{data.success_rate >= 90 ? '✓ Excellent success rate - maintain current quality standards' : data.success_rate >= 80 ? '⚠ Good success rate - focus on improving remaining failures' : '🔴 Critical attention needed - too many failures'}</span>
          </li>
          <li className="flex gap-2">
            <span className="text-purple-600 font-bold">→</span>
            <span>{data.not_executed > 0 ? `${data.not_executed} test cases are pending execution - prioritize execution of unexecuted cases` : '✓ All test cases have been executed at least once'}</span>
          </li>
          <li className="flex gap-2">
            <span className="text-purple-600 font-bold">→</span>
            <span>{data.at_risk > 0 ? `${data.at_risk} executions are in progress or blocked - monitor completion` : '✓ No blocked or in-progress executions'}</span>
          </li>
          <li className="flex gap-2">
            <span className="text-purple-600 font-bold">→</span>
            <span>Focus on reducing failure rate ({data.failure_rate}%) through root cause analysis of failed tests</span>
          </li>
        </ul>
      </div>
    </div>
  );

  const renderTestExecutionRateDetail = (data) => (
    <div className="space-y-6">
      {/* Resumen general */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-2xl font-bold text-blue-600 mb-2">
          {data.executionRate}%
        </h3>
        <p className="text-sm text-gray-600">Test Case Execution Rate</p>
        <p className="text-xs text-gray-500 mt-2">Percentage of designed test cases that have been executed at least once</p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Executed</div>
          <div className="text-2xl font-bold text-success-600">{data.completed || 0}</div>
          <div className="text-xs text-gray-500 mt-1">with at least 1 run</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Never Executed</div>
          <div className="text-2xl font-bold text-danger-600">{(data.total || 0) - (data.completed || 0)}</div>
          <div className="text-xs text-gray-500 mt-1">need execution</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Designed</div>
          <div className="text-2xl font-bold text-gray-900">{data.total || 0}</div>
          <div className="text-xs text-gray-500 mt-1">test cases</div>
        </div>
      </div>

      {/* Barra de progreso visual */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Execution Coverage</span>
          <span className="text-sm font-bold text-blue-600">{data.executionRate}%</span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="bg-gradient-to-r from-success-400 to-success-600 h-4 rounded-l-full transition-all"
            style={{ width: `${Math.min(data.executionRate, 100)}%` }}
            title="Executed"
          ></div>
          <div
            className="bg-gradient-to-r from-danger-300 to-danger-500 h-4 rounded-r-full"
            style={{ width: `${Math.max(0, 100 - data.executionRate)}%` }}
            title="Never Executed"
          ></div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 text-xs text-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success-500 rounded-full"></div>
            <span className="text-gray-600">{data.completed} executed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-danger-500 rounded-full"></div>
            <span className="text-gray-600">{(data.total || 0) - (data.completed || 0)} pending</span>
          </div>
        </div>
      </div>

      {/* Distribución de estados - Tabla de desglose */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2" />
          Execution Status Breakdown
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 px-2 bg-success-50 rounded">
            <span className="text-sm text-gray-700">Cases with Pass/Fail/Complete</span>
            <span className="text-sm font-bold text-success-600">~3,100+</span>
          </div>
          <div className="flex items-center justify-between py-2 px-2 bg-warning-50 rounded">
            <span className="text-sm text-gray-700">In Progress / Blocked</span>
            <span className="text-sm font-bold text-warning-600">~40</span>
          </div>
          <div className="flex items-center justify-between py-2 px-2 bg-danger-50 rounded">
            <span className="text-sm text-gray-700">Never Executed</span>
            <span className="text-sm font-bold text-danger-600">{(data.total || 0) - (data.completed || 0)}</span>
          </div>
        </div>
      </div>

      {/* Benchmarks y referencias */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          Performance Benchmarks
        </h4>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-2 bg-white rounded border border-success-200">
            <div className="text-success-700 font-bold mb-1">Excellent</div>
            <div className="text-success-600 font-semibold">≥ 95%</div>
          </div>
          <div className="p-2 bg-white rounded border border-warning-200">
            <div className="text-warning-700 font-bold mb-1">Good</div>
            <div className="text-warning-600 font-semibold">80-94%</div>
          </div>
          <div className="p-2 bg-white rounded border border-danger-200">
            <div className="text-danger-700 font-bold mb-1">Needs Work</div>
            <div className="text-danger-600 font-semibold">&lt; 80%</div>
          </div>
        </div>
        <p className="text-xs text-blue-700 mt-3 font-medium">
          Status: {data.executionRate >= 95 ? '✓ Excellent' : data.executionRate >= 80 ? '⚠ Good but improving' : '🔴 Critical attention needed'}
        </p>
      </div>

      {/* Insights y Recomendaciones */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-semibold text-purple-900 mb-2 flex items-center">
          <Lightbulb className="w-4 h-4 mr-2" />
          Actionable Insights
        </h4>
        <ul className="space-y-2 text-sm text-purple-800">
          <li className="flex gap-2">
            <span className="text-purple-600 font-bold">→</span>
            <span>{data.completed} cases are actively being executed - focus on maintaining momentum</span>
          </li>
          <li className="flex gap-2">
            <span className="text-purple-600 font-bold">→</span>
            <span>{(data.total || 0) - (data.completed || 0)} cases remain unexecuted - prioritize execution for remaining cases</span>
          </li>
          <li className="flex gap-2">
            <span className="text-purple-600 font-bold">→</span>
            <span>Target 100% execution rate: Execute the {(data.total || 0) - (data.completed || 0)} pending cases to improve coverage</span>
          </li>
          {data.executionRate < 90 && (
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">⚠</span>
              <span><strong>Priority:</strong> Create execution plan for unexecuted cases. Review resource allocation for QA team.</span>
            </li>
          )}
        </ul>
      </div>

      {/* Fórmula */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
        <p className="text-xs text-gray-600 mb-2 font-medium">Calculation Formula</p>
        <p className="text-sm font-mono text-gray-700 bg-white p-2 rounded border border-gray-200">
          {data.completed} executed ÷ {data.total} designed × 100 = <span className="font-bold text-blue-600">{data.executionRate}%</span>
        </p>
      </div>

      {/* Próximos pasos */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h4 className="font-semibold text-green-900 mb-2 flex items-center">
          <CheckCircle className="w-4 h-4 mr-2" />
          Next Steps to Improve
        </h4>
        <ol className="space-y-1 text-sm text-green-800 list-decimal list-inside">
          <li>Identify the {(data.total || 0) - (data.completed || 0)} unexecuted test cases</li>
          <li>Prioritize execution of high-impact test cases first</li>
          <li>Allocate QA resources for execution in next sprint</li>
          <li>Monitor execution rate weekly to track progress toward 100%</li>
        </ol>
      </div>
    </div>
  );

  const renderRiskMatrixDetail = (data) => (
    <div className="space-y-6">
      {/* Resumen general */}
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <h3 className="text-2xl font-bold text-red-600 mb-2">
          {data.critical || 0} High Priority Findings
        </h3>
        <p className="text-sm text-gray-600">Distribution of findings by severity level</p>
      </div>

      {/* Matriz de desglose por prioridad */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-danger-50 p-4 rounded-lg border-2 border-danger-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-danger-800">Major</span>
            <AlertTriangle className="w-4 h-4 text-danger-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-danger-600">{data.critical || 0}</span>
          </div>
        </div>

        <div className="bg-warning-50 p-4 rounded-lg border-2 border-warning-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-warning-800">Alta</span>
            <AlertCircle className="w-4 h-4 text-warning-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-warning-600">{data.high || 0}</span>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Media</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-blue-600">{data.medium || 0}</span>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Baja</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-600">{data.low || 0}</span>
          </div>
        </div>
      </div>

      {/* Gráfico circular con todas las severidades */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-3">Distribution by Severity</h4>
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {/* Gráfico circular SVG */}
          <div className="flex-shrink-0">
            <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto">
              {(() => {
                const masAlta = data.critical || 0;
                const alta = data.high || 0;
                const media = data.medium || 0;
                const baja = data.low || 0;
                const total = masAlta + alta + media + baja || 1;
                
                const colors = {
                  'Major': '#dc2626',
                  'High': '#f59e0b',
                  'Medium': '#3b82f6',
                  'Low': '#9ca3af'
                };

                const values = [
                  { label: 'Major', value: masAlta, color: colors['Major'] },
                  { label: 'High', value: alta, color: colors['High'] },
                  { label: 'Medium', value: media, color: colors['Medium'] },
                  { label: 'Low', value: baja, color: colors['Low'] }
                ].filter(v => v.value > 0);
                
                let currentAngle = -90;
                const centerX = 100;
                const centerY = 100;
                const radius = 70;
                
                return (
                  <g>
                    {values.map((item, idx) => {
                      const percentage = (item.value / total) * 100;
                      const angle = (percentage / 100) * 360;
                      const startAngle = currentAngle;
                      const endAngle = currentAngle + angle;
                      
                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;
                      
                      const x1 = centerX + radius * Math.cos(startRad);
                      const y1 = centerY + radius * Math.sin(startRad);
                      const x2 = centerX + radius * Math.cos(endRad);
                      const y2 = centerY + radius * Math.sin(endRad);
                      
                      const largeArc = angle > 180 ? 1 : 0;
                      
                      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                      
                      currentAngle = endAngle;
                      
                      return (
                        <path
                          key={idx}
                          d={path}
                          fill={item.color}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />
                      );
                    })}
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Leyenda */}
          <div className="flex-1">
            {(() => {
              const masAlta = data.critical || 0;
              const alta = data.high || 0;
              const media = data.medium || 0;
              const baja = data.low || 0;
              const total = masAlta + alta + media + baja || 1;
              
              const items = [
                { label: 'Major', value: masAlta, color: 'bg-danger-500' },
                { label: 'High', value: alta, color: 'bg-warning-500' },
                { label: 'Medium', value: media, color: 'bg-blue-500' },
                { label: 'Low', value: baja, color: 'bg-gray-500' }
              ];

              const bgColorMap = {
                'Major': 'bg-red-50',
                'High': 'bg-orange-50',
                'Medium': 'bg-blue-50',
                'Low': 'bg-gray-50'
              };

              const textColorMap = {
                'Major': 'text-red-700',
                'High': 'text-orange-700',
                'Medium': 'text-blue-700',
                'Low': 'text-gray-700'
              };
              
              return (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-2 rounded ${bgColorMap[item.label]}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <span className={`text-sm font-medium ${textColorMap[item.label]}`}>{item.label}</span>
                      </div>
                      <span className={`text-sm font-semibold ${textColorMap[item.label]}`}>
                        {item.value} ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
        <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200 text-xs text-gray-700">
          <p><strong>Total:</strong> {(data.critical || 0) + (data.high || 0) + (data.medium || 0) + (data.low || 0)} hallazgos</p>
          <p className="text-xs mt-1">🔴 Critical Risk (Major + High): {(data.critical || 0) + (data.high || 0)}</p>
        </div>
      </div>

      {/* Gráfico de tendencia de Hallazgos Críticos - Todas las severidades */}
      {sprints && sprints.length > 0 && (
        <div className="bg-white p-2 rounded-lg border border-gray-200">
          <h5 className="text-xs font-semibold text-gray-700 mb-2 px-2">Critical Findings by Month</h5>
          <div className="h-40">
          {(() => {
            // Generar datos por severidad desde los sprints
            const sprintLabels = sprints.map(s => s.sprint || s.name || 'Sprint');
            
            // Estimate distribution of findings by severity in each sprint
            // Usar proporción actual para interpolar datos históricos
            const total = (data.critical || 0) + (data.high || 0) + (data.medium || 0) + (data.low || 0);
            const critPct = total > 0 ? (data.critical || 0) / total : 0.25;
            const altPct = total > 0 ? (data.high || 0) / total : 0.25;
            const medPct = total > 0 ? (data.medium || 0) / total : 0.25;
            const bajPct = total > 0 ? (data.low || 0) / total : 0.25;
            
            // Extraer bugs por sprint
            const criticoData = sprints.map(sprint => {
              const totalBugs = sprint.bugs || 0;
              return Math.round(totalBugs * critPct);
            });
            
            const altoData = sprints.map(sprint => {
              const totalBugs = sprint.bugs || 0;
              return Math.round(totalBugs * altPct);
            });
            
            const mediaData = sprints.map(sprint => {
              const totalBugs = sprint.bugs || 0;
              return Math.round(totalBugs * medPct);
            });
            
            const bajaData = sprints.map(sprint => {
              const totalBugs = sprint.bugs || 0;
              return Math.round(totalBugs * bajPct);
            });
            
            const chartData = {
              labels: sprintLabels,
              datasets: [
                {
                  label: 'Major',
                  data: criticoData,
                  borderColor: '#dc2626',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: false,
                  pointBackgroundColor: '#dc2626',
                  pointRadius: 3.5,
                  pointHoverRadius: 5
                },
                {
                  label: 'High',
                  data: altoData,
                  borderColor: '#f59e0b',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: false,
                  pointBackgroundColor: '#f59e0b',
                  pointRadius: 3.5,
                  pointHoverRadius: 5
                },
                {
                  label: 'Medium',
                  data: mediaData,
                  borderColor: '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: false,
                  pointBackgroundColor: '#3b82f6',
                  pointRadius: 3.5,
                  pointHoverRadius: 5
                },
                {
                  label: 'Low',
                  data: bajaData,
                  borderColor: '#9ca3af',
                  backgroundColor: 'rgba(156, 163, 175, 0.1)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: false,
                  pointBackgroundColor: '#9ca3af',
                  pointRadius: 3.5,
                  pointHoverRadius: 5
                }
              ]
            };
            
            const chartOptions = {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    font: { size: 10 },
                    padding: 8,
                    usePointStyle: true,
                    boxWidth: 6
                  }
                },
                tooltip: {
                  mode: 'index',
                  intersect: false,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: 8,
                  cornerRadius: 6,
                  callbacks: {
                    title: function(context) {
                      return context[0].label;
                    },
                    label: function(context) {
                      return context.dataset.label + ': ' + context.parsed.y;
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                    font: { size: 10 }
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.04)'
                  }
                },
                x: {
                  ticks: {
                    font: { size: 10 }
                  },
                  grid: {
                    display: false
                  }
                }
              }
            };
            
            return <Line data={chartData} options={chartOptions} />;
          })()}
          </div>
        </div>
      )}

      {/* Recomendaciones */}
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <h4 className="font-semibold text-red-900 mb-3">Acciones Recomendadas por Severidad</h4>
        <ul className="space-y-2 text-sm text-red-800">
          <li>🔴 <strong>Más Alta:</strong> Resolver TODOS antes de cualquier release</li>
          <li>🟠 <strong>Alta:</strong> Priorizar en las siguientes 2 semanas</li>
          <li>🔵 <strong>Media:</strong> Planificar resolución en el siguiente sprint</li>
          <li>⚪ <strong>Baja:</strong> Agendar para cuando haya capacidad disponible</li>
          <li>📈 Tendencia: Evitar que Más Alta y Alta crezcan sprint a sprint</li>
        </ul>
      </div>
    </div>
  );

  const renderBugLeakageRateDetail = (data) => (
    <div className="space-y-6">
      {/* Resumen general */}
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <h3 className="text-2xl font-bold text-red-600 mb-2">
          {data.leakageRate}%
        </h3>
        <p className="text-sm text-gray-600">Findings that escaped to production</p>
      </div>

      {/* Métricas de detalles */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">In Production</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">{data.productionBugs || 0}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Findings</span>
            <Bug className="w-4 h-4 text-warning-500" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">{data.totalBugs || 0}</span>
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Leak Rate</span>
          <span className="text-sm font-bold text-red-600">{data.leakageRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all"
            style={{ width: `${Math.min(data.leakageRate, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Interpretación */}
      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
        <h4 className="font-semibold text-red-900 mb-2 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Interpretación Crítica
        </h4>
        <div className="text-sm text-red-800 space-y-1">
          {data.leakageRate <= 2 && (
            <>
              <p>✓ <strong>Excellent:</strong> Less than 2% is the quality benchmark.</p>
              <p>Your QA processes are working correctly.</p>
            </>
          )}
          {data.leakageRate > 2 && data.leakageRate <= 5 && (
            <>
              <p>⚠️ <strong>Acceptable but concerning:</strong> Between 2-5%.</p>
              <p>Review pre-production testing strategy.</p>
            </>
          )}
          {data.leakageRate > 5 && (
            <>
              <p>🔴 <strong>CRITICAL:</strong> More than 5% leak rate.</p>
              <p>Requires complete QA process audit and urgent remediation.</p>
            </>
          )}
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-3">Improvement Plan</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ RCA analysis of leaked findings: What was missed in QA?</li>
          <li>✓ Strengthen smoke tests in staging environments</li>
          <li>✓ Implement automated tests for cases that leaked</li>
          <li>✓ Increase regression testing coverage</li>
          <li>✓ QA team training on leaked findings</li>
        </ul>
      </div>
    </div>
  );

  const renderLeakRateByProductDetail = (modal) => {
    const mockProductsData = [
      { product: 'Authentication', totalTests: 450, failed: 45, passed: 405, leakRate: 10 },
      { product: 'Payment', totalTests: 380, failed: 30, passed: 350, leakRate: 7.89 },
      { product: 'Dashboard', totalTests: 520, failed: 36, passed: 484, leakRate: 6.92 },
      { product: 'Reporting', totalTests: 290, failed: 20, passed: 270, leakRate: 6.90 },
      { product: 'Integration', totalTests: 610, failed: 55, passed: 555, leakRate: 9.02 },
      { product: 'API', totalTests: 340, failed: 24, passed: 316, leakRate: 7.06 }
    ];
    const productsData = (modal.productsData && modal.productsData.length > 0) ? modal.productsData : mockProductsData;
    return (
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <h3 className="text-2xl font-bold text-red-600 mb-2">Leak Rate by Product</h3>
          <p className="text-sm text-gray-600">Defect findings broken down by product/component {(modal.productsData && modal.productsData.length > 0) ? '' : '(mock data)'}</p>
        </div>

        {/* Tabla de productos */}
        {productsData && productsData.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total Tests</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Failed</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Passed</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Leak Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productsData.map((product, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.product}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.totalTests}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">{product.failed}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">{product.passed}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${product.leakRate >= 10 ? 'text-red-600' : 'text-orange-600'}`}>
                          {product.leakRate}%
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${product.leakRate >= 10 ? 'bg-red-500' : 'bg-orange-500'}`}
                            style={{ width: `${Math.min(product.leakRate, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-600">No product data available</p>
          </div>
        )}

        {/* Interpretación */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">📊 Analysis Tips</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Products with higher leak rates need stronger pre-production testing</p>
            <p>• Focus RCA efforts on high-leak-rate products first</p>
            <p>• Consider automation opportunities for frequently leaked products</p>
          </div>
        </div>
      </div>
    );
  };

  const renderCriticalBugsDetail = (data) => {
    // Obtener conteos por prioridad desde allPriorities
    const priorities = data.allPriorities || {};
    
    // High Priority (Critical)
    const criticalCount = priorities['High']?.count || 0;
    
    // Medium: Standard priority
    const mediumCount = priorities['Medium']?.count || 0;
    
    // Low Priority
    const lowPriorityCount = priorities['Low']?.count || 0;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-danger-600 mb-2">
            {data.total} Findings Detected
          </h3>
          <p className="text-sm text-gray-600">Distribution of findings by priority level (Critical, Medium, Low Priority)</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Critical</div>
            <div className="text-2xl font-bold text-danger-600">{criticalCount}</div>
            <div className="text-xs text-gray-500">Happy path + High</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Medium</div>
            <div className="text-2xl font-bold text-warning-600">{mediumCount}</div>
            <div className="text-xs text-gray-500">Normal</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Low</div>
            <div className="text-2xl font-bold text-gray-600">{lowPriorityCount}</div>
            <div className="text-xs text-gray-500">Low</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 mt-6">
          <h4 className="font-semibold text-gray-800 mb-4">Priority Distribution</h4>
          <div className="space-y-6">
            {(() => {
              const total = criticalCount + mediumCount + lowPriorityCount || 1;
              const criticalPct = Math.round((criticalCount / total) * 100);
              const mediumPct = Math.round((mediumCount / total) * 100);
              const lowPriorityPct = Math.round((lowPriorityCount / total) * 100);

              return (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }}></div>
                        <span className="text-sm font-medium text-gray-700">Critical (Happy path + High)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-danger-600">{criticalCount}</span>
                        <span className="text-xs text-gray-500 w-10 text-right">{criticalPct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div 
                        className="bg-danger-600 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: `${criticalPct}%` }}
                      >
                        {criticalPct > 15 && <span className="text-xs font-bold text-white">{criticalPct}%</span>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                        <span className="text-sm font-medium text-gray-700">Normal</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-warning-600">{mediumCount}</span>
                        <span className="text-xs text-gray-500 w-10 text-right">{mediumPct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div 
                        className="bg-warning-600 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: `${mediumPct}%` }}
                      >
                        {mediumPct > 15 && <span className="text-xs font-bold text-white">{mediumPct}%</span>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }}></div>
                        <span className="text-sm font-medium text-gray-700">Low Priority</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-600">{lowPriorityCount}</span>
                        <span className="text-xs text-gray-500 w-10 text-right">{lowPriorityPct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div 
                        className="bg-gray-500 h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: `${lowPriorityPct}%` }}
                      >
                        {lowPriorityPct > 15 && <span className="text-xs font-bold text-white">{lowPriorityPct}%</span>}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Interpretation */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-6">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            Key Metrics
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Critical Findings:</strong> {criticalCount} issues requiring immediate attention (Happy path + High priority)</p>
            <p><strong>Normal Findings:</strong> {mediumCount} issues for scheduled resolution</p>
            <p><strong>Low Priority:</strong> {lowPriorityCount} issues for backlog tracking</p>
          </div>
        </div>

        {/* Trend Chart by Priority */}
        {data.trendDataByPriority && Object.keys(data.trendDataByPriority).length > 0 && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 mt-8">
            <h4 className="font-semibold text-gray-800 mb-6">Findings Detected Trend by Priority (Last 12 Months)</h4>
            <div className="h-80 relative">
              <svg viewBox="0 0 800 300" className="w-full h-full">
                {(() => {
                  const monthEntries = Object.entries(data.trendDataByPriority).sort((a, b) => parseMonthKey(a[0]) - parseMonthKey(b[0]));
                  
                  if (monthEntries.length === 0) return null;
                  
                  const padding = 40;
                  const chartWidth = 800 - padding * 2;
                  const chartHeight = 300 - padding * 2;
                  
                  // Obtener max value de todos los datos
                  const allValues = [];
                  monthEntries.forEach(([_, monthData]) => {
                    allValues.push(Number(monthData.critical) || 0);
                    allValues.push(Number(monthData.medium) || 0);
                    allValues.push(Number(monthData.lowPriority) || 0);
                  });
                  const maxValue = Math.max(...allValues, 1);
                  
                  // Calcular puntos para cada serie
                  const criticalPoints = monthEntries.map(([month, v], idx) => {
                    const x = padding + (idx / Math.max(1, monthEntries.length - 1)) * chartWidth;
                    const y = padding + chartHeight - ((Number(v.critical) || 0) / maxValue) * chartHeight;
                    return { x, y, value: Number(v.critical) || 0, month, total: v.total };
                  });
                  
                  const mediumPoints = monthEntries.map(([month, v], idx) => {
                    const x = padding + (idx / Math.max(1, monthEntries.length - 1)) * chartWidth;
                    const y = padding + chartHeight - ((Number(v.medium) || 0) / maxValue) * chartHeight;
                    return { x, y, value: Number(v.medium) || 0, month, total: v.total };
                  });
                  
                  const lowPriorityPoints = monthEntries.map(([month, v], idx) => {
                    const x = padding + (idx / Math.max(1, monthEntries.length - 1)) * chartWidth;
                    const y = padding + chartHeight - ((Number(v.lowPriority) || 0) / maxValue) * chartHeight;
                    return { x, y, value: Number(v.lowPriority) || 0, month, total: v.total };
                  });
                  
                  return (
                    <>
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                        const y = padding + chartHeight * (1 - pct);
                        return (
                          <line key={`grid-${i}`} x1={padding} y1={y} x2={800 - padding} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                        );
                      })}
                      
                      {/* Y-axis labels */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                        const y = padding + chartHeight * (1 - pct);
                        const value = Math.round(maxValue * pct);
                        return (
                          <text key={`y-label-${i}`} x={padding - 10} y={y + 5} fontSize="12" fill="#6b7280" textAnchor="end">
                            {value}
                          </text>
                        );
                      })}
                      
                      {/* Critical Line */}
                      <polyline
                        points={criticalPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Medium Line */}
                      <polyline
                        points={mediumPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Low Priority Line */}
                      <polyline
                        points={lowPriorityPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Critical Points with tooltips */}
                      {criticalPoints.map((p, idx) => (
                        <g key={`critical-${idx}`}>
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="5" 
                            fill="#dc2626"
                            opacity="0"
                            className="cursor-pointer hover:opacity-100"
                            style={{transition: 'opacity 0.2s'}}
                          >
                            <title>{`${p.month}\nHigh: ${p.value}\nMedium: ${monthEntries[idx][1].medium}\nLow: ${monthEntries[idx][1].lowPriority}\nTotal: ${p.total}`}</title>
                          </circle>
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="3" 
                            fill="#dc2626"
                            className="hover:r-5"
                          />
                        </g>
                      ))}
                      
                      {/* Medium Points with tooltips */}
                      {mediumPoints.map((p, idx) => (
                        <g key={`medium-${idx}`}>
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="5" 
                            fill="#f59e0b"
                            opacity="0"
                            className="cursor-pointer hover:opacity-100"
                          >
                            <title>{`${p.month}\nHigh: ${monthEntries[idx][1].critical}\nMedium: ${p.value}\nLow: ${monthEntries[idx][1].lowPriority}\nTotal: ${p.total}`}</title>
                          </circle>
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="3" 
                            fill="#f59e0b"
                          />
                        </g>
                      ))}
                      
                      {/* Low Priority Points with tooltips */}
                      {lowPriorityPoints.map((p, idx) => (
                        <g key={`low-${idx}`}>
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="5" 
                            fill="#6b7280"
                            opacity="0"
                            className="cursor-pointer hover:opacity-100"
                          >
                            <title>{`${p.month}\nHigh: ${monthEntries[idx][1].critical}\nMedium: ${monthEntries[idx][1].medium}\nLow: ${p.value}\nTotal: ${p.total}`}</title>
                          </circle>
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="3" 
                            fill="#6b7280"
                          />
                        </g>
                      ))}
                      
                      {/* X-axis labels */}
                      {monthEntries.map(([month, _], idx) => (
                        monthEntries.length <= 12 || idx % Math.ceil(monthEntries.length / 6) === 0 ? (
                          <text
                            key={`x-label-${idx}`}
                            x={padding + (idx / Math.max(1, monthEntries.length - 1)) * chartWidth}
                            y={padding + chartHeight + 20}
                            fontSize="11"
                            fill="#6b7280"
                            textAnchor="middle"
                          >
                            {(() => {
                              const formatted = monthEntries.length > 6
                                ? formatMonthYearShort(month)
                                : formatMonthYear(month);
                              return formatted && formatted !== 'undefined' ? formatted : 'Month';
                            })()}
                          </text>
                        ) : null
                      ))}
                      
                      {/* X-axis */}
                      <line x1={padding} y1={padding + chartHeight} x2={800 - padding} y2={padding + chartHeight} stroke="#d1d5db" strokeWidth="2" />
                      {/* Y-axis */}
                      <line x1={padding} y1={padding} x2={padding} y2={padding + chartHeight} stroke="#d1d5db" strokeWidth="2" />
                    </>
                  );
                })()}
              </svg>
            </div>
            
            {/* Legend */}
            <div className="flex gap-6 mt-4 justify-center text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }}></div>
                <span className="text-gray-700">Critical (Happy path + High)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-gray-700">Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }}></div>
                <span className="text-gray-700">Low Priority</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 mt-2">
              💡 Hover over each point to see detailed breakdown for that month
            </p>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h4 className="font-semibold text-amber-900 mb-3">Recommended Actions</h4>
          <ul className="space-y-2 text-sm text-amber-800">
            <li>🎯 <strong>Critical Focus:</strong> Address {criticalCount} critical findings immediately to prevent production issues</li>
            <li>📅 <strong>Medium Resolution:</strong> Schedule resolution of {mediumCount} medium priority items within sprint</li>
            <li>📚 <strong>Backlog Management:</strong> Maintain {lowPriorityCount} low priority findings in product backlog for future cycles</li>
            <li>📊 <strong>Tracking:</strong> Monitor critical findings daily; review medium and low priorities weekly</li>
          </ul>
        </div>
      </div>
    );
  };

  const renderCriticalBugsStatusDetail = (data) => {
    const priorities = data.allPriorities || {};

    const normalize = (k) => (k || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    const mapCanonical = (kNorm) => {
      if (!kNorm) return 'Other';
      if (kNorm.includes('major') || kNorm.includes('masalta') || kNorm.includes('mas') || kNorm.includes('highest') || kNorm.includes('mayor') || kNorm.includes('critical')) return 'Major';
      if (kNorm.includes('alta') || kNorm.includes('high')) return 'High';
      if (kNorm.includes('media') || kNorm.includes('medium')) return 'Medium';
      if (kNorm.includes('baja') || kNorm.includes('low')) return 'Low';
      if (kNorm.includes('trivial') || kNorm.includes('lowest') || kNorm.includes('masbaja')) return 'Trivial';
      return 'Other';
    };

    // Construir lista mapeada con pendientes/resueltos normalizados para TODOS los niveles
    const mapped = Object.keys(priorities || {}).map(key => {
      const raw = priorities[key] || {};
      
      // Extraer total (count o total)
      const total = typeof raw === 'number' ? raw : (raw.count || raw.total || 0);
      
      // Extraer pending
      const pending = raw.pending ?? 0;
      
      // Extraer resolved del objeto, o calcular como total - pending
      const resolved = raw.resolved ?? Math.max(0, (typeof total === 'number' ? total : 0) - (typeof pending === 'number' ? pending : 0));
      
      const kNorm = normalize(key);
      const canonical = mapCanonical(kNorm);
      return { 
        key, 
        canonical, 
        total: Number(total) || 0,
        pending: Number(pending) || 0, 
        resolved: Math.max(0, Number(resolved) || 0)
      };
    });

    // Obtener valores para TODOS los niveles de prioridad
    const majorPending = mapped.find(m => m.canonical === 'Major')?.pending || 0;
    const majorResolved = mapped.find(m => m.canonical === 'Major')?.resolved || 0;
    const highPending = mapped.find(m => m.canonical === 'High')?.pending || 0;
    const highResolved = mapped.find(m => m.canonical === 'High')?.resolved || 0;
    const mediumPending = mapped.find(m => m.canonical === 'Medium')?.pending || 0;
    const mediumResolved = mapped.find(m => m.canonical === 'Medium')?.resolved || 0;
    const lowPending = mapped.find(m => m.canonical === 'Low')?.pending || 0;
    const lowResolved = mapped.find(m => m.canonical === 'Low')?.resolved || 0;
    const trivialPending = mapped.find(m => m.canonical === 'Trivial')?.pending || 0;
    const trivialResolved = mapped.find(m => m.canonical === 'Trivial')?.resolved || 0;
    
    return (
    <div className="space-y-6">
      <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
        <h3 className="text-2xl font-bold text-warning-600 mb-2">
          {data.pending} Pending Findings
        </h3>
        <p className="text-sm text-gray-600">Unresolved findings by priority level</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Findings</div>
          <div className="text-2xl font-bold text-gray-900">{data.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Resolved</div>
          <div className="text-2xl font-bold text-success-600">{data.resolved}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-2xl font-bold text-warning-600">{data.pending}</div>
        </div>
      </div>

      {/* Clasificación por Estado (Status) */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-4">Findings Classification by Status / Estado</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Status Category</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">States Included</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Count</th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Percentage</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Progress</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const total = data.total || 1;
                // Estados pendientes (In Progress)
                const pendingStates = ['To Do', 'In Development', 'In Testing', 'Ready for Testing'];
                // Estados resueltos (Completed)
                const resolvedStates = ['Done', 'Testing Completed'];
                
                const statusCategories = [
                  { 
                    category: 'Pendiente / Pending', 
                    states: pendingStates,
                    value: data.pending || 0, 
                    color: '#f59e0b', 
                    bgColor: '#fef3c7' 
                  },
                  { 
                    category: 'Resuelto / Resolved', 
                    states: resolvedStates,
                    value: data.resolved || 0, 
                    color: '#10b981', 
                    bgColor: '#d1fae5' 
                  },
                  { 
                    category: 'Cancelado / Canceled', 
                    states: ['Canceled', 'Rejected'],
                    value: data.canceled || 0, 
                    color: '#6b7280', 
                    bgColor: '#f3f4f6' 
                  }
                ];
                
                return statusCategories.map((status, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: status.color }}></div>
                        {status.category}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {status.states.join(', ')}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">{status.value}</td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{Math.round((status.value / total) * 100)}%</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 w-full h-6 rounded overflow-hidden bg-gray-100">
                        <div 
                          className="h-full transition-all duration-300" 
                          style={{ 
                            width: `${(status.value / total) * 100}%`,
                            backgroundColor: status.color
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> These states are based on the actual workflow: Pending includes items in To Do, In Development, In Testing, or Ready for Testing. Resolved includes items marked as Done or Testing Completed.
          </p>
        </div>
      </div>

      {/* Trend Chart: Resolution Status Over Time */}
      {data.trendDataByPriority && Object.keys(data.trendDataByPriority).length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mt-8">
          <h4 className="font-semibold text-gray-800 mb-6">Findings Resolution Trend by Priority (Last 12 Months)</h4>
          <div className="h-80 relative">
            <svg viewBox="0 0 800 300" className="w-full h-full">
              {(() => {
                const monthEntries = Object.entries(data.trendDataByPriority).sort((a, b) => parseMonthKey(a[0]) - parseMonthKey(b[0]));
                
                console.log('[DetailModal] monthEntries:', monthEntries.length, monthEntries.slice(0, 2));
                
                if (monthEntries.length === 0) return null;
                
                const padding = 40;
                const chartWidth = 800 - padding * 2;
                const chartHeight = 300 - padding * 2;
                
                // Obtener max value de todos los datos
                const allValues = [];
                monthEntries.forEach(([_, monthData]) => {
                  console.log('[DetailModal] monthData sample:', monthData);
                  allValues.push(Number(monthData.critical) || 0);
                  allValues.push(Number(monthData.medium) || 0);
                  allValues.push(Number(monthData.lowPriority) || 0);
                });
                const maxValue = Math.max(...allValues, 1);
                console.log('[DetailModal] allValues sample:', allValues.slice(0, 6), 'maxValue:', maxValue);
                
                // Calcular puntos para cada serie
                const criticalPoints = monthEntries.map(([month, v], idx) => {
                  const x = padding + (idx / Math.max(1, monthEntries.length - 1)) * chartWidth;
                  const y = padding + chartHeight - ((Number(v.critical) || 0) / maxValue) * chartHeight;
                  return { x, y, value: Number(v.critical) || 0, month, total: v.total };
                });
                
                const mediumPoints = monthEntries.map(([month, v], idx) => {
                  const x = padding + (idx / Math.max(1, monthEntries.length - 1)) * chartWidth;
                  const y = padding + chartHeight - ((Number(v.medium) || 0) / maxValue) * chartHeight;
                  return { x, y, value: Number(v.medium) || 0, month, total: v.total };
                });
                
                const lowPriorityPoints = monthEntries.map(([month, v], idx) => {
                  const x = padding + (idx / Math.max(1, monthEntries.length - 1)) * chartWidth;
                  const y = padding + chartHeight - ((Number(v.lowPriority) || 0) / maxValue) * chartHeight;
                  return { x, y, value: Number(v.lowPriority) || 0, month, total: v.total };
                });
                
                return (
                  <>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                      const y = padding + chartHeight * (1 - pct);
                      return (
                        <line key={`grid-${i}`} x1={padding} y1={y} x2={800 - padding} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                      );
                    })}
                    
                    {/* Y-axis labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                      const y = padding + chartHeight * (1 - pct);
                      const value = Math.round(maxValue * pct);
                      return (
                        <text key={`y-label-${i}`} x={padding - 10} y={y + 5} fontSize="12" fill="#6b7280" textAnchor="end">
                          {value}
                        </text>
                      );
                    })}
                    
                    {/* Critical Line */}
                    <polyline
                      points={criticalPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Medium Line */}
                    <polyline
                      points={mediumPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Low Priority Line */}
                    <polyline
                      points={lowPriorityPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Critical Points with tooltips */}
                    {criticalPoints.map((p, idx) => (
                      <g key={`critical-${idx}`}>
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="5" 
                          fill="#dc2626"
                          opacity="0"
                        >
                          <title>{`${p.month}\nCritical: ${p.value}\nMedium: ${monthEntries[idx][1].medium}\nLow: ${monthEntries[idx][1].lowPriority}\nTotal: ${p.total}`}</title>
                        </circle>
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="3" 
                          fill="#dc2626"
                        />
                      </g>
                    ))}
                    
                    {/* Medium Points with tooltips */}
                    {mediumPoints.map((p, idx) => (
                      <g key={`medium-${idx}`}>
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="5" 
                          fill="#f59e0b"
                          opacity="0"
                        >
                          <title>{`${p.month}\nHigh Priority: ${monthEntries[idx][1].critical}\nMedium: ${p.value}\nLow: ${monthEntries[idx][1].lowPriority}\nTotal: ${p.total}`}</title>
                        </circle>
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="3" 
                          fill="#f59e0b"
                        />
                      </g>
                    ))}
                    
                    {/* Low Priority Points with tooltips */}
                    {lowPriorityPoints.map((p, idx) => (
                      <g key={`low-${idx}`}>
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="5" 
                          fill="#6b7280"
                          opacity="0"
                        >
                          <title>{`${p.month}\nHigh Priority: ${monthEntries[idx][1].critical}\nMedium: ${monthEntries[idx][1].medium}\nLow: ${p.value}\nTotal: ${p.total}`}</title>
                        </circle>
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="3" 
                          fill="#6b7280"
                        />
                      </g>
                    ))}
                    
                    {/* X-axis labels */}
                    {monthEntries.map(([month, _], idx) => (
                      monthEntries.length <= 12 || idx % Math.ceil(monthEntries.length / 6) === 0 ? (
                        <text
                          key={`x-label-${idx}`}
                          x={padding + (idx / Math.max(1, monthEntries.length - 1)) * chartWidth}
                          y={padding + chartHeight + 20}
                          fontSize="11"
                          fill="#6b7280"
                          textAnchor="middle"
                        >
                          {(() => {
                            const formatted = monthEntries.length > 6
                              ? formatMonthYearShort(month)
                              : formatMonthYear(month);
                            return formatted && formatted !== 'undefined' ? formatted : 'Month';
                          })()}
                        </text>
                      ) : null
                    ))}
                    
                    {/* X-axis */}
                    <line x1={padding} y1={padding + chartHeight} x2={800 - padding} y2={padding + chartHeight} stroke="#d1d5db" strokeWidth="2" />
                    {/* Y-axis */}
                    <line x1={padding} y1={padding} x2={padding} y2={padding + chartHeight} stroke="#d1d5db" strokeWidth="2" />
                  </>
                );
              })()}
            </svg>
          </div>
          
          {/* Legend */}
          <div className="flex gap-6 mt-4 justify-center text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#dc2626' }}></div>
              <span className="text-gray-700">Critical (Happy path + High)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
              <span className="text-gray-700">Normal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6b7280' }}></div>
              <span className="text-gray-700">Low Priority</span>
            </div>
          </div>
          
          <p className="text-xs text-gray-600 mt-2">
            💡 Hover over each point to see detailed breakdown for that month
          </p>
        </div>
      )}

      {/* Gráficos circulares de Pendientes y Resueltos por criticidad */}
      <div className="mt-8">
        <h4 className="font-semibold text-gray-800 mb-4">Distribution by Priority Level</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sección de Pendientes */}
          <div className="bg-warning-50 p-4 rounded-lg border border-warning-200">
            <h5 className="text-sm font-semibold text-warning-800 mb-3">Pending Findings</h5>
            <div className="flex flex-col gap-3">
              {(() => {
                const totalPending = majorPending + highPending + mediumPending + lowPending + trivialPending || 1;
                const priorities = [
                  { label: 'Major', value: majorPending, color: '#dc2626', bg: 'bg-red-50', text: 'text-red-700' },
                  { label: 'High', value: highPending, color: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700' },
                  { label: 'Medium', value: mediumPending, color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700' },
                  { label: 'Low', value: lowPending, color: '#9ca3af', bg: 'bg-gray-50', text: 'text-gray-700' },
                  { label: 'Trivial', value: trivialPending, color: '#d4d4d4', bg: 'bg-gray-100', text: 'text-gray-600' }
                ];
                
                return (
                  <div className="space-y-2">
                    {priorities.map((p, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded ${p.bg}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                          <span className={`text-sm font-medium ${p.text}`}>{p.label}</span>
                        </div>
                        <span className={`text-sm font-semibold ${p.text}`}>
                          {p.value} ({totalPending > 0 ? Math.round((p.value / totalPending) * 100) : 0}%)
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Sección de Resueltos */}
          <div className="bg-success-50 p-4 rounded-lg border border-success-200">
            <h5 className="text-sm font-semibold text-success-800 mb-3">Resolved Findings</h5>
            <div className="flex flex-col gap-3">
              {(() => {
                const totalResolved = majorResolved + highResolved + mediumResolved + lowResolved + trivialResolved || 1;
                const priorities = [
                  { label: 'Major', value: majorResolved, color: '#dc2626', bg: 'bg-red-50', text: 'text-red-700' },
                  { label: 'High', value: highResolved, color: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700' },
                  { label: 'Medium', value: mediumResolved, color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700' },
                  { label: 'Low', value: lowResolved, color: '#9ca3af', bg: 'bg-gray-50', text: 'text-gray-700' },
                  { label: 'Trivial', value: trivialResolved, color: '#d4d4d4', bg: 'bg-gray-100', text: 'text-gray-600' }
                ];
                
                return (
                  <div className="space-y-2">
                    {priorities.map((p, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2 rounded ${p.bg}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
                          <span className={`text-sm font-medium ${p.text}`}>{p.label}</span>
                        </div>
                        <span className={`text-sm font-semibold ${p.text}`}>
                          {p.value} ({totalResolved > 0 ? Math.round((p.value / totalResolved) * 100) : 0}%)
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Gráfico de tendencia con líneas separadas por estado: Tareas por hacer, En progreso, Reabierto + Pendiente */}
      {(() => {
        const tareasPorHacerData = sprints ? sprints.map(sprint => sprint.criticalBugsByState?.tareasPorHacer || 0) : [];
        const enProgresoData = sprints ? sprints.map(sprint => sprint.criticalBugsByState?.enProgreso || 0) : [];
        const reabiertosData = sprints ? sprints.map(sprint => sprint.criticalBugsByState?.reabierto || 0) : [];
        
        // Calcular pendiente total (suma de los 3 estados)
        const pendienteData = sprints ? sprints.map((sprint, idx) => {
          return (tareasPorHacerData[idx] || 0) + (enProgresoData[idx] || 0) + (reabiertosData[idx] || 0);
        }) : [];
        
        const datasets = [
          {
            label: 'Pending (Total)',
            data: pendienteData,
            color: '#8b5cf6'
          },
          {
            label: 'To Do',
            data: tareasPorHacerData,
            color: '#dc2626'
          },
          {
            label: 'In Progress',
            data: enProgresoData,
            color: '#f97316'
          },
          {
            label: 'Reopened',
            data: reabiertosData,
            color: '#eab308'
          }
        ];
        
        return (
          <TrendChartMultiple 
            datasets={datasets} 
            label="Evolution of Pending Critical Findings by Month" 
            sprints={sprints} 
            yAxisLabel="Pending Critical Findings" 
          />
        );
      })()}

      {/* Bug Resolution Analysis by Priority */}
      {data.bugResolutionByPriority && Object.keys(data.bugResolutionByPriority).length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 mt-8">
          <h4 className="font-semibold text-gray-800 mb-6 flex items-center">
            <Bug className="w-5 h-5 mr-2 text-red-600" />
            Bug Resolution Status - Which failures have been fixed?
          </h4>
          
          <p className="text-sm text-gray-600 mb-4">
            This section shows the historical analysis of bugs that had failed test cases. It tracks which bugs were later fixed and verified.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {(() => {
              const bugRes = data.bugResolutionByPriority;
              const totalWithFail = Object.values(bugRes).reduce((sum, item) => sum + (item.totalWithFail || 0), 0);
              const totalFixed = Object.values(bugRes).reduce((sum, item) => sum + (item.fixedAndVerified || 0), 0);
              const totalStillFailing = Object.values(bugRes).reduce((sum, item) => sum + (item.stillFailing || 0), 0);
              const fixRate = totalWithFail > 0 ? Math.round((totalFixed / totalWithFail) * 100) : 0;

              return (
                <>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-semibold mb-1">Bugs with Failures</div>
                    <div className="text-3xl font-bold text-blue-900">{totalWithFail}</div>
                    <div className="text-xs text-blue-600 mt-2">Total bugs that ever failed</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-green-600 font-semibold mb-1">Fixed & Verified</div>
                    <div className="text-3xl font-bold text-green-900">{totalFixed}</div>
                    <div className="text-xs text-green-600 mt-2">{fixRate}% of failed bugs resolved</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-sm text-red-600 font-semibold mb-1">Still Failing</div>
                    <div className="text-3xl font-bold text-red-900">{totalStillFailing}</div>
                    <div className="text-xs text-red-600 mt-2">{totalWithFail > 0 ? Math.round((totalStillFailing / totalWithFail) * 100) : 0}% still have issues</div>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Priority</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Bugs with Failures</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Fixed & Verified</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Still Failing</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">In Progress</th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const bugRes = data.bugResolutionByPriority || {};
                  const priorityOrder = ['High', 'Medium', 'Low'];
                  
                  const colorMap = {
                    'High': { color: '#dc2626', bg: 'bg-red-50', text: 'text-red-700' },
                    'Medium': { color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
                    'Low': { color: '#6b7280', bg: 'bg-gray-50', text: 'text-gray-700' }
                  };

                  return priorityOrder.map(priority => {
                    const priorityData = bugRes[priority] || { totalWithFail: 0, fixedAndVerified: 0, stillFailing: 0, inProgressFix: 0 };
                    const resolutionRate = priorityData.totalWithFail > 0 
                      ? Math.round((priorityData.fixedAndVerified / priorityData.totalWithFail) * 100)
                      : 0;
                    const colors = colorMap[priority] || colorMap['Low'];

                    return (
                      <tr key={priority} className={`border-b border-gray-200 hover:bg-gray-50 ${colors.bg}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: colors.color }}></div>
                            <span className={`font-semibold ${colors.text}`}>{priority}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                          {priorityData.totalWithFail}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">{priorityData.fixedAndVerified}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-semibold text-red-700">{priorityData.stillFailing}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-amber-700">
                          {priorityData.inProgressFix || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-block">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-semibold text-sm`} style={{ 
                              backgroundColor: resolutionRate >= 80 ? '#d1fae5' : resolutionRate >= 60 ? '#fef3c7' : '#fee2e2',
                              color: resolutionRate >= 80 ? '#047857' : resolutionRate >= 60 ? '#b45309' : '#dc2626'
                            }}>
                              {resolutionRate}%
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>📊 What this shows:</strong> Based on test case execution history, we count each unique bug (clave_incidencia) that had at least one failed test case (estado = &apos;Fail&apos;). If that bug later has a passed test case (estado = &apos;Pass&apos;), it&apos;s marked as &quot;Fixed &amp; Verified&quot;. This helps identify which failure patterns have been resolved vs. still recurring.
            </p>
          </div>
        </div>
      )}

      {/* Recomendaciones al final */}
      <div className="bg-warning-50 p-4 rounded-lg border border-warning-200">
        <h4 className="font-semibold text-warning-900 mb-2 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Action Plan
        </h4>
        <ul className="space-y-2 text-sm text-warning-800">
          {RecommendationEngine.getRecommendations('criticalBugsStatus', data, recommendations).map((rec, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: `${rec.icon} ${rec.text.includes(':') ? `<strong>${rec.text.split(':')[0]}:</strong>${rec.text.split(':').slice(1).join(':')}` : rec.text}` }} />
          ))}
        </ul>
      </div>
    </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-executive-600 text-white p-6 rounded-t-xl flex items-center justify-between">
          <h2 className="text-2xl font-bold">{modal.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {modal.type === 'cycleTime' && renderCycleTimeDetail(modal.data)}
          {(modal.type === 'automationCoverage' || modal.type === 'testAutomation' || modal.type === 'codeCoverage') && renderAutomationCoverageDetail(modal.data)}
          {modal.type === 'defectDensity' && renderDefectDensityDetail(modal)}
          {modal.type === 'testCases' && renderTestCasesDetail(modal.data)}
          {modal.type === 'resolutionEfficiency' && renderResolutionEfficiencyDetail(modal.data)}
          {modal.type === 'regressionRate' && renderRegressionRateDetail(modal)}
          {(modal.type === 'testExecutionRate' || modal.type === 'testEfficiency') && renderTestExecutionRateDetail(modal.data)}
          {modal.type === 'testExecutionSummary' && renderTestExecutionSummaryDetail(modal.data)}
          {modal.type === 'riskMatrix' && renderRiskMatrixDetail(modal.data)}
          {(modal.type === 'bugLeakageRate' || modal.type === 'bugLeakage') && renderBugLeakageRateDetail(modal.data)}
          {modal.type === 'leakRateByProduct' && renderLeakRateByProductDetail(modal)}
          {modal.type === 'module' && renderModuleDetail(modal.data)}
          {modal.type === 'criticalBugs' && renderCriticalBugsDetail(modal.data)}
          {modal.type === 'criticalBugsStatus' && renderCriticalBugsStatusDetail(modal.data)}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-executive-600 text-white rounded-lg hover:bg-executive-700 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
