import { Input } from 'postcss'
import './head-question.css'

export default function HeadQuestion({ children }) {
  return (
    <div className='head-question'>
      <div className="head-container">
        <div className="text-head-container">
          <input className='input-head-question' placeholder="File name" />
        </div>
        <div className="button-head-container">
          <button>{children}</button>
        </div>
      </div>
      <hr className='head-dash' />
    </div>
  )
}
