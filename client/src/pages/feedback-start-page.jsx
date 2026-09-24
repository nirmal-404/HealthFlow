import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/card";
import Button from "../components/ui/button";
import { toast } from "react-toastify";
import TokenService from "../services/TokenService"; // Import TokenService for token

export default function FeedbackStartPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("[FeedbackStartPage] Fetching feedbacks...");

        const token = TokenService.getAccessToken(); // Retrieve the access token
        if (!token) {
          throw new Error("No access token found. Please log in again.");
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/feedback/patient/me`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Add the Authorization header with the token
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch feedbacks: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("[FeedbackStartPage] Fetched feedbacks:", data);
        setFeedbacks(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching feedbacks:", error);
        setFeedbacks([]);
        setError("Failed to load feedbacks. Please try again.");
        toast.error("Failed to load feedbacks. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchFeedbacks();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold mb-6">Feedback</h1>
        <Card>
          <p className="text-gray-500">Loading feedbacks...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-6">Feedback</h1>
      {error ? (
        <Card>
          <p className="text-red-500">{error}</p>
        </Card>
      ) : feedbacks.length === 0 ? (
        <Card>
          <p className="text-gray-500">No feedback yet!</p>
        </Card>
      ) : (
        feedbacks.map(feedback => (
          <div key={feedback._id}>
            <Button onClick={() => navigate(`/account/feedback/summary/${feedback._id}`, { state: { feedback } })}>
              View Feedback
            </Button>
          </div>
        ))
      )}
      {/* Always show the "Give Feedback" button */}
      <Card>
        <Button
          className="mt-4 w-full"
          onClick={() => navigate("/account/feedback/create/PE123")}
        >
          Give Feedback
        </Button>
      </Card>
    </div>
  );
}