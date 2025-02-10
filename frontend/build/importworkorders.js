document.addEventListener("DOMContentLoaded", () => {
  const toggleImportWorkordersButton = document.getElementById("toggleImportWorkordersButton");
  const closeImportModal = document.getElementById("closeImportModal");
  const importContainer = document.getElementById("importContainer");
  const csvInputWorkorders = document.getElementById("csvInputWorkorders");
  const progressBar = document.getElementById("progressBar");
  const progressBarContainer = document.getElementById("progressBarContainer");
  const importStatus = document.getElementById("importStatus");

  // Show the Import Container
  toggleImportWorkordersButton.addEventListener("click", () => {
    importContainer.style.display = "block";
  });

  // Close the Import Container
  closeImportModal.addEventListener("click", () => {
    importContainer.style.display = "none";
    csvInputWorkorders.value = ""; // Clear file input
    importStatus.innerHTML = ""; // Clear status messages
    progressBar.value = 0; // Reset progress bar
  });

  // Handle CSV Upload
  csvInputWorkorders.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target.result;

      try {
        const rows = csvContent.split("\n").map((row) => row.split(","));
        const headers = rows.shift().map((header) => header.trim()); // Extract headers

        // Validate headers
        const requiredFields = ["workorder", "type", "description", "partnumber", "estCost", "quantity", "salesorder"];
        const missingFields = requiredFields.filter((field) => !headers.includes(field));
        if (missingFields.length > 0) {
          importStatus.innerHTML = `<p class="error">Missing required headers: ${missingFields.join(", ")}</p>`;
          return;
        }

        const workorders = [];
        const errors = [];

        rows.forEach((row, index) => {
          const rowData = {};
          headers.forEach((header, i) => {
            rowData[header] = row[i]?.trim();
          });

          // Validate required fields
          if (!rowData.workorder || !rowData.type || !rowData.partnumber || !rowData.quantity || !rowData.salesorder) {
            errors.push({
              row: index + 2,
              message: "Missing required fields: workorder, type, partnumber, quantity, or salesorder.",
            });
            return;
          }

          // Add validated row to workorders array
          workorders.push(rowData);
        });

        progressBarContainer.style.display = "block";
        progressBar.value = 0;

        // Send rows to the backend one by one
        for (let i = 0; i < workorders.length; i++) {
          const workorder = workorders[i];
          try {
            console.log("Sending workorder to API:", workorder); // Debugging
            const response = await fetch("/api/workorders/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(workorder),
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
          progressBar.value = ((i + 1) / workorders.length) * 100;
        }

        progressBarContainer.style.display = "none";

        // Display results
        if (errors.length === 0) {
          importStatus.innerHTML = `<p id="successMessage">Import successful! All rows processed.</p>`;
        } else {
          importStatus.innerHTML = `
            <p id="successMessage">Import completed with errors:</p>
            <ul id="errorReport">
              ${errors.map((err) => `<li>Row ${err.row}: ${err.message}</li>`).join("")}
            </ul>
          `;
        }
      } catch (error) {
        console.error("Error processing CSV:", error);
        importStatus.innerHTML = `<p class="error">Error processing CSV: ${error.message}</p>`;
      }
    };

    reader.readAsText(file);
  });
});

