import TokenService from "./TokenService";
import PDFReportService from "./PDFReportService";

const API_URL = process.env.REACT_APP_API_URL;

export const UserActivityService = {
  /**
   * Fetch activity report with optional date range
   * @param {Date} startDate - Start date for report period
   * @param {Date} endDate - End date for report period
   * @returns {Promise} - Promise with report data
   */
  async getActivityReport(startDate, endDate) {
    try {
      const formattedStartDate = startDate.toISOString().split("T")[0]; // YYYY-MM-DD format
      const formattedEndDate = endDate.toISOString().split("T")[0];

      const response = await fetch(
        `${API_URL}/users/activity-report?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
        {
          headers: {
            Authorization: `Bearer ${TokenService.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        return { success: true, report: data.report };
      } else {
        return { success: false, error: "Failed to fetch report data" };
      }
    } catch (err) {
      console.error("Error fetching activity report:", err);
      return {
        success: false,
        error: err.message || "An error occurred while fetching the report",
      };
    }
  },

  /**
   * Fetch real-time user overview data
   * @returns {Promise} - Promise with overview data
   */
  async getRealtimeOverview() {
    try {
      const response = await fetch(`${API_URL}/users/active-users-overview`, {
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        return { success: true, overview: data.overview };
      } else {
        return { success: false, error: "Failed to fetch overview data" };
      }
    } catch (err) {
      console.error("Error fetching real-time overview:", err);
      return {
        success: false,
        error: err.message || "An error occurred while fetching the overview",
      };
    }
  },

  /**
   * Download activity report in specified format
   * @param {string} format - Report format (json, csv, excel, pdf)
   * @param {Date} startDate - Start date for report period
   * @param {Date} endDate - End date for report period
   * @param {Object} reportData - Current report data (required for PDF)
   * @param {Object} realtimeOverview - Current realtime overview data (required for PDF)
   * @returns {Promise} - Promise that resolves when download is initiated
   */
  async downloadReport(
    format,
    startDate,
    endDate,
    reportData,
    realtimeOverview
  ) {
    try {
      // Handle PDF format specially using client-side generation
      if (format === "pdf") {
        return await this.generateActivityPDFReport(
          startDate,
          endDate,
          reportData,
          realtimeOverview
        );
      }

      const formattedStartDate = startDate.toISOString().split("T")[0];
      const formattedEndDate = endDate.toISOString().split("T")[0];

      // Create URL for download with query parameters (without token in URL)
      const url = `${API_URL}/users/download-activity-report?format=${format}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;

      // Use fetch with proper authorization header to get the file
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${TokenService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.status}`);
      }

      // Get the blob from response
      const blob = await response.blob();

      // Create a filename based on report type and date
      const fileName = `activity-report-${formattedStartDate}-to-${formattedEndDate}.${
        format === "excel" ? "xlsx" : format
      }`;

      // Create a download link and trigger it
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();

      return { success: true };
    } catch (err) {
      console.error("Error downloading report:", err);
      return {
        success: false,
        error: err.message || "Failed to download report",
      };
    }
  },

  /**
   * Generate Activity PDF report specifically for admin dashboard
   * Renamed to avoid collision with other components' downloadReport functions
   */
  async generateActivityPDFReport(
    startDate,
    endDate,
    reportData,
    realtimeOverview
  ) {
    try {
      console.log("Starting PDF report generation process...");

      // Validate input data
      if (!reportData) {
        console.error("Missing report data for PDF generation");
        return {
          success: false,
          error: "Cannot generate PDF: Missing report data",
        };
      }

      if (!startDate || !endDate) {
        console.error("Missing date range for PDF generation");
        return {
          success: false,
          error: "Cannot generate PDF: Invalid date range",
        };
      }

      // Define selectors for charts to capture
      const chartSelectors = [
        ".user-status-chart", // Status distribution pie chart
        ".role-distribution-chart", // Role distribution pie chart
        ".daily-activity-chart", // Daily activity bar chart
      ];

      // Verify charts exist in DOM
      const chartsExist = chartSelectors.some(
        (selector) => document.querySelector(selector) !== null
      );

      if (!chartsExist) {
        console.warn(
          "No chart elements found in the DOM, charts may be missing from the PDF"
        );
      }

      console.log("Attempting to capture chart images...");
      // Capture chart images with timeout to prevent hanging
      let chartImages;
      try {
        // Set timeout for chart capture to prevent hanging
        const capturePromise = PDFReportService.captureCharts(chartSelectors);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Chart capture timed out")), 10000)
        );

        chartImages = await Promise.race([capturePromise, timeoutPromise]);
        console.log("Chart images captured:", chartImages?.length || 0);
      } catch (chartError) {
        console.error("Failed to capture charts:", chartError);
        chartImages = []; // Continue with empty chart images
      }

      // Generate the PDF report
      console.log("Generating PDF report...");
      const pdfBlob = await PDFReportService.generateActivityPDFReport(
        reportData,
        realtimeOverview,
        startDate,
        endDate,
        chartImages
      );

      if (!pdfBlob) {
        throw new Error("PDF generation returned empty result");
      }

      // Create a filename based on report period
      const formattedStartDate = startDate.toISOString().split("T")[0];
      const formattedEndDate = endDate.toISOString().split("T")[0];
      const fileName = `healthflow-system-report-${formattedStartDate}-to-${formattedEndDate}.pdf`;

      // Trigger download
      console.log("Initiating PDF download...");
      try {
        const downloadUrl = window.URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
          window.URL.revokeObjectURL(downloadUrl);
          a.remove();
        }, 100);

        console.log("PDF download initiated successfully");
        return { success: true };
      } catch (downloadError) {
        console.error("Error initiating download:", downloadError);
        return {
          success: false,
          error: `Failed to download PDF: ${downloadError.message}`,
        };
      }
    } catch (err) {
      console.error("Error generating activity PDF report:", err);
      return {
        success: false,
        error: `Failed to generate PDF report: ${err.message}`,
      };
    }
  },

  /**
   * @deprecated - Kept for backward compatibility
   * Use generateActivityPDFReport instead
   */
  async generatePDFReport(startDate, endDate, reportData, realtimeOverview) {
    return this.generateActivityPDFReport(
      startDate,
      endDate,
      reportData,
      realtimeOverview
    );
  },
};

export default UserActivityService;
