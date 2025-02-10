document.addEventListener("DOMContentLoaded", () => {
  const toggleImportPartBoPButton = document.getElementById("toggleImportPartBoPButton");
  const closeImportPartBoPModal = document.getElementById("closeImportPartBoPModal");
  const importPartBoPContainer = document.getElementById("importPartBoPContainer");
  const csvInputPartBoP = document.getElementById("csvInputPartBoP");
  const progressBarPartBoP = document.getElementById("progressBarPartBoP");
  const progressBarContainerPartBoP = document.getElementById("progressBarContainerPartBoP");
  const importPartBoPStatus = document.getElementById("importPartBoPStatus");

  // Show the Import Container
  toggleImportPartBoPButton.addEventListener("click", () => {
    importPartBoPContainer.style.display = "block";
  });

  // Close the Import Container
  closeImportPartBoPModal.addEventListener("click", () => {
    importPartBoPContainer.style.display = "none";
    csvInputPartBoP.value = ""; // Clear file input
    importPartBoPStatus.innerHTML = ""; // Clear status messages
    progressBarPartBoP.value = 0; // Reset progress bar
  });

  // Handle CSV Upload
  csvInputPartBoP.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvContent = e.target.result;

      try {
        const rows = csvContent.split("\n").map((row) => row.split(","));
        const headers = rows.shift().map((header) => header.trim()); // Extract headers

        // Validate headers
        const requiredFields = ["partnumber", "operation", "opcode", "sequence", "planner"];
        const missingFields = requiredFields.filter((field) => !headers.includes(field));
        if (missingFields.length > 0) {
          importPartBoPStatus.innerHTML = `<p class="error">Missing required headers: ${missingFields.join(", ")}</p>`;
          return;
        }

        const partBoPs = [];
        const errors = [];

        rows.forEach((row, index) => {
          const rowData = {};
          headers.forEach((header, i) => {
            rowData[header] = row[i]?.trim();
          });

          // Validate required fields
          if (!rowData.partnumber || !rowData.operation || !rowData.opcode || !rowData.sequence || !rowData.planner) {
            errors.push({
              row: index + 2,
              message: "Missing required fields: partnumber, operation, opcode, sequence, or planner.",
            });
            return;
          }

          // Add validated row to partBoPs array
          partBoPs.push(rowData);
        });

        progressBarContainerPartBoP.style.display = "block";
        progressBarPartBoP.value = 0;

        // Send rows to the backend one by one
        for (let i = 0; i < partBoPs.length; i++) {
          const partBoP = partBoPs[i];
          try {
            const response = await fetch("/api/partbop/import", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(partBoP),
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
          progressBarPartBoP.value = ((i + 1) / partBoPs.length) * 100;
        }

        progressBarContainerPartBoP.style.display = "none";

        // Display results
        if (errors.length === 0) {
          importPartBoPStatus.innerHTML = `<p id="successMessage">Import successful! All rows processed.</p>`;
        } else {
          importPartBoPStatus.innerHTML = `
            <p id="successMessage">Import completed with errors:</p>
            <ul id="errorReport">
              ${errors.map((err) => `<li>Row ${err.row}: ${err.message}</li>`).join("")}
            </ul>
          `;
        }
      } catch (error) {
        console.error("Error processing CSV:", error);
        importPartBoPStatus.innerHTML = `<p class="error">Error processing CSV: ${error.message}</p>`;
      }
    };

    reader.readAsText(file);
  });
});

