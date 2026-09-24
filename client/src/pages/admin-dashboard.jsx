import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays } from 'date-fns';
import { 
  Calendar, 
  Download, 
  Users, 
  AlertTriangle,
  LogIn,
  XCircle,
  Shield,
  BarChart2,
  ChevronDown,
  Search,
  MoreHorizontal
} from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import UserActivityService from '../services/UserActivityService';

// Chart colors - pastel palette
const COLORS = ['#B5EAD7', '#C7CEEA', '#FFB7B2', '#FFDAC1', '#E2F0CB'];

const AdminDashboard = () => {
  // State for report data and loading status
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for date range and report format
  const [startDate, setStartDate] = useState(subDays(new Date(), 30)); // Default to last 30 days
  const [endDate, setEndDate] = useState(new Date());
  const [reportFormat, setReportFormat] = useState('json');
  
  // Real-time overview data
  const [realtimeOverview, setRealtimeOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Fetch initial report data
  useEffect(() => {
    fetchActivityReport();
    fetchRealtimeOverview();
    
    // Set up interval for real-time data refresh (every 5 minutes)
    const intervalId = setInterval(fetchRealtimeOverview, 300000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Fetch activity report with optional date range
  const fetchActivityReport = async () => {
    setLoading(true);
    try {
      const result = await UserActivityService.getActivityReport(startDate, endDate);
      
      if (result.success) {
        setReportData(result.report);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error in fetchActivityReport:', err);
      setError(err.message || 'An error occurred while fetching the report');
    } finally {
      setLoading(false);
    }
  };

  // Fetch real-time user overview data
  const fetchRealtimeOverview = async () => {
    setOverviewLoading(true);
    try {
      const result = await UserActivityService.getRealtimeOverview();
      
      if (result.success) {
        setRealtimeOverview(result.overview);
      } else {
        console.error('Failed to fetch real-time overview:', result.error);
      }
    } catch (err) {
      console.error('Error in fetchRealtimeOverview:', err);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Handle date change and report refresh
  const handleDateChange = () => {
    fetchActivityReport();
  };

  // Handle report download
  const handleDownloadReport = async () => {
    setDownloadLoading(true);
    try {
      const result = await UserActivityService.downloadReport(
        reportFormat, 
        startDate, 
        endDate, 
        reportData,
        realtimeOverview
      );
      
      if (!result.success) {
        setError(result.error || 'Failed to download report');
      }
    } catch (err) {
      console.error('Error downloading report:', err);
      setError(err.message || 'Failed to download report');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Prepare data for status distribution pie chart
  const prepareStatusData = () => {
    if (!reportData?.userStatusDistribution) return [];
    
    return reportData.userStatusDistribution.map(item => ({
      name: item.status || 'unknown',
      value: item.count
    }));
  };

  // Prepare data for role distribution pie chart
  const prepareRoleData = () => {
    if (!reportData?.roleDistribution) return [];
    
    return reportData.roleDistribution.map(item => ({
      name: item.roleName || 'unknown',
      value: item.count
    }));
  };

  // Prepare data for daily activity bar chart
  const prepareDailyActivityData = () => {
    if (!reportData?.dailyActivity) return [];
    return reportData.dailyActivity;
  };

  // Render loading state
  if (loading && !reportData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">User Activity Dashboard</h1>
      
      {/* Date range selector and download options */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 flex flex-wrap gap-4 items-center">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                <DatePicker
                  selected={startDate}
                  onChange={date => setStartDate(date)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date</label>
                <DatePicker
                  selected={endDate}
                  onChange={date => setEndDate(date)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>
              <div className="self-end">
                <button
                  onClick={handleDateChange}
                  disabled={loading}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Update Report</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-full">
              <label className="block text-sm text-gray-600 mb-1">Report Format</label>
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div className="self-end">
              <button
                onClick={handleDownloadReport}
                disabled={downloadLoading}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50"
              >
                {downloadLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time metrics cards */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Real-time Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {overviewLoading ? (
                  <div className="animate-pulse h-8 w-12 bg-gray-200 rounded"></div>
                ) : (
                  realtimeOverview?.activeUsersLast24Hours || 0
                )}
              </p>
              <p className="text-sm text-gray-500">Active Users (24h)</p>
            </div>
          </div>
          <button>
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {overviewLoading ? (
                  <div className="animate-pulse h-8 w-12 bg-gray-200 rounded"></div>
                ) : (
                  realtimeOverview?.potentialSecurityIssues || 0
                )}
              </p>
              <p className="text-sm text-gray-500">Security Issues</p>
            </div>
          </div>
          <button>
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <LogIn className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reportData?.overview?.totalLogins || 0}</p>
              <p className="text-sm text-gray-500">Total Logins</p>
            </div>
          </div>
          <button>
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reportData?.overview?.totalFailedAttempts || 0}</p>
              <p className="text-sm text-gray-500">Failed Login Attempts</p>
            </div>
          </div>
          <button>
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Additional metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reportData?.twoFAAdoption?.enabled || 0}</p>
              <p className="text-sm text-gray-500">Users with 2FA Enabled</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {reportData?.twoFAAdoption?.enabled && reportData?.twoFAAdoption?.disabled
              ? `${Math.round((reportData.twoFAAdoption.enabled / 
                 (reportData.twoFAAdoption.enabled + reportData.twoFAAdoption.disabled)) * 100)}% of users`
              : '0% of users'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <BarChart2 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{reportData?.overview?.avgLoginsPerUser || '0'}</p>
              <p className="text-sm text-gray-500">Avg. Logins Per User</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* User Status Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">User Status Distribution</h2>
            <div className="flex items-center space-x-2">
              <button className="text-gray-400 hover:text-gray-600">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" className="user-status-chart">
              <PieChart>
                <Pie
                  data={prepareStatusData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {prepareStatusData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value, name) => [`${value} users`, name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Role Distribution</h2>
            <div className="flex items-center space-x-2">
              <button className="text-gray-400 hover:text-gray-600">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" className="role-distribution-chart">
              <PieChart>
                <Pie
                  data={prepareRoleData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {prepareRoleData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value, name) => [`${value} users`, name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Activity Bar Chart - Full width */}
        <div className="bg-white rounded-lg shadow-sm p-6 col-span-1 md:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Daily Login Activity</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Show by</span>
              <select 
                className="text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                defaultValue="days"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%" className="daily-activity-chart">
              <BarChart
                data={prepareDailyActivityData()}
                margin={{
                  top: 5, right: 30, left: 20, bottom: 30,
                }}
                barCategoryGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="loginCount" 
                  name="Logins" 
                  fill="#7c3aed" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Error message if any */}
      {error && (
        <div className="mt-6 bg-red-100 border border-red-200 text-red-800 rounded-lg p-4">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;