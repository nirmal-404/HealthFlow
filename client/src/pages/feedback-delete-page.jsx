import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Button from "../components/ui/button";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import clsx from "clsx";
import TokenService from "../services/TokenService";

export default function FeedbackDeletePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [feedback, setFeedback] = useState(location.state?.feedback || null);
  const [loading, setLoading] = useState(!location.state?.feedback);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = TokenService.getAccessToken();
        if (!token) {
          throw new Error("No access token found. Please log in again.");
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/feedback/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch feedback: ${response.statusText}`);
        }
        const data = await response.json();
        setFeedback(data);
      } catch (error) {
        console.error("Error fetching feedback:", error);
        setError("Failed to load feedback. Please try again.");
        toast.error("Failed to load feedback. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (!feedback) {
      fetchFeedback();
    } else {
      setLoading(false);
    }
  }, [id, feedback]);

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

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        navigate(`/account/feedback/summary/${id}`, { state: { feedback } });
      }
    };

    document.addEventListener("keydown", handleEscape);
    if (panelRef.current) {
      panelRef.current.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [navigate, id, feedback]);

  const handleDelete = async () => {
    try {
      const token = TokenService.getAccessToken();
      if (!token) {
        throw new Error("No access token found. Please log in again.");
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/feedback/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Feedback deleted successfully!");
        navigate(`/account/feedback/summary/${id}`);
      } else {
        toast.error(data.message || "Error deleting feedback");
      }
    } catch (error) {
      toast.error("Error deleting feedback");
    }
  };

  const handleBackgroundClick = (e) => {
    if (e.target.id === "backdrop") {
      navigate(`/account/feedback/summary/${id}`, { state: { feedback } });
    }
  };

  const handleClose = () => {
    navigate(`/account/feedback/summary/${id}`, { state: { feedback } });
  };

  return (
    <div
      id="backdrop"
      onClick={handleBackgroundClick}
      className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 flex justify-end m-0"
      aria-modal="true"
      role="dialog"
      aria-labelledby="panel-title"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative m-4 h-[calc(100%-2rem)] w-[90vw] max-w-xl bg-white rounded-2xl shadow-xl transition-transform duration-300 flex flex-col translate-x-0"
      >
        <div className="flex justify-between items-center p-4 border-b sticky top-0 rounded-t-lg z-10">
          <h2 id="panel-title" className="text-lg font-semibold">Delete Feedback</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-black" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-grow">
          {loading ? (
            <p className="text-gray-500">Loading feedback...</p>
          ) : error ? (
            <div className="space-y-4">
              <p className="text-red-500">{error}</p>
              <Button className="mt-4" onClick={() => navigate("/account/feedback/summary")}>
                Back to Feedback
              </Button>
            </div>
          ) : timeRemaining <= 0 ? (
            <div className="space-y-4">
              <p className="text-red-500">The delete window has expired (10 minutes).</p>
              <Button
                className="mt-4"
                onClick={() => navigate(`/account/feedback/summary/${id}`, { state: { feedback } })}
              >
                Back to Summary
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to delete this feedback? This action cannot be undone.
              </p>
              <p className="text-sm text-gray-500">
                Time remaining to delete: {Math.floor(timeRemaining / 60)}:
                {(timeRemaining % 60).toString().padStart(2, "0")}
              </p>
              <div className="flex space-x-2">
                <Button variant="danger" onClick={handleDelete}>
                  Delete Feedback
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/account/feedback/summary/${id}`, { state: { feedback } })}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}