"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import './level.css';
import Loading from "@/app/loading";

export default function SkillLevel() {
  const router = useRouter();
  const [skill, setSkill] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!skill) {
      return;
    }

    setIsLoading(true);
    try {
      // Here you can add API call to save skill level
      // Example:
      // await axios.post('api/set-skill', { skill });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push('/dashboard');
    } catch (error) {
      console.error('Error setting skill level:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="container">
      <main className="skill-card">
        <div className="progress-steps">
          <div className="step">1</div>
          <div className="progress-line"></div>
          <div className="step">2</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Choose your skill</label>
            <div className="select-wrapper">
              <select
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                required
                disabled={isLoading}
              >
                <option value="">Select your skill level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!skill || isLoading}
          >
            {isLoading ? 'LOADING...' : 'CONTINUE'}
          </button>
        </form>
      </main>
    </div>
  );
}