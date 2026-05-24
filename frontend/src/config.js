// Production API URL - strip trailing slash to prevent double-slash in paths
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://pathwaycs-backend.onrender.com').replace(/\/$/, '')
export default API_BASE_URL
