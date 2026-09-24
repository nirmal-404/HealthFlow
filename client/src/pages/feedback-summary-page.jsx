import { useEffect, useState, useRef } from "react";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import TokenService from "../services/TokenService"; // Import TokenService for token
import { useLinkedRecordContext } from "../context/LinkedRecordContext"; // Import LinkedRecordContext
import clsx from "clsx";

export default function FeedbackSummaryPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [doctorNames, setDoctorNames] = useState({}); // Store doctor names by encounterId
  const { linkedRecordIds } = useLinkedRecordContext(); // Get linkedRecordIds from context
  const panelRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = TokenService.getAccessToken(); // Retrieve the access token
        if (!token) {
          throw new Error("No access token found. Please log in again.");
        }

        // Fetch feedback data
        const feedbackResponse = await fetch(`${process.env.REACT_APP_API_URL}/feedback/patient/me`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!feedbackResponse.ok) {
          throw new Error("Failed to fetch feedback");
        }
        const feedbackData = await feedbackResponse.json();
        const sortedData = Array.isArray(feedbackData)
          ? feedbackData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : [];
        setFeedbacks(sortedData);

        // Fetch encounters for all linked records
        const doctorNamesMap = {};
        if (!linkedRecordIds || linkedRecordIds.length === 0) {
          // If no linked records, set all doctor names to "Unknown"
          sortedData.forEach((feedback) => {
            doctorNamesMap[feedback.encounterId] = "Unknown";
          });
        } else {
          // Fetch encounters for each linked record
          const allEncounters = await Promise.all(
            linkedRecordIds.map(async (recordId) => {
              try {
                const response = await fetch(
                  `${process.env.REACT_APP_API_URL}/encounters/by-record/${recordId}`,
                  {
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                if (!response.ok) {
                  console.warn(`Failed to fetch encounters for record ${recordId}`);
                  return [];
                }
                return await response.json();
              } catch (err) {
                console.error(`Error fetching encounters for record ${recordId}:`, err);
                return [];
              }
            })
          );

          // Combine encounters and create mapping of encounter _id to provider name
          const encounters = allEncounters.flat();
          encounters.forEach((encounter) => {
            doctorNamesMap[encounter._id] = encounter.provider?.name || "Unknown";
          });

          // Set "Unknown" for any feedback encounterId not found in encounters
          sortedData.forEach((feedback) => {
            if (!doctorNamesMap[feedback.encounterId]) {
              doctorNamesMap[feedback.encounterId] = "Unknown";
            }
          });
        }

        setDoctorNames(doctorNamesMap);
      } catch (error) {
        console.error("[FeedbackSummaryPage] Error fetching data:", error.message);
        toast.error("Failed to load feedback.");
        setFeedbacks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [linkedRecordIds]);

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
        <h1 className="text-2xl font-bold mb-6">Feedback Summary</h1>
        <Card>
          <p className="text-gray-500">Loading feedback...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pl-6 pr-6 pt-4 pb-4">
      <h1 className="text-2xl font-bold mb-6">Feedback Summary</h1>
      <Card>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-3xl font-bold">{feedbacks.length}</p>
          <p className="text-sm text-gray-500">Total Feedback Submitted</p>
        </div>
      </Card>
      <Card>
        <div className="flex justify-center px-4">
          <div className="w-full max-w-9xl">
            <div className="overflow-hidden rounded-xl max-h-[700px] overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 sticky top-0">
                    <th className="px-12 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      DOCTOR NAME
                    </th>
                    <th className="px-12 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      SUBMITTED AT
                    </th>
                    <th className="px-12 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {feedbacks.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-gray-500">
                        No feedback available.
                      </td>
                    </tr>
                  ) : (
                    feedbacks.map(f => {
                      const now = new Date();
                      const createdAt = new Date(f.createdAt);
                      const diffInMinutes = (now - createdAt) / (1000 * 60);
                      const canEditOrDelete = diffInMinutes <= 10;

                      return (
                        <tr key={f._id} className="hover:bg-gray-50">
                          <td className="px-12 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {doctorNames[f.encounterId] || "Unknown"}
                            </div>
                          </td>
                          <td className="px-12 py-4 whitespace-nowrap">
                            <div className="text-sm text-indigo-400">
                              {new Date(f.createdAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-12 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleViewFeedback(f)}
                              className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-[10px] text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-2"
                            >
                              View Feedback
                            </button>
                            {canEditOrDelete && (
                              <>
                                <Link
                                  to={`/account/feedback/edit/${f._id}`}
                                  state={{ feedback: f }}
                                  className="mr-2"
                                >
                                  <button
                                    className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-[10px] text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                  >
                                    Edit
                                  </button>
                                </Link>
                                <Link
                                  to={`/account/feedback/delete/${f._id}`}
                                  state={{ feedback: f }}
                                >
                                  <button
                                    className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-[10px] text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                  >
                                    Delete
                                  </button>
                                </Link>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
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
              <h2 id="panel-title" className="text-xl font-bold text-gray-800">Feedback Details</h2>
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
    </div>
  );
}