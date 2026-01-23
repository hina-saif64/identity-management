# 🤝 Contributing to Hyperion

Thank you for your interest in contributing to Hyperion! We welcome contributions from the community and are excited to see what you'll bring to the project.

## 🎯 Ways to Contribute

### 🐛 Bug Reports
- Use the [GitHub Issues](https://github.com/hyperion-identity/hyperion/issues) page
- Search existing issues before creating a new one
- Include detailed reproduction steps
- Provide system information and logs

### ✨ Feature Requests
- Open a [GitHub Issue](https://github.com/hyperion-identity/hyperion/issues) with the "enhancement" label
- Describe the problem you're trying to solve
- Explain your proposed solution
- Include mockups or examples if applicable

### 💻 Code Contributions
- Fork the repository
- Create a feature branch
- Make your changes
- Add tests if applicable
- Submit a pull request

## 🚀 Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- PowerShell 7+ (for AD integration testing)

### Setup Steps
```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/hyperion.git
cd hyperion

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env
# Edit .env with your test credentials

# 4. Start development server
npm run dev

# 5. Run tests
npm test
```

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing code formatting (Prettier)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Commit Messages
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat: add user risk scoring algorithm
fix: resolve device sync timeout issue
docs: update API documentation
test: add unit tests for CA policy parser
```

### Pull Request Process
1. **Create a feature branch** from `main`
2. **Make your changes** with clear, focused commits
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run the test suite** to ensure nothing breaks
6. **Submit a pull request** with a clear description

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- UserIntelligence.test.ts
```

### Test Categories
- **Unit Tests**: Individual component/function testing
- **Integration Tests**: API and service integration
- **E2E Tests**: Full user workflow testing
- **Security Tests**: Authentication and authorization

### Writing Tests
- Use Jest and React Testing Library
- Test both happy path and error scenarios
- Mock external dependencies (Microsoft Graph, etc.)
- Include accessibility tests for UI components

## 📚 Documentation

### Types of Documentation
- **Code Comments**: JSDoc for functions and classes
- **README Updates**: Keep installation and usage current
- **API Documentation**: Document all endpoints and parameters
- **User Guides**: Step-by-step instructions for features

### Documentation Standards
- Use clear, concise language
- Include code examples
- Add screenshots for UI features
- Keep examples up-to-date

## 🔒 Security Considerations

### Security Guidelines
- Never commit credentials or secrets
- Use environment variables for configuration
- Follow OWASP security practices
- Validate all user inputs
- Use secure authentication flows

### Reporting Security Issues
- **DO NOT** open public GitHub issues for security vulnerabilities
- Email security@hyperion-identity.com
- Include detailed reproduction steps
- Allow time for investigation before public disclosure

## 🏆 Recognition

### Contributors
All contributors will be:
- Added to the Contributors section in README
- Mentioned in release notes for significant contributions
- Invited to join our Discord community
- Eligible for Hyperion swag and recognition

### Contribution Types
We recognize various types of contributions:
- 💻 Code contributions
- 📖 Documentation improvements
- 🐛 Bug reports and testing
- 💡 Feature ideas and feedback
- 🎨 Design and UX improvements
- 🌍 Translations and localization

## 📞 Getting Help

### Community Support
- **Discord**: [Join our community](https://discord.gg/hyperion)
- **GitHub Discussions**: Ask questions and share ideas
- **Stack Overflow**: Tag questions with `hyperion-identity`

### Maintainer Contact
- **General Questions**: Open a GitHub Discussion
- **Security Issues**: security@hyperion-identity.com
- **Partnership Inquiries**: partnerships@hyperion-identity.com

## 📄 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:
- Experience level
- Gender identity and expression
- Sexual orientation
- Disability
- Personal appearance
- Body size
- Race
- Ethnicity
- Age
- Religion
- Nationality

### Expected Behavior
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior
- Harassment or discriminatory language
- Trolling or insulting comments
- Public or private harassment
- Publishing others' private information
- Other conduct inappropriate in a professional setting

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## 🎉 Thank You!

Your contributions make Hyperion better for everyone. Whether you're fixing a typo, adding a feature, or helping other users, every contribution matters.

**Happy coding!** 🚀