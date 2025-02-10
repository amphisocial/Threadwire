document.addEventListener("DOMContentLoaded", () => {
  const toggleImportButton = document.getElementById("toggleImportButton");
  const closeImportModal = document.getElementById("closeImportModal");
  const importContainer = document.getElementById("importContainer");
  const csvInput = document.getElementById("csvInput");
  const progressBar = document.getElementById("progressBar");
  const progressBarContainer = document.getElementById("progressBarContainer");
  const importStatus = document.getElementById("importStatus");

  // Show the Import Container
  toggleImportButton.addEventListener("click", () => {
    importContainer.style.display = "block";
  });

  // Close the Import Container
  closeImportModal.addEventListener("click", () => {
    importContainer.style.display = "none";
    csvInput.value = ""; // Clear file input
    importStatus.innerHTML = ""; // Clear status messages
    progressBar.value = 0; // Reset progress bar
  });

  // Handle CSV Upload
  csvInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target.result;

      try {
        const rows = csvContent.split("\n").map((row) => row.split(","));
        const headers = rows.shift().map((header) => header.trim()); // Extract headers

        // Validate headers
        const requiredFields = [
          "partnumber",
          "revision",
          "description",
          "type",
          "category",
          "unit_price",
          "isbom",
        ];
        const missingFields = requiredFields.filter(
          (field) => !headers.includes(field)
        );
        if (missingFields.length > 0) {
          importStatus.innerHTML = `<p class="error">Missing required headers: ${missingFields.join(", ")}</p>`;
          return;
        }

        const parts = [];
        const errors = [];

        rows.forEach((row, index) => {
          const rowData = {};
          headers.forEach((header, i) => {
            rowData[header] = row[i]?.trim();
          });

          // Validate required fields
          if (
            !rowData.partnumber ||
            !rowData.revision ||
            !rowData.description
          ) {
            errors.push({
              row: index + 2,
              message: "Missing required fields (partnumber, revision, or description).",
            });
            return;
          }

          // Convert `isbom` to Boolean
          rowData.isbom = rowData.isbom.toLowerCase() === "yes";
          // Add validated row to parts array
          parts.push(rowData);
        });

        progressBarContainer.style.display = "block";
        progressBar.value = 0;

        // Send rows to the backend one by one
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          try {
            console.log("Sending part to API:", part); // Debugging
            const response = await fetch("/api/parts/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(part),
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
          progressBar.value = ((i + 1) / parts.length) * 100;
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

