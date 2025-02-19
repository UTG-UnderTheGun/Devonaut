'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import './home.css'

export default function Home() {
  // Clean up any coding page related localStorage items when mounting homepage
  useEffect(() => {
    localStorage.removeItem('isDescriptionFolded');
    localStorage.removeItem('isConsoleFolded');
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (  
    <div className="homepage-container">
      <main className="homepage-main-content">
        <h1 className="heading-1 animate-on-scroll">
          All Your Coding Journey
        </h1>
        <h2 className="heading-2 animate-on-scroll">
          In One Platform.
        </h2>
        <p className="description animate-on-scroll">
          Learn, Debug, and Master Programming - From Beginner to Professional. 
          Complete Learning System with Smart Debugging, Personalized Paths, 
          and Professional Tools.
        </p>
        <Link href="/auth/signin" className="get-started-button animate-on-scroll">
          GET STARTED
        </Link>
      </main>
    </div>
  )
}