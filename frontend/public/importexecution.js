document.addEventListener("DOMContentLoaded", () => {
  const toggleImportExecutionButton = document.getElementById("toggleImportExecutionButton");
  const closeImportExecutionModal = document.getElementById("closeImportExecutionModal");
  const importExecutionContainer = document.getElementById("importExecutionContainer");
  const csvInputExecution = document.getElementById("csvInputExecution");
  const progressBarExecution = document.getElementById("progressBarExecution");
  const progressBarContainerExecution = document.getElementById("progressBarContainerExecution");
  const importExecutionStatus = document.getElementById("importExecutionStatus");

  // Show Import Container
  toggleImportExecutionButton.addEventListener("click", () => {
    importExecutionContainer.style.display = "block";
  });

  // Close Import Container
  closeImportExecutionModal.addEventListener("click", () => {
    importExecutionContainer.style.display = "none";
    csvInputExecution.value = ""; // Clear file input
    importExecutionStatus.innerHTML = ""; // Clear status messages
    progressBarExecution.value = 0; // Reset progress bar
  });

  // Handle CSV Upload
  csvInputExecution.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target.result;

      try {
        const rows = csvContent.split("\n").map((row) => row.split(","));
        const headers = rows.shift().map((header) => header.trim()); // Extract headers

        // Validate headers
        const requiredFields = ["workorder", "serialNumber", "partnumber", "operation", "timeIn", "timeOut", "status", "operator", "location"];
        const missingFields = requiredFields.filter((field) => !headers.includes(field));
        if (missingFields.length > 0) {
          importExecutionStatus.innerHTML = `<p class="error">Missing required headers: ${missingFields.join(", ")}</p>`;
          return;
        }

        const executions = [];
        const errors = [];

        rows.forEach((row, index) => {
          const rowData = {};
          headers.forEach((header, i) => {
            rowData[header] = row[i]?.trim();
          });

          // Validate required fields
          if (!rowData.workorder || !rowData.serialNumber || !rowData.partnumber || !rowData.operation || !rowData.timeIn || !rowData.status || !rowData.operator || !rowData.location) {
            errors.push({
              row: index + 2,
              message: "Missing required fields: workorder, serialNumber, partnumber, operation, timeIn, status, operator, or location.",
            });
            return;
          }

          // Add validated row to executions array
          executions.push(rowData);
        });

        progressBarContainerExecution.style.display = "block";
        progressBarExecution.value = 0;

        // Send rows to the backend one by one
        for (let i = 0; i < executions.length; i++) {
          const execution = executions[i];
          try {
            const response = await fetch("/api/workorderexecution/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(execution),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText);
            }
          } catch (error) {
            errors.push({
              row: i + 2,
              message: `Failed to import row: ${error.message}`,
            });
          }

          // Update progress bar
          progressBarExecution.value = ((i + 1) / executions.length) * 100;
        }

        progressBarContainerExecution.style.display = "none";

        // Display results
        if (errors.length === 0) {
          importExecutionStatus.innerHTML = `<p id="successMessage">Import successful! All rows processed.</p>`;
        } else {
          importExecutionStatus.innerHTML = `
            <p id="successMessage">Import completed with errors:</p>
            <ul id="errorReport">
              ${errors.map((err) => `<li>Row ${err.row}: ${err.message}</li>`).join("")}
            </ul>
          `;
        }
      } catch (error) {
        console.error("Error processing CSV:", error);
        importExecutionStatus.innerHTML = `<p class="error">Error processing CSV: ${error.message}</p>`;
      }
    };

    reader.readAsText(file);
  });
});

