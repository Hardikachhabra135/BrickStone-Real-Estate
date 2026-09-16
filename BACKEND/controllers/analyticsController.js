const pool = require('../config/db');

// Track an event (page_view, property_view, contact_submit, etc.)
exports.trackEvent = async (req, res) => {
    try {
        const { event_type, page, property_id, session_id, device_type, referrer, metadata } = req.body;
        
        // Fail gracefully if table doesn't exist yet
        try {
            await pool.query(
                `INSERT INTO analytics_events 
                (event_type, page, property_id, session_id, device_type, referrer, metadata) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [event_type, page, property_id || null, session_id, device_type, referrer, metadata ? JSON.stringify(metadata) : null]
            );
        } catch(dbErr) {
            if (dbErr.code === 'ER_NO_SUCH_TABLE') {
                // Table not created yet, just fallback to old website_clicks increment if it's a page_view
                if (event_type === 'page_view') {
                    await pool.query('UPDATE Analytics SET website_clicks = website_clicks + 1').catch(() => {});
                }
            } else {
                throw dbErr;
            }
        }
        
        res.status(200).json({ success: true, message: 'Event tracked' });
    } catch (error) {
        console.error('Error tracking event:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};



// Overview Stats (Visitors, properties, leads, etc.)
exports.getOverview = async (req, res) => {
    const range = req.query.range || '30days';
    let dateCondition = '';
    if (range === 'today') dateCondition = 'DATE(timestamp) = CURDATE()';
    else if (range === '7days') dateCondition = 'timestamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    else if (range === '30days') dateCondition = 'timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    else if (range === '90days') dateCondition = 'timestamp >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
    else if (range === 'year') dateCondition = 'timestamp >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
    else dateCondition = '1=1';

    try {
        const [rows] = await pool.query(`
            SELECT COUNT(*) as total_events, COUNT(DISTINCT session_id) as unique_sessions
            FROM analytics_events WHERE event_type = 'page_view' AND ${dateCondition}
        `);
        const visitors = rows[0].total_events;
        const uniqueVisitors = rows[0].unique_sessions;

        const [props] = await pool.query(`SELECT COUNT(*) as count FROM Properties`);
        const [verifiedProps] = await pool.query(`SELECT COUNT(*) as count FROM Properties WHERE is_verified = 1`);
        const [enquiries] = await pool.query(`SELECT COUNT(*) as count FROM Enquiries WHERE created_at >= ${dateCondition.replace('timestamp', 'created_at')}`);
        const [contacts] = await pool.query(`SELECT COUNT(*) as count FROM ContactForms WHERE created_at >= ${dateCondition.replace('timestamp', 'created_at')}`);

        res.status(200).json({
            success: true,
            data: { visitors, uniqueVisitors, totalProperties: props[0].count, verifiedProperties: verifiedProps[0].count, enquiries: enquiries[0].count, contactForms: contacts[0].count }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getDailyTraffic = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT DATE(timestamp) as date, COUNT(*) as views, COUNT(DISTINCT session_id) as visitors
            FROM analytics_events WHERE event_type = 'page_view' AND timestamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY DATE(timestamp) ORDER BY date ASC
        `);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getSources = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT referrer, COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view' GROUP BY referrer ORDER BY count DESC LIMIT 10
        `);
        const data = rows.map(r => ({ source: (!r.referrer || r.referrer === '') ? 'Direct' : r.referrer, count: r.count }));
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getDevices = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT device_type, COUNT(DISTINCT session_id) as count FROM analytics_events WHERE event_type = 'page_view' GROUP BY device_type`);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getTopPages = async (req, res) => {
    try {
        const [rows] = await pool.query(`SELECT page, COUNT(*) as views, COUNT(DISTINCT session_id) as unique_visitors FROM analytics_events WHERE event_type = 'page_view' GROUP BY page ORDER BY views DESC LIMIT 10`);
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
