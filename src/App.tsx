import React from "react";
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  useNavigate,
  useParams,
  Navigate,
} from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { Id } from "../convex/_generated/dataModel";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { CycleDashboard } from "./components/CycleDashboard";
import { CycleView } from "./components/CycleView";

// Layout component for shared header/footer
function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <div className="flex items-center gap-6">
          <button
            onClick={() => void navigate({ to: "/" })}
            className="text-xl font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            Split Budget
          </button>
        </div>
        <Authenticated>
          <SignOutButton />
        </Authenticated>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}

// Cycles route (default dashboard)
const CyclesRoute = React.memo(() => (
  <Authenticated>
    <CycleDashboard />
  </Authenticated>
));

// Individual cycle view route
const CycleViewRoute = React.memo(() => {
  const { cycleId } = useParams({ strict: false });

  if (!cycleId) {
    return <Navigate to="/" />;
  }

  return (
    <Authenticated>
      <CycleView cycleId={cycleId as Id<"cycles">} />
    </Authenticated>
  );
});

// Auth route (sign in page)
const AuthRoute = React.memo(() => (
  <Unauthenticated>
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Split Budget</h1>
        <p className="text-xl text-secondary mb-2">
          Collaborative budgeting for irregular payment schedules
        </p>
        <p className="text-gray-600">
          Perfect for freelancers, contractors, and anyone with non-traditional
          income
        </p>
      </div>
      <div className="w-full max-w-md">
        <SignInForm />
      </div>
    </div>
  </Unauthenticated>
));

// Loading fallback component
const Loading = React.memo(() => (
  <div className="flex justify-center items-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
));

// Root route with authentication check
const RootRoute = React.memo(() => {
  return (
    <>
      <Authenticated>
        <AppLayout />
      </Authenticated>
      <Unauthenticated>
        <Navigate to="/auth" />
      </Unauthenticated>
    </>
  );
});

// --- TanStack Router route tree ---
const rootRoute = createRootRoute({
  component: RootRoute,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: CyclesRoute,
});

const cycleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cycle/$cycleId",
  component: CycleViewRoute,
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthRoute,
});

const routeTree = rootRoute.addChildren([indexRoute, cycleRoute, authRoute]);

const router = createRouter({
  routeTree,
  defaultPendingComponent: Loading,
});

export default function App() {
  return <RouterProvider router={router} />;
}
