const apiAnalyticsService = require('../services/apiAnalytics');

const getApiUsage = async (req, res) => {
    try {
        const customerId = req.user.customerId;
        const { startDate, endDate, limit } = req.query;

        const usage = await apiAnalyticsService.getApiUsageByCompany(
            customerId,
            {
                startDate,
                endDate,
                limit: parseInt(limit) || 100
            }
        );

        res.status(200).json(usage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getApiSummary = async (req, res) => {
    try {
        const customerId = req.user.customerId;
        const { startDate, endDate } = req.query;

        const summary = await apiAnalyticsService.getApiUsageSummary(
            customerId,
            { startDate, endDate }
        );

        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getApiUsage,
    getApiSummary
};