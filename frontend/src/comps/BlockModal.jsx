import React, { useState, useEffect } from 'react';

const BlockModal = ({ show, onClose, salesOrder, partNumber, lineNumber }) => {
  const [blockers, setBlockers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [blockerTitle, setBlockerTitle] = useState('');
  const [status, setStatus] = useState('Open');
  const [category, setCategory] = useState('Schedule');
  const [owner, setOwner] = useState('');
  const [impact, setImpact] = useState('High');
  const [probability, setProbability] = useState('Low');
  const [actions, setActions] = useState([]);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    const fetchBlockers = async () => {
      try {
        const response = await fetch(
          `/api/blockers?salesorder=${salesOrder}&linenumber=${lineNumber}`
        );
        const data = await response.json();
        setBlockers(data);

        if (data.length > 0) {
          const firstBlocker = data[0];
          setBlockerTitle(firstBlocker.title || '');
          setStatus(firstBlocker.status || 'Open');
          setCategory(firstBlocker.category || 'Schedule');
          setOwner(firstBlocker.owner || '');
          setImpact(firstBlocker.impact || 'High');
          setProbability(firstBlocker.probability || 'Low');
        }
      } catch (error) {
        console.error('Error fetching blockers:', error);
      }
    };

    if (salesOrder && lineNumber) {
      fetchBlockers();
    }
  }, [salesOrder, lineNumber]);

  useEffect(() => {
    const fetchActions = async () => {
      try {
        const currentBlocker = blockers[currentIndex];
        if (!currentBlocker) return;

        const response = await fetch(`/api/actions?blockerId=${currentBlocker._id}`);
        const data = await response.json();
        setActions(data);
      } catch (error) {
        console.error('Error fetching actions:', error);
      }
    };

    if (blockers[currentIndex]) {
      fetchActions();
    }
  }, [blockers, currentIndex]);

  const goToPrevious = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : blockers.length - 1;
    setCurrentIndex(prevIndex);
    updateFormFields(blockers[prevIndex]);
  };

  const goToNext = () => {
    const nextIndex = currentIndex < blockers.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(nextIndex);
    updateFormFields(blockers[nextIndex]);
  };

  const updateFormFields = (blocker) => {
    if (blocker) {
      setBlockerTitle(blocker.title || '');
      setStatus(blocker.status || 'Open');
      setCategory(blocker.category || 'Schedule');
      setOwner(blocker.owner || '');
      setImpact(blocker.impact || 'High');
      setProbability(blocker.probability || 'Low');
    }
  };

  const addNewAction = () => {
    setActions((prev) => [
      ...prev,
      { actionItem: '', assignedTo: '', status: 'Open', remark: '' },
    ]);
  };

  const updateAction = (index, field, value) => {
    setActions((prev) =>
      prev.map((action, i) => (i === index ? { ...action, [field]: value } : action))
    );
  };

  const saveActions = async () => {
    try {
      const blockerId = blockers[currentIndex]?._id;
      if (!blockerId) {
        alert('No blocker selected to associate actions.');
        return;
      }

      for (const action of actions) {
        const payload = { ...action, blockerId };
        if (action._id) {
          const response = await fetch(`/api/actions/${action._id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Failed to update action with ID ${action._id}`);
          }
        } else {
          const response = await fetch('/api/actions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error('Failed to create new action');
          }

          const newAction = await response.json();
          setActions((prev) =>
            prev.map((a) => (a === action ? { ...a, _id: newAction._id } : a))
          );
        }
      }

      alert('Actions saved successfully');
      setShowActions(false);
    } catch (error) {
      console.error('Error saving actions:', error);
      alert('Failed to save all actions. Please try again.');
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/blockers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesorder: salesOrder,
          linenumber: lineNumber,
          partnumber: partNumber,
          title: blockerTitle,
          status,
          category,
          owner,
          impact,
          probability,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save blocker details.');
      }
      await response.json();
      alert('Blocker details saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving blocker details:', error);
      alert('Failed to save blocker details. Please try again.');
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="blocker-form-container">
          <div className="modal-header">
            <button className="arrow left" onClick={goToPrevious}>
              &lt;
            </button>
            Blocker Details - Order: {salesOrder}, Line: {lineNumber}
            <button className="arrow right" onClick={goToNext}>
              &gt;
            </button>
          </div>
          <form className="modal-form">
            <label>Blocker Title</label>
            <input
              type="text"
              value={blockerTitle}
              onChange={(e) => setBlockerTitle(e.target.value)}
            />

            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Open</option>
              <option>Closed</option>
            </select>

            <label>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Schedule</option>
              <option>Cost</option>
              <option>Effort</option>
              <option>Material</option>
              <option>Defect</option>
              <option>Design</option>
              <option>Equipment</option>
              <option>Others</option>
            </select>

            <label>Owner</label>
            <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} />

            <label>Impact</label>
            <select value={impact} onChange={(e) => setImpact(e.target.value)}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <label>Probability</label>
            <select value={probability} onChange={(e) => setProbability(e.target.value)}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>

            <div className="modal-buttons">
              <button type="button" className="modal-button save" onClick={handleSave}>
                Save
              </button>
              <button
                type="button"
                className="modal-button actions"
                onClick={() => setShowActions(true)}
              >
                ACTIONS
              </button>
              <button type="button" onClick={onClose}>
                Close
              </button>
            </div>
          </form>
        </div>
      </div>

      {showActions && (
        <div className="action-items-modal">
          <div className="action-items-header">
            <h3>Action Items</h3>
            <button type="button" onClick={addNewAction}>
              +
            </button>
          </div>
          <div className="action-items-table-container">
            <table className="action-items-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={action.actionItem}
                        onChange={(e) => updateAction(index, 'actionItem', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={action.assignedTo}
                        onChange={(e) => updateAction(index, 'assignedTo', e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        value={action.status}
                        onChange={(e) => updateAction(index, 'status', e.target.value)}
                      >
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={action.remark}
                        onChange={(e) => updateAction(index, 'remark', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-buttons">
            <button type="button" onClick={saveActions}>
              Save
            </button>
            <button type="button" onClick={() => setShowActions(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockModal;