# Local setup and deployment

## Frontend

Use Node.js 24 for parity with CI and Vercel. The interactive demo can run independently of the API.

1. Run npm ci in ai-career-forge-frontend.
2. For authenticated features, create an ignored .env.local containing NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1.
3. Run npm run dev and open http://localhost:3000.

Only public configuration belongs in NEXT_PUBLIC_ variables: Next.js includes these values in the browser bundle.

## Backend

Use Java 21 and Maven 3.9+. The tracked configuration is src/main/resources/application-prod.yml. An existing local application.yml is not part of this repository.

1. Copy the root .env.example to ai-career-forge-backend/.env.development.
2. Fill the values required by the tracked configuration. The application loads this file from its working directory without overriding existing environment variables.
3. Run mvn --batch-mode verify from ai-career-forge-backend.
4. Run mvn spring-boot:run -Dspring-boot.run.profiles=prod from that directory. In PowerShell, quote the complete -Dspring-boot.run.profiles=prod argument if necessary.

Use your own development resources and synthetic resumes when testing. The example values are placeholders, not working credentials.

| Configuration | Purpose |
| --- | --- |
| MONGODB_URI | MongoDB Atlas database connection |
| REDIS_URL | Redis cache connection; use rediss:// for a TLS endpoint |
| JWT_SECRET, JWT_EXPIRATION | Signing secret and lifetime in milliseconds; use a cryptographically random secret accepted by the JWT implementation |
| AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME | Object storage; grant access only to the application's bucket |
| SPRING_AI_OPENAI_CHAT_API_KEY, SPRING_AI_OPENAI_CHAT_BASE_URL, SPRING_AI_OPENAI_CHAT_OPTIONS_MODEL | Chat provider configuration |
| SPRING_AI_OPENAI_EMBEDDING_API_KEY, SPRING_AI_OPENAI_EMBEDDING_BASE_URL, SPRING_AI_OPENAI_EMBEDDING_MODEL | Embedding provider; blank key/base URL fall back to the chat provider configuration |
| GOOGLE_AI_API_KEY | Gemini fallback when compatible-provider credentials are absent |
| GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | Google OAuth configuration required by the current security configuration |
| SMTP_*, RESEND_*, SENDGRID_* | Existing email providers; configure the providers used for verification and account recovery |
| ADZUNA_*, RAPIDAPI_* | Job discovery providers |
| CORS_ALLOWED_ORIGINS, FRONTEND_URL, BACKEND_URL | Explicit frontend origin and public redirect/asset URLs |

The example includes blank values for additional provider settings referenced by the existing configuration. Features using an unconfigured provider will not function. Inspect application-prod.yml for all supported overrides.

## Atlas vector index

Create vector_index on the vector_store collection using the embedding field and cosine similarity. Set numDimensions to the vector length produced by your selected provider/model. The Gemini adapter requests 768 dimensions; the NVIDIA adapter returns the configured model's vector length. Do not assume they are interchangeable.

Retain the metadata filter fields required by your queries. Switching embedding models requires regenerating stored vectors and updating the index. initialize-schema is disabled, so the application does not create or repair the index automatically.

## Git-connected deployment

| Service | Configuration |
| --- | --- |
| Vercel | GitHub bhuvicoder01/zenith, main; root ai-career-forge-frontend; Next.js preset; Node.js 24 |
| Render | Same repository and branch; Docker service using the backend Dockerfile and backend build context; Java 21 |

The frontend's production NEXT_PUBLIC_API_URL must include /api/v1. Set it to https://ai-career-forge-47ob.onrender.com/api/v1 for the existing service.

The backend's CORS_ALLOWED_ORIGINS and FRONTEND_URL must include/use https://zenith-ai-careers.vercel.app. BACKEND_URL must be the backend origin without /api/v1. Keep all provider credentials in the deployment platform's environment settings.

A push to main triggers the existing deployments and GitHub Actions checks. Confirm both providers have deployed the intended commit, then smoke-test the website, demo and authenticated API boundaries. A successful Git push alone does not confirm that the new release is live.

## Validation boundaries

Unit tests mock external services. They do not send email, create social posts, submit applications, or prove the availability of cloud credentials. Live provider calls and AI-generated output require separate testing with authorized test accounts and data.

## Verified release checks

The career-workspace release passed 59 backend tests covering the changed workflows and access rules, plus 25 browser scenarios and seven automated WCAG scans of the landing/demo views. These checks use synthetic data and are not a full penetration test or a substitute for provider integration testing.
