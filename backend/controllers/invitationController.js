const invitationService = require('../services/invitationService');

// Create a new invitation
const createInvitation = async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const result = await invitationService.createInvitation(userId, email);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Validate an invitation token
const validateInvitation = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const result = await invitationService.validateInvitation(token);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Process an invitation (mark as accepted)
const processInvitation = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const result = await invitationService.processInvitation(token);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all pending invitations for a company
const getPendingInvitations = async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;

        const result = await invitationService.getPendingInvitations(userId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Resend an invitation
const resendInvitation = async (req, res) => {
    try {
        const userId = req.user.id || req.user.userId;
        const { invitationId } = req.params;

        if (!invitationId) {
            return res.status(400).json({ error: 'Invitation ID is required' });
        }

        const result = await invitationService.resendInvitation(userId, invitationId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    createInvitation,
    validateInvitation,
    processInvitation,
    resendInvitation,
    getPendingInvitations
};