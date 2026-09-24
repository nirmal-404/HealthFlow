import { useEffect, useState } from "react";
import Button from "../components/ui/button";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import { X } from "lucide-react";

export default function FeedbackReportPopup({ onClose }) {
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState("");

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
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/feedback/report/generate`);
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token");
            toast.error("Session expired. Please log in again.");
            onClose();
            return;
          }
          throw new Error("Failed to generate report");
        }
        const data = await response.json();
        setAiAnalysis(data.aiAnalysis || "No analysis available.");
        setReportData(data.reportData || []);
      } catch (error) {
        console.error("[FeedbackReportPopup] Error fetching report:", error.message);
        toast.error(error.message || "Failed to load report.");
        setAiAnalysis("Error generating AI analysis.");
        setReportData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  const parseAiAnalysis = (analysis) => {
    if (!analysis || typeof analysis !== "string") {
      return [];
    }
    const sections = analysis.split(/(?=## )/);
    return sections.map(section => {
      const lines = section.split("\n");
      const heading = lines[0].startsWith("## ") ? lines[0].replace("## ", "") : null;
      const content = lines.slice(1).join("\n").trim();
      return { heading, content };
    }).filter(section => section.heading && section.content);
  };

  const downloadReport = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
  
      // Add letterhead image as background layer (full page)
      const letterheadImg = "/letterhead.png"; // Adjust path or use URL
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      try {
        doc.addImage(
          letterheadImg,
          "PNG", // Image format
          0, // x position (full width)
          0, // y position (top)
          pageWidth, // Scale to page width
          pageHeight, // Scale to page height
          undefined,
          "FAST" // Compression for performance
        );
      } catch (imgError) {
        console.error("[FeedbackReportPopup] Error loading letterhead image:", imgError.message);
        toast.error("Failed to load letterhead image. Generating PDF without background.");
      }
  
      // Set margins and text width for centering
      const textWidth = 150; // Narrowed text width in mm
      const leftMargin = (pageWidth - textWidth) / 2; // Center the text block
      const topMargin = 60; // Start text in clear area
      let y = topMargin;
  
      // Add top line above title
      doc.setLineWidth(0.5);
      doc.setDrawColor(119,136,153); // Light gray color for the line
      doc.line(leftMargin, y - 5, leftMargin + textWidth, y - 5); // Line above title
      y += 7;


      // Add title (foreground layer, centered)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0); // Black text for visibility
      const title = "Feedback Report - AI Analysis";
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (pageWidth - titleWidth) / 2, y); // Center title
      y += 7;
  
      // Add bottom line below title
      doc.line(leftMargin, y, leftMargin + textWidth, y); // Line below title
      y += 20; // Space after title and line
  
      // Add AI analysis sections (foreground layer)
      const sections = parseAiAnalysis(aiAnalysis);
      if (sections.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const noDataText = "No AI analysis data available.";
        const noDataWidth = doc.getTextWidth(noDataText);
        doc.text(noDataText, (pageWidth - noDataWidth) / 2, y); // Center text
        y += 10;
      } else {
        sections.forEach(section => {
          // Check for page overflow and add new page if needed
          if (y > 270) { // A4 height is 297mm, leave 20mm bottom margin
            doc.addPage();
            y = topMargin; // Reset y for new page
            // Repeat letterhead as background on new pages
            try {
              doc.addImage(letterheadImg, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
            } catch (imgError) {
              console.error("[FeedbackReportPopup] Error loading letterhead image on new page:", imgError.message);
            }
          }
  
          // Add section heading (centered)
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          const headingWidth = doc.getTextWidth(section.heading);
          doc.text(section.heading, (pageWidth - headingWidth) / 2, y); // Center heading
          y += 5;
  
          // Add section content (justified within narrowed width)
          doc.setFont("helvetica", "normal");
          doc.setFontSize(12);
          const splitContent = doc.splitTextToSize(section.content, textWidth);
          splitContent.forEach(line => {
            const lineWidth = doc.getTextWidth(line);
            doc.text(line, (pageWidth - lineWidth) / 2, y); // Center each line
            y += 5;
          });
          y += 15; // Increased gap after each section
        });
      }
  
      // Add footer (foreground layer, page numbers, centered)
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const pageText = `Page ${i} of ${pageCount}`;
        const pageTextWidth = doc.getTextWidth(pageText);
        doc.text(pageText, (pageWidth - pageTextWidth) / 2, 290); // Center footer
      }
  
      // Save the PDF
      doc.save("feedback-report-ai-analysis.pdf");
      toast.success("AI analysis report downloaded successfully!");
    } catch (error) {
      console.error("[FeedbackReportPopup] Error downloading report:", error.message);
      toast.error(error.message || "Failed to download report.");
    }
  };

  const handleClose = (e) => {
    e.stopPropagation();
    console.log("[FeedbackReportPopup] Close button clicked");
    onClose();
  };

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

  const handleBackgroundClick = (e) => {
    if (e.target.id === "backdrop") {
      onClose();
    }
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
        className="relative m-4 h-[calc(100%-2rem)] w-[90vw] max-w-xl bg-white rounded-2xl shadow-xl transition-transform duration-30 flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b sticky top-0 rounded-t-lg z-10">
          <h2 id="panel-title" className="text-lg font-semibold">AI Analysis Report</h2>
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
            <p className="text-gray-500">Generating report...</p>
          ) : (
            <div className="space-y-4">
              {/* AI Analysis Box */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <h3 className="text-md font-medium mb-2">AI Analysis</h3>
                <div className="text-sm text-gray-600">
                  {parseAiAnalysis(aiAnalysis).map((section, index) => (
                    <div key={index} className="mb-4">
                      <h4 className="text-lg font-bold text-gray-800">{section.heading}</h4>
                      <p className="mt-1">{section.content}</p>
                    </div>
                  ))}
                </div>
                <Button onClick={downloadReport}>Download Report as PDF</Button>
              </div>

              {/* Ask AI Box */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                <h3 className="text-md font-medium mb-2">Ask the AI About Feedback Data</h3>
                
                {/* Suggested Questions */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Suggested Questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestedQuestion(question)}
                        className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat History */}
                <div className="border rounded-lg p-4 h-48 overflow-y-auto mb-4">
                  {chatHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">Start by asking a question or selecting a suggestion above.</p>
                  ) : (
                    chatHistory.map((chat, index) => (
                      <div
                        key={index}
                        className={`mb-2 ${chat.sender === "Doctor" ? "text-right" : "text-left"}`}
                      >
                        <p className={`inline-block p-2 rounded-lg ${chat.sender === "Doctor" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
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
                  <Button onClick={() => handleAskQuestion(userInput)}>Ask</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}