import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import Dashboard from "@/pages/dashboard";
import ControlCharts from "@/pages/control-charts";
import CTPTable from "@/pages/ctp-table";
import Trends from "@/pages/trends";
import Tree from "@/pages/tree";
import Recommendations from "@/pages/recommendations";
import Analytics from "@/pages/analytics";
import DataUpload from "@/pages/data-upload";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-[280px]">
        <Header />
        <main className="p-8">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/control-charts" component={ControlCharts} />
            <Route path="/ctp-table" component={CTPTable} />
            <Route path="/trends" component={Trends} />
            <Route path="/tree" component={Tree} />
            <Route path="/recommendations" component={Recommendations} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/data-upload" component={DataUpload} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
