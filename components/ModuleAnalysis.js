import { Package, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

/**
 * ModuleAnalysis Component - Refactorizado
 * Detailed analysis of bugs, efficiency and risk by system modules.
 * Alineado con nueva estructura SQL/CSV, validación segura de datos.
 */
export default function ModuleAnalysis({ data }) {
  // Validación robusta de datos
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return (
      <div className="executive-card text-center p-8">
        <p className="text-gray-600">No hay datos de módulos disponibles</p>
      </div>
    );
  }

  // Normalize module data with SQL/CSV names
  const modules = Object.entries(data).map(([name, moduleData]) => ({
    name,
    ...moduleData,
    total: moduleData.total || moduleData.bugs_total || moduleData.defectos_total || 0,
    pending: moduleData.pending || moduleData.bugs_pendientes || moduleData.defectos_pendientes || 0,
    resolved: moduleData.resolved || moduleData.bugs_resueltos || moduleData.defectos_cerrados || 0,
    percentage: moduleData.percentage || 0
  }));

  // Evitar división por cero
  const totalBugs = modules.reduce((sum, module) => sum + (module.total || 0), 0) || 1;

  const getModuleRiskLevel = (percentage) => {
    if (percentage >= 60) return { level: 'Alto', color: 'red', icon: AlertTriangle };
    if (percentage >= 40) return { level: 'Medio', color: 'yellow', icon: AlertTriangle };
    return { level: 'Bajo', color: 'green', icon: CheckCircle };
  };

  return (
    <div className="executive-card">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Analysis by System Modules
      </h3>
      
      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {modules.map((module) => {
          const risk = getModuleRiskLevel(module.percentage);
          const RiskIcon = risk.icon;
          const resolutionRate = module.total > 0 ? Math.round((module.resolved / module.total) * 100) : 0;
          
          return (
            <div key={module.name} className="p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-executive-600" />
                  <span className="font-semibold text-gray-900">{module.name}</span>
                </div>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                  risk.color === 'red' ? 'bg-red-100 text-red-800' :
                  risk.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  <RiskIcon className="w-3 h-3 mr-1" />
                  {risk.level}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total de Bugs:</span>
                  <span className="font-semibold text-gray-900">{module.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pendientes:</span>
                  <span className="font-semibold text-red-600">{module.pending}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Resueltos:</span>
                  <span className="font-semibold text-green-600">{module.resolved}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">% del Total:</span>
                  <span className="font-semibold text-executive-600">{module.percentage}%</span>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Tasa de Resolución</span>
                  <span>{resolutionRate}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      resolutionRate >= 80 ? 'bg-green-500' :
                      resolutionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${resolutionRate}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico de distribución */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">
          Distribución de Bugs por Módulo
        </h4>
        <div className="space-y-3">
          {modules.map((module) => (
            <div key={module.name} className="flex items-center">
              <span className="w-16 text-sm font-medium text-gray-600">
                {module.name}:
              </span>
              <div className="flex-1 mx-4">
                <div className="bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-6 rounded-full transition-all duration-1000 ease-out ${
                      module.percentage >= 60 ? 'bg-red-500' :
                      module.percentage >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${module.percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                    {module.total} bugs
                  </div>
                </div>
              </div>
              <span className="w-16 text-sm font-medium text-gray-900 text-right">
                {module.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis and Recommendations */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2" />
          Analysis and Recommendations
        </h4>
        
        <div className="space-y-3">
          {modules.find(m => m.percentage >= 60) && (
            <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Critical Module Identified</p>
                <p className="text-sm text-red-700">
                  The module {modules.find(m => m.percentage >= 60)?.name} concentrates{' '}
                  {modules.find(m => m.percentage >= 60)?.percentage}% of the bugs.{' '}
                  <strong>Recommended action:</strong> Plan immediate refactoring.
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Package className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Distribución de Esfuerzo</p>
              <p className="text-sm text-blue-700">
                Concentrar esfuerzos de QA en los módulos con mayor incidencia de bugs para 
                optimizar el tiempo de testing y mejorar la eficiencia general.
              </p>
            </div>
          </div>
          
          {modules.some(m => m.total > 0 && (m.resolved / m.total) >= 0.8) && (
            <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Módulos con Buen Rendimiento</p>
                <p className="text-sm text-green-700">
                  {modules.filter(m => m.total > 0 && (m.resolved / m.total) >= 0.8).map(m => m.name).join(', ')}{' '}
                  muestran tasas de resolución superiores al 80%. Aplicar sus mejores prácticas a otros módulos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
