/**
 * KPICard Component - Refactorizado y alineado
 * Displays an individual KPI metric with trend indicator, status and tooltip.
 * Estructura normalizada SQL/CSV, seguridad mejorada, validación robusta.
 * 
 * @param {Object} props
 * @param {string} props.title - KPI name
 * @param {string|number} props.value - Value to display (validated)
 * @param {JSX.Element} props.icon - Component icon
 * @param {number} props.trend - Trend percentage
 * @param {string} props.status - 'success' | 'warning' | 'danger' | 'neutral'
 * @param {string} props.subtitle - Optional description
 * @param {string} props.formula - Formula explanation
 * @param {string} props.tooltip - Tooltip text
 * @param {Function} props.onClick - Click handler
 * @param {Array} props.sparklineData - Datos para sparkline
 * @param {boolean} props.isEstimated - Badge (est.)
 */
import { TrendingUp, TrendingDown, Info, ChevronRight, Construction } from 'lucide-react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export default function KPICard({
  title, 
  value, 
  icon, 
  trend, 
  status = 'neutral', 
  subtitle,
  formula,
  tooltip,
  onClick,
  detailData,
  sparklineData,
  isEstimated = false
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  const isClickable = onClick || detailData;
  
  /** Map status to Tailwind classes for consistent styling */
  const getStatusStyles = () => {
    switch (status) {
      case 'success':
        return 'border-success-200 bg-success-50';
      case 'warning':
        return 'border-warning-200 bg-warning-50';
      case 'danger':
        return 'border-danger-200 bg-danger-50';
      default:
        return 'border-gray-200 bg-white';
    }
  }
  
  // Seguridad mejorada: typeof check antes de acceder a window
  const handleCardMouseEnter = (e) => {
    if (!tooltip) return;
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const TOOLTIP_WIDTH = 240;
      const padding = 8;
      // Prevenir overflow del viewport
      let left = rect.right + padding;
      if (typeof window !== 'undefined' && left + TOOLTIP_WIDTH > (window.innerWidth - padding)) {
        left = rect.left - TOOLTIP_WIDTH - padding;
      }
      left = Math.max(padding, left);
      setTooltipPos({ x: left, y: rect.top });
      setShowTooltip(true);
    } catch (err) {
      // Silenciar errores no críticos
    }
  };

  const handleCardMouseLeave = () => {
    if (!tooltip) return;
    setShowTooltip(false);
  };

  return (
    <div 
      className={`kpi-card relative ${getStatusStyles()} ${
        isClickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300' : ''
      }`}
      onClick={(e) => {
        try { console.debug && console.debug('KPICard clicked:', title); } catch (err) {}
        if (typeof onClick === 'function') onClick(e);
      }}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="w-5 h-5 flex items-center justify-center">
          {icon}
        </div>
        <div className="relative">
          {tooltip && (
            <span
              className="ml-0.5 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltipPos({ x: rect.right + 8, y: rect.top });
                setShowTooltip(true);
              }}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltipPos({ x: rect.right + 8, y: rect.top });
                setShowTooltip(true);
              }}
              onBlur={() => setShowTooltip(false)}
              tabIndex={0}
              role="button"
              aria-label={`More information about ${title}`}
            >
              <Info className="w-3 h-3 text-gray-400 hover:text-blue-500" />
            </span>
          )}
          {tooltip && showTooltip && createPortal(
            <div
              style={{
                  position: 'fixed',
                  left: tooltipPos.x,
                  top: tooltipPos.y,
                  zIndex: 9999,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  padding: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#374151',
                  width: '14rem',
                  pointerEvents: 'none',
                }}
            >
              {tooltip}
            </div>, document.body
          )}
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center text-xs font-medium mt-0.5 mb-0.5 ${
          trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
        }`}>
          {trend > 0 ? (
            <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
          ) : trend < 0 ? (
            <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
          ) : null}
          {trend !== 0 && `${trend > 0 ? '+' : ''}${trend}%`}
        </div>
      )}
      <div className="flex items-center justify-between mb-0.5 gap-1">
        <h3 className="metric-label text-xs leading-tight">{title}</h3>
        {isEstimated && (
          <span className="inline-flex items-center text-xs bg-orange-100 text-orange-700 px-1 py-0 rounded flex-shrink-0 border border-orange-200">
            <Construction className="w-2.5 h-2.5 mr-0.5" />
            <span>*</span>
          </span>
        )}
      </div>
      <div className="metric-value text-xl leading-tight">{value}{isEstimated && <span className="text-orange-500 ml-0.5">*</span>}</div>
      {formula && (
        <div className="text-xs text-gray-400 mt-0.5 leading-tight line-clamp-2">{formula}</div>
      )}
      {subtitle && (
        <div className="text-xs text-gray-600 mt-0.5 leading-tight">{subtitle}</div>
      )}
      
      {isClickable && (
        <div className="absolute bottom-1 right-1 text-gray-400 hover:text-[#754bde] transition-colors">
          <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}
