async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/intern-listings/BRK-L-4944/review', {
      method: 'PATCH',
      headers: { 'Authorization': 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED', admin_feedback: '' })
    });
    const json = await res.json();
    console.log(json);
  } catch (e) {
    console.error(e);
  }
}
test();
