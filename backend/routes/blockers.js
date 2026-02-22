/**
 * =============================================================================
 * Blocker Routes
 * =============================================================================
 * API endpoints for managing Blockers (Risk/Issues).
 * 
 * Endpoints:
 * - POST   /api/blockers                       - Create a new blocker
 * - GET    /api/blockers                       - Get all blockers for current customer
 * - GET    /api/blockers/:id                   - Get a single blocker by ID
 * - PUT    /api/blockers/:id                   - Update a blocker
 * - PUT    /api/blockers/:id/close             - Quick close a blocker (sets status to Closed)
 * - PUT    /api/blockers/:id/add-salesorder    - Add a sales order to blocker
 * - PUT    /api/blockers/:id/remove-salesorder - Remove a sales order from blocker
 * - PUT    /api/blockers/:id/add-workorder     - Add a work order to blocker
 * - PUT    /api/blockers/:id/remove-workorder  - Remove a work order from blocker
 * - DELETE /api/blockers/:id                   - Delete a blocker
 * 
 * Updated: February 6, 2026 - Added add/remove endpoints for related items
 * =============================================================================
 */

const express = require('express');
const router = express.Router();
const blockerController = require('../controllers/blockerController');
const { authenticateToken, requireScope } = require('../services/authToken');
const trackApiUsage = require('../services/apiUsageTracker');

// Create a new blocker
// POST /api/blockers
router.post('/', authenticateToken, requireScope('write:blockers'), trackApiUsage, blockerController.createBlocker);

// Get all blockers for current customer
// GET /api/blockers
router.get('/', authenticateToken, requireScope('read:blockers'), trackApiUsage, blockerController.getBlockers);

// Get a single blocker by ID
// GET /api/blockers/:id
router.get('/:id', authenticateToken, requireScope('read:blockers'), trackApiUsage, blockerController.getBlockerById);

// Quick close a blocker (sets status to 'Closed' and closedDate to current date)
// PUT /api/blockers/:id/close
// NOTE: This route must come BEFORE the generic /:id route to avoid conflicts
router.put('/:id/close', authenticateToken, requireScope('write:blockers'), trackApiUsage, blockerController.closeBlocker);

// Add a sales order to a blocker
// PUT /api/blockers/:id/add-salesorder
// Body: { salesOrderId: "..." }
router.put('/:id/add-salesorder', authenticateToken, requireScope('write:blockers'), trackApiUsage, blockerController.addRelatedSalesOrder);

// Remove a sales order from a blocker
// PUT /api/blockers/:id/remove-salesorder
// Body: { salesOrderId: "..." }
router.put('/:id/remove-salesorder', authenticateToken, requireScope('write:blockers'), trackApiUsage, blockerController.removeRelatedSalesOrder);

// Add a work order to a blocker
// PUT /api/blockers/:id/add-workorder
// Body: { workOrderId: "..." }
router.put('/:id/add-workorder', authenticateToken, requireScope('write:blockers'), trackApiUsage, blockerController.addRelatedWorkOrder);

// Remove a work order from a blocker
// PUT /api/blockers/:id/remove-workorder
// Body: { workOrderId: "..." }
router.put('/:id/remove-workorder', authenticateToken, requireScope('write:blockers'), trackApiUsage, blockerController.removeRelatedWorkOrder);

// Update a blocker
// PUT /api/blockers/:id
router.put('/:id', authenticateToken, requireScope('write:blockers'), trackApiUsage, blockerController.updateBlocker);

// Delete a blocker
// DELETE /api/blockers/:id
router.delete('/:id', authenticateToken, requireScope('delete:blockers'), trackApiUsage, blockerController.deleteBlocker);

module.exports = router;
