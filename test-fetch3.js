async function test() {
  const res = await fetch('http://localhost:5000/api/properties');
  const json = await res.json();
  console.log(json.data.map(p => ({ title: p.title, specs: p.specs })));
}
test();
