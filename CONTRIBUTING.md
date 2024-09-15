# Contributing to Devonaut

We welcome contributions from everyone. To maintain a healthy and collaborative environment, please follow these guidelines.

## How to Contribute

### 1. Fork the Repository
- Use the GitHub interface to fork the repository to your account.
- Clone the forked repository to your local machine:
  ```bash
  git clone https://github.com/your-username/project-name.git

### 2. Create a New Branch
- Always create a new branch for your work:
'''
  git checkout -b feature/your-feature-name
'''
Use descriptive names for your branches (e.g., fix/bug-issue, feature/add-new-function).

3. Make Your Changes
- Follow the project's coding style and conventions.
- Ensure that your code works and passes all tests (if applicable).
- If you've added code that should be tested, add appropriate test cases.

4. Commit Your Changes
- Make small, incremental commits.
- Write meaningful and concise commit messages:
'''
  git commit -m "Short summary of changes"
'''

5. Push to Your Fork
Push your branch to your forked repository:
'''
  git push origin feature/your-feature-name
'''

6. Open a Pull Request
- Go to the original repository and create a pull request (PR) from your branch.
- Provide a clear description of the changes and why they are needed.
- Link any relevant issues or discussions (e.g., Fixes #123).
- Be prepared to address feedback from reviewers and make further changes if necessary.

7. Keep Your Fork Updated
Regularly sync your fork with the upstream repository to stay up-to-date:
'''
  git remote add upstream https://github.com/original-repo/project-name.git
  git fetch upstream
  git checkout main
  git merge upstream/main
'''

Pull Request Guidelines
- Ensure that your code is well-formatted and adheres to project standards.
- Document any new features or breaking changes.
- Write unit tests for any new functionality or changes.
- PRs should be focused on a single issue or feature.
- Don’t include unrelated changes in the same PR.
- Communicate with maintainers if your PR is not getting feedback in a reasonable time.

Issues and Discussions
- Before submitting a new issue, please search existing issues to avoid duplicates.
- When opening an issue, provide a clear description of the problem, steps to reproduce, and expected behavior.
- For feature requests, explain the use case and benefits of the feature.
