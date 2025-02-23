# Devonaut Learning Platform

## Overview
Devonaut is a cutting-edge computer-based learning platform designed to transform beginners into professional developers. Built with Next.js, it provides an intuitive and adaptive learning experience with an integrated AI teaching assistant that guides students through their coding journey.

## Core Philosophy
Our platform emphasizes independent learning and genuine skill development, rather than reliance on external AI tools. The integrated AI teaching assistant functions as a supportive instructor by:

- Offering educational guidance and explanations
- Asking targeted questions to identify learning gaps
- Providing strategic hints and suggestions
- Encouraging independent problem-solving
- Supporting conceptual understanding

## Key Features

### Educational Framework
- **Assignment Management**: Professors can create and manage programming assignments
- **Grading System**: Integrated feedback and commenting system for instructors
- **Python Focus**: Specialized curriculum for Python programming
- **Structured Learning**: Systematic progression through learning paths

### Technical Architecture
- **Modern Stack**: Built with Next.js for optimal performance
- **Clean Code**: Implements object-oriented programming principles
- **Smart Tools**: Advanced debugging capabilities
- **Adaptive Learning**: Personalized learning paths for each student

### Learning Methodology
- **Interactive Learning**: Hands-on coding exercises with real-time feedback
- **Progressive Development**: Adaptive modules that match student skill levels
- **Strong Foundations**: Focus on core programming concepts
- **Professional Standards**: Integration of industry-standard practices

## Platform Goals
1. Foster independent problem-solving skills
2. Provide structured guidance when needed
3. Build genuine coding abilities
4. Ensure fundamental understanding of programming concepts
5. Create a supportive learning environment

## Support System
Students receive comprehensive support through:
- AI teaching assistant guidance
- Instructor feedback
- Interactive learning materials
- Real-time debugging assistance

---

# Devonaut Technical Stack

## Frontend
- **Framework**: Next.js 14 (React)
- **Language**: JavaScript
- **Styling**: 
  - CSS Modules
  - Tailwind CSS
- **Code Editor**: Monaco Editor (VS Code's editor)
- **Markdown**: 
  - React Markdown
  - Remark GFM
- **State Management**: React Context API

## Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **API**: RESTful + WebSocket
- **Database**: 
  - MongoDB (main database)
  - Redis (caching & sessions)
- **Authentication**: 
  - JWT (JSON Web Tokens)
  - OAuth 2.0 (Google Sign-in)

## AI Integration
- **Model**: Anthropic Claude
- **API**: Anthropic API
- **Features**:
  - Code explanation
  - Learning assistance
  - Real-time code analysis

## DevOps & Infrastructure
- **Containerization**: Docker
- **Container Orchestration**: Docker Compose
- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Hosting**: 
  - Frontend: Vercel
  - Backend: Digital Ocean
  - Database: MongoDB Atlas

## Development Tools
- **Package Manager**: npm/yarn
- **Code Quality**:
  - ESLint
  - Prettier
  - TypeScript
- **Testing**:
  - Jest
  - React Testing Library
  - Cypress (E2E)

## Security
- **Authentication**: JWT + OAuth
- **API Security**: 
  - CORS
  - Helmet.js
  - Rate Limiting
- **Data Protection**: 
  - Environment Variables
  - Data Encryption

## Performance Optimization
- **Frontend**:
  - Code Splitting
  - Image Optimization
  - Dynamic Imports
- **Backend**:
  - Caching (Redis)
  - Database Indexing
  - Load Balancing

## Monitoring & Analytics
- **Error Tracking**: Sentry
- **Performance Monitoring**: New Relic
- **Analytics**: Google Analytics

---

*Devonaut: Your Complete Coding Journey - From Beginner to Professional*



"const createPrompt = {
  codeExplanation: (code, context = '') => `
As a coding instructor, please explain this code:

CODE:
${code}

CONTEXT:
${context}

Please provide:
1. A clear, concise explanation of what this code does
2. Key concepts used in the code
3. Any potential improvements or best practices to consider

Focus on educational value rather than just providing solutions.
`,

  debugHelp: (code, error) => `
As a coding instructor, help me understand this error:

CODE:
${code}

ERROR:
${error}

Please:
1. Explain what's causing the error in simple terms
2. Guide me towards fixing it (without direct solutions)
3. Suggest how to prevent similar errors
4. Explain any relevant concepts I should understand

Help me learn from this error rather than just fixing it.
`,

  conceptualGuidance: (concept, studentLevel = 'beginner') => `
As a coding instructor, please help me understand this concept:

CONCEPT:
${concept}

STUDENT LEVEL:
${studentLevel}

Please provide:
1. A clear explanation with simple examples
2. Common use cases
3. Best practices
4. Common pitfalls to avoid
5. Related concepts I should know about

Focus on building fundamental understanding.
`,

  hintRequest: (problem, currentCode, attemptCount) => `
As a coding instructor, I need a hint for this problem:

PROBLEM:
${problem}

CURRENT CODE:
${currentCode}

ATTEMPT COUNT: ${attemptCount}

Please provide:
1. A gentle hint that guides me towards the solution
2. Questions to help me think through the problem
3. Relevant concepts I should consider
4. NO direct solutions

Help me discover the solution on my own.
`,

  codeReview: (code, requirements) => `
As a coding instructor, please review my code:

CODE:
${code}

REQUIREMENTS:
${requirements}

Please provide:
1. What works well in the code
2. Areas for improvement
3. Best practices I should consider
4. Learning opportunities
5. NO direct rewrites

Focus on helping me learn and improve.
`,

  progressCheck: (topic, recentCode) => `
As a coding instructor, please assess my understanding:

TOPIC:
${topic}

RECENT CODE:
${recentCode}

Please:
1. Identify concepts I seem to understand well
2. Point out areas that need more work
3. Suggest next steps for learning
4. Provide targeted practice suggestions

Focus on constructive feedback and growth.
`
};

// Usage example:
const getAIResponse = async (code, type, context = {}) => {
  let prompt;
  switch (type) {
    case 'explain':
      prompt = createPrompt.codeExplanation(code, context.additionalInfo);
      break;
    case 'debug':
      prompt = createPrompt.debugHelp(code, context.error);
      break;
    case 'concept':
      prompt = createPrompt.conceptualGuidance(code, context.level);
      break;
    case 'hint':
      prompt = createPrompt.hintRequest(context.problem, code, context.attempts);
      break;
    case 'review':
      prompt = createPrompt.codeReview(code, context.requirements);
      break;
    case 'progress':
      prompt = createPrompt.progressCheck(context.topic, code);
      break;
    default:
      prompt = createPrompt.codeExplanation(code);
  }

  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });
    return await response.json();
  } catch (error) {
    console.error('Error getting AI response:', error);
    return null;
  }
};

export { createPrompt, getAIResponse };"