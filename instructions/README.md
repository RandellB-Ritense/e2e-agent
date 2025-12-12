# Test Instructions

This directory contains test instruction files in Markdown format. Each instruction file describes a scenario for the AI agent to execute.

## Instruction File Format

Each instruction file should be a Markdown (.md) file with the following sections:

### Required Sections

#### Goal (Required)
A clear description of what the test should accomplish. This is sent to the LLM as the primary objective.

```markdown
## Goal
Navigate to the contact page and submit the form with test data.
```

#### Entry Path (Required)
The entry path for the test, relative to the BASE_URL configured in your `.env` file.

```markdown
## Entry Path
/login
```

Use `.` for the root path:
```markdown
## Entry Path
.
```

**BASE_URL Configuration:**
The base URL is set globally in your `.env` file and applies to all tests:
```
BASE_URL=https://example.com
```

**Benefits:**
- One central URL configuration for all tests
- Generated Playwright tests use relative paths (`/login` instead of full URLs)
- Easy to switch environments (dev, staging, production) by changing one variable
- Follows Playwright configuration standards
- Automatically used by Playwright validation

#### Starting URL (Legacy)
For backward compatibility, full URLs are still supported:

```markdown
## Starting URL
https://example.com/login
```

**Note:** The BASE_URL + Entry Path approach is recommended. The system will extract the entry path automatically from full URLs.

### Optional Sections

#### Max Steps
Maximum number of actions the agent can take (default: 30).

```markdown
## Max Steps
15
```

#### Auto Dismiss Cookies
Automatically dismiss cookie consent banners before starting the test (default: true).

```markdown
## Auto Dismiss Cookies
true
```

The framework will automatically detect and click common cookie consent buttons like:
- "Accept All"
- "Accept Cookies"
- "I Agree"
- "Allow All"

This runs once before the agent loop starts. Set to `false` to disable if you need to test cookie banner interactions explicitly.

#### Debug Mode
Enable verbose debug logging and automatic screenshot capture (default: false).

```markdown
## Debug
true
```

When debug mode is enabled:
- Full LLM prompts and responses are logged to console and file
- Screenshots are captured before and after each action
- Detailed timing information is recorded
- DOM observation details are logged
- All logs are saved to `debug-screenshots/` directory

Use debug mode when:
- Troubleshooting test failures
- Understanding agent decision-making
- Analyzing performance issues
- Developing new test scenarios

Set to `false` or omit for normal operation.

#### Success Criteria
List of conditions that indicate successful test completion.

```markdown
## Success Criteria
- Form submitted successfully
- Confirmation message displayed
- No errors encountered
```

#### Test Data Suggestions
Suggested test data for the LLM to use when filling forms.

```markdown
## Test Data Suggestions
- Email: test@example.com
- Name: John Doe
```

#### Notes
Additional context or instructions for the LLM.

```markdown
## Notes
This test requires JavaScript to be enabled.
```

## Example Test

```markdown
# Login Test

## Goal
Navigate to the login page, enter credentials, and verify successful login.

## Starting URL
https://example.com

## Max Steps
10

## Success Criteria
- Successfully logged in
- Dashboard page displayed
- Welcome message shows correct username

## Test Data Suggestions
- Username: testuser
- Password: testpass123

## Notes
This test uses mock credentials and should not affect real user data.
```

## Running an Instruction File

```bash
npm start -- instructions/example-navigation.md
```

Or from code:
```typescript
import { InstructionsLoader } from './utils/InstructionsLoader.js';

const instructions = await InstructionsLoader.loadInstructions('instructions/example-navigation.md');
// Use instructions.goal, instructions.startUrl, instructions.maxSteps
```

## Best Practices

1. **Be Specific**: Write clear, specific goals that the LLM can understand
2. **Set Appropriate Max Steps**: Complex workflows need more steps
3. **Include Success Criteria**: Help validate test completion
4. **Provide Test Data**: Suggest realistic test data for form fields
5. **Use Descriptive Names**: Name instruction files clearly (e.g., `login-test.md`, `checkout-flow.md`)

## Instruction File Organization

Organize instruction files by feature or workflow:

```
instructions/
  auth/
    login-test.md
    logout-test.md
    forgot-password.md
  checkout/
    add-to-cart.md
    complete-purchase.md
  navigation/
    homepage-links.md
    footer-navigation.md
```
