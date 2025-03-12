const baseUrl = import.meta.env.VITE_API_BASE_URL;

// Helper function to get the auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const saveToMongo = (collection, data) =>
  fetch(`${baseUrl}/mongo/save`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ collection, data }),
  });

export const saveToInflux = (measurement, fields, tags) =>
  fetch(`${baseUrl}/influx/save`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ measurement, fields, tags }),
  });