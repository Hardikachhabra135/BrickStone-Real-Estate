const pool = require('../config/db');

// Create a new property
exports.createProperty = async (req, res) => {
    try {
        const { title, description, price, location, badge, image, specs, is_verified, status } = req.body;
        
        const specsJson = specs ? JSON.stringify(specs) : null;
        const verified = is_verified ? true : false;
        const propStatus = status || 'Available';

        const [result] = await pool.query(
            'INSERT INTO Properties (title, description, price, location, badge, image, specs, is_verified, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, price, location, badge, image, specsJson, verified, propStatus]
        );

        res.status(201).json({ success: true, message: 'Property created', data: { id: result.insertId } });
    } catch (error) {
        console.error('Error creating property:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Retrieve all properties
exports.getAllProperties = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Properties ORDER BY created_at DESC');
        
        // Parse JSON specs back to arrays for the response
        const properties = rows.map(row => ({
            ...row,
            specs: typeof row.specs === 'string' ? JSON.parse(row.specs) : (row.specs || [])
        }));

        res.status(200).json({ success: true, data: properties });
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Retrieve a single property
exports.getPropertyById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM Properties WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        const property = rows[0];
        property.specs = typeof property.specs === 'string' ? JSON.parse(property.specs) : (property.specs || []);

        res.status(200).json({ success: true, data: property });
    } catch (error) {
        console.error('Error fetching property:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update a property
exports.updateProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, location, badge, image, specs, is_verified, status } = req.body;

        const specsJson = specs ? JSON.stringify(specs) : null;
        // Allows partial updates for verified boolean if provided, otherwise keep existing logic
        let query = 'UPDATE Properties SET ';
        const queryParams = [];

        if (title !== undefined) { query += 'title = ?, '; queryParams.push(title); }
        if (description !== undefined) { query += 'description = ?, '; queryParams.push(description); }
        if (price !== undefined) { query += 'price = ?, '; queryParams.push(price); }
        if (location !== undefined) { query += 'location = ?, '; queryParams.push(location); }
        if (badge !== undefined) { query += 'badge = ?, '; queryParams.push(badge); }
        if (image !== undefined) { query += 'image = ?, '; queryParams.push(image); }
        if (specs !== undefined) { query += 'specs = ?, '; queryParams.push(specsJson); }
        if (is_verified !== undefined) { query += 'is_verified = ?, '; queryParams.push(is_verified ? true : false); }
        if (status !== undefined) { query += 'status = ?, '; queryParams.push(status); }

        // Remove trailing comma and space
        query = query.slice(0, -2);
        query += ' WHERE id = ?';
        queryParams.push(id);

        const [result] = await pool.query(query, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        res.status(200).json({ success: true, message: 'Property updated' });
    } catch (error) {
        console.error('Error updating property:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete a property
exports.deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM Properties WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        res.status(200).json({ success: true, message: 'Property deleted' });
    } catch (error) {
        console.error('Error deleting property:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
