const Invitation = require('../models/Invitation');
const Company = require('../models/Company');
const User = require('../models/User');
const crypto = require('crypto');

// Configure SendGrid
const sgMail = require('@sendgrid/mail');

// Create an invitation and send email
const createInvitation = async (userId, email) => {
  try {
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get company details
    const company = await Company.findById(user.customerId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Check if user is power user
    if (user.role !== 'power_user') {
      throw new Error('Access denied. Only power users can send invitations.');
    }

    // Check if company has reached user limit
    if (company.currentUserCount >= company.maxUsers) {
      throw new Error('Your company has reached the maximum user limit');
    }

    // Check if email already exists as a user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    // Check if there's already a pending invitation for this email in this company
    const existingInvitation = await Invitation.findOne({
      email,
      companyId: company._id,
      status: 'pending'
    });

    if (existingInvitation) {
      throw new Error('An invitation has already been sent to this email');
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create the invitation
    const invitation = new Invitation({
      email,
      token,
      companyId: company._id,
      companyName: company.name,
      invitedBy: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    await invitation.save();

    // Generate invitation URL
    const invitationUrl = `https://threadwire.ai/app/register?token=${token}`;

    // Send email
    await sendInvitationEmail(email, user.firstName, company.name, invitationUrl);

    return { message: 'Invitation sent successfully' };
  } catch (error) {
    throw new Error(error.message || 'Failed to create invitation');
  }
};

// Validate invitation token
const validateInvitation = async (token) => {
  try {
    // Find the invitation
    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      throw new Error('Invitation has expired');
    }

    return {
      email: invitation.email,
      companyId: invitation.companyId,
      companyName: invitation.companyName
    };
  } catch (error) {
    throw new Error(error.message || 'Failed to validate invitation');
  }
};

// Process invitation (mark as accepted)
const processInvitation = async (token) => {
  try {
    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Update invitation status
    invitation.status = 'accepted';
    await invitation.save();

    return { message: 'Invitation accepted successfully' };
  } catch (error) {
    throw new Error(error.message || 'Failed to process invitation');
  }
};

// Send invitation email using SendGrid
const sendInvitationEmail = async (recipientEmail, senderName, companyName, invitationUrl) => {
  // Set SendGrid API key
  sgMail.setApiKey('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');
  
  const msg = {
    to: recipientEmail,
    from: {
      email: 'admin@threadwire.ai',
      name: 'Threadwire'
    },
    subject: `You've been invited to join ${companyName} on Threadwire`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #333;">Threadwire</h2>
        </div>
        <div style="background-color: #f9f9f9; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #333; margin-top: 0;">You've Been Invited!</h3>
          <p>${senderName} has invited you to join their team at ${companyName} on Threadwire.</p>
          <p>Click the button below to accept the invitation and create your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Accept Invitation</a>
          </div>
          <p style="color: #777; font-size: 0.9em;">This invitation will expire in 7 days.</p>
        </div>
        <div style="text-align: center; color: #777; font-size: 0.8em;">
          <p>&copy; 2025 Threadwire. All rights reserved.</p>
          <p>If you received this email by mistake, please disregard it.</p>
        </div>
      </div>
    `,
    // Optional: Add text version for email clients that don't support HTML
    text: `${senderName} has invited you to join their team at ${companyName} on Threadwire. 
    Visit this link to accept the invitation: ${invitationUrl}
    This invitation will expire in 7 days.`
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Error sending email with SendGrid:', error);
    throw new Error('Failed to send invitation email');
  }
};

// Resend an invitation
const resendInvitation = async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { invitationId } = req.params;

    // Validate invitationId
    if (!invitationId) {
      return res.status(400).json({ error: 'Invitation ID is required' });
    }

    // Get invitation
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Can only resend pending invitations' });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get company details
    const company = await Company.findById(user.customerId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if user is power user
    if (user.role !== 'power_user') {
      return res.status(403).json({ error: 'Access denied. Only power users can resend invitations.' });
    }

    // Check if user belongs to the same company as the invitation
    if (user.customerId.toString() !== invitation.companyId.toString()) {
      return res.status(403).json({ error: 'Access denied. You can only resend invitations for your company.' });
    }

    // Generate invitation URL
    const invitationUrl = `https://threadwire.ai/app/register?token=${token}`;

    // Resend email
    await sendInvitationEmail(invitation.email, user.firstName, company.name, invitationUrl);

    // Update invitation timestamp (optional)
    invitation.updatedAt = new Date();
    await invitation.save();

    res.status(200).json({ message: 'Invitation resent successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all pending invitations for a company
const getPendingInvitations = async (userId) => {
  try {
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get company details
    const company = await Company.findById(user.customerId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Check if user is power user
    if (user.role !== 'power_user') {
      throw new Error('Access denied. Only power users can view invitations.');
    }

    // Get all pending invitations for the company
    const invitations = await Invitation.find({ 
      companyId: company._id, 
      status: 'pending',
      expiresAt: { $gt: new Date() } // Only non-expired invitations
    }).sort({ createdAt: -1 });

    return { invitations };
  } catch (error) {
    throw new Error(error.message || 'Failed to retrieve pending invitations');
  }
};

module.exports = {
  createInvitation,
  validateInvitation,
  processInvitation,
  getPendingInvitations,
  resendInvitation
};