# Split Budget – Collaborative Budgeting Tool

A collaborative budgeting app built with [Convex](https://convex.dev) (backend) and [Vite](https://vitejs.dev/) + [React](https://react.dev) (frontend). Styled with [Tailwind CSS](https://tailwindcss.com/). An app that i'm vibe coding, to handle the weird way I do my monthly budgets.

---

## Project Structure

- **Frontend:** `src/` – React app (Vite, TypeScript, Tailwind CSS)
- **Backend:** `convex/` – Convex functions, schema, and auth config

## Getting Started

1. **Install dependencies** (uses [pnpm](https://pnpm.io/)):

   ```sh
   pnpm install
   ```

2. **Start development servers:**

   ```sh
   pnpm run dev
   ```

   This runs both the Vite frontend and Convex backend locally.

3. **Open the app:**
   Visit [http://localhost:5173](http://localhost:5173) in your browser.

## Authentication

- Uses [Convex Auth](https://auth.convex.dev/) with Anonymous authentication for easy sign-in during development.
- You can update the auth method in `convex/auth.config.ts` before deploying to production.

## Deployment

- See [Convex Hosting & Deployment docs](https://docs.convex.dev/production/) for backend deployment.
- For frontend, build with `pnpm run build` and deploy the output in `dist/` to your preferred static host.

## HTTP API

- User-defined HTTP routes are in `convex/router.ts`.
- Auth routes are separated in `convex/http.ts` for clarity and security.

## Resources

- [Convex Docs](https://docs.convex.dev/)
- [Chef (Convex App Framework)](https://chef.convex.dev)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)

---

Feel free to contribute or open issues to improve this project!
