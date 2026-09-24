const API = "http://127.0.0.1:8000";

async function main() {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ns.com", password: "1234" }),
  });
  const loginBody = await loginRes.text();
  if (!loginRes.ok) {
    console.log("LOGIN FAILED", loginRes.status, loginBody);
    process.exit(1);
  }
  const { access_token } = JSON.parse(loginBody);

  const listRes = await fetch(`${API}/athletes`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const listText = await listRes.text();
  const athletes = JSON.parse(listText);
  if (!Array.isArray(athletes) || athletes.length === 0) {
    console.log("No athletes in list", listRes.status, listText);
    process.exit(1);
  }
  const id = athletes[0].id;
  console.log(`Using athlete id=${id} name=${athletes[0].name}`);

  const getRes = await fetch(`${API}/athletes/${id}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const getBody = await getRes.text();
  console.log("--- GET /athletes/" + id + " ---");
  console.log("Status:", getRes.status, getRes.statusText);
  console.log("Body:");
  try {
    console.log(JSON.stringify(JSON.parse(getBody), null, 2));
  } catch {
    console.log(getBody);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
