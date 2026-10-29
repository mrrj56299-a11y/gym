import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("@/pages/Home"));
const Admin = lazy(() => import("@/pages/Admin"));

function Router() {
  return <Suspense fallback={<div className="route-loading" role="status">Loading…</div>}><Switch>
    <Route path="/" component={Home} />
    <Route path="/admin" component={Admin} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
