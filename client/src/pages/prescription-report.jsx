import { useState, useEffect } from "react";
import { useAuthContext } from "../context/AuthContext";
import TokenService from "../services/TokenService";
import Button from "../components/ui/button";
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = `${process.env.REACT_APP_API_URL}`;

export default function PrescriptionReport() {
  const { currentUser } = useAuthContext();
  const doctorId = currentUser?.id;
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [medicineStats, setMedicineStats] = useState({});
  const [reportPeriod, setReportPeriod] = useState('all'); // 'all', 'month', 'week', 'today', 'yesterday'

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const token = TokenService.getAccessToken();
        const response = await fetch(`${API_URL}/prescriptions/doctor/${doctorId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch prescriptions");
        }

        const data = await response.json();
        setPrescriptions(data);
        calculateMedicineStats(data);
      } catch (err) {
        console.error("Error fetching prescriptions:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (doctorId) {
      fetchPrescriptions();
    }
  }, [doctorId]);

  const isWithinLastMonth = (date, currentDate) => {
    const lastMonth = new Date(currentDate);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return date >= lastMonth;
  };

  const isWithinLastWeek = (date, currentDate) => {
    const lastWeek = new Date(currentDate);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return date >= lastWeek;
  };

  const isToday = (date, currentDate) => {
    return date.toDateString() === currentDate.toDateString();
  };

  const isYesterday = (date, currentDate) => {
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  };

  const calculateMedicineStats = (prescriptionData) => {
    const stats = {};
    const currentDate = new Date();

    prescriptionData.forEach(prescription => {
      const prescriptionDate = new Date(prescription.dateIssued);
      
      // Filter based on report period
      if (reportPeriod === 'month' && !isWithinLastMonth(prescriptionDate, currentDate)) return;
      if (reportPeriod === 'week' && !isWithinLastWeek(prescriptionDate, currentDate)) return;
      if (reportPeriod === 'today' && !isToday(prescriptionDate, currentDate)) return;
      if (reportPeriod === 'yesterday' && !isYesterday(prescriptionDate, currentDate)) return;

      prescription.medicines.forEach(medicine => {
        if (!stats[medicine.medicineName]) {
          stats[medicine.medicineName] = {
            totalPrescribed: 0,
            dosageStats: {},
          };
        }

        stats[medicine.medicineName].totalPrescribed++;
        
        if (!stats[medicine.medicineName].dosageStats[medicine.dosage]) {
          stats[medicine.medicineName].dosageStats[medicine.dosage] = 1;
        } else {
          stats[medicine.medicineName].dosageStats[medicine.dosage]++;
        }
      });
    });

    setMedicineStats(stats);
  };

  useEffect(() => {
    calculateMedicineStats(prescriptions);
  }, [reportPeriod, prescriptions]);

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    let y = 20;
    const lineHeight = 10;

    // Add title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Prescription Analysis Report', 105, y, { align: 'center' });
    y += lineHeight * 2;

    // Add doctor info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Doctor: Dr. ${currentUser?.name || 'Unknown'}`, 20, y);
    y += lineHeight;
    doc.text(`Report Period: ${reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)}`, 20, y);
    y += lineHeight;
    doc.text(`Total Prescriptions Analyzed: ${Object.keys(medicineStats).length}`, 20, y);
    y += lineHeight * 2;

    // Add medicine statistics
    doc.setFont('helvetica', 'bold');
    doc.text('Medicine Statistics:', 20, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');

    Object.entries(medicineStats).forEach(([medicine, stats]) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.text(`${medicine}:`, 20, y);
      y += lineHeight;
      doc.text(`Total Prescriptions: ${stats.totalPrescribed}`, 30, y);
      y += lineHeight;
      
      doc.text('Dosage Breakdown:', 30, y);
      y += lineHeight;
      
      Object.entries(stats.dosageStats).forEach(([dosage, count]) => {
        doc.text(`- ${dosage}: ${count} time${count !== 1 ? 's' : ''}`, 40, y);
        y += lineHeight;
      });
      
      y += lineHeight;
    });

    // Add footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const today = new Date().toLocaleDateString();
    doc.text(`Report generated on ${today}`, 105, 280, { align: 'center' });

    // Save the PDF
    doc.save('prescription-analysis-report.pdf');
  };

  const chartData = {
    labels: Object.keys(medicineStats),
    datasets: [
      {
        label: 'Times Prescribed',
        data: Object.values(medicineStats).map(stat => stat.totalPrescribed),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Medicine Prescription Frequency',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-8">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Prescription Analysis</h1>
            <Button
              variant="primary"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleDownloadReport}
            >
              Download Report
            </Button>
          </div>
          <div className="flex gap-4 mb-6">
            <Button
              variant={reportPeriod === 'all' ? 'primary' : 'secondary'}
              onClick={() => setReportPeriod('all')}
            >
              All Time
            </Button>
            <Button
              variant={reportPeriod === 'month' ? 'primary' : 'secondary'}
              onClick={() => setReportPeriod('month')}
            >
              Last Month
            </Button>
            <Button
              variant={reportPeriod === 'week' ? 'primary' : 'secondary'}
              onClick={() => setReportPeriod('week')}
            >
              Last Week
            </Button>
            <Button
              variant={reportPeriod === 'yesterday' ? 'primary' : 'secondary'}
              onClick={() => setReportPeriod('yesterday')}
            >
              Yesterday
            </Button>
            <Button
              variant={reportPeriod === 'today' ? 'primary' : 'secondary'}
              onClick={() => setReportPeriod('today')}
            >
              Today
            </Button>
            
          </div>
        </div>

        <div className="mb-8">
          <div className="h-[400px]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Detailed Medicine Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(medicineStats).map(([medicine, stats]) => (
              <div key={medicine} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-lg text-gray-900 mb-2">{medicine}</h3>
                <p className="text-gray-600 mb-2">
                  Total Prescriptions: {stats.totalPrescribed}
                </p>
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-1">Dosage Breakdown:</h4>
                  <ul className="space-y-1">
                    {Object.entries(stats.dosageStats).map(([dosage, count]) => (
                      <li key={dosage} className="text-sm text-gray-600">
                        {dosage}: {count} time{count !== 1 ? 's' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}