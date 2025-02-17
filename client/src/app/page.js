'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import './home.css'

export default function Home() {

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