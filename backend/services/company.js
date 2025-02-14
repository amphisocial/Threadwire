const axios = require('axios');
const Company = require('../models/Company');

const SEC_TICKER_URL = 'https://www.sec.gov/files/company_tickers.json';

// Delay to avoid hitting SEC's rate limit
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchAndStoreCompanies = async () => {
    try {
        // Fetch company tickers from SEC
        const response = await axios.get(SEC_TICKER_URL, {
            headers: { 'User-Agent': 'Threadwire (akashface2@gmail.com)' }
        });
        const companies = response.data;


        // Loop through each company and fetch additional details
        for (const key in companies) {
            const { cik_str, title } = companies[key];
            const cikPadded = cik_str.toString().padStart(10, '0'); // Format CIK to 10 digits

            const detailsURL = `https://data.sec.gov/submissions/CIK${cikPadded}.json`;

            try {
                // Fetch company details from the detailed SEC filing
                const detailsResponse = await axios.get(detailsURL, {
                    headers: { 'User-Agent': 'Threadwire (akashface2@gmail.com)' }
                });

                const data = detailsResponse.data;
                const address = data.addresses?.business || {}; // Get business address if available
                const fullAddress = `${address.street1 || ''}, ${address.city || ''}, ${address.stateOrCountryDescription || ''}, ${address.zipCode || ''}`;
                const phone = data.phone || 'N/A'; // Use 'N/A' if no phone number is available

                console.log({
                    companyId: cikPadded,
                    name: title,
                    address: fullAddress.trim(),
                    phone
                });

                // Check if company exists, and insert if not
                const existingCompany = await Company.findOne({ companyId: cikPadded });
                if (!existingCompany) {
                    await Company.create({
                        companyId: cikPadded,
                        name: title,
                        address: fullAddress.trim(),
                        phone
                    });
                    console.log(`Stored company: ${title}`);
                }
            } catch (error) {
                console.error(`Error fetching details for ${title}: ${error.message}`);
            }

        }

        console.log('Company data stored successfully.');
    } catch (error) {
        if (error.response && error.response.status === 429) {
            // Check if the Retry-After header is present
            const retryAfter = error.response.headers['retry-after'];

            if (retryAfter) {
                // If Retry-After header is present, use its value (in seconds)
                console.log(`Rate-limited. Retrying in ${retryAfter} seconds...`);
                await delay(parseInt(retryAfter) * 1000); // Wait for the specified time
            }
            console.error('Error fetching SEC company data:', error.message);
        }
    }
};


module.exports = { fetchAndStoreCompanies };
