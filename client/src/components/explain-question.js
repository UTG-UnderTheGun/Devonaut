import './explain-question.css'
import './hr-seperate.css'
import Editor from './editor';
import Question from './question';
import GlassBox from './glass-box';

export default function ExplainQuestion() {
  return (
    <div>
      <div className="home-question-container">
        <div className="inner-codequestion-container">
          <Question />
          <GlassBox size={{ width: "100%", marginTop: "-10px", borderRadius: "0 0 .5rem .5rem" }}>
            <div className='explain-container' style={{ marginTop: "10px" }}>
              <Editor />
              <input
                className='explain-answer'
                placeholder='Answer' />
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
