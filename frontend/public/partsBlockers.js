// partsBlockers.js

let blockerModal = null;
let currentBlockerId = null;   // Used to track if we're editing or creating new
let actionItems = [];          // Local array to manage the action items in the modal

document.addEventListener("DOMContentLoaded", () => {
  // We assume "parts.js" sets selectedPartRow or a global "window.currentSelectedPart"

  // Get references to your modal & buttons
  blockerModal = document.getElementById("blockerModal");

  const btnAddRiskIssue = document.getElementById("btnAddRiskIssue");
  const btnEditRiskIssue = document.getElementById("btnEditRiskIssue");
  const closeBlockerModal = document.getElementById("closeBlockerModal");
  const btnAddActionItem = document.getElementById("btnAddActionItem");
  const btnSaveBlocker = document.getElementById("btnSaveBlocker");

  // Open modal in "Add" mode
  btnAddRiskIssue.addEventListener("click", () => {
    if (!window.selectedPartRow) {
      alert("Please select a part row first.");
      return;
    }
    openBlockerModalForCreate();
  });

  // Open modal in "Edit" mode
  btnEditRiskIssue.addEventListener("click", async () => {
    if (!window.selectedPartRow) {
      alert("Please select a part row first.");
      return;
    }
    // We need to find an existing Blocker for this part, if any.
    // Because your Part schema doesn't store a direct "blockerId",
    // you might need to fetch from /api/blockers?relatedParts=<partId>
    const partNumber = window.selectedPartRow.dataset.partnumber;
    const partId = window.selectedPartRow.dataset.partId;

    try {
      // Example: attempt to find if there's an *open* blocker
      // or the first one for this part.  You may want a more elaborate approach.
      const res = await fetch(`/api/blockers?relatedParts=${partId}`);
      const blockers = await res.json();

      if (!blockers || blockers.length === 0) {
        alert("No existing Risk/Issue found for this part.");
        return;
      }
      // For simplicity, let's assume the first returned blocker is the one we want to edit
      openBlockerModalForEdit(blockers[0]._id);
    } catch (err) {
      console.error("Error fetching blocker for part:", err);
      alert("Failed to find risk/issue for this part.");
    }
  });

  // Close modal
  closeBlockerModal.addEventListener("click", closeBlockerModalFunc);

  // Add new empty ActionItem row
  btnAddActionItem.addEventListener("click", () => {
    addActionItemRow({
      _id: "temp" + Date.now(),
      actionItem: "",
      assignedTo: "",
      status: "Open",
      remark: ""
    });
  });

  // Save the Blocker (either create or update)
  btnSaveBlocker.addEventListener("click", saveBlocker);

  // Clicking outside modal content should also close it (optional)
  window.addEventListener("click", (event) => {
    if (event.target === blockerModal) {
      closeBlockerModalFunc();
    }
  });
});

// ------------------------------
// Modal open/close helpers
// ------------------------------
function openBlockerModalForCreate() {
  currentBlockerId = null;
  actionItems = [];

  document.getElementById("blockerModalTitle").textContent = "Create Risk/Issue";
  document.getElementById("blockerTitle").value = "";
  document.getElementById("blockerType").value = "Issue";
  document.getElementById("blockerStatus").value = "Open";
  document.getElementById("blockerDescription").value = "";
  document.querySelector("#actionItemsTable tbody").innerHTML = "";

  blockerModal.style.display = "block";
}

async function openBlockerModalForEdit(blockerId) {
  currentBlockerId = blockerId;

  document.getElementById("blockerModalTitle").textContent = "Edit Risk/Issue";
  document.querySelector("#actionItemsTable tbody").innerHTML = "";

  try {
    // Fetch the existing blocker
    const resBlocker = await fetch(`/api/blockers/${blockerId}`);
    const blocker = await resBlocker.json();

    document.getElementById("blockerTitle").value = blocker.title || "";
    document.getElementById("blockerType").value = blocker.type || "Issue";
    document.getElementById("blockerStatus").value = blocker.status || "Open";
    document.getElementById("blockerDescription").value = blocker.description || "";

    // Now fetch action items
    const resAI = await fetch(`/api/action-items/blocker/${blockerId}`);
    actionItems = await resAI.json();

    // Populate the table rows
    actionItems.forEach((ai) => addActionItemRow(ai));

    blockerModal.style.display = "block";
  } catch (err) {
    console.error("Error loading blocker/action items:", err);
    alert("Failed to load existing risk/issue data.");
  }
}

