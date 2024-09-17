# ♠️ Devonaut 
Devonaut: Navigate the coding cosmos with our all-in-one IDE for writing, debugging, and translating.

หัวข้อไทย: ระบบช่วยอธิบาย แปล สอนโค้ด และแก้ไขข้อผิดพลาด (Debug)
เทคโนโลยีซอฟต์แวร์ที่เกี่ยวข้อง: การประมวลผลภาษา (Natural Language Processing), การเรียนรู้ของเครื่อง (Machine Learning), การวิเคราะห์โค้ด (Code Analysis), การสอนและการเรียนรู้ (Teaching and Learning Technologies), และเครื่องมือการดีบัก (Debugging Tools)

# ✅ TODO 
- [x] Login page.
- [ ] Register page.
- [ ] Logout page.
- [ ] Login API.
- [ ] Register API.
- [ ] Logout API.

# 👥 CONTRIBUTING
คู่มือและแนวทางการทำงานโดยใช้ Github ร่วมกันฮ้าฟฟู่ววว [CONTRIBUTING](CONTRIBUTING.md).

# 🛠️ FILE STRUCTURE
```
  my_project/
  ├── .gitignore                     # Ignored files for both FastAPI and Next.js
  ├── README.md                      # Project documentation
  ├── requirements.txt               # Python dependencies for FastAPI
  ├── client/                        # Next.js frontend
  │   ├── .next/                     # Next.js build directory (ignored)
  │   ├── node_modules/              # Node.js dependencies (ignored)
  │   ├── public/                    # Public assets (images, fonts, etc.)
  │   ├── src/                       # Source files for the Next.js application
  │   │   ├── components/            # Reusable UI components
  │   │   ├── pages/                 # Next.js pages (routes)
  │   │   ├── styles/                # CSS/Sass files
  │   │   └── utils/                 # Utility functions
  │   ├── .env.local                 # Environment variables (ignored)
  │   ├── next.config.js             # Next.js configuration
  │   └── package.json               # Node.js dependencies and scripts
  ├── server/                        # FastAPI backend
  │   ├── app/                       # Application logic
  │   │   ├── api/                   # API routes
  │   │   │   └── v1/                # Version 1 of the API
  │   │   │       ├── endpoints/
  │   │   │       │   ├── auth.py    # Auth-related routes (login, signup)
  │   │   │       │   ├── user.py    # User-related routes
  │   │   │       └── __init__.py
  │   │   ├── core/                  # Core settings, security, etc.
  │   │   │   ├── config.py          # Configuration settings
  │   │   │   ├── security.py        # Authentication (JWT, password hashing)
  │   │   │   └── __init__.py
  │   │   ├── db/                    # Database models and session management
  │   │   │   ├── models/            # Database models (SQLAlchemy)
  │   │   │   │   └── user.py
  │   │   │   ├── schemas/           # Pydantic models for request/response
  │   │   │   │   └── user.py
  │   │   │   ├── session.py         # Database session
  │   │   │   └── __init__.py
  │   │   ├── services/              # Business logic
  │   │   │   ├── auth_service.py    # Authentication logic (login, signup)
  │   │   │   ├── user_service.py    # User-related business logic
  │   │   │   └── __init__.py
  │   │   ├── utils/                 # Utility functions (e.g., email, token generation)
  │   │   ├── main.py                # Entry point for the FastAPI application
  │   │   └── __init__.py
  │   ├── .env                       # Backend environment variables (ignored)
  │   ├── Dockerfile                 # Dockerfile for FastAPI (optional)
  │   ├── alembic.ini                # Alembic configuration (if using)
  │   ├── tests/                     # Backend tests
  │   │   ├── test_auth.py           # Tests for authentication
  │   │   └── test_user.py           # Tests for user routes
  │   └── __init__.py
  └── docker-compose.yml             # Docker Compose configuration (optional)
```

# 🎯 Goals
![Class Excercise](https://github.com/user-attachments/assets/e1820560-bcfb-4562-83a0-78a2626d1199)
