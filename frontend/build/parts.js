let selectedPartRow = null; // Track the currently selected part row
// Make a global reference
window.selectedPartRow = null;

document.addEventListener("DOMContentLoaded", () => {
  loadParts(); // Fetch and display parts
});

// Fetch and populate parts table
async function loadParts() {
  try {
    const response = await fetch("/api/parts");
    const parts = await response.json();
    populatePartsTable(parts);
  } catch (error) {
    console.error("Error loading parts:", error);
  }
}

function populatePartsTable(parts) {
  const tbody = document.querySelector("#partsTable tbody");
  tbody.innerHTML = ""; // Clear existing rows

  parts.forEach((part) => {
    const row = document.createElement("tr");
    row.dataset.partnumber = part.partnumber;
    row.dataset.revision = part.revision;
    // Store the Mongo _id in a data attribute so we can reference it later
    row.dataset.partId = part._id;
    // If the part has an open blocker, highlight it
    if (part.blockerTag > 0) {
      row.classList.add("has-blocker");
    }

    row.innerHTML = `
      <td>${part.partnumber}</td>
      <td>${part.revision}</td>
      <td>${part.description}</td>
      <td>${part.type}</td>
      <td>${part.category}</td>
      <td>${part.unit_price}</td>
      <td>${part.isbom ? "Yes" : "No"}</td>
      <td>${new Date(part.datecreated).toLocaleDateString()}</td>
      <td>${new Date(part.datemodified).toLocaleDateString()}</td>
    `;

    row.addEventListener("click", () => handleRowSelection(row, part));
    tbody.appendChild(row);
  });
}

// Handle row selection
function handleRowSelection(row, part) {
  // Remove highlight from the previously selected row
  if (selectedPartRow) {
    selectedPartRow.classList.remove("highlighted");
    window.selectedPartRow  = null;
  }

  // Highlight the newly selected row
  row.classList.add("highlighted");
  selectedPartRow = row;

  // Also update the global variable
  window.selectedPartRow = row; // <--- THIS IS KEY

  // Display the part details in the right pane
  showPartDetails(part);
}

// Show part details in the right pane
function showPartDetails(part) {
  const detailsDiv = document.getElementById("partDetails");
  detailsDiv.innerHTML = `
    <p><strong>Part Number:</strong> ${part.partnumber}</p>
    <p><strong>Revision:</strong> ${part.revision}</p>
    <p><strong>Description:</strong> ${part.description}</p>
    <p><strong>Type:</strong> ${part.type}</p>
    <p><strong>Category:</strong> ${part.category}</p>
    <p><strong>Unit Price:</strong> ${part.unit_price}</p>
    <p><strong>Is BOM:</strong> ${part.isbom ? "Yes" : "No"}</p>
    <p><strong>Date Created:</strong> ${new Date(part.datecreated).toLocaleDateString()}</p>
    <p><strong>Date Modified:</strong> ${new Date(part.datemodified).toLocaleDateString()}</p>
    <p><strong>Created By:</strong> ${part.createdby || "N/A"}</p>
    <p><strong>Last Modifier:</strong> ${part.lastmodifier || "N/A"}</p>
    ${Object.keys(part)
      .filter((key) => key.startsWith("customattribute"))
      .map(
        (key) =>
          `<p><strong>${key.replace("customattribute", "Custom Attribute ")}:</strong> ${
            part[key] || "N/A"
          }</p>`
      )
      .join("")}
  `;
}

// Clear right pane content
function clearRightPane() {
  const detailsDiv = document.getElementById("partDetails");
  detailsDiv.innerHTML = "";
}


// filtering logic
function filterParts() {
  const partNumberFilter = document
    .getElementById("filterPartNumber")
    .value.toLowerCase();
  const descriptionFilter = document
    .getElementById("filterDescription")
    .value.toLowerCase();
  const typeFilter = document
    .getElementById("filterType")
    .value.toLowerCase();

  const rows = document.querySelectorAll("#partsTable tbody tr");

  rows.forEach((row) => {
    const partNumber = row.cells[0].textContent.toLowerCase();
    const description = row.cells[2].textContent.toLowerCase();
    const type = row.cells[3].textContent.toLowerCase();

    const matchesPartNumber = partNumber.includes(partNumberFilter);
    const matchesDescription = description.includes(descriptionFilter);
    const matchesType = type.includes(typeFilter);

    // Show row if it matches all filter conditions; hide it otherwise
    if (matchesPartNumber && matchesDescription && matchesType) {
      row.style.display = ""; // Show row
    } else {
      row.style.display = "none"; // Hide row
    }
  });
}


function navigateTo(page) {
  switch (page) {
    case "blockers":
      window.location.href = "blockers.html";
      break;
    case "salesorders":
      window.location.href = "salesorders.html";
      break;
    case "dashboard":
      window.location.href = "landingPage.html";
      break;
    case "graph":
      window.location.href = "graphview.html";
      break;
    case "parts":
      window.location.href = "parts.html";
      break;
    case "workorders":
      window.location.href = "workorders.html";
      break;
    case "logout":
      sessionStorage.removeItem("userId");
      window.location.href = "logout.html";
      break;
    default:
      console.error(`Unknown page: ${page}`);
  }
}