function closeBlockerModalFunc() {
  blockerModal.style.display = "none";
}

// ------------------------------
// Action Items table manipulation
// ------------------------------
function addActionItemRow(ai) {
  const tbody = document.querySelector("#actionItemsTable tbody");
  const tr = document.createElement("tr");
  tr.dataset.id = ai._id;

  tr.innerHTML = `
    <td><input type="text" class="ai-actionItem" value="${ai.actionItem || ""}"></td>
    <td><input type="text" class="ai-assignedTo" value="${ai.assignedTo || ""}"></td>
    <td>
      <select class="ai-status">
        <option value="Open" ${ai.status === "Open" ? "selected" : ""}>Open</option>
        <option value="In Progress" ${
          ai.status === "In Progress" ? "selected" : ""
        }>In Progress</option>
        <option value="Completed" ${
          ai.status === "Completed" ? "selected" : ""
        }>Completed</option>
      </select>
    </td>
    <td><input type="text" class="ai-remark" value="${ai.remark || ""}"></td>
    <td><button class="btn-remove-ai">X</button></td>
  `;

  // Handle removing the row
  tr.querySelector(".btn-remove-ai").addEventListener("click", () => {
    tr.remove();
  });

  tbody.appendChild(tr);
}

// ------------------------------
// Save (Create or Update) Blocker + ActionItems
// ------------------------------
async function saveBlocker() {
  if (!window.selectedPartRow) {
    alert("No part is selected!");
    return;
  }

  // Gather form data
  const title = document.getElementById("blockerTitle").value.trim();
  const type = document.getElementById("blockerType").value;
  const status = document.getElementById("blockerStatus").value;
  const description = document.getElementById("blockerDescription").value;
  const partNumber = window.selectedPartRow.dataset.partnumber; // from parts.js

  // Gather action items from table
  const rows = document.querySelectorAll("#actionItemsTable tbody tr");
  const localActionItems = [];
  rows.forEach((row) => {
    const _id = row.dataset.id; // 'temp123...' or real id
    const actionItem = row.querySelector(".ai-actionItem").value.trim();
    const assignedTo = row.querySelector(".ai-assignedTo").value.trim();
    const st = row.querySelector(".ai-status").value;
    const remark = row.querySelector(".ai-remark").value.trim();
    localActionItems.push({ _id, actionItem, assignedTo, status: st, remark });
  });

  try {
    if (currentBlockerId) {
      // Update existing Blocker
      await fetch(`/api/blockers/${currentBlockerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, status, description }),
      });

      // Then create/update the action items
      for (const ai of localActionItems) {
        if (ai._id.startsWith("temp")) {
          // New item
          await fetch("/api/action-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blockerId: currentBlockerId,
              actionItem: ai.actionItem,
              assignedTo: ai.assignedTo,
              status: ai.status,
              remark: ai.remark,
            }),
          });
        } else {
          // Update existing
          await fetch(`/api/action-items/${ai._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actionItem: ai.actionItem,
              assignedTo: ai.assignedTo,
              status: ai.status,
              remark: ai.remark,
            }),
          });
        }
      }
      // If you need to handle deleted items, you'd compare and call DELETE

    } else {
      // Create new Blocker, linking it to the selected part
      const partId = window.selectedPartRow.dataset.partId; 
      const res = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          status,
          description,
          relatedParts: [partId],
        }),
      });
      const newBlocker = await res.json();

      // Create each action item
      for (const ai of localActionItems) {
        await fetch("/api/action-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockerId: newBlocker._id,
            actionItem: ai.actionItem,
            assignedTo: ai.assignedTo,
            status: ai.status,
            remark: ai.remark,
          }),
        });
      }
    }

    alert("Risk/Issue saved successfully!");
    closeBlockerModalFunc();

    // Optionally refresh the parts table to update blockertag
    // or do a partial update. E.g.:
    // loadParts();
  } catch (err) {
    console.error("Error saving blocker/action items:", err);
    alert("Failed to save Risk/Issue. Check console for details.");
  }
}

