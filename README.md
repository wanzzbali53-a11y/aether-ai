# AETHER AI — Vercel version (converted from AETHER_AI_MULTIPROVIDER.zip)

This package preserves the original uploaded `public/index.html` interface and converts the Node HTTP server into Vercel serverless functions.

## Deploy
1. Upload the CONTENTS of this folder to the root of your GitHub repository (not the ZIP itself).
2. Import the repository in Vercel.
3. In Vercel Project Settings → Environment Variables, add one or more:
   - `GEMINI_API_KEY`
   - `GROQ_API_KEY`
   - `OPENROUTER_API_KEY`
4. Optional model overrides:
   - `GEMINI_MODEL` (default `gemini-2.5-flash`)
   - `GROQ_MODEL` (default `openai/gpt-oss-20b`)
   - `OPENROUTER_MODEL` (default `openrouter/free`)
5. Redeploy after setting variables.

API keys belong ONLY in Vercel Environment Variables, never in GitHub or browser code.
The app is not deployed by creating this ZIP. Chat works after valid provider keys are configured and Vercel deployment succeeds.
