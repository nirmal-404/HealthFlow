import Card from "../components/ui/card";
import Button from "../components/ui/button";
import React, { useEffect, useState } from "react";
import { useAuthContext } from "../context/AuthContext";
import { useRecordContext } from "../context/RecordContext";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Calendar, DollarSign, Users, TrendingUp, MessageSquare, Smile, CheckCircle } from 'lucide-react';
import TokenService from "../services/TokenService";
import { toast } from "react-toastify";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_URL = `${process.env.REACT_APP_API_URL}`;

export default function Dashboard() {
  const { currentUser } = useAuthContext();
  const { records, getRecordsByDoctor } = useRecordContext();
  const doctorId = currentUser?.id;
  const [ageGenderData, setAgeGenderData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [feedbackMetrics, setFeedbackMetrics] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicineStats, setMedicineStats] = useState({});
  const [reportData, setReportData] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const suggestedQuestions = [
    "What is the overall patient satisfaction rate?",
    "Are there any common complaints in the feedback?",
    "Which patients reported the highest satisfaction?",
    "How many patients reported improvement in their condition?",
    "What are the most frequent comments?",
    "Are there any negative feedback trends?",
    "How does the feedback vary by patient demographics?",
    "What are the common diseases?",
    "How many patients need to contact the doctor during treatment?",
    "How many days did patients take the prescribed medication commonly?"
  ];

  useEffect(() => {
    const fetchAgeGenderData = async () => {
      try {
        const authToken = localStorage.getItem('accessToken');
        console.log('Access token:', authToken ? 'Found' : 'Not found');

        if (!authToken) {
          throw new Error('No authentication token found. Please log in again.');
        }

        const response = await fetch('/api/patients/age-gender-distribution', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data && data.male && data.female) {
          setAgeGenderData(data);
        } else {
          setAgeGenderData({ male: { '0-18': 0, '19-30': 0, '31-50': 0, '51+': 0 }, female: { '0-18': 0, '19-30': 0, '31-50': 0, '51+': 0 } });
        }
      } catch (error) {
        console.error('Error fetching age and gender data:', error);
        setError(error.message);
        setAgeGenderData({ male: { '0-18': 0, '19-30': 0, '31-50': 0, '51+': 0 }, female: { '0-18': 0, '19-30': 0, '31-50': 0, '51+': 0 } });
      }
    };

    const fetchFinancialReport = async () => {
      try {
        const response = await fetch(
          `${API_URL}/finance/doctors/${doctorId}/report`,
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
        setFinancialData(data);
      } catch (error) {
        console.error('Error fetching financial report:', error);
      }
    };

    const fetchFeedbackMetrics = async () => {
      try {
        const response = await fetch(`${API_URL}/feedback/metrics/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }

        const data = await response.json();
        setFeedbackMetrics(data);
      } catch (error) {
        console.error('Error fetching feedback metrics:', error);
      }
    };

    const fetchPrescriptions = async () => {
      try {
        const token = TokenService.getAccessToken();
        const response = await fetch(`${API_URL}/prescriptions/doctor/${doctorId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch prescriptions');
        }

        const data = await response.json();
        setPrescriptions(data);
        calculateMedicineStats(data);
      } catch (error) {
        console.error('Error fetching prescriptions:', error);
        setError(error.message);
      }
    };

    const fetchFeedbackReport = async () => {
      try {
        const response = await fetch(`${API_URL}/feedback/report/generate`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            toast.error("Session expired. Please log in again.");
            return;
          }
          throw new Error("Failed to generate report");
        }
        const data = await response.json();
        setReportData(data.reportData || []);
      } catch (error) {
        console.error("[FeedbackReport] Error fetching report:", error.message);
        toast.error(error.message || "Failed to load feedback report.");
        setReportData([]);
      }
    };

    const calculateMedicineStats = (prescriptionData) => {
      const stats = {};
      prescriptionData.forEach(prescription => {
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

    const fetchAllData = async () => {
      try {
        setLoading(true);
        if (currentUser) {
          await Promise.all([
            fetchAgeGenderData(),
            fetchFinancialReport(),
            fetchFeedbackMetrics(),
            fetchPrescriptions(),
            fetchFeedbackReport(),
            getRecordsByDoctor()
          ]);
        } else {
          setError('Please log in to view dashboard data.');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [currentUser, doctorId, getRecordsByDoctor]);

  useEffect(() => {
    if (records.length > 0) {
      const activeCount = records.filter(patient => patient.activeStatus === true).length;
      setStats({
        totalPatients: records.length,
        activePatients: activeCount
      });
    }
  }, [records]);

  const analyzeFeedback = (question) => {
    let response = "I'm sorry, I couldn't understand that question. Please try rephrasing or select a suggested question.";

    const commonDiseases = [
      "diabetes", "hypertension", "asthma", "arthritis", "cancer", "heart disease",
      "migraine", "depression", "anxiety", "flu", "pneumonia", "covid"
    ];

    if (question.toLowerCase().includes("satisfaction rate")) {
      const totalResponses = reportData.length;
      const positiveResponses = reportData.filter(data => 
        data.feedback.some(f => 
          typeof f.answer === "string" && 
          (f.answer.toLowerCase().includes("yes") || f.answer.toLowerCase().includes("good"))
        )
      ).length;
      const satisfactionRate = totalResponses > 0 ? ((positiveResponses / totalResponses) * 100).toFixed(2) : 0;
      response = `The overall patient satisfaction rate is ${satisfactionRate}%. This is based on ${positiveResponses} out of ${totalResponses} patients providing positive feedback (e.g., "Yes" or "Good").`;
    } else if (question.toLowerCase().includes("common complaints")) {
      const complaints = reportData
        .filter(data => data.feedback.some(f => 
          typeof f.answer === "string" && f.answer.toLowerCase().includes("no")
        ))
        .map(data => data.feedback.find(f => f.answer.toLowerCase().includes("no")).question);
      const uniqueComplaints = [...new Set(complaints)];
      response = uniqueComplaints.length > 0
        ? `Common complaints include issues related to: ${uniqueComplaints.join(", ")}.`
        : "No common complaints were identified in the feedback.";
    } else if (question.toLowerCase().includes("highest satisfaction")) {
      const satisfiedPatients = reportData
        .filter(data => 
          data.feedback.some(f => 
            typeof f.answer === "string" && 
            (f.answer.toLowerCase().includes("yes") || f.answer.toLowerCase().includes("good"))
          )
        )
        .map(data => data.patient.name);
      response = satisfiedPatients.length > 0
        ? `Patients reporting the highest satisfaction are: ${satisfiedPatients.join(", ")}.`
        : "No patients reported high satisfaction.";
    } else if (question.toLowerCase().includes("improvement in their condition")) {
      const improvedPatients = reportData.filter(data => 
        data.feedback.some(f => 
          f.question.toLowerCase().includes("improvement") && 
          (f.answer.toLowerCase().includes("yes") || parseInt(f.answer) > 3)
        )
      ).length;
      response = `${improvedPatients} patients reported improvement in their condition.`;
    } else if (question.toLowerCase().includes("frequent comments")) {
      const comments = reportData
        .filter(data => data.comments)
        .map(data => data.comments.toLowerCase());
      const commentCounts = comments.reduce((acc, comment) => {
        acc[comment] = (acc[comment] || 0) + 1;
        return acc;
      }, {});
      const frequentComments = Object.entries(commentCounts)
        .filter(([_, count]) => count > 1)
        .map(([comment]) => comment);
      response = frequentComments.length > 0
        ? `The most frequent comments are: ${frequentComments.join(", ")}.`
        : "No frequent comments were identified.";
    } else if (question.toLowerCase().includes("negative feedback trends")) {
      const negativeFeedback = reportData
        .filter(data => data.feedback.some(f => 
          typeof f.answer === "string" && f.answer.toLowerCase().includes("no")
        ))
        .map(data => data.feedback.find(f => f.answer.toLowerCase().includes("no")).question);
      const negativeTrends = [...new Set(negativeFeedback)];
      response = negativeTrends.length > 0
        ? `Negative feedback trends include: ${negativeTrends.join(", ")}.`
        : "No negative feedback trends were identified.";
    } else if (question.toLowerCase().includes("patient demographics")) {
      response = "Demographic data is not available in the feedback. Please update the patient data to include demographics like age or gender for a detailed analysis.";
    } else if (question.toLowerCase().includes("common diseases")) {
      const diseaseMentions = [];
      reportData.forEach(data => {
        if (data.comments) {
          const comment = data.comments.toLowerCase();
          commonDiseases.forEach(disease => {
            if (comment.includes(disease)) {
              diseaseMentions.push({ patient: data.patient.name, disease });
            }
          });
        }
      });

      const diseaseCounts = diseaseMentions.reduce((acc, mention) => {
        acc[mention.disease] = (acc[mention.disease] || 0) + 1;
        return acc;
      }, {});

      const sortedDiseases = Object.entries(diseaseCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([disease, count]) => `${disease} (${count} patients)`);

      if (sortedDiseases.length > 0) {
        response = `The common diseases mentioned in the feedback comments are: ${sortedDiseases.join(", ")}. `;
        const patientDetails = diseaseMentions.map(mention => `${mention.patient} mentioned ${mention.disease}`);
        response += `Details: ${patientDetails.join("; ")}.`;
      } else {
        response = "No specific diseases were mentioned in the feedback comments. You may need to check the patient encounter records for detailed disease information.";
      }
    } else if (question.toLowerCase().includes("need to contact the doctor")) {
      const patientsNeedingContact = reportData.filter(data => {
        const feedbackMatch = data.feedback.some(f => 
          (f.question.toLowerCase().includes("follow-up") || 
           f.question.toLowerCase().includes("contact") || 
           f.question.toLowerCase().includes("reach out")) && 
          (typeof f.answer === "string" && f.answer.toLowerCase().includes("yes"))
        );
        const commentMatch = data.comments && 
          (data.comments.toLowerCase().includes("contacted the doctor") || 
           data.comments.toLowerCase().includes("needed to reach out") || 
           data.comments.toLowerCase().includes("called the doctor"));
        return feedbackMatch || commentMatch;
      });

      const count = patientsNeedingContact.length;
      if (count > 0) {
        const patientNames = patientsNeedingContact.map(data => data.patient.name).join(", ");
        response = `${count} patients needed to contact the doctor during treatment. These patients are: ${patientNames}.`;
      } else {
        response = "No patients indicated a need to contact the doctor during treatment based on the feedback or comments.";
      }
    } else if (question.toLowerCase().includes("days") && question.toLowerCase().includes("medication")) {
      const durations = [];
      
      reportData.forEach(data => {
        const durationFeedback = data.feedback.find(f => 
          f.question.toLowerCase().includes("how many days") && 
          f.question.toLowerCase().includes("medication")
        );
        if (durationFeedback && typeof durationFeedback.answer === "string") {
          const daysMatch = durationFeedback.answer.match(/\d+/);
          if (daysMatch) {
            durations.push({ patient: data.patient.name, days: parseInt(daysMatch[0]) });
          }
        }

        if (data.comments) {
          const comment = data.comments.toLowerCase();
          const daysMatch = comment.match(/(\d+)\s*days/);
          if (daysMatch) {
            durations.push({ patient: data.patient.name, days: parseInt(daysMatch[1]) });
          }
        }
      });

      if (durations.length > 0) {
        const durationCounts = durations.reduce((acc, entry) => {
          acc[entry.days] = (acc[entry.days] || 0) + 1;
          return acc;
        }, {});

        const mostCommonDuration = Object.entries(durationCounts)
          .sort(([, a], [, b]) => b - a)[0];
        const commonDays = mostCommonDuration[0];
        const count = mostCommonDuration[1];

        const patientsWithCommonDuration = durations
          .filter(entry => entry.days === parseInt(commonDays))
          .map(entry => entry.patient)
          .join(", ");

        response = `The most common duration for taking the prescribed medication is ${commonDays} days, reported by ${count} patients. These patients are: ${patientsWithCommonDuration}.`;
      } else {
        response = "No specific information about medication duration was found in the feedback or comments. Consider adding a question about medication duration to the feedback form for better insights.";
      }
    }

    return response;
  };

  const handleAskQuestion = (question) => {
    if (!question.trim()) return;

    const response = analyzeFeedback(question);
    setChatHistory(prev => [
      ...prev,
      { sender: "Doctor", message: question },
      { sender: "AI", message: response }
    ]);
    setUserInput("");
  };

  const handleSuggestedQuestion = (question) => {
    setUserInput(question);
    handleAskQuestion(question);
  };

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
        },
        ticks: {
          stepSize: 1,
        },
      },
      x: {
        grid: {
          display: false
        },
      }
    }
  };

  const ageGenderChartData = ageGenderData ? {
    labels: ['0-18', '19-30', '31-50', '51+'],
    datasets: [
      {
        label: 'Male',
        data: [
          ageGenderData.male['0-18'],
          ageGenderData.male['19-30'],
          ageGenderData.male['31-50'],
          ageGenderData.male['51+'],
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
      {
        label: 'Female',
        data: [
          ageGenderData.female['0-18'],
          ageGenderData.female['19-30'],
          ageGenderData.female['31-50'],
          ageGenderData.female['51+'],
        ],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  } : {
    labels: ['0-18', '19-30', '31-50', '51+'],
    datasets: [
      {
        label: 'Male',
        data: [0, 0, 0, 0],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
      {
        label: 'Female',
        data: [0, 0, 0, 0],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  const appointmentsChartData = financialData?.trends ? {
    labels: financialData.trends.months,
    datasets: [
      {
        label: 'Monthly Appointments',
        data: financialData.trends.appointments,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderRadius: 4
      }
    ]
  } : {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Appointments',
        data: [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderRadius: 4
      }
    ]
  };

  const medicineChartData = {
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

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold mb-6">Doctor Dashboard</h1>
        <Card>
          <p className="text-gray-500">Loading dashboard data...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pl-6 pr-6 pt-4 pb-4">
      <h1 className="text-2xl font-bold mb-6">Doctor Dashboard</h1>
      <h2>Welcome, {currentUser?.name || "User"}!</h2>

      
      {/* Summary Cards */}
      <div className="bg-white rounded-xl p-3 mb-6 w-full shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Financial Summary Cards */}
          <div className="p-3 text-center sm:border-r sm:border-gray-300">
            <div className="flex items-center gap-2 justify-center">
              <div className="p-2 bg-blue-50 rounded-full">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{financialData?.summary.totalAppointments || 0}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">Total Appointments</p>
          </div>
          <div className="p-3 text-center sm:border-r sm:border-gray-300 border-t border-gray-300 sm:border-t-0 pt-4 sm:pt-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="p-2 bg-green-50 rounded-full">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold">LKR {financialData?.summary.totalIncome.toFixed(2) || '0.00'}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">Total Income</p>
          </div>
          <div className="p-3 text-center sm:border-r sm:border-gray-300 border-t border-gray-300 sm:border-t-0 pt-4 sm:pt-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="p-2 bg-indigo-50 rounded-full">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold">LKR {financialData?.summary.averageMonthlyIncome.toFixed(2) || '0.00'}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">Avg Monthly Income</p>
          </div>
          <div className="p-3 text-center sm:border-r sm:border-gray-300 border-t border-gray-300 sm:border-t-0 pt-4 sm:pt-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="p-2 bg-purple-50 rounded-full">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold">{financialData?.summary.averageGrowthRate.toFixed(1) || '0.0'}%</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">Avg Growth Rate</p>
          </div>
          {/* Feedback Summary Cards */}
          <div className="p-3 text-center sm:border-r sm:border-gray-300 border-t border-gray-300 sm:border-t-0 pt-4 sm:pt-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="p-2 bg-blue-50 rounded-full">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{feedbackMetrics?.totalFeedbackReceived || 0}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">Total Feedback Received</p>
          </div>
          <div className="p-3 text-center sm:border-r sm:border-gray-300 border-t border-gray-300 sm:border-t-0 pt-4 sm:pt-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="p-2 bg-green-50 rounded-full">
                <Smile className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold">{feedbackMetrics?.patientSatisfactionRate || '0%'}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">Patient Satisfaction Rate</p>
          </div>
          <div className="p-3 text-center border-t border-gray-300 sm:border-t-0 pt-4 sm:pt-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="p-2 bg-indigo-50 rounded-full">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold">{feedbackMetrics?.treatmentSuccessRate || '0%'}</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">Treatment Success Rate (%)</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left/Middle Column: Medicine Prescription Frequency, Monthly Appointments, Patient Demographics, Patient Statistics */}
        <div className="lg:col-span-2 space-y-4">
          {/* Row 1: Medicine Prescription Frequency and Monthly Appointments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white rounded-xl p-4 shadow-md">
              <h3 className="text-xl font-semibold mb-4">Medicine Prescription Frequency</h3>
              {error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <div className="h-[300px]">
                  <Bar data={medicineChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Medicine Prescription Frequency' } }, scales: { y: { ...chartOptions.scales.y, title: { display: true, text: 'Times Prescribed' } }, x: { ...chartOptions.scales.x, title: { display: true, text: 'Medicine' } } } }} />
                </div>
              )}
            </Card>
            <Card className="bg-white rounded-xl p-4 shadow-md">
              <h3 className="text-xl font-semibold mb-4">Monthly Appointments</h3>
              {error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <div className="h-[300px]">
                  <Bar data={appointmentsChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Monthly Appointments' } }, scales: { y: { ...chartOptions.scales.y, title: { display: true, text: 'Number of Appointments' } }, x: { ...chartOptions.scales.x, title: { display: true, text: 'Month' } } } }} />
                </div>
              )}
            </Card>
          </div>
          {/* Row 2: Patient Demographics and Patient Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white rounded-xl p-4 shadow-md">
              <h3 className="text-xl font-semibold mb-4">Patient Demographics</h3>
              {error ? (
                <p className="text-red-500">{error}</p>
              ) : (
                <div className="h-[300px]">
                  <Bar data={ageGenderChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Patient Age and Gender Distribution' } }, scales: { y: { ...chartOptions.scales.y, title: { display: true, text: 'Number of Patients' } }, x: { ...chartOptions.scales.x, title: { display: true, text: 'Age Group' } } } }} />
                </div>
              )}
            </Card>
            <Card className="bg-white rounded-xl p-4 shadow-md h-[300px] flex flex-col justify-center">
              <h3 className="text-xl font-semibold mb-4 text-center">Patient Statistics</h3>
              {error ? (
                <p className="text-red-500 text-center">{error}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 rounded-full">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <p className="text-2xl font-bold">{stats.totalPatients}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Total Patients</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-green-50 rounded-full">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold">{stats.activePatients}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Active Patients ({Math.round((stats.activePatients / (stats.totalPatients || 1)) * 100)}%)
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Right Column: AI Feedback */}
        <div className="lg:col-span-1 space-y-4 mx-auto lg:mx-0">
          <Card className="bg-white rounded-xl p-4 shadow-md max-w-md">
            <h3 className="text-xl font-semibold mb-4">Ask the AI About Feedback Data</h3>
            {error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <div className="space-y-4">
                {/* Suggested Questions */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Suggested Questions:</p>
                  <div className=" flex flex-wrap gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedQuestion(question)}
                        className="text-[12px] text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat History */}
                <div className="border rounded-lg p-4 h-[250px] overflow-y-auto mb-4">
                  {chatHistory.length === 0 ? (
                    <p className="text-[12px] text-gray-500">Start by asking a question or selecting a suggestion above.</p>
                  ) : (
                    chatHistory.map((chat, index) => (
                      <div
                        key={index}
                        className={`mb-2 ${chat.sender === "Doctor" ? "text-right" : "text-left"}`}
                      >
                        <p className={`inline-block p-2 rounded-lg ${chat.sender === "Doctor" ? "text-[12px] bg-blue-100 text-blue-800" : "text-[12px] bg-gray-100 text-gray-800"}`}>
                          <span className="font-semibold">{chat.sender}:</span> {chat.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Input Field */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAskQuestion(userInput)}
                    placeholder="Type your question here..."
                    className="flex-1 p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Button
                    onClick={() => handleAskQuestion(userInput)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Ask
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}