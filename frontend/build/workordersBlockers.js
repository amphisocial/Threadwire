// workordersBlockers.js

let blockerModal = null;
let currentBlockerId = null; // null = create mode, not null = edit mode
let actionItems = [];

document.addEventListener("DOMContentLoaded", () => {
  blockerModal = document.getElementById("blockerModal");

  const btnAddRiskIssue = document.getElementById("btnAddRiskIssue");
  const btnEditRiskIssue = document.getElementById("btnEditRiskIssue");
  const closeBlockerModal = document.getElementById("closeBlockerModal");
  const btnAddActionItem = document.getElementById("btnAddActionItem");
  const btnSaveBlocker = document.getElementById("btnSaveBlocker");

  // "Add Risk/Issue" => create new
  btnAddRiskIssue.addEventListener("click", () => {
    if (!window.selectedWorkOrderRow) {
      alert("Please select a Work Order row first.");
      return;
    }
    openBlockerModalForCreate();
  });

  // "Edit Risk/Issue" => find existing by workorder id
  btnEditRiskIssue.addEventListener("click", async () => {
    if (!window.selectedWorkOrderRow) {
      alert("Please select a Work Order row first.");
      return;
    }
    const workorderId = window.selectedWorkOrderRow.dataset.workorderId;
    try {
      // fetch blockers referencing this workorder
      const res = await fetch(`/api/blockers?relatedWorkOrders=${workorderId}`);
      const blockers = await res.json();

      if (!blockers || blockers.length === 0) {
        alert("No existing Risk/Issue found for this Work Order.");
        return;
      }
      // For simplicity, open the first result
      openBlockerModalForEdit(blockers[0]._id);
    } catch (err) {
      console.error("Error finding blockers:", err);
      alert("Failed to find risk/issue for this workorder.");
    }
  });

  closeBlockerModal.addEventListener("click", closeBlockerModalFunc);

  btnAddActionItem.addEventListener("click", () => {
    addActionItemRow({
      _id: "temp" + Date.now(),
      actionItem: "",
      assignedTo: "",
      status: "Open",
      remark: ""
    });
  });

  btnSaveBlocker.addEventListener("click", saveBlocker);

  // optional: click outside modal to close
  window.addEventListener("click", (evt) => {
    if (evt.target === blockerModal) {
      closeBlockerModalFunc();
    }
  });
});

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

  // Clear table
  document.querySelector("#actionItemsTable tbody").innerHTML = "";

  try {
    // fetch that blocker
    const resBlocker = await fetch(`/api/blockers/${blockerId}`);
    const blocker = await resBlocker.json();

    document.getElementById("blockerTitle").value = blocker.title || "";
    document.getElementById("blockerType").value = blocker.type || "Issue";
    document.getElementById("blockerStatus").value = blocker.status || "Open";
    document.getElementById("blockerDescription").value =
      blocker.description || "";

    // fetch action items
    const resItems = await fetch(`/api/action-items/blocker/${blockerId}`);
    actionItems = await resItems.json();
    actionItems.forEach((ai) => addActionItemRow(ai));

    blockerModal.style.display = "block";
  } catch (err) {
    console.error("Error loading blocker or action items:", err);
    alert("Failed to load risk/issue data.");
  }
}

function addActionItemRow(ai) {
  const tbody = document.querySelector("#actionItemsTable tbody");
  const tr = document.createElement("tr");
  tr.dataset.id = ai._id;

  tr.innerHTML = `
    <td><input type="text" class="ai-actionItem" value="${ai.actionItem || ""}" /></td>
    <td><input type="text" class="ai-assignedTo" value="${ai.assignedTo || ""}" /></td>
    <td>
      <select class="ai-status">
        <option value="Open" ${ai.status === "Open" ? "selected" : ""}>Open</option>
        <option value="In Progress" ${ai.status === "In Progress" ? "selected" : ""}>In Progress</option>
        <option value="Completed" ${ai.status === "Completed" ? "selected" : ""}>Completed</option>
      </select>
    </td>
    <td><input type="text" class="ai-remark" value="${ai.remark || ""}" /></td>
    <td><button class="btn-remove-ai">X</button></td>
  `;

  tr.querySelector(".btn-remove-ai").addEventListener("click", () => {
    tr.remove();
  });
  tbody.appendChild(tr);
}

function closeBlockerModalFunc() {
  blockerModal.style.display = "none";
}

async function saveBlocker() {
  if (!window.selectedWorkOrderRow) {
    alert("No Work Order row selected!");
    return;
  }
  
  const title = document.getElementById("blockerTitle").value.trim();
  const type = document.getElementById("blockerType").value;
  const status = document.getElementById("blockerStatus").value;
  const description = document.getElementById("blockerDescription").value.trim();
  const workOrderId = window.selectedWorkOrderRow.dataset.workorderId;

  // gather action items from the table
  const rows = document.querySelectorAll("#actionItemsTable tbody tr");
  const localActionItems = [];
  rows.forEach((row) => {
    const _id = row.dataset.id;
    const actionItem = row.querySelector(".ai-actionItem").value.trim();
    const assignedTo = row.querySelector(".ai-assignedTo").value.trim();
    const st = row.querySelector(".ai-status").value;
    const remark = row.querySelector(".ai-remark").value.trim();

    localActionItems.push({ _id, actionItem, assignedTo, status: st, remark });
  });

  try {
    if (currentBlockerId) {
      // update existing
      await fetch(`/api/blockers/${currentBlockerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, type, status, description }),
      });

      // new or updated action items
      for (const ai of localActionItems) {
        if (ai._id.startsWith("temp")) {
          // new
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
          // update existing
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
    } else {
      // create new
      const resCreate = await fetch("/api/blockers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          status,
          description,
          relatedWorkOrders: [workOrderId], // key difference: we reference a WorkOrder
        }),
      });
      const newBlocker = await resCreate.json();

      // create action items
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

    // If you want, reload or partially refresh the table:
    // loadWorkOrders();
  } catch (err) {
    console.error("Error saving Blocker or Action Items:", err);
    alert("Failed to save. Check console for details.");
  }
}

