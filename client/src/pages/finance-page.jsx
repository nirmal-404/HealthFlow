import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { Line, Bar } from 'react-chartjs-2';
import { Calendar, TrendingUp, Users, DollarSign, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function FinancialReportPage() {
  const { currentUser } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Create refs for charts at the top level
  const incomeChartRef = useRef(null);
  const appointmentsChartRef = useRef(null);
  const growthChartRef = useRef(null);

  const fetchFinancialReport = async () => {
    try {
      const queryParams = new URLSearchParams({
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate })
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/finance/doctors/${currentUser.id}/report?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch financial report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching financial report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialReport();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading financial data...</div>
      </div>
    );
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const incomeChartData = reportData?.trends ? {
    labels: reportData.trends.months,
    datasets: [
      {
        label: 'Monthly Income (LKR)',
        data: reportData.trends.income,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  } : null;

  const appointmentsChartData = reportData?.trends ? {
    labels: reportData.trends.months,
    datasets: [
      {
        label: 'Monthly Appointments',
        data: reportData.trends.appointments,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderRadius: 4
      }
    ]
  } : null;

  const growthChartData = reportData?.trends ? {
    labels: reportData.trends.months,
    datasets: [
      {
        label: 'Monthly Growth Rate (%)',
        data: reportData.trends.growth,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  } : null;

  const downloadPDF = async () => {
    if (!reportData) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Helper function to add text and increment y position
    const addText = (text, fontSize = 12, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.text(text, margin, yPos);
      yPos += fontSize / 2 + 2;
    };

    // Title
    addText('Financial Report', 24, true);
    yPos += 5;

    // Date Range
    if (dateRange.startDate && dateRange.endDate) {
      addText(`Period: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`, 12);
      yPos += 5;
    }

    // Summary Section
    addText('Summary', 16, true);
    yPos += 5;
    addText(`Total Appointments: ${reportData.summary.totalAppointments}`, 12);
    addText(`Total Income: LKR ${reportData.summary.totalIncome.toFixed(2)}`, 12);
    addText(`Average Monthly Income: LKR ${reportData.summary.averageMonthlyIncome.toFixed(2)}`, 12);
    addText(`Average Growth Rate: ${reportData.summary.averageGrowthRate.toFixed(1)}%`, 12);
    yPos += 10;

    // Monthly Details Section
    addText('Monthly Details', 16, true);
    yPos += 5;

    // Table headers
    const headers = ['Month', 'Income (LKR)', 'Appointments', 'Avg Daily Income (LKR)', 'Growth Rate'];
    const columnWidths = [40, 35, 30, 40, 35];
    let xPos = margin;

    // Draw table headers
    doc.setFillColor(240, 240, 240);
    doc.rect(margin - 2, yPos - 5, pageWidth - (margin * 2) + 4, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    headers.forEach((header, i) => {
      doc.text(header, xPos, yPos);
      xPos += columnWidths[i];
    });
    yPos += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    Object.entries(reportData.monthlyData).forEach(([month, data]) => {
      if (yPos > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }

      xPos = margin;
      doc.text(month, xPos, yPos);
      xPos += columnWidths[0];
      
      doc.text(data.totalIncome.toFixed(2).toString(), xPos, yPos);
      xPos += columnWidths[1];
      
      doc.text(data.appointmentCount.toString(), xPos, yPos);
      xPos += columnWidths[2];
      
      doc.text(data.averageDailyIncome.toFixed(2).toString(), xPos, yPos);
      xPos += columnWidths[3];
      
      doc.text(data.growthRate.toFixed(1) + '%', xPos, yPos);
      
      yPos += 6;
    });

    // Add charts as images
    const addChartImage = async (chartRef, title) => {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }

      yPos += 10;
      addText(title, 14, true);
      yPos += 5;

      const canvas = chartRef.current?.canvas;
      if (canvas) {
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'PNG', margin, yPos, imgWidth, imgHeight);
        yPos += imgHeight + 10;
      }
    };

    // Save charts as images in the PDF
    if (incomeChartRef.current) await addChartImage(incomeChartRef, 'Income Trend');
    if (appointmentsChartRef.current) await addChartImage(appointmentsChartRef, 'Monthly Appointments');
    if (growthChartRef.current) await addChartImage(growthChartRef, 'Growth Rate Trend');

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generated on ${new Date().toLocaleString()}`,
      margin,
      pageHeight - 10
    );

    // Save the PDF
    doc.save('financial-report.pdf');
  };

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen bg-white-600">
      {/* Header */}
      <div className="border-b border-gray-200 mb-4 bg-white">
        <div className="p-4 pb-0 flex justify-between items-center">
          <h1 className="text-blue-600 font-medium text-sm">Financial Report</h1>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={downloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          </div>
        </div>
        <div className="h-0.5 w-44 bg-blue-600 mt-2"></div>
      </div>

      {/* Rest of the content */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="flex justify-center bg-white rounded-xl p-4 mb-6 w-full shadow-md">
            <div className="flex flex-col sm:flex-row gap-6 mb-6 items-center">
              <div className="p-4 text-center sm:border-r sm:border-gray-300">
                <div className="p-3 bg-blue-50 rounded-full mx-auto mb-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-3xl font-bold">{reportData.summary.totalAppointments}</p>
                <p className="text-sm text-gray-500">Total Appointments</p>
              </div>
              <div className="p-4 text-center sm:border-r sm:border-gray-300 border-t border-gray-300 sm:border-t-0 pt-8 sm:pt-4">
                <div className="p-3 bg-green-50 rounded-full mx-auto mb-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-3xl font-bold">LKR {reportData.summary.totalIncome.toFixed(2)}</p>
                <p className="text-sm text-gray-500">Total Income</p>
              </div>
              <div className="p-4 text-center sm:border-r sm:border-gray-300 border-t border-gray-300 sm:border-t-0 pt-8 sm:pt-4">
                <div className="p-3 bg-indigo-50 rounded-full mx-auto mb-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-3xl font-bold">LKR {reportData.summary.averageMonthlyIncome.toFixed(2)}</p>
                <p className="text-sm text-gray-500">Avg Monthly Income</p>
              </div>
              <div className="p-4 text-center border-t border-gray-300 sm:border-t-0 pt-8 sm:pt-4">
                <div className="p-3 bg-purple-50 rounded-full mx-auto mb-2">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-3xl font-bold">{reportData.summary.averageGrowthRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">Avg Growth Rate</p>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Income Trend</h3>
              <div className="h-[300px]">
                {incomeChartData && <Line ref={incomeChartRef} data={incomeChartData} options={chartOptions} />}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Appointments</h3>
              <div className="h-[300px]">
                {appointmentsChartData && <Bar ref={appointmentsChartRef} data={appointmentsChartData} options={chartOptions} />}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Growth Rate</h3>
            <div className="h-[300px]">
              {growthChartData && <Line ref={growthChartRef} data={growthChartData} options={chartOptions} />}
            </div>
          </div>

          {/* Monthly Details */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appointments</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Daily Income</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Peak Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(reportData.monthlyData).map(([month, data]) => (
                    <tr key={month} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">LKR {data.totalIncome.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{data.appointmentCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">LKR {data.averageDailyIncome.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.peakAppointmentDay} ({data.peakAppointmentCount} appointments)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          data.growthRate > 0 ? 'bg-green-50 text-green-700' : 
                          data.growthRate < 0 ? 'bg-red-50 text-red-700' : 
                          'bg-gray-50 text-gray-700'
                        }`}>
                          {data.growthRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}