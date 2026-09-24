import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";

/**
 * Service for generating professional PDF reports from dashboard data
 */
const PDFReportService = {
  /**
   * Generate a complete PDF report with charts and data
   * @param {Object} reportData - The full report data object
   * @param {Object} realtimeOverview - Realtime data from the dashboard
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @param {Array} chartImages - Array of chart images as base64 strings
   * @returns {Promise<Blob>} - PDF file as blob for download
   */
  generateActivityPDFReport: async (
    reportData,
    realtimeOverview,
    startDate,
    endDate,
    chartImages
  ) => {
    try {
      console.log("Starting PDF generation process...");

      // Validate inputs
      if (!reportData) {
        console.error("Report data is missing or invalid");
        throw new Error("Report data is missing or invalid");
      }

      // Create new PDF document with custom settings
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Get page dimensions
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let yPosition = margin;

      // HEADER SECTION
      // --------------
      // Add professional gradient header background
      const headerHeight = 35;
      doc.setFillColor(41, 121, 255);
      doc.rect(0, 0, pageWidth, headerHeight, "F");

      // Add subtle header decoration
      doc.setFillColor(65, 145, 255);
      doc.rect(0, headerHeight - 4, pageWidth, 4, "F");

      // Set text for header
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("HealthFlow Analytics Report", pageWidth / 2, 20, {
        align: "center",
      });

      // Format dates for subtitle
      let formattedStartDate, formattedEndDate;
      try {
        formattedStartDate = format(new Date(startDate), "MMM dd, yyyy");
        formattedEndDate = format(new Date(endDate), "MMM dd, yyyy");
      } catch (error) {
        console.error("Date formatting error:", error);
        formattedStartDate = "Unknown";
        formattedEndDate = "Unknown";
      }

      // Add date range subtitle
      yPosition = headerHeight + 10;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(12);
      doc.text(
        `Report Period: ${formattedStartDate} to ${formattedEndDate}`,
        pageWidth / 2,
        yPosition,
        {
          align: "center",
        }
      );
      doc.text(
        `Generated on: ${format(new Date(), "MMM dd, yyyy HH:mm")}`,
        pageWidth / 2,
        yPosition + 7,
        {
          align: "center",
        }
      );

      // EXECUTIVE SUMMARY SECTION
      // -------------------------
      yPosition = yPosition + 20;

      // Add section header with subtle separator
      doc.setDrawColor(41, 121, 255);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 121, 255);
      doc.setFontSize(16);
      doc.text("Executive Summary", pageWidth / 2, yPosition + 7, {
        align: "center",
      });

      yPosition = yPosition + 20;

      // Create a 2x3 grid of metric boxes for better layout
      const createMetricBox = (label, value, x, y, width, height) => {
        // Box with rounded corners and subtle shadow effect
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(220, 230, 240);
        doc.roundedRect(x, y, width, height, 3, 3, "FD");

        // Metric label
        doc.setFont("helvetica", "normal");
        doc.setTextColor(90, 90, 90);
        doc.setFontSize(10);
        doc.text(label, x + width / 2, y + 7, { align: "center" });

        // Metric value
        doc.setFont("helvetica", "bold");
        doc.setTextColor(41, 121, 255);
        doc.setFontSize(14);
        doc.text(value.toString(), x + width / 2, y + 20, { align: "center" });
      };

      // Prepare metric data
      const metrics = [
        {
          label: "Total Logins",
          value: reportData?.overview?.totalLogins || 0,
        },
        {
          label: "Active Users (24h)",
          value: realtimeOverview?.activeUsersLast24Hours || 0,
        },
        {
          label: "Failed Login Attempts",
          value: reportData?.overview?.totalFailedAttempts || 0,
        },
        {
          label: "Avg. Logins Per User",
          value: reportData?.overview?.avgLoginsPerUser || 0,
        },
        {
          label: "Users with 2FA",
          value: reportData?.twoFAAdoption?.enabled || 0,
        },
        {
          label: "2FA Adoption Rate",
          value:
            reportData?.twoFAAdoption?.enabled &&
            reportData?.twoFAAdoption?.disabled
              ? `${Math.round(
                  (reportData.twoFAAdoption.enabled /
                    (reportData.twoFAAdoption.enabled +
                      reportData.twoFAAdoption.disabled)) *
                    100
                )}%`
              : "0%",
        },
      ];

      // Display metrics in a grid layout (3 columns, 2 rows)
      const boxWidth = (contentWidth - 10) / 3; // 3 columns with 5px gap
      const boxHeight = 30;

      for (let i = 0; i < metrics.length; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const xPos = margin + col * (boxWidth + 5);
        const yPos = yPosition + row * (boxHeight + 10);

        createMetricBox(
          metrics[i].label,
          metrics[i].value,
          xPos,
          yPos,
          boxWidth,
          boxHeight
        );
      }

      // Update yPosition after metrics
      yPosition += boxHeight * 2 + 30;

      // DATA VISUALIZATIONS SECTION
      // --------------------------
      // Section header
      doc.setDrawColor(41, 121, 255);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 121, 255);
      doc.setFontSize(16);
      doc.text("Data Visualizations", pageWidth / 2, yPosition + 7, {
        align: "center",
      });

      yPosition += 15;

      // Add charts with better sizing and positioning
      if (chartImages && Array.isArray(chartImages) && chartImages.length > 0) {
        try {
          // First check if we need a new page for charts to avoid cutting them off
          const estimatedChartHeight = 220; // Estimated total height needed for charts
          if (yPosition + estimatedChartHeight > pageHeight - 30) {
            doc.addPage();
            yPosition = margin + 10;
          }

          // User Status Chart
          if (chartImages[0]) {
            yPosition += 10;
            doc.setFont("helvetica", "bold");
            doc.setTextColor(80, 80, 80);
            doc.setFontSize(14);
            doc.text("User Status Distribution", pageWidth / 2, yPosition, {
              align: "center",
            });

            yPosition += 10;

            // Calculate optimal dimensions while maintaining aspect ratio
            const maxWidth = contentWidth * 0.7; // Maximum width (70% of content width)
            const maxHeight = 80; // Maximum height

            // Determine actual dimensions to use (maintain aspect ratio)
            let imageWidth = maxWidth;
            let imageHeight = maxHeight;

            try {
              // Create a temporary image to get the actual dimensions
              const img = new Image();
              img.src = chartImages[0];

              // If image loaded, calculate dimensions that maintain aspect ratio
              if (img.width && img.height) {
                const aspectRatio = img.width / img.height;

                // Calculate dimensions that fit within our constraints while maintaining aspect ratio
                if (aspectRatio > 1) {
                  // Wider than tall
                  imageWidth = Math.min(maxWidth, maxHeight * aspectRatio);
                  imageHeight = imageWidth / aspectRatio;
                } else {
                  // Taller than wide or square
                  imageHeight = Math.min(maxHeight, maxWidth / aspectRatio);
                  imageWidth = imageHeight * aspectRatio;
                }
              }
            } catch (err) {
              console.log(
                "Could not determine image dimensions, using defaults"
              );
            }

            // Position image in center
            const xPos = margin + (contentWidth - imageWidth) / 2;

            doc.addImage(
              chartImages[0],
              "PNG",
              xPos,
              yPosition,
              imageWidth,
              imageHeight
            );

            yPosition += imageHeight + 20;
          }

          // Check if we need a new page for the next chart
          if (yPosition + 120 > pageHeight - 30) {
            doc.addPage();
            yPosition = margin + 10;
          }

          // Role Distribution Chart
          if (chartImages[1]) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(80, 80, 80);
            doc.setFontSize(14);
            doc.text("Role Distribution", pageWidth / 2, yPosition, {
              align: "center",
            });

            yPosition += 10;

            // Calculate optimal dimensions while maintaining aspect ratio
            const maxWidth = contentWidth * 0.7; // Maximum width (70% of content width)
            const maxHeight = 80; // Maximum height

            // Determine actual dimensions to use (maintain aspect ratio)
            let imageWidth = maxWidth;
            let imageHeight = maxHeight;

            try {
              // Create a temporary image to get the actual dimensions
              const img = new Image();
              img.src = chartImages[1];

              // If image loaded, calculate dimensions that maintain aspect ratio
              if (img.width && img.height) {
                const aspectRatio = img.width / img.height;

                // Calculate dimensions that fit within our constraints while maintaining aspect ratio
                if (aspectRatio > 1) {
                  // Wider than tall
                  imageWidth = Math.min(maxWidth, maxHeight * aspectRatio);
                  imageHeight = imageWidth / aspectRatio;
                } else {
                  // Taller than wide or square
                  imageHeight = Math.min(maxHeight, maxWidth / aspectRatio);
                  imageWidth = imageHeight * aspectRatio;
                }
              }
            } catch (err) {
              console.log(
                "Could not determine image dimensions, using defaults"
              );
            }

            // Position image in center
            const xPos = margin + (contentWidth - imageWidth) / 2;

            doc.addImage(
              chartImages[1],
              "PNG",
              xPos,
              yPosition,
              imageWidth,
              imageHeight
            );

            yPosition += imageHeight + 20;
          }

          // Check if we need a new page for the bar chart
          if (yPosition + 130 > pageHeight - 30) {
            doc.addPage();
            yPosition = margin + 10;
          }

          // Daily Activity Bar Chart
          if (chartImages[2]) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(80, 80, 80);
            doc.setFontSize(14);
            doc.text("Daily Login Activity", pageWidth / 2, yPosition, {
              align: "center",
            });

            yPosition += 10;

            // Calculate optimal dimensions while maintaining aspect ratio
            const maxWidth = contentWidth * 0.8; // Maximum width (80% of content width)
            const maxHeight = 100; // Maximum height

            // Determine actual dimensions to use (maintain aspect ratio)
            let imageWidth = maxWidth;
            let imageHeight = maxHeight;

            try {
              // Create a temporary image to get the actual dimensions
              const img = new Image();
              img.src = chartImages[2];

              // If image loaded, calculate dimensions that maintain aspect ratio
              if (img.width && img.height) {
                const aspectRatio = img.width / img.height;

                // Calculate dimensions that fit within our constraints while maintaining aspect ratio
                if (aspectRatio > 1) {
                  // Wider than tall
                  imageWidth = Math.min(maxWidth, maxHeight * aspectRatio);
                  imageHeight = imageWidth / aspectRatio;
                } else {
                  // Taller than wide or square
                  imageHeight = Math.min(maxHeight, maxWidth / aspectRatio);
                  imageWidth = imageHeight * aspectRatio;
                }
              }
            } catch (err) {
              console.log(
                "Could not determine image dimensions, using defaults"
              );
            }

            // Position image in center
            const xPos = margin + (contentWidth - imageWidth) / 2;

            doc.addImage(
              chartImages[2],
              "PNG",
              xPos,
              yPosition,
              imageWidth,
              imageHeight
            );

            yPosition += imageHeight + 20;
          }
        } catch (chartError) {
          console.error("Error adding charts:", chartError);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(10);
          doc.text("Error displaying charts", margin, yPosition);
          yPosition += 10;
        }
      } else {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text("No chart data available", pageWidth / 2, yPosition + 10, {
          align: "center",
        });
        yPosition += 20;
      }

      // DETAILED DATA SECTION
      // --------------------
      // Always start detailed data on a new page
      doc.addPage();
      yPosition = margin;

      // Section header with decoration
      doc.setDrawColor(41, 121, 255);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 121, 255);
      doc.setFontSize(16);
      doc.text("Detailed Activity Data", pageWidth / 2, yPosition + 7, {
        align: "center",
      });

      yPosition += 20;

      // Add activity data table if available
      if (
        reportData?.dailyActivity &&
        Array.isArray(reportData.dailyActivity) &&
        reportData.dailyActivity.length > 0
      ) {
        try {
          // Prepare table data
          const tableData = reportData.dailyActivity.map((item) => [
            item.date || "Unknown",
            (item.loginCount || 0).toString(),
            ((item.successRate || 0) * 100).toFixed(1) + "%",
          ]);

          // Create table with improved styling
          doc.autoTable({
            head: [["Date", "Login Count", "Success Rate"]],
            body: tableData,
            startY: yPosition,
            theme: "grid",
            styles: {
              fontSize: 10,
              cellPadding: 5,
              overflow: "linebreak",
              valign: "middle",
              halign: "center",
            },
            headStyles: {
              fillColor: [41, 121, 255],
              textColor: [255, 255, 255],
              fontStyle: "bold",
              halign: "center",
            },
            alternateRowStyles: {
              fillColor: [245, 247, 250],
            },
            // More professional table styling
            margin: { top: yPosition },
            tableWidth: "auto",
            columnStyles: {
              0: { cellWidth: "auto" },
              1: { cellWidth: "auto", halign: "right" },
              2: { cellWidth: "auto", halign: "right" },
            },
          });

          // Update yPosition after table
          yPosition = doc.lastAutoTable.finalY + 10;
        } catch (tableError) {
          console.error("Error creating table:", tableError);

          // Fallback if table fails
          doc.text("Error creating detailed data table", margin, yPosition);
          yPosition += 10;
        }
      } else {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        doc.text("No activity data available", pageWidth / 2, yPosition, {
          align: "center",
        });
      }

      // Add footer to each page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);

        // Footer with gradient line
        doc.setDrawColor(41, 121, 255, 0.5);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

        // Page number with improved styling
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 10,
          {
            align: "right",
          }
        );

        // Confidentiality note
        doc.text(
          "CONFIDENTIAL - HealthFlow Analytics Report",
          margin,
          pageHeight - 10
        );
      }

      // Return the PDF as a blob
      return doc.output("blob");
    } catch (error) {
      console.error("Critical error during PDF generation:", error);
      throw new Error(`Failed to generate PDF report: ${error.message}`);
    }
  },

  /**
   * Capture chart elements as images for PDF
   * @param {string[]} chartSelectors - CSS selectors for chart elements
   * @returns {Promise<string[]>} - Array of base64-encoded images
   */
  captureCharts: async (chartSelectors) => {
    try {
      if (!chartSelectors || !Array.isArray(chartSelectors)) {
        return [];
      }

      const chartImages = [];

      // Import html2canvas
      try {
        const html2canvas = await import("html2canvas").then(
          (module) => module.default
        );

        // Process each chart selector
        for (const selector of chartSelectors) {
          try {
            const element = document.querySelector(selector);

            if (element) {
              // Add delay to ensure charts are rendered
              await new Promise((resolve) => setTimeout(resolve, 200));

              const canvas = await html2canvas(element, {
                scale: 3, // Higher resolution for better quality
                backgroundColor: "#ffffff",
                logging: false,
                useCORS: true, // Allow cross-origin images
                allowTaint: true, // Allow tainted canvas
              });

              chartImages.push(canvas.toDataURL("image/png"));
            } else {
              chartImages.push(null);
            }
          } catch (err) {
            console.error(`Error capturing chart for ${selector}:`, err);
            chartImages.push(null);
          }
        }
      } catch (importError) {
        console.error("Failed to import html2canvas:", importError);
        return [];
      }

      return chartImages;
    } catch (error) {
      console.error("Error in captureCharts:", error);
      return [];
    }
  },
};

export default PDFReportService;
