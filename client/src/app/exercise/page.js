"use client";

import { useState, useEffect } from "react";
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

  const [activeTab, setActiveTab] = useState("upcoming");
  const [exercises, setExercises] = useState(
    Array.from({ length: 15 }, (_, index) => ({
      title: `Assignment ${index + 1}`,
      status: "upcoming",
      description: `Assignment for session ${index + 1}`,
      subdescription: "Grade evaluation using Python",
      dueDate: new Date(
        new Date().getTime() + (index + 1) * 24 * 60 * 60 * 1000
      ), // Due dates in the future
      submitted: false, // Track if assignment is submitted
    }))
  );

  useEffect(() => {
    const interval = setInterval(checkForPastDueAssignments, 1000 * 60 * 60); // Check every hour
    return () => clearInterval(interval);
  }, [exercises]);

  // Function to check if assignments are past due
  const checkForPastDueAssignments = () => {
    const updatedExercises = exercises.map((exercise) => {
      if (
        exercise.status === "upcoming" &&
        new Date() > new Date(exercise.dueDate) &&
        !exercise.submitted
      ) {
        return { ...exercise, status: "pastDue" };
      }
      return exercise;
    });
    setExercises(updatedExercises);
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const addExercise = () => {
    const newIndex = exercises.length + 1;
    const newExercise = {
      title: `Assignment ${newIndex}`,
      status: "upcoming",
      description: `New assignment for session ${newIndex}`,
      subdescription: "Grade evaluation using Python",
      dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // Default due date: 7 days from now
      submitted: false,
    };
    setExercises((prevExercises) => [...prevExercises, newExercise]);
  };

  // Function to submit an assignment
  const submitAssignment = (index) => {
    const updatedExercises = [...exercises];
    updatedExercises[index].status = "finished";
    updatedExercises[index].submitted = true;
    setExercises(updatedExercises);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div
      className="bg-cover bg-center min-h-screen flex items-center justify-center"
      style={{ backgroundImage: `url('/Login.png')` }}
    >
      <GlassBox size={{ minWidth: "1800px" }}>
        <div className="min-h-full w-full py-10 px-6">
          <h1 className="text-white text-4xl font-bold mb-6">
            Class Assignments
          </h1>

          {/* Tabs */}
          <div className="flex justify-start space-x-6 text-white mb-6 border-b border-gray-600">
            <button
              className={`py-2 px-4 font-semibold rounded-lg transition-colors duration-300 ${
                activeTab === "upcoming"
                  ? "text-gray-600 bg-white border-b-gray-600"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }`}
              onClick={() => handleTabClick("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`py-2 px-4 font-semibold rounded-lg transition-colors duration-300 ${
                activeTab === "pastDue"
                  ? "text-gray-600 bg-white border-b-gray-600"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }`}
              onClick={() => handleTabClick("pastDue")}
            >
              Past Due
            </button>
            <button
              className={`py-2 px-4 font-semibold rounded-lg transition-colors duration-300 ${
                activeTab === "finished"
                  ? "text-gray-600 bg-white border-b-gray-600"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }`}
              onClick={() => handleTabClick("finished")}
            >
              Finished
            </button>
            <button
              onClick={addExercise}
              className="py-2 px-4  text-black bg-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
            >
              Add New Assignment
            </button>
          </div>

          {/* Button to add new exercise */}

          {/* Grid layout for exercises */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mx-24">
            {exercises
              .filter((exercise) => exercise.status === activeTab)
              .map((exercise, index) => (
                <div
                  key={index}
                  className={`p-10 rounded-3xl shadow-lg text-center transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl ${
                    exercise.status === "finished"
                      ? "bg-green-300 text-white"
                      : exercise.status === "pastDue"
                      ? "bg-red-300 text-white"
                      : "bg-white"
                  }`}
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
                  <p className="text-sm text-gray-500 mb-2">
                    Due Date: {formatDate(exercise.dueDate)}
                  </p>
                  {exercise.status === "upcoming" && !exercise.submitted && (
                    <button
                      onClick={() => submitAssignment(index)}
                      className="mt-4 py-1 px-3 text-white bg-green-500 rounded hover:bg-green-600 transition-colors duration-300"
                    >
                      Submit Assignment
                    </button>
                  )}
                </div>
              ))}
          </div>
        </div>
      </GlassBox>
    </div>
  );
};

export default Exercise;
