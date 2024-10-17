"use client";

import { useState } from "react";
import axios from "axios";
import "./exercise.css";
import GlassBox from "@/components/glass-box";
import { useRouter } from "next/navigation";
import Sidebar from '@/components/sidebar';



const Exercise = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:8000/auth/logout",
        {},
        {
          withCredentials: true,
        }
      );
      setUser(null);
      router.push("/auth/login");
    } catch (err) {
      console.error("Error during logout:", err);
      setError("Logout failed, please try again.");
    }
  };

  const [activeButton, setActiveButton] = useState("incoming");
  const [exercises, setExercises] = useState(
    Array.from({ length: 15 }, (_, index) => ({
      title: `Ex${index + 1}.py`,
      status: index % 3 === 0 ? "incoming" : index % 3 === 1 ? "overdue" : "finished",
      description: `แบบฝึกหัดในห้องครั้งที่ ${index + 1} `,
      subdescription: "โปรแกรมตัดเกรด โดยใช้ภาษา Python"
    }))
  );

  const handleButtonClick = (button) => {
    setActiveButton(button);
    // Removed page redirection
  };

  const addExercise = () => {
    const newIndex = exercises.length + 1; // Calculate the new index based on current exercises
    const newExercise = {
      title: `Ex${newIndex}.py`,
      status: "incoming", // Set default status or use a dropdown to select
      description: `แบบฝึกหัดใหม่ในห้องครั้งที่ ${newIndex} `,
      subdescription: "โปรแกรมตัดเกรด โดยใช้ภาษา Python",
    };
    setExercises((prevExercises) => [...prevExercises, newExercise]); // Update the state with the new exercise
  };

  return (
    <div
      className="bg-cover bg-center min-h-screen flex items-center justify-center"
      style={{ backgroundImage: `url('/Login.png')` }}
    >
      <GlassBox size={{ minWidth: "1800px" }}>
        <div className="min-h-full w-full py-10 px-6">
          <h1 className="text-white text-4xl font-bold mb-6">Class Exercise</h1>

          {/* Tabs */}
          <div className="flex justify-start space-x-6 text-white mb-6 border-b border-gray-600">
            <button
              className={`py-2 px-4 font-semibold rounded-lg transition-colors duration-300 ${
                activeButton === "incoming"
                  ? "text-gray-600 bg-white border-b-gray-600"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }`}
              onClick={() => handleButtonClick("incoming")}
            >
              In coming
            </button>

            <button
              className={`py-2 px-4 font-semibold rounded-lg transition-colors duration-300 ${
                activeButton === "overdue"
                  ? "text-gray-600 bg-white border-b-gray-600"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }`}
              onClick={() => handleButtonClick("overdue")}
            >
              Overdue
            </button>

            <button
              className={`py-2 px-4 font-semibold rounded-lg transition-colors duration-300 ${
                activeButton === "finished"
                  ? "text-gray-600 bg-white border-b-gray-600"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }`}
              onClick={() => handleButtonClick("finished")}
            >
              Finished
            </button>
          </div>

          {/* Button to add new exercise */}
          <button 
            onClick={addExercise}
            className="mb-4 py-2 px-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-300"
          >
            Add New Exercise
          </button>

          {/* Grid layout for exercises */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mx-24">
            {exercises.map((exercise, index) => (
              <div
                key={index}
                className="bg-white p-10 rounded-3xl shadow-lg text-center transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <img
                  className="mx-auto w-16 h-16 mb-4 transition-transform duration-300 hover:scale-110"
                  src="https://res.cloudinary.com/dstl8qazf/image/upload/f_auto,q_auto/v1/underthegun/iuvlqgoaydxwdesf3xkk"
                  alt="Python Logo"
                />
                <h2 className="text-xl font-semibold mb-4 text-black border-b-2 border-purple-700 mx-10">
                  {exercise.title}
                </h2>
                <p className="text-sm text-gray-600 mb-2">
                  {exercise.description}
                  <br />
                  {exercise.subdescription}
                </p>
              </div>
            ))}
          </div>
        </div>
      </GlassBox>
    </div>
  );
};

export default Exercise;
