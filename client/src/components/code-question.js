import './code-question.css';
import './hr-seperate.css'
import Editor from './editor';
import Question from './question';

export default function CodeQuestion() {
  return (
    <div className='code-quiz-container'>
      <div className="home-question-container">
        <div className="inner-codequestion-container">
          <Question />
          <Editor isCodeQuestion={true} />
          <div className='score-container'>
            <input type='number' className='input-score' placeholder='Score' />
          </div>
        </div>
      </div>
      <div className='hr-container'>
        <hr className='hr-seperate-question' />
      </div>
      <br />
    </div>
  );
}
