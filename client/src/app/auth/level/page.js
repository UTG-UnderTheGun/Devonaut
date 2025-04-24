"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import './level.css';
import Loading from "@/app/loading";

export default function SkillLevel() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const router = useRouter();
  const [skill, setSkill] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!skill) {
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Call API to save skill level
      const response = await fetch(`${API_BASE}/users/skill-level`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ skill_level: skill })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to set skill level');
      }

      // Wait for the response to complete before navigation
      await response.json().catch(() => ({}));
      
      // Add a small delay to ensure the server has processed the request
      setTimeout(() => {
        router.push('/dashboard');
      }, 300);
      
    } catch (error) {
      console.error('Error setting skill level:', error);
      setError(error.message || 'An error occurred. Please try again.');
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
          <div className="step active">1</div>
          <div className="progress-line active"></div>
          <div className="step active">2</div>
          <div className="progress-line active"></div>
          <div className="step active">3</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <h2 className="form-label">Select your Python skill level</h2>
            
            <div className="skill-level-blocks">
              <div 
                className={`skill-block ${skill === 'beginner' ? 'selected' : ''}`}
                onClick={() => setSkill('beginner')}
              >
                <h3 className="skill-title">
                  <span className="skill-icon beginner-icon">🐣</span>
                  Beginner
                </h3>
                <p className="skill-description">
                  เหมาะสำหรับผู้ที่เพิ่งเริ่มต้นเขียนโปรแกรม เน้นการเรียนรู้พื้นฐานที่สุด เช่น ตัวแปร การรับค่า-แสดงผล และการคำนวณอย่างง่าย
                </p>
                {skill === 'beginner' && <div className="check-mark">✓</div>}
              </div>

              <div 
                className={`skill-block ${skill === 'intermediate' ? 'selected' : ''}`}
                onClick={() => setSkill('intermediate')}
              >
                <h3 className="skill-title">
                  <span className="skill-icon intermediate-icon">🚀</span>
                  Intermediate
                </h3>
                <p className="skill-description">
                  สำหรับผู้ที่เข้าใจพื้นฐานแล้ว พร้อมเรียนรู้เรื่อง if-else, loops, lists 
                </p>
                {skill === 'intermediate' && <div className="check-mark">✓</div>}
              </div>

              <div 
                className={`skill-block ${skill === 'advanced' ? 'selected' : ''}`}
                onClick={() => setSkill('advanced')}
              >
                <h3 className="skill-title">
                  <span className="skill-icon advanced-icon">⭐</span>
                  Advanced
                </h3>
                <p className="skill-description">
                  สำหรับผู้ที่เข้าใจหลักการfunctions พื้นฐาน พร้อมเรียนรู้การจัดการข้อมูลที่ซับซ้อนขึ้น และการจัดการ errors เบื้องต้น
                </p>
                {skill === 'advanced' && <div className="check-mark">✓</div>}
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!skill || isLoading}
          >
            {isLoading ? 'กำลังบันทึก...' : 'ยืนยัน'}
          </button>
        </form>
      </main>
    </div>
  );
}
