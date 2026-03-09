import { User, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function DeveloperAnalysis({ data }) {
  // Guard against empty or undefined data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="executive-card text-center p-8">
        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No hay datos de desarrolladores disponibles</p>
      </div>
    );
  }

  // Refactor: field names aligned with SQL/CSV structure
  const sortedDevelopers = [...data].sort((a, b) => (b.pending || 0) - (a.pending || 0));
  const totalBugs = data.reduce((sum, dev) => sum + (dev.totalBugs || dev.total_bugs || 0), 0);
  const totalPending = data.reduce((sum, dev) => sum + (dev.pending || dev.tareas_pendientes || 0), 0);

  const getWorkloadColor = (workload) => {
    switch (workload) {
      case 'Alto':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medio':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Bajo':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 80) return 'text-green-600';
    if (efficiency >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Resumen del equipo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="executive-card text-center">
          <User className="w-8 h-8 text-executive-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{data.length}</div>
          <div className="text-sm text-gray-600">Desarrolladores Activos</div>
        </div>
        
        <div className="executive-card text-center">
          <AlertCircle className="w-8 h-8 text-warning-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalPending}</div>
          <div className="text-sm text-gray-600">Bugs Pendientes Total</div>
        </div>
        
        <div className="executive-card text-center">
          <TrendingUp className="w-8 h-8 text-success-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(((totalBugs - totalPending) / totalBugs) * 100)}%
          </div>
          <div className="text-sm text-gray-600">Eficiencia General</div>
        </div>
      </div>

      {/* Detailed analysis by developer */}
      <div className="executive-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Detailed Analysis by Developer
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Desarrollador
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Bugs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pendientes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resueltos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eficiencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % del Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedDevelopers.map((developer, index) => {
                const efficiency = developer.totalBugs > 0 
                  ? Math.round((developer.resolved / developer.totalBugs) * 100) 
                  : 0;
                const percentageOfTotal = Math.round((developer.totalBugs / totalBugs) * 100);
                
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-executive-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-executive-600">
                              {developer.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {developer.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold">{developer.totalBugs}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        developer.pending > 15 ? 'text-red-600' :
                        developer.pending > 10 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {developer.pending}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      {developer.resolved}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              efficiency >= 80 ? 'bg-green-500' :
                              efficiency >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${efficiency}%` }}
                          />
                        </div>
                        <span className={`font-semibold ${getEfficiencyColor(efficiency)}`}>
                          {efficiency}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getWorkloadColor(developer.workload)}`}>
                        {developer.workload}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className="w-12 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-executive-500 h-2 rounded-full"
                            style={{ width: `${percentageOfTotal}%` }}
                          />
                        </div>
                        <span className="font-medium">{percentageOfTotal}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations for the team */}
      <div className="executive-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Team Recommendations
        </h3>
        
        <div className="space-y-3">
          {sortedDevelopers[0].pending > 15 && (
            <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  Sobrecarga Crítica Detectada
                </p>
                <p className="text-sm text-red-700">
                  {sortedDevelopers[0].name} tiene {sortedDevelopers[0].pending} bugs pendientes. 
                  Considerar redistribuir carga de trabajo inmediatamente.
                </p>
              </div>
            </div>
          )}
          
          {data.filter(dev => dev.workload === 'Bajo').length > 0 && (
            <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Oportunidad de Balanceo
                </p>
                <p className="text-sm text-blue-700">
                  {data.filter(dev => dev.workload === 'Bajo').length} desarrolladores con carga baja 
                  pueden asumir más responsabilidades.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Eficiencia General del Equipo
              </p>
              <p className="text-sm text-green-700">
                El equipo mantiene una eficiencia del {Math.round(((totalBugs - totalPending) / totalBugs) * 100)}% 
                en resolución de bugs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
