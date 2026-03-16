const FALLBACK_API_URL = "https://rtnmusicappbackend.onrender.com";

export const API_URL = (process.env.REACT_APP_API_URL || FALLBACK_API_URL).replace(/\/$/, "");
