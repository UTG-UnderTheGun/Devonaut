import './globals.css'
import { Work_Sans } from 'next/font/google'
import Header from '@/components/header.js'
import { CodeProvider } from './context/CodeContext'

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
})

export const metadata = {
  title: 'Devonaut - Your Complete Coding Journey',
  description: 'Learn, Debug, and Master Programming with Devonaut. Complete Learning System with Smart Debugging, Personalized Paths, and Professional Tools.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={workSans.className}>
        <div className="landing-page">
          <CodeProvider>
            <Header />
            {children}
          </CodeProvider>
        </div>
      </body>
    </html>
  )
};