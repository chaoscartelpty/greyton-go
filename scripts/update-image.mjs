const projectId = "greyton-go-1";
const apiKey = "AIzaSyBE9E4kd8q2vCZh82JfaRz8e0Wl-lKfzuw";
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;
const docUrl = `${base}/documents/app_data/restaurants?key=${apiKey}`;

// Fetch current document
const resp = await fetch(docUrl);
const doc = await resp.json();
if (doc.error) { console.log("Fetch error:", doc.error); process.exit(1); }

const list = doc.fields.list.arrayValue.values;

// Find and update Lucy Blu's image
for (const item of list) {
  const fields = item.mapValue.fields;
  if (fields.id?.stringValue === "lucy-blu") {
    fields.image.stringValue = "https://imghosting.in/host/mm5d7a";
    console.log("Updated Lucy Blu image");
  }
}

// PATCH back the full document
const result = await fetch(`${docUrl}&updateMask.fieldPaths=list`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ fields: { list: doc.fields.list } })
});

const res = await result.json();
if (res.error) {
  console.log("Update failed:", JSON.stringify(res.error, null, 2));
} else {
  console.log("Success! Firestore updated.");
}
