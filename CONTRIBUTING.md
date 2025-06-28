# Contributing to AI Educational QA System

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   cd nextjs-app
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Update `.env.local` with your actual values

## Security Guidelines

### Environment Variables

1. **Never commit sensitive data**:
   - API keys, tokens, or credentials must NEVER be committed to the repository
   - Always use `.env.local` for local development (it's gitignored)
   - Use `.env.example` as a template with dummy values only

2. **JWT Secret Requirements**:
   - Must be at least 32 characters long
   - Generate secure secrets using:
     ```bash
     # Linux/Mac
     openssl rand -base64 32
     
     # Node.js
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```

3. **Production Secrets Management**:
   - Use AWS Secrets Manager, HashiCorp Vault, or similar services
   - Never store production secrets in environment files
   - Implement secret rotation policies

### Pre-commit Checks

Before committing, ensure:
1. No sensitive data is included (automated checks via Husky)
2. All tests pass
3. Code follows TypeScript strict mode

### OpenAI API Key Management

1. Set usage limits on your OpenAI dashboard
2. Use separate keys for development and production
3. Rotate keys regularly using the provided script:
   ```bash
   npm run rotate-openai-key -- --prev <old-key> --next <new-key>
   ```

## Code of Conduct

Please follow our code of conduct in all interactions. 