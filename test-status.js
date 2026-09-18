async function test() {
  const res = await fetch('http://localhost:5000/api/properties');
  console.log('Status:', res.status);
  if (!res.ok) {
    const text = await res.text();
    console.log('Error Text:', text);
  } else {
    const json = await res.json();
    console.log('Success, found', json.data.length, 'properties');
  }
}
test();
