/**
 * ExecutiveRecommendations Component - Refactorizado
 * Generates executive-level recommendations based on KPIs and trends
 * Estructura normalizada SQL/CSV, lógica validada y robusta
 */
import { 
    Clock, 
    AlertTriangle, 
    TrendingUp, 
    CheckCircle, 
    Target,
    Users,
    Zap,
    Calendar,
    ArrowRight
  } from 'lucide-react';
  
  export default function ExecutiveRecommendations({ data }) {
    const displayType = {
      'Inmediata': 'Immediate',
      'Corto Plazo': 'Short Term',
      'Mediano Plazo': 'Mid Term'
    };
    const getRecommendationIcon = (type) => {
      switch (type) {
        case 'Inmediata':
          return <AlertTriangle className="w-5 h-5 text-red-500" />;
        case 'Corto Plazo':
          return <Clock className="w-5 h-5 text-yellow-500" />;
        case 'Mediano Plazo':
          return <Calendar className="w-5 h-5 text-blue-500" />;
        default:
          return <Target className="w-5 h-5 text-gray-500" />;
      }
    };
  
    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'Crítica':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'Alta':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'Media':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'Baja':
          return 'bg-green-100 text-green-800 border-green-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };
  
    const getEffortColor = (effort) => {
      switch (effort) {
        case 'Alto':
          return 'text-red-600';
        case 'Medio':
          return 'text-yellow-600';
        case 'Bajo':
          return 'text-green-600';
        default:
          return 'text-gray-600';
      }
    };
  
    const getImpactColor = (impact) => {
      switch (impact) {
        case 'Crítico':
          return 'text-red-600 bg-red-50 border-red-200';
        case 'Alto':
          return 'text-orange-600 bg-orange-50 border-orange-200';
        case 'Medio':
          return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'Bajo':
          return 'text-green-600 bg-green-50 border-green-200';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    };
  
    const getTypeColor = (type) => {
      switch (type) {
        case 'Inmediata':
          return 'bg-red-50 border-red-200';
        case 'Corto Plazo':
          return 'bg-yellow-50 border-yellow-200';
        case 'Mediano Plazo':
          return 'bg-blue-50 border-blue-200';
        default:
          return 'bg-gray-50 border-gray-200';
      }
    };

    const mapPriorityText = (p) => {
      switch (p) {
        case 'Crítica': return 'Critical';
        case 'Alta': return 'High';
        case 'Media': return 'Medium';
        case 'Baja': return 'Low';
        default: return p;
      }
    };

    const mapEffortText = (e) => {
      switch (e) {
        case 'Alto': return 'High';
        case 'Medio': return 'Medium';
        case 'Bajo': return 'Low';
        default: return e;
      }
    };

    const mapImpactText = (i) => {
      switch (i) {
        case 'Crítico': return 'Critical';
        case 'Muy Alto': return 'Very High';
        case 'Alto': return 'High';
        case 'Medio': return 'Medium';
        case 'Bajo': return 'Low';
        default: return i;
      }
    };
  
    // Group recommendations by type
    const groupedRecommendations = data.reduce((acc, rec) => {
      if (!acc[rec.type]) {
        acc[rec.type] = [];
      }
      acc[rec.type].push(rec);
      return acc;
    }, {});
  
    const typeOrder = ['Inmediata', 'Corto Plazo', 'Mediano Plazo'];
  
    return (
      <div className="space-y-8">
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Target className="w-6 h-6 text-executive-600 mr-2" />
            Executive Recommendations
          </h3>
          
          {/* Recommendations summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-600">{data.filter(r => r.type === 'Inmediata').length}</div>
                  <div className="text-sm text-red-700 font-medium">Immediate Actions</div>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">{data.filter(r => r.type === 'Corto Plazo').length}</div>
              <div className="text-sm text-yellow-700 font-medium">Short Term</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{data.filter(r => r.type === 'Mediano Plazo').length}</div>
              <div className="text-sm text-blue-700 font-medium">Mid Term</div>
            </div>
          </div>
  
          {/* Recommendations grouped by type */}
          <div className="space-y-6">
            {typeOrder.map((type) => {
              const recommendations = groupedRecommendations[type] || [];
              if (recommendations.length === 0) return null;
  
              return (
                <div key={type} className={`border-2 rounded-lg p-6 ${getTypeColor(type)}`}>
                  <div className="flex items-center mb-4">
                    {getRecommendationIcon(type)}
                    <h4 className="text-lg font-semibold text-gray-900 ml-2">{displayType[type] || type}</h4>
                    <span className="ml-auto text-sm text-gray-600">{recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}</span>
                  </div>
  
                  <div className="space-y-4">
                    {recommendations.map((recommendation, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="text-md font-semibold text-gray-900">
                            {recommendation.title}
                          </h5>
                          <div className="flex items-center space-x-2 ml-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getPriorityColor(recommendation.priority)}`}>
                              {mapPriorityText(recommendation.priority)}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-4">
                          {recommendation.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center text-sm">
                              <Zap className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-gray-600">Effort:</span>
                              <span className={`ml-1 font-medium ${getEffortColor(recommendation.effort)}`}>{mapEffortText(recommendation.effort)}</span>
                            </div>
                            <div className="flex items-center text-sm">
                              <TrendingUp className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-gray-600">Impact:</span>
                              <span className={`ml-1 px-2 py-1 text-xs font-medium rounded-full border ${getImpactColor(recommendation.impact)}`}>{mapImpactText(recommendation.impact)}</span>
                            </div>
                          </div>
                          <button className="flex items-center px-3 py-1 text-sm font-medium text-executive-600 hover:text-executive-700 transition-colors">
                            View details
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
  
        {/* Executive Action Plan */}
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <CheckCircle className="w-6 h-6 text-success-600 mr-2" />
            Executive Action Plan
          </h3>
          
          <div className="space-y-6">
            {/* This Week */}
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold text-red-700 mb-2">This Week</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                {data.filter(r => r.type === 'Inmediata').map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>{rec.title}</span>
                  </li>
                ))}
              </ul>
            </div>
  
            {/* Next 2-4 Weeks */}
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-semibold text-yellow-700 mb-2">Next 2-4 Weeks</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                {data.filter(r => r.type === 'Corto Plazo').map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>{rec.title}</span>
                  </li>
                ))}
              </ul>
            </div>
  
            {/* 1-3 months */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-blue-700 mb-2">1-3 Months</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                {data.filter(r => r.type === 'Mediano Plazo').map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span>{rec.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
  
          {/* Métricas de seguimiento */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Tracking Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">KPIs to Monitor:</span>
                <ul className="mt-1 space-y-1 text-gray-600">
                  <li>• Reduce critical bugs (-50%)</li>
                  <li>• Improve resolution time (-30%)</li>
                  <li>• Increase automation (+35%)</li>
                </ul>
              </div>
              <div>
                <span className="font-medium text-gray-700">Scheduled Reviews:</span>
                <ul className="mt-1 space-y-1 text-gray-600">
                  <li>• Weekly: Immediate actions</li>
                  <li>• Bi-weekly: Short term progress</li>
                  <li>• Monthly: Strategic review</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  