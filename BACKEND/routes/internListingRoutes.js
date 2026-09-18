const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const listingsFile = path.join(__dirname, '../intern_listings.json');
const internsFile = path.join(__dirname, '../interns.json');

const readListings = () => JSON.parse(fs.readFileSync(listingsFile, 'utf8'));
const writeListings = (data) => fs.writeFileSync(listingsFile, JSON.stringify(data, null, 2));

const readInterns = () => JSON.parse(fs.readFileSync(internsFile, 'utf8'));

// Authentication Middleware for Interns & Admins
const auth = require('../middleware/authMiddleware');

// Get all listings (Admin gets all, Intern gets theirs)
router.get('/', auth.verifyToken, (req, res) => {
    let listings = readListings();
    
    if (req.user.role === 'intern') {
        listings = listings.filter(l => l.intern_id === req.user.id);
    }
    
    // Sort by updated_at desc
    listings.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    
    // Map intern name for admin view
    if (req.user.role !== 'intern') {
        const interns = readInterns();
        listings = listings.map(l => {
            const intern = interns.find(i => i.id === l.intern_id);
            return { ...l, intern_name: intern ? intern.name : 'Unknown Intern' };
        });
    }

    res.json({ success: true, data: listings });
});

// Intern creates or updates a listing (Draft or Submitted)
router.post('/', auth.verifyToken, (req, res) => {
    if (req.user.role !== 'intern') return res.status(403).json({ success: false, message: 'Only interns can create listings' });

    const listings = readListings();
    const payload = req.body;
    
    if (payload.id) {
        // Update existing
        const index = listings.findIndex(l => l.id === payload.id && l.intern_id === req.user.id);
        if (index === -1) return res.status(404).json({ success: false, message: 'Listing not found' });
        
        // Prevent editing if SUBMITTED or APPROVED, unless changes requested
        const currentStatus = listings[index].status;
        if (currentStatus === 'SUBMITTED' || currentStatus === 'APPROVED') {
            return res.status(400).json({ success: false, message: 'Cannot edit a submitted or approved listing' });
        }

        listings[index] = {
            ...listings[index],
            ...payload,
            updated_at: new Date().toISOString()
        };
        writeListings(listings);
        return res.json({ success: true, data: listings[index] });
    } else {
        // Create new
        const newList = {
            id: 'BRK-L-' + Math.floor(1000 + Math.random() * 9000), // e.g. BRK-L-4921
            intern_id: req.user.id,
            ...payload,
            status: payload.status || 'DRAFT',
            admin_feedback: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        listings.push(newList);
        writeListings(listings);
        return res.json({ success: true, data: newList });
    }
});

// Admin reviews listing (Approve, Request Changes, Reject)
router.patch('/:id/review', auth.verifyToken, async (req, res) => {
    if (req.user.role === 'intern') return res.status(403).json({ success: false, message: 'Only admins can review' });

    const { status, admin_feedback, publishToMain, category, subcategory } = req.body;
    const listings = readListings();
    const index = listings.findIndex(l => l.id === req.params.id);
    
    if (index === -1) return res.status(404).json({ success: false, message: 'Listing not found' });

    listings[index].status = status;
    if (admin_feedback !== undefined) {
        listings[index].admin_feedback = admin_feedback;
    }
    listings[index].updated_at = new Date().toISOString();

    writeListings(listings);
    
    let warning = '';
    if (status === 'APPROVED' && publishToMain) {
        const listing = listings[index];
        const cleanSpecs = (listing.specifications || []).filter(s => !s.startsWith('__CAT:') && !s.startsWith('__SUB:'));
        cleanSpecs.push('__CAT:' + (category || 'flat'));
        cleanSpecs.push('__SUB:' + (subcategory || ''));
        
        const propertyData = {
            title: listing.title,
            description: listing.description || '',
            price: listing.price,
            location: listing.location,
            badge: 'New',
            image: listing.primary_photo || '',
            specs: cleanSpecs,
            is_verified: true,
            status: 'Available',
            category: category || 'flat',
            subcategory: subcategory || ''
        };
        
        try {
            const pool = require('../config/db');
            
            // Make sure the schema has category and subcategory!
                        await pool.query(
                'INSERT INTO Properties (title, description, price, location, badge, image, specs, is_verified, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    propertyData.title, propertyData.description, propertyData.price, propertyData.location,
                    propertyData.badge, propertyData.image, JSON.stringify(propertyData.specs),
                    propertyData.is_verified, propertyData.status
                ]
            );
        } catch (dbErr) {
            console.error('Failed to publish to main DB:', dbErr);
            warning = ' Note: Failed to publish to public website (Database error/Missing Columns).';
        }
    }

    res.json({ success: true, message: 'Review saved' + warning, data: listings[index] });
});

// Intern deletes a draft
router.delete('/:id', auth.verifyToken, (req, res) => {
    const listings = readListings();
    
    if (req.user.role === 'admin') {
        const index = listings.findIndex(l => l.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: 'Listing not found' });
        listings.splice(index, 1);
        writeListings(listings);
        return res.json({ success: true, message: 'Listing deleted by admin' });
    }
    
    if (req.user.role === 'intern') {
        const index = listings.findIndex(l => l.id === req.params.id && l.intern_id === req.user.id);
        if (index === -1) return res.status(404).json({ success: false, message: 'Listing not found' });
        if (listings[index].status !== 'DRAFT') return res.status(400).json({ success: false, message: 'Only drafts can be deleted' });
        listings.splice(index, 1);
        writeListings(listings);
        return res.json({ success: true, message: 'Draft deleted' });
    }
    
    return res.status(403).json({ success: false, message: 'Forbidden' });
});

module.exports = router;




