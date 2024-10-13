import './code-question.css';
import Editor from './editor';
import Question from './question';

export default function CodeQuestion({ children }) {
  return (
    <div className="home-question-container">
      <div className="inner-codequestion-container">
        <Question />
        <Editor />
        <div className='score-container'>
          <input className='input-score' placeholder='Score' />
        </div>
      </div>
    </div>
  );
}
