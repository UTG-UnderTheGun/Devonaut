import axios from "axios";

export default async function Data() {
	const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  try {
    const response = await axios.get(`${API_BASE}/users/me`, {
      withCredentials: true,
    });
    return response.data;
  } catch (err) {
    console.error('Error fetching user:', err);
  }
};

