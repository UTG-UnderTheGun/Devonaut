import { useState } from "react"

export default function Question() {
  const [question, setQuestion] = useState('');
  return (
    <div className="question-content">
      <input
        className="input-question"
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Input question here"
      />
    </div>

  )
}
