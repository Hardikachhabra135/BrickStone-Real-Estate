async function test() {
  const res = await fetch('http://localhost:5000/api/properties');
  const json = await res.json();
  const match = json.data.find(p => p.specs.includes('__SUB:2 bhk'));
  console.log('MATCH:', match);
}
test();
