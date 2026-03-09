/**
 * QA Dashboard Page
 * Main page for the QA executive dashboard.
 * Renders the ExecutiveDashboard with API sources and refresh interval.
 */
import ExecutiveDashboard from '../components/ExecutiveDashboard';

export default function QADashboardPage() {
  return (
    <ExecutiveDashboard 
      dataSource="/api/qa-data"
      configSource="/api/config"
      refreshInterval={300000} // 5 minutes
    />
  );
}

