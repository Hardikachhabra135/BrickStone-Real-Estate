const pool = require('../config/db');

// Create a new property
exports.createProperty = async (req, res) => {
    try {
        const { title, description, price, location, badge, image, specs, is_verified, status, category, subcategory, media } = req.body;
        
        let processedSpecs = Array.isArray(specs) ? specs : [];
        if (category) processedSpecs.push('__CAT:' + category);
        if (subcategory) processedSpecs.push('__SUB:' + subcategory);
        
        const specsJson = processedSpecs.length > 0 ? JSON.stringify(processedSpecs) : null;
        const verified = is_verified ? true : false;
        const propStatus = status || 'Available';
        const mediaJson = media ? JSON.stringify(media) : JSON.stringify({ photos: [], video: '' });

        const [result] = await pool.query(
            'INSERT INTO Properties (title, description, price, location, badge, image, specs, is_verified, status, media) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, price, location, badge, image, specsJson, verified, propStatus, mediaJson]
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
        let rows;
        try {
            [rows] = await pool.query("SELECT * FROM Properties WHERE approval_status = 'Approved' OR approval_status IS NULL ORDER BY created_at DESC");
        } catch (dbError) {
            if (dbError.code === 'ER_BAD_FIELD_ERROR' || String(dbError).includes('Unknown column')) {
                // Fallback for older database schema
                [rows] = await pool.query("SELECT * FROM Properties ORDER BY created_at DESC");
            } else {
                throw dbError;
            }
        }
        
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
        let rows;
        try {
            [rows] = await pool.query("SELECT * FROM Properties WHERE id = ? AND (approval_status = 'Approved' OR approval_status IS NULL)", [id]);
        } catch (dbError) {
            if (dbError.code === 'ER_BAD_FIELD_ERROR' || String(dbError).includes('Unknown column')) {
                // Fallback for older database schema
                [rows] = await pool.query("SELECT * FROM Properties WHERE id = ?", [id]);
            } else {
                throw dbError;
            }
        }

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
        const { title, description, price, location, badge, image, specs, is_verified, status, category, subcategory, media } = req.body;

        let processedSpecs = Array.isArray(specs) ? specs : (specs || []);
        if (category || subcategory) {
            // Remove old tags
            processedSpecs = processedSpecs.filter(s => !s.startsWith('__CAT:') && !s.startsWith('__SUB:'));
            if (category) processedSpecs.push('__CAT:' + category);
            if (subcategory) processedSpecs.push('__SUB:' + subcategory);
        }

        const specsJson = processedSpecs.length > 0 ? JSON.stringify(processedSpecs) : null;
        const mediaJson = media ? JSON.stringify(media) : null;

        // Allows partial updates for verified boolean if provided, otherwise keep existing logic
        let query = 'UPDATE Properties SET ';
        const queryParams = [];

        if (title !== undefined) { query += 'title = ?, '; queryParams.push(title); }
        if (description !== undefined) { query += 'description = ?, '; queryParams.push(description); }
        if (price !== undefined) { query += 'price = ?, '; queryParams.push(price); }
        if (location !== undefined) { query += 'location = ?, '; queryParams.push(location); }
        if (badge !== undefined) { query += 'badge = ?, '; queryParams.push(badge); }
        if (image !== undefined) { query += 'image = ?, '; queryParams.push(image); }
        if (specs !== undefined || category || subcategory) { query += 'specs = ?, '; queryParams.push(specsJson); }
        if (media !== undefined) { query += 'media = ?, '; queryParams.push(mediaJson); }
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
