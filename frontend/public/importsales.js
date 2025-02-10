document.addEventListener("DOMContentLoaded", () => {
    const toggleImportButton = document.getElementById("toggleImportButton"); // The always-visible Import CSV button
    const closeImportModal = document.getElementById("closeImportModal"); // The close button inside the modal
    const importContainer = document.getElementById("importContainer"); // The hidden import modal
    const csvInput = document.getElementById("csvInput"); // File input for CSV
    const progressBar = document.getElementById("progressBar"); // Progress bar
    const progressBarContainer = document.getElementById("progressBarContainer"); // Wrapper for the progress bar
    const importStatus = document.getElementById("importStatus"); // Status container for messages and errors

    // Show the Import Container
    toggleImportButton.addEventListener("click", () => {
        importContainer.style.display = "block"; // Show the modal
    });

    // Close the Import Container
    closeImportModal.addEventListener("click", () => {
        importContainer.style.display = "none"; // Hide the modal
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
            // Split CSV content into rows
            const rows = csvContent.split("\n").map((row) => row.split(","));
            const headers = rows.shift().map((header) => header.trim()); // Extract headers

            const errors = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                // Convert CSV row to JavaScript object
                const salesOrder = {};
                headers.forEach((header, index) => {
                    salesOrder[header] = row[index]?.trim();
                });

                // Validate required fields
                if (!salesOrder.salesOrder || !salesOrder.customer_name || !salesOrder.line) {
                    errors.push({
                        row: i + 2, // Row number (accounting for headers)
                        message: "Missing required fields (salesOrder, customer_name, or line).",
                    });
                    continue;
                }

                // Send the row to the API
                try {
                    console.log("Sending to API:", salesOrder); // Debugging
                    const response = await fetch("/api/salesorders/import", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(salesOrder), // Convert object to JSON
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(errorText);
                    }

                    console.log(`Row ${i + 2}: Successfully imported.`);
                } catch (error) {
                    errors.push({
                        row: i + 2,
                        message: `Failed to import row: ${error.message}`,
                    });
                }
            }

            // Display errors if any
            if (errors.length > 0) {
                importStatus.innerHTML = `
                    <p id="errorMessage">Import completed with errors:</p>
                    <ul id="errorList">
                        ${errors.map((err) => `<li>Row ${err.row}: ${err.message}</li>`).join("")}
                    </ul>
                `;
            } else {
                importStatus.innerHTML = `<p id="successMessage">Import completed successfully!</p>`;
            }
        } catch (error) {
            console.error("Error processing CSV:", error);
            importStatus.innerHTML = `<p id="errorMessage">Error processing CSV: ${error.message}</p>`;
        }
    };

    reader.readAsText(file);
});

});

