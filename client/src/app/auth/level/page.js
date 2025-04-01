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
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    setIsLoading(true);
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
        throw new Error('Failed to set skill level');
      }

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
            <label className="form-label">เลือกระดับความรู้ Python ของคุณ</label>
            <div className="select-wrapper">
              <select
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                required
                disabled={isLoading}
              >
                <option value="">กรุณาเลือกระดับของคุณ</option>
                <option value="beginner">
                  มือใหม่ - เพิ่งเริ่มเรียนเขียนโปรแกรม
                </option>
                <option value="intermediate">
                  ระดับกลาง - เข้าใจพื้นฐาน if-else, loops, lists
                </option>
                <option value="advanced">
                  ก้าวหน้า - เข้าใจ functions และโครงสร้างข้อมูลพื้นฐาน
                </option>
              </select>
            </div>
          </div>

          <div className="level-descriptions">
            <div className="level-description">
              <h3>มือใหม่</h3>
              <p>เหมาะสำหรับผู้ที่เพิ่งเริ่มต้นเขียนโปรแกรม เน้นการเรียนรู้พื้นฐานที่สุด เช่น ตัวแปร การรับค่า-แสดงผล และการคำนวณอย่างง่าย</p>
            </div>
            <div className="level-description">
              <h3>ระดับกลาง</h3>
              <p>สำหรับผู้ที่เข้าใจพื้นฐานแล้ว พร้อมเรียนรู้เรื่อง if-else, loops, lists และ functions พื้นฐาน</p>
            </div>
            <div className="level-description">
              <h3>ก้าวหน้า</h3>
              <p>สำหรับผู้ที่เข้าใจหลักการพื้นฐานดี พร้อมเรียนรู้การจัดการข้อมูลที่ซับซ้อนขึ้น และการจัดการ errors เบื้องต้น</p>
            </div>
          </div>

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
