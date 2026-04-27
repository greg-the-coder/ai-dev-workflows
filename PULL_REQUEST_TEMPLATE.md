# Pull Request: Implement API Gateway Authentication and CORS Restrictions

## Description

This PR addresses two critical security issues identified in the Well-Architected Review:

1. **Implement Authentication for API Gateway**: Added Cognito User Pool integration for secure API access
2. **Restrict CORS to Specific Trusted Domains**: Changed from `Cors.ALL_ORIGINS` to explicit domain list

## Changes Made

### 1. Authentication Implementation

- Added Cognito User Pool with secure password policies:
  - Minimum 8 characters
  - Requires lowercase, uppercase, digits, and symbols
  - Email verification enabled
  - Account recovery via email only

- Created Cognito User Pool Client with auth flows for:
  - User password authentication
  - SRP (Secure Remote Password) authentication

- Applied Cognito Authorizer to all API Gateway methods:
  - POST /tasks (create task)
  - GET /tasks (get all tasks)
  - PUT /tasks/{taskId} (update task)
  - DELETE /tasks/{taskId} (delete task)
  - GET /summary/open-tasks (open tasks summary)
  - GET /summary/completed-tasks (completed tasks summary)

### 2. CORS Restrictions

- Changed from `apigateway.Cors.ALL_ORIGINS` to explicit list
- Added `allowedOrigins` parameter to BackendStackProps interface
- Configured specific trusted domains in app.ts: 
  - `https://taskmanagement.example.com`
  - `https://www.taskmanagement.example.com`

## Security Improvements

✅ **Authentication**: No authentication mechanism implemented → Cognito User Pool with strong password policies

✅ **CORS Restrictions**: All origins allowed → Only specific trusted domains allowed

✅ **Authorization**: Publicly accessible endpoints → All endpoints require Cognito authentication

## Files Modified

- `task-management-app/infrastructure/lib/backend-stack.ts`: 
  - Added Cognito User Pool and User Pool Client
  - Applied Cognito Authorizer to all API Gateway methods
  - Added `allowedOrigins` parameter for CORS configuration

- `task-management-app/infrastructure/bin/app.ts`:
  - Added trusted domains list for CORS configuration
  - Commented out frontend stack for deployment testing

- `task-management-app/infrastructure/package.json`:
  - Updated aws-cdk-lib dependency (2.147.0)

## Testing

- Successfully built with `npm run build`
- Successfully synthesized with `npx cdk synth`

## Deployment Notes

1. After deployment, you will need to:
   - Create users in the Cognito User Pool
   - Configure your frontend to use Cognito authentication
   - Update the CORS domains in `bin/app.ts` to your production domains

2. The frontend stack is temporarily commented out in `bin/app.ts` for deployment testing. Uncomment it when ready to deploy the full stack.

## Related Issues

Addresses the following security weaknesses from the Well Architected Review:

- **Authentication & Authorization**: Critical issues related to no authentication mechanism
- **CORS Configuration**: Critical issue related to allowing all origins

## Review Checklist

- [ ] Code review approved
- [ ] Security review completed
- [ ] Cognito User Pool configuration verified
- [ ] CORS domains updated for production
- [ ] Frontend integration tested
