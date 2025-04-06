// JsonValidator.js - Utility for validating and transforming question format

export const validateQuestionJson = (questions) => {
  if (!Array.isArray(questions)) {
    return { valid: false, error: 'JSON must be an array of questions' };
  }

  if (questions.length === 0) {
    return { valid: false, error: 'Questions array is empty' };
  }

  const errors = [];

  questions.forEach((question, index) => {
    const questionNumber = index + 1;

    // Required fields
    const requiredFields = ['id', 'title', 'description', 'type'];
    requiredFields.forEach(field => {
      if (!question[field]) {
        errors.push(`Question ${questionNumber}: Missing required field "${field}"`);
      }
    });

    // Type validation
    if (question.type && !['code', 'output', 'fill'].includes(question.type)) {
      errors.push(`Question ${questionNumber}: Invalid type "${question.type}". Must be one of: code, output, fill`);
    }

    // Code validation
    if (!question.code && !question.starterCode) {
      errors.push(`Question ${questionNumber}: Missing "code" or "starterCode" field`);
    } else if (question.type === 'fill' && !(question.code?.includes('____') || question.starterCode?.includes('____'))) {
      errors.push(`Question ${questionNumber}: Fill-in-the-blank question must contain blanks indicated by "____"`);
    }

    // Check for userAnswers object
    if (!question.userAnswers || typeof question.userAnswers !== 'object') {
      errors.push(`Question ${questionNumber}: Missing or invalid "userAnswers" object`);
    }

    // Check for answers object (can be empty but must exist)
    if (!('answers' in question) || typeof question.answers !== 'object') {
      errors.push(`Question ${questionNumber}: Missing or invalid "answers" object`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    message: errors.length > 0
      ? `Found ${errors.length} validation errors`
      : 'JSON is valid'
  };
};

// Function to standardize questions to match application format
export const standardizeQuestions = (questions) => {
  if (!Array.isArray(questions)) {
    // Try to convert to array if it's a single object
    if (typeof questions === 'object' && questions !== null) {
      questions = [questions];
    } else {
      return { success: false, error: 'Cannot standardize: input is not an array or object' };
    }
  }

  const standardizedQuestions = questions.map((question, index) => {
    const standardized = { ...question };

    // Ensure ID
    if (!standardized.id) {
      standardized.id = index + 1;
    }

    // Ensure title
    if (!standardized.title) {
      standardized.title = `Question ${index + 1}`;
    }

    // Ensure description
    if (!standardized.description) {
      standardized.description = 'No description provided.';
    }

    // Ensure type
    if (!standardized.type || !['code', 'output', 'fill'].includes(standardized.type)) {
      standardized.type = 'code'; // Default to code type
    }

    // Handle code/starterCode compatibility
    if (!standardized.code && standardized.starterCode) {
      standardized.code = standardized.starterCode;
    } else if (!standardized.starterCode && standardized.code) {
      standardized.starterCode = standardized.code;
    } else if (!standardized.code && !standardized.starterCode) {
      // Create default code based on type
      const defaultCode = standardized.type === 'code'
        ? '# เขียนโค้ดของคุณที่นี่\n\n\n\n'
        : standardized.type === 'fill'
          ? '# เติมคำตอบในช่องว่าง\nx = ____\n'
          : '# แสดงผลลัพธ์\nprint("Hello World")';

      standardized.code = defaultCode;
      standardized.starterCode = defaultCode;
    }

    // Ensure userAnswers exists and has appropriate structure
    if (!standardized.userAnswers || typeof standardized.userAnswers !== 'object') {
      standardized.userAnswers = {};
    }

    // Setup appropriate userAnswers based on type
    if (standardized.type === 'code' && !('codeAnswer' in standardized.userAnswers)) {
      standardized.userAnswers.codeAnswer = '';
    } else if (standardized.type === 'output' && !('outputAnswer' in standardized.userAnswers)) {
      standardized.userAnswers.outputAnswer = '';
    } else if (standardized.type === 'fill') {
      if (!('fillAnswers' in standardized.userAnswers) || typeof standardized.userAnswers.fillAnswers !== 'object') {
        standardized.userAnswers.fillAnswers = {};
      }

      // Count blanks and create empty answers for them
      const blanks = (standardized.code.match(/____/g) || []).length;
      for (let i = 0; i < blanks; i++) {
        if (!(`blank-${i}` in standardized.userAnswers.fillAnswers)) {
          standardized.userAnswers.fillAnswers[`blank-${i}`] = '';
        }
      }
    }

    // Ensure answers object exists
    if (!standardized.answers || typeof standardized.answers !== 'object') {
      standardized.answers = {};
    }

    return standardized;
  });

  return {
    success: true,
    questions: standardizedQuestions,
    message: `Standardized ${standardizedQuestions.length} questions`
  };
};

// Function to export questions to JSON file
export const exportQuestionsToJson = (questions) => {
  // First standardize the questions
  const standardized = standardizeQuestions(questions);

  if (!standardized.success) {
    return { success: false, error: standardized.error };
  }

  try {
    // Format JSON with 2-space indentation for readability
    const jsonString = JSON.stringify(standardized.questions, null, 2);

    // Create a Blob and downloadable link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Prompt for filename
    const filename = prompt('Enter filename for export:', 'questions.json') || 'questions.json';

    // Create and click a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);

    return { success: true, message: `Exported ${questions.length} questions to ${a.download}` };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: 'Export failed: ' + error.message };
  }
};
