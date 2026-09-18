async function test() {
  const res = await fetch('http://localhost:5000/api/properties');
  const json = await res.json();
  const prop = json.data.find(p => p.title === 'FLAT 420' && p.specs.includes('__SUB:2 BHK'));
  console.log(prop);
}
test();
