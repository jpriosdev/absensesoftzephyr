/**
 * SprintTrendChart Component - Refactorizado
 * Visualizes sprint trends: bugs found, resolved, executed cases
 * Estructura normalizada con SQL/CSV, todos los cálculos validados
 * Multi-eje para comparación side-by-side de métricas
 * 
 * @param {Array} data - Array de datos de sprint con {sprint, bugs, bugsResolved, testCases, change, ...}
 */
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/** Chart color scheme constants */
const COLORS = {
  bugsFound: '#ef4444',
  bugsResolved: '#22c55e',
  testCases: '#3b82f6',
};

export default function SprintTrendChart({ data }) {
  const chartData = {
    labels: data.map(item => item.sprint || item.name || `Sprint ${item.id}`),
    datasets: [
      {
        label: 'Bugs Found',
        data: data.map(item => item.bugs),
        borderColor: COLORS.bugsFound,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Bugs Resolved',
        data: data.map(item => item.bugsResolved),
        borderColor: COLORS.bugsResolved,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Test Cases',
        data: data.map(item => item.testCases),
        borderColor: COLORS.testCases,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ],
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
        position: 'top',
      },
      title: {
        display: true,
        text: 'Quality Trend by Sprint',
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          afterLabel: function(context) {
            if (context.datasetIndex === 0) {
              const sprint = data[context.dataIndex];
              return sprint.change !== 0 ? `Cambio: ${sprint.change > 0 ? '+' : ''}${sprint.change}%` : '';
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Sprint'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Número de Bugs'
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Casos de Prueba'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="executive-card" role="region" aria-label="Sprint Quality Trends">
      <div className="chart-container" style={{ minHeight: '400px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
