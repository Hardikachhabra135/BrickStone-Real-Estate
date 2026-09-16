USE real_estate_db;

INSERT INTO Properties (title, description, price, location, is_verified, status) VALUES 
('Hillside Villa', 'A private hillside estate framed by ocean views on every level.', '2400000', 'Malibu, California', TRUE, 'Available'),
('Skyline Penthouse', 'A glass-walled penthouse in the heart of the city.', '8500', 'Downtown, Delhi', TRUE, 'Rented'),
('Coastal Retreat', 'An open-plan coastal home designed around indoor-outdoor living.', '1800000', 'Goa, India', TRUE, 'Available'),
('Urban Loft', 'A compact, design-forward loft in a converted commercial building.', '650000', 'Bangalore, Karnataka', FALSE, 'Available'),
('Garden Bungalow', 'A quiet single-storey bungalow set around a private garden.', '2200', 'Pune, Maharashtra', TRUE, 'Available'),
('Heritage Townhouse', 'A restored heritage townhouse blending traditional Rajasthani architecture with modern interiors.', '980000', 'Jaipur, Rajasthan', FALSE, 'Sold'),
('Skyline Penthouse', 'A refined penthouse in the heart of Bandra West.', '35000000', 'Bandra West, Mumbai', TRUE, 'Available'),
('Heritage Row Villa', 'A spacious heritage-style villa in one of Pune''s most sought-after neighbourhoods.', '85000', 'Koregaon Park, Pune', TRUE, 'Rented'),
('Metro Business Hub', 'A premium commercial space in Mumbai''s BKC business district.', '12000000', 'BKC, Mumbai', TRUE, 'Available');
