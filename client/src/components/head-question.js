import './head-question.css'
import { useCodeContext } from '@/app/context/CodeContext'

export default function HeadQuestion({ children }) {
  const { setOpenCreate } = useCodeContext()
  const handleClick = () => {
    setOpenCreate(true)
  }

  return (
    <div className='head-question'>
      <div className="head-container">
        <div className="text-head-container">
          <input className='input-head-question' placeholder="File name" />
        </div>
        <div className="button-head-container">
          <button onClick={handleClick}>{children}</button>
        </div>
      </div>
      <hr className='head-dash' />
    </div>
  )
}
