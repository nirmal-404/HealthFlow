import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import { Search } from "lucide-react";
import Input from "../components/ui/input";
import { toast } from "react-toastify";
import FeedbackReportPopup from "./feedback-report-page";
import clsx from "clsx";

export default function DoctorFeedbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [feedbacks, setFeedbacks] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showReportPopup, setShowReportPopup] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        console.log("[DoctorFeedbackPage] Fetching feedbacks...");
        const feedbacksResponse = await fetch(`${process.env.REACT_APP_API_URL}/feedback/doctor/me`);
        if (!feedbacksResponse.ok) {
          if (feedbacksResponse.status === 401) {
            localStorage.removeItem("token");
            toast.error("Session expired. Please log in again.");
            navigate("/login");
            return;
          }
          throw new Error("Failed to fetch feedbacks");
        }
        const feedbacksData = await feedbacksResponse.json();
        console.log("[DoctorFeedbackPage] Fetched feedbacks:", feedbacksData);
        setFeedbacks(Array.isArray(feedbacksData) ? feedbacksData : []);

        console.log("[DoctorFeedbackPage] Fetching metrics...");
        const metricsResponse = await fetch(`${process.env.REACT_APP_API_URL}/feedback/metrics/me`);
        if (!metricsResponse.ok) {
          throw new Error("Failed to fetch metrics");
        }
        const metricsData = await metricsResponse.json();
        console.log("[DoctorFeedbackPage] Fetched metrics:", metricsData);
        setMetrics(metricsData || {});
      } catch (error) {
        console.error("[DoctorFeedbackPage] Error fetching data:", error.message);
        toast.error(error.message || "Failed to load data. Displaying available content.");
        setFeedbacks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location.pathname, navigate]);

  const handleGenerateReport = () => {
    console.log("[DoctorFeedbackPage] Opening report popup");
    setShowReportPopup(true);
  };

  const closeReportPopup = () => {
    console.log("[DoctorFeedbackPage] Closing report popup");
    setShowReportPopup(false);
  };

  const filteredFeedbacks = feedbacks.filter(f =>
    f.patientId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || ""
  );

  const handleViewFeedback = (feedback) => {
    setSelectedFeedback(feedback);
  };

  const closeModal = () => {
    setSelectedFeedback(null);
  };

  // Focus trap and escape key handling
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && selectedFeedback) {
        closeModal();
      }
    };

    if (selectedFeedback) {
      document.addEventListener("keydown", handleEscape);
      if (panelRef.current) {
        panelRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedFeedback]);

  const handleBackgroundClick = (e) => {
    if (e.target.id === "backdrop") {
      closeModal();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold mb-6">Doctor Feedback</h1>
        <Card>
          <p className="text-gray-500">Loading feedbacks...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pl-6 w pr-6 pt-4 pb-4">
      <h1 className="text-2xl font-bold">Doctor Feedback</h1>
      <div className="flex justify-center bg-white rounded-xl p-4 mb-6 w-full shadow-md">
        <div className="flex flex-col sm:flex-row gap-6 mb-6 items-center">
          <div className="p-4 text-center sm:border-r sm:border-gray-300">
            <p className="text-3xl font-bold">{metrics.totalFeedbackReceived || 0}</p>
            <p className="text-sm text-gray-500">Total Feedback Received</p>
          </div>
          <div className="p-4 text-center sm:border-r sm:border-gray-300 border-t border-gray-300 sm:border-t-0 pt-8 sm:pt-4">
            <p className="text-3xl font-bold">{metrics.patientSatisfactionRate || "0%"}</p>
            <p className="text-sm text-gray-500">Patient Satisfaction Rate</p>
          </div>
          <div className="p-4 text-center border-t border-gray-300 sm:border-t-0 pt-8 sm:pt-4">
            <p className="text-3xl font-bold">{metrics.treatmentSuccessRate || "0%"}</p>
            <p className="text-sm text-gray-500">Treatment Success Rate (%)</p>
          </div>
        </div>
        
      </div>

      <div className=" w-full mb-4 bg-white rounded-xl p-4 space-y-4 pl-6 w pr-6 pt-4 pb-4 ">
      <div className="flex justify-center w-full">
        <Button onClick={handleGenerateReport} className="mt-4 w bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 shadow-md transition duration-200">
          Generate Feedback Report
        </Button>
      </div>
      {/* Search Bar */}
      <div className="relative w-1/3 mx-auto mb-6 ">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none ">
          <Search className="h-4 w-4 text-gray-400 " />
        </div>
        <input
          type="text"
          placeholder="Search patients..."
          className="pl-8 pr-3 py-2.5 w-full bg-gray-100 rounded-[10px] text-sm focus:outline-none focus:ring-1 focus:ring-indigo-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      </div>

      <Card>
        {/* Feedback List Table with Scroll */}
        <div className="flex justify-center px-4">
          <div className="w-full max-w-9xl">
            <div className="overflow-hidden rounded-xl max-h-[700px] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 sticky top-0">
                    <th className="px-12 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      NAME
                    </th>
                    <th className="px-12 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      CONTACT
                    </th>
                    <th className="px-12 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredFeedbacks.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-gray-500">
                        No feedback available.
                      </td>
                    </tr>
                  ) : (
                    filteredFeedbacks.map(f => (
                      <tr key={f._id} className="hover:bg-gray-50">
                        <td className="px-12 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {f.patientId?.name || "Unknown Patient"}
                          </div>
                        </td>
                        <td className="px-12 py-4 whitespace-nowrap">
                          <div className="text-sm text-indigo-400">
                            {f.patientId?.email || "N/A"}
                          </div>
                        </td>
                        <td className="px-12 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleViewFeedback(f)}
                            className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-[10px] text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            View Feedback
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>

      {/* Enhanced Hover Panel for Viewing Feedback */}
      {selectedFeedback && (
        <div
          id="backdrop"
          onClick={handleBackgroundClick}
          className={clsx(
            "fixed inset-0 z-50 bg-black/40 transition-opacity duration-500 flex justify-end m-0",
            selectedFeedback ? "visible opacity-100" : "invisible opacity-0"
          )}
          aria-modal={selectedFeedback}
          role="dialog"
          aria-labelledby="panel-title"
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            className={clsx(
              "relative m-6 h-[calc(100%-3rem)] w-[95vw] max-w-xl bg-white rounded-3xl shadow-2xl transition-transform duration-500 flex flex-col",
              selectedFeedback ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-3xl z-10">
              <h2 id="panel-title" className="text-xl font-bold text-gray-800">Client Feedback</h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                aria-label="Close panel"
              >
                <svg className="w-6 h-6 text-gray-600 hover:text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow bg-gray-50">
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start space-x-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-600 text-sm font-semibold">
                      P
                    </span>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-gray-800">Patient Name</p>
                      <p className="mt-1 text-sm text-gray-600">{selectedFeedback.patientId?.name || "Unknown Patient"}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start space-x-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-600 text-sm font-semibold">
                      E
                    </span>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-gray-800">Email</p>
                      <p className="mt-1 text-sm text-gray-600">{selectedFeedback.patientId?.email || "N/A"}</p>
                    </div>
                  </div>
                </div>
                {selectedFeedback.answers.map((a, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-start space-x-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-600 text-sm font-semibold">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-gray-800">
                          {a.questionId?.text || "Unknown Question"}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {typeof a.answer === "object" ? (a.answer.value || "No") : a.answer}
                        </p>
                        {a.answer.details && a.answer.value === "Yes" && (
                          <p className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded-lg">
                            <span className="font-medium">Details:</span> {a.answer.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {selectedFeedback.comments && (
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-start space-x-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-600 text-sm font-semibold">
                        C
                      </span>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-gray-800">Comments</p>
                        <p className="mt-1 text-sm text-gray-600">{selectedFeedback.comments}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-white rounded-b-3xl">
              <Button
                onClick={closeModal}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 py-3 rounded-lg text-base font-medium"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Right-Side Popup for Feedback Report */}
      {showReportPopup && <FeedbackReportPopup onClose={closeReportPopup} />}
    </div>
  );
}