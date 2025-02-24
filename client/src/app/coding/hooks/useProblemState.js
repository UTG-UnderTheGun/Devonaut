import { useState, useEffect } from 'react';

/**
 * @typedef {Object} Problem
 * @property {number} id
 * @property {'code' | 'output' | 'fill'} type
 * @property {string} title
 * @property {string} description
 * @property {string} starterCode
 * @property {string} [expectedOutput]
 * @property {string[]} [blanks]
 */

export const useProblemState = () => {
  /** @type {[Problem[], Function]} */
  const [problems, setProblems] = useState([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [problemCodes, setProblemCodes] = useState({});
  const [answers, setAnswers] = useState({});

  // โหลดข้อมูลจาก localStorage เมื่อเริ่มต้น
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProblems = localStorage.getItem('problems');
      const savedCodes = localStorage.getItem('problem-codes');
      const savedAnswers = localStorage.getItem('problem-answers');

      if (savedProblems) setProblems(JSON.parse(savedProblems));
      if (savedCodes) setProblemCodes(JSON.parse(savedCodes));
      if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
    }
  }, []);

  return {
    problems,
    setProblems,
    currentProblemIndex,
    setCurrentProblemIndex,
    problemCodes,
    setProblemCodes,
    answers,
    setAnswers
  };
}; 