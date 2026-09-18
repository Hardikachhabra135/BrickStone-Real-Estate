const pool = require('./BACKEND/config/db');

async function testQuery() {
    try {
        const [interns] = await pool.query(
            `SELECT i.*, 
             (SELECT COUNT(*) FROM Properties WHERE intern_id = i.id AND approval_status = 'Approved') as approved_properties,
             (SELECT COUNT(*) FROM Properties WHERE intern_id = i.id AND approval_status = 'Under Review') as pending_properties
             FROM Interns i ORDER BY i.created_at DESC`
        );
        console.log(interns);
    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        process.exit();
    }
}
testQuery();
