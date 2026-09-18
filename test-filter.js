const allLoadedProperties = [
  {
    title: 'FLAT 420',
    specs: [ ' sq ft', 'East', 'Freehold', '__CAT:flat', '__SUB:2 bhk' ]
  }
];

function filterByCategory(list, category) {
    if (!category) return list;
    const lowerCat = category.toLowerCase();
    return list.filter(prop => {
        let c = '';
        let sc = '';
        if (prop.specs && Array.isArray(prop.specs)) {
            prop.specs.forEach(s => {
                if (s.startsWith('__CAT:')) c = s.replace('__CAT:', '').toLowerCase();
                if (s.startsWith('__SUB:')) sc = s.replace('__SUB:', '').toLowerCase().replace(/\s+/g, '');
            });
        }

        const qCat = lowerCat.replace(/\s+/g, '');
        if (c === qCat || sc === qCat) return true;

        const cleanSpecs = (prop.specs || []).filter(s => !s.startsWith('__CAT:') && !s.startsWith('__SUB:'));
        const searchableText = (prop.title + ' ' + (prop.description || '') + ' ' + cleanSpecs.join(' ')).toLowerCase();

        if (lowerCat === 'flat') return searchableText.includes('flat') || searchableText.includes('apartment') || searchableText.includes('bhk') || searchableText.includes('villa');
        return false;
    });
}

console.log(filterByCategory(allLoadedProperties, '2BHK'));
