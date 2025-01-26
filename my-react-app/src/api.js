const baseUrl = import.meta.env.VITE_API_BASE_URL;

export const saveToMongo = (collection, data) =>
  fetch(`${baseUrl}/mongo/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection, data }),
  });

export const saveToInflux = (measurement, fields, tags) =>
  fetch(`${baseUrl}/influx/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ measurement, fields, tags }),
  });
