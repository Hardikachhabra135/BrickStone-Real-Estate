const pool = require('../config/db');

// Get Dashboard Summary Stats
exports.getDashboardStats = async (req, res) => {
    try {
        // Fetch Total Website Clicks
        const [analyticsRows] = await pool.query('SELECT website_clicks FROM Analytics LIMIT 1');
        const totalClicks = analyticsRows.length > 0 ? analyticsRows[0].website_clicks : 0;

        // Fetch Total Verified Properties
        const [verifiedProps] = await pool.query('SELECT COUNT(*) as count FROM Properties WHERE is_verified = TRUE');
        const totalVerifiedProperties = verifiedProps[0].count;

        // Fetch Total Property Enquiries
        const [enquiries] = await pool.query('SELECT COUNT(*) as count FROM PropertyEnquiries');
        const totalPropertyEnquiries = enquiries[0].count;

        // Fetch Total Contact Submissions
        const [contacts] = await pool.query('SELECT COUNT(*) as count FROM ContactSubmissions');
        const totalContactSubmissions = contacts[0].count;

        // Fetch Total Properties
        const [allProps] = await pool.query('SELECT COUNT(*) as count FROM Properties');
        const totalProperties = allProps[0].count;

        res.status(200).json({
            success: true,
            data: {
                total_clicks: totalClicks,
                total_properties: totalProperties,
                total_verified_properties: totalVerifiedProperties,
                total_property_enquiries: totalPropertyEnquiries,
                total_contact_submissions: totalContactSubmissions
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
