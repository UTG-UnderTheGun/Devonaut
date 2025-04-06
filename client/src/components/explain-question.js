import './explain-question.css'
import './hr-seperate.css'
import Editor from './editor';
import Question from './question';
import GlassBox from './glass-box';
import { useState, useEffect } from 'react';
import { useCodeContext } from '@/app/context/CodeContext';

export default function ExplainQuestion({ questionData, problemIndex }) {
  const [userAnswer, setUserAnswer] = useState('');
  const { setCode, codes } = useCodeContext();
  const testType = 'output'; // For output/explain type questions

  // Get a unique storage key for this problem
  const getStorageKey = () => {
    if (problemIndex === undefined) {
      return 'explainAnswer';
    }
    // Include problem index and type in the key to ensure uniqueness
    return `output-answer-${problemIndex}`;
  };

  // Load initial answer for this question
  useEffect(() => {
    // Check if we have imported answer data - try both answer and outputAnswer fields
    if (questionData?.userAnswers?.answer || questionData?.userAnswers?.outputAnswer) {
      const answerText = questionData.userAnswers.answer || questionData.userAnswers.outputAnswer;
      setUserAnswer(answerText);
      
      // Store imported answer
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, answerText);
    } else {
      // Try to load from localStorage
      const storageKey = getStorageKey();
      const savedAnswer = localStorage.getItem(storageKey);
      if (savedAnswer) {
        setUserAnswer(savedAnswer);
      }
    }
  }, [questionData, problemIndex]);

  // Handle answer changes
  const handleAnswerChange = (e) => {
    const newAnswer = e.target.value;
    setUserAnswer(newAnswer);
    
    // Save to localStorage
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, newAnswer);
  };

  return (
    <div>
      <div className="home-question-container">
        <div className="inner-codequestion-container">
          <Question data={questionData} />
          <GlassBox size={{ width: "100%", marginTop: "-10px", borderRadius: "0 0 .5rem .5rem" }}>
            <div className='explain-container' style={{ marginTop: "10px" }}>
              <Editor 
                initialValue={questionData?.code || '# Example code'}
                problemIndex={problemIndex}
                testType={testType}
                onChange={() => {}} // Editor is mainly for display in explain questions
              />
              <input
                className='explain-answer'
                placeholder='Answer'
                value={userAnswer}
                onChange={handleAnswerChange}
              />
            </div>
          </GlassBox>
          <div className='score-container'>
            <input className='input-score' placeholder='Score' />
          </div>
        </div>
      </div>
      <div className='hr-container'>
        <hr className='hr-seperate-question' />
      </div>
      <br />
    </div>
  )
}
