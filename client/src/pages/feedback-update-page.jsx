import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Button from "../components/ui/button";
import { toast } from "react-toastify";
import TokenService from "../services/TokenService";
import { X, User, Calendar, Stethoscope } from "lucide-react";
import { useLinkedRecordContext } from "../context/LinkedRecordContext";

export default function FeedbackUpdatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { linkedRecordIds } = useLinkedRecordContext();
  const [feedback, setFeedback] = useState(location.state?.feedback || null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [comments, setComments] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(!location.state?.feedback);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [encounterData, setEncounterData] = useState({
    doctorName: "Unknown",
    diagnosis: "Unknown",
    encounterDate: new Date().toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }),
  });
  const totalPages = 3;

  useEffect(() => {
    const fetchFeedbackAndQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = TokenService.getAccessToken();
        if (!token) {
          throw new Error("No access token found. Please log in again.");
        }

        // Fetch questions
        const questionsResponse = await fetch(`${process.env.REACT_APP_API_URL}/feedback/questions/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!questionsResponse.ok) {
          const errorText = await questionsResponse.text();
          throw new Error(`Failed to fetch questions: ${questionsResponse.status} ${questionsResponse.statusText} - ${errorText}`);
        }
        const questionsData = await questionsResponse.json();
        setQuestions(Array.isArray(questionsData) ? questionsData : []);

        // Fetch feedback if not provided
        let feedbackData = feedback;
        if (!feedback) {
          const feedbackResponse = await fetch(`${process.env.REACT_APP_API_URL}/feedback/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          if (!feedbackResponse.ok) {
            const errorText = await feedbackResponse.text();
            throw new Error(`Failed to fetch feedback: ${feedbackResponse.status} ${feedbackResponse.statusText} - ${errorText}`);
          }
          feedbackData = await feedbackResponse.json();
          setFeedback(feedbackData);
        }

        // Set comments and answers
        setComments(feedbackData?.comments || "");
        const initialAnswers = {};
        if (feedbackData?.answers) {
          feedbackData.answers.forEach((a) => {
            const questionId = typeof a.questionId === "object" ? a.questionId?._id : a.questionId;
            const question = questionsData.find((q) => q._id === questionId);
            if (question) {
              initialAnswers[questionId] = question.hasDetails
                ? { value: a.answer?.value || "", details: a.answer?.details || "" }
                : a.answer || "";
            }
          });
        }
        setAnswers(initialAnswers);

        // Fetch encounter data
        const encounterId = feedbackData?.encounterId;
        let doctorName = "Unknown";
        let diagnosis = "Unknown";
        let encounterDate = new Date().toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        });

        // Fetch diagnosis and date
        if (encounterId) {
          console.log("[FeedbackUpdatePage] Fetching encounter for encounterId:", encounterId);
          const encounterResponse = await fetch(`${process.env.REACT_APP_API_URL}/encounters/${encounterId}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (encounterResponse.ok) {
            const encounter = await encounterResponse.json();
            diagnosis = encounter.diagnosis || "Unknown";
            encounterDate = encounter.dateTime
              ? new Date(encounter.dateTime).toLocaleDateString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                  year: "numeric",
                })
              : encounterDate;
          } else {
            console.warn(`[FeedbackUpdatePage] Failed to fetch encounter: ${encounterResponse.statusText}`);
          }
        }

        // Fetch doctor name using linked records
        if (encounterId && linkedRecordIds?.length > 0) {
          const allEncounters = await Promise.all(
            linkedRecordIds.map(async (recordId) => {
              try {
                console.log("[FeedbackUpdatePage] Fetching encounters for recordId:", recordId);
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

          // Find matching encounter
          const encounters = allEncounters.flat();
          const matchingEncounter = encounters.find((enc) => enc._id === encounterId);
          doctorName = matchingEncounter?.provider?.name || "Unknown";
        }

        setEncounterData({ doctorName, diagnosis, encounterDate });
      } catch (error) {
        console.error("[FeedbackUpdatePage] Error fetching data:", error);
        setError(error.message || "Failed to load feedback or questions. Please try again.");
        toast.error(error.message || "Failed to load feedback or questions. Please try again.");
        if (error.message.includes("401")) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackAndQuestions();
  }, [id, feedback, navigate, linkedRecordIds]);

  useEffect(() => {
    if (feedback) {
      const createdAt = new Date(feedback.createdAt);
      const now = new Date();
      const diffInSeconds = Math.max(0, 600 - Math.floor((now - createdAt) / 1000));
      setTimeRemaining(diffInSeconds);

      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [feedback]);

  const validateNumberInput = (questionText, value) => {
    if (questionText === "How many days did it take for you to feel noticeable improvement?") {
      const num = parseInt(value);
      if (value !== "" && (isNaN(num) || num < 0 || num > 30)) {
        return "Please enter a number between 0 and 30.";
      }
    }
    if (questionText === "How would you rate your overall health improvement after the consultation?") {
      const num = parseInt(value);
      if (value !== "" && (isNaN(num) || num < 0 || num > 5)) {
        return "Please enter a number between 0 and 5.";
      }
    }
    return null;
  };

  const badWords = ["fuck", "shit", "asshole", "damn", "bitch"];
  const checkForBadWords = (text) => {
    const lowerText = text.toLowerCase();
    return badWords.some((word) => lowerText.includes(word));
  };

  const handleAnswerChange = (questionId, value, details = "", isDetailsUpdate = false) => {
    const question = questions.find((q) => q._id === questionId);
    if (!question) return;

    if (question.type === "number") {
      const error = validateNumberInput(question.text, value);
      if (error) {
        toast.error(error);
        return;
      }
      setAnswers((prev) => ({
        ...prev,
        [questionId]: value,
      }));
    } else if (question.type === "yesNoWithDetails") {
      const currentAnswer = answers[questionId] || { value: "", details: "" };
      if (isDetailsUpdate) {
        setAnswers((prev) => ({
          ...prev,
          [questionId]: { value: currentAnswer.value, details: value },
        }));
      } else {
        const isSelected = currentAnswer.value === value;
        const newAnswer = isSelected ? { value: "", details: "" } : { value, details: currentAnswer.details || "" };
        setAnswers((prev) => ({
          ...prev,
          [questionId]: newAnswer,
        }));
      }
    } else {
      const currentAnswer = answers[questionId];
      const isSelected = currentAnswer === value;
      const newAnswer = isSelected ? "" : value;
      setAnswers((prev) => ({
        ...prev,
        [questionId]: newAnswer,
      }));
    }
  };

  const validatePage = () => {
    if (currentPage === totalPages) {
      return true;
    }
    const startIndex = currentPage === 1 ? 0 : Math.ceil(questions.length / 2);
    const endIndex = currentPage === 1 ? Math.ceil(questions.length / 2) : questions.length;
    const pageQuestions = questions.slice(startIndex, endIndex);

    return pageQuestions.every((q) => {
      const answer = answers[q._id];
      if (!answer && answer !== 0) return false;
      if (q.hasDetails && answer?.value === "Yes" && !answer.details) return false;
      return true;
    });
  };

  const handleNext = () => {
    if (!validatePage()) {
      toast.error("Please answer all questions on this page.");
      return;
    }
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validatePage()) {
      toast.error("Please answer all questions.");
      return;
    }

    if (checkForBadWords(comments)) {
      toast.error("Comments contain inappropriate language. Please remove bad words.");
      return;
    }

    const formattedAnswers = Object.keys(answers).map((questionId) => ({
      questionId,
      answer: answers[questionId],
    }));

    try {
      const token = TokenService.getAccessToken();
      if (!token) {
        throw new Error("No access token found. Please log in again.");
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/feedback/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: formattedAnswers, comments }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Feedback updated successfully!");
        navigate(`/account/feedback/summary/${id}`, { state: { feedback: data } });
      } else {
        throw new Error(data.message || `Error updating feedback: ${response.status}`);
      }
    } catch (error) {
      console.error("[FeedbackUpdatePage] Error submitting feedback:", error);
      toast.error(error.message || "Error updating feedback");
      if (error.message.includes("401")) {
        navigate("/login");
      }
    }
  };

  const renderQuestion = (question, index) => {
    const answer = answers[question._id] || (question.hasDetails ? { value: "", details: "" } : "");
    const isCustomNumberInput = [
      "How many days did it take for you to feel noticeable improvement?",
      "How would you rate your overall health improvement after the consultation?",
    ].includes(question.text);

    const options = question.type === "multipleChoice" ? question.options : ["Yes", "No"];

    const handleIncrement = () => {
      const currentValue = parseInt(answer) || 0;
      let newValue = currentValue + 1;
      if (question.text === "How would you rate your overall health improvement after the consultation?") {
        newValue = Math.min(newValue, 5);
      } else if (question.text === "How many days did it take for you to feel noticeable improvement?") {
        newValue = Math.min(newValue, 30);
      }
      handleAnswerChange(question._id, newValue.toString());
    };

    const handleDecrement = () => {
      const currentValue = parseInt(answer) || 0;
      let newValue = currentValue - 1;
      if (question.text === "How would you rate your overall health improvement after the consultation?") {
        newValue = Math.max(newValue, 0);
      } else if (question.text === "How many days did it take for you to feel noticeable improvement?") {
        newValue = Math.max(newValue, 0);
      }
      handleAnswerChange(question._id, newValue.toString());
    };

    return (
      <div key={question._id} className="mb-4 p-5 bg-white rounded-xl shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">{question.text}</label>
        {question.type === "number" && isCustomNumberInput ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDecrement}
              className="h-9 w-9 flex items-center justify-center text-sm rounded-xl border bg-white border-gray-300 text-gray-700 hover:bg-blue-50 transition-colors duration-200"
            >
              −
            </button>
            <input
              type="number"
              value={answer}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              className="h-9 w-16 text-center text-sm border border-gray-300 rounded-xl py-0 px-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="button"
              onClick={handleIncrement}
              className="h-9 w-9 flex items-center justify-center text-sm rounded-xl border bg-white border-gray-300 text-gray-700 hover:bg-blue-50 transition-colors duration-200"
            >
              +
            </button>
          </div>
        ) : question.type === "number" ? (
          <input
            type="number"
            value={answer}
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
            className="block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleAnswerChange(question._id, option)}
                className={`text-sm py-1 px-3 rounded-xl border transition-colors duration-200 ${
                  (question.type === "yesNoWithDetails" ? answer.value === option : answer === option)
                    ? "bg-blue-100 border-blue-300 text-blue-700"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
        {question.type === "yesNoWithDetails" && answer.value === "Yes" && (
          <input
            type="text"
            placeholder="Please specify"
            value={answer.details}
            onChange={(e) => handleAnswerChange(question._id, e.target.value, undefined, true)}
            className="mt-2 block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        )}
      </div>
    );
  };

  const handleBackgroundClick = (e) => {
    if (e.target.id === "backdrop") {
      navigate(`/account/feedback/summary/${id}`, { state: { feedback } });
    }
  };

  if (loading) {
    return (
      <div id="backdrop" className="fixed inset-0 z-50 bg-black/50 flex justify-end m-0">
        <div className="relative m-6 h-[calc(100%-3rem)] w-[90vw] max-w-xl bg-white rounded-2xl shadow-xl flex flex-col p-6">
          <p className="text-gray-500">Loading feedback and questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div id="backdrop" className="fixed inset-0 z-50 bg-black/50 flex justify-end m-0">
        <div className="relative m-6 h-[calc(100%-3rem)] w-[90vw] max-w-xl bg-white rounded-2xl shadow-xl flex flex-col p-6">
          <p className="text-red-500">{error}</p>
          <Button className="mt-6 py-2 px-5 rounded-xl" onClick={() => navigate("/account/feedback")}>
            Back to Feedback
          </Button>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div id="backdrop" className="fixed inset-0 z-50 bg-black/50 flex justify-end m-0">
        <div className="relative m-6 h-[calc(100%-3rem)] w-[90vw] max-w-xl bg-white rounded-2xl shadow-xl flex flex-col p-6">
          <p className="text-red-500">No feedback data available.</p>
          <Button className="mt-6 py-2 px-5 rounded-xl" onClick={() => navigate("/account/feedback")}>
            Back to Feedback
          </Button>
        </div>
      </div>
    );
  }

  if (timeRemaining <= 0) {
    return (
      <div id="backdrop" className="fixed inset-0 z-50 bg-black/50 flex justify-end m-0">
        <div className="relative m-6 h-[calc(100%-3rem)] w-[90vw] max-w-xl bg-white rounded-2xl shadow-xl flex flex-col p-6">
          <p className="text-red-500">The edit window has expired (10 minutes).</p>
          <Button
            className="mt-6 py-2 px-5 rounded-xl"
            onClick={() => navigate(`/account/feedback/summary/${id}`, { state: { feedback } })}
          >
            Back to Summary
          </Button>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div id="backdrop" className="fixed inset-0 z-50 bg-black/50 flex justify-end m-0">
        <div className="relative m-6 h-[calc(100%-3rem)] w-[90vw] max-w-xl bg-white rounded-2xl shadow-xl flex flex-col p-6">
          <p className="text-red-500">No questions available to edit feedback.</p>
          <Button
            className="mt-6 py-2 px-5 rounded-xl"
            onClick={() => navigate(`/account/feedback/summary/${id}`, { state: { feedback } })}
          >
            Back to Summary
          </Button>
        </div>
      </div>
    );
  }

  const startIndex = currentPage === 1 ? 0 : Math.ceil(questions.length / 2);
  const endIndex = currentPage === 1 ? Math.ceil(questions.length / 2) : questions.length;
  const currentQuestions = questions.slice(startIndex, endIndex);

  return (
    <div
      id="backdrop"
      onClick={handleBackgroundClick}
      className="fixed inset-0 z-50 bg-black/50 flex justify-end m-0"
      aria-modal="true"
      role="dialog"
      aria-labelledby="panel-title"
    >
      <div className="relative m-6 h-[calc(100%-3rem)] w-[90vw] max-w-xl bg-white rounded-2xl shadow-xl flex flex-col">
        <div className="p-6 border-b sticky top-0 rounded-t-2xl z-10 bg-white">
          <div className="flex justify-between items-center">
            <h2 id="panel-title" className="text-xl font-medium opacity-70">
             Encounter ID <span className="opacity-60 text-base"> #{feedback.encounterId || "Unknown"}</span>
          </h2>
            <button
              onClick={() => navigate(`/account/feedback/summary/${id}`, { state: { feedback } })}
              className="p-2 rounded-xl hover:bg-gray-100"
              aria-label="Close panel"
            >
              <X className="w-6 h-6 text-gray-500 hover:text-black" />
            </button>
          </div>
          <hr className="my-4 border-gray-200" />
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <span className="font-semibold text-blue-600">{encounterData.doctorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span>{encounterData.encounterDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-gray-500" />
              <span className="font-semibold text-blue-600">{encounterData.diagnosis}</span>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col justify-between flex-grow overflow-hidden">
          <div className="overflow-y-auto flex-grow">
            <div className="flex justify-center items-center mb-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-xl ${
                      currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < totalPages - 1 && (
                    <div
                      className={`h-1 w-12 ${currentPage > i + 1 ? "bg-blue-600" : "bg-gray-200"}`}
                    />
                  )}
                </div>
              ))}
            </div>
            {currentPage === totalPages ? (
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">Other Comments</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="4"
                />
              </div>
            ) : currentQuestions.length ? (
              <div className="space-y-4">{currentQuestions.map((question, index) => renderQuestion(question, index))}</div>
            ) : (
              <p className="text-gray-500 text-center">No questions available for this page.</p>
            )}
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Time remaining to edit: {Math.floor(timeRemaining / 60)}:
                {(timeRemaining % 60).toString().padStart(2, "0")}
              </p>
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <Button
              variant="secondary"
              onClick={
                currentPage === 1
                  ? () => navigate(`/account/feedback/summary/${id}`, { state: { feedback } })
                  : handlePrevious
              }
              className="py-2 px-5 rounded-xl"
            >
              {currentPage === 1 ? "Cancel" : "Previous"}
            </Button>
            <Button
              onClick={currentPage === totalPages ? handleSubmit : handleNext}
              className="py-2 px-5 rounded-xl"
            >
              {currentPage === totalPages ? "Save" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}