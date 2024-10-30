import axios from "axios";

export default async function Data() {
  try {
    const response = await axios.get('http://localhost:8000/users/me', {
      withCredentials: true,
    });
    return response.data;
  } catch (err) {
    console.error('Error fetching user:', err);
  }
};

