const prop = {
  id: 1789705504089,
  title: 'FLAT 420',
  description: '',
  price: '1.2 CR',
  location: 'NOIDA',
  badge: 'New',
  image: 'http://localhost:5000/uploads/files-1789698718865-625123654.jpg',
  specs: [ ' sq ft', 'East', 'Freehold', '__CAT:flat', '__SUB:2 BHK' ],
  is_verified: true,
  status: 'Available',
  created_at: '2026-09-18T04:25:04.089Z'
};

const categoryParam = '2BHK';
const lowerCat = categoryParam.toLowerCase();
let c = '';
let sc = '';
if (prop.specs && Array.isArray(prop.specs)) {
    prop.specs.forEach(s => {
        if (s.startsWith('__CAT:')) c = s.replace('__CAT:', '').toLowerCase();
        if (s.startsWith('__SUB:')) sc = s.replace('__SUB:', '').toLowerCase().replace(/\s+/g, '');
    });
}
const qCat = lowerCat.replace(/\s+/g, '');

console.log('c:', c);
console.log('sc:', sc);
console.log('qCat:', qCat);
console.log('Match?', c === qCat || sc === qCat);

const filteredList = [prop].filter(p => {
    const status = (p.status || '').toLowerCase();
    const filterLower = 'all'.toLowerCase();
    return status.includes(filterLower);
});
console.log('Status Match?', filteredList.length > 0);
