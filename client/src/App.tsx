import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CrmLayout } from "./components/CrmLayout";
import Home from "@/pages/Home";
import JoinBeta from "@/pages/JoinBeta";
import CRM from "@/pages/CRM";
import Leads from "@/pages/Leads";
import PhoneChat from "@/pages/PhoneChat";
import Campaigns from "@/pages/Campaigns";
import Employees from "@/pages/Employees";
import Incidents from "@/pages/Incidents";
import WriteUps from "@/pages/WriteUps";
import EmployeeIntake from "@/pages/EmployeeIntake";
import FileManagement from "@/pages/FileManagement";
import Locations from "@/pages/Locations";
import Reports from "@/pages/Reports";
import Pipeline from "@/pages/Pipeline";
import Tasks from "@/pages/Tasks";
import Dashboard from "@/pages/Dashboard";
import Settings from "@/pages/Settings";
import CalendarPage from "@/pages/Calendar";
import EmailTemplates from "@/pages/EmailTemplates";
import Login from "@/pages/Login";

function CrmRoutes() {
  return (
    <CrmLayout>
      <Switch>
        <Route path={"/crm/leads"} component={Leads} />
        <Route path={"/crm/phone-chat"} component={PhoneChat} />
        <Route path={"/crm/campaigns"} component={Campaigns} />
        <Route path={"/crm/employees"} component={Employees} />
        <Route path={"/crm/incidents"} component={Incidents} />
        <Route path={"/crm/write-ups"} component={WriteUps} />
        <Route path={"/crm/intake"} component={EmployeeIntake} />
        <Route path={"/crm/files"} component={FileManagement} />
        <Route path={"/crm/locations"} component={Locations} />
        <Route path={"/crm/reports"} component={Reports} />
        <Route path={"/crm/pipeline"} component={Pipeline} />
        <Route path={"/crm/tasks"} component={Tasks} />
        <Route path={"/crm/calendar"} component={CalendarPage} />
        <Route path={"/crm/dashboard"} component={Dashboard} />
        <Route path={"/crm/templates"} component={EmailTemplates} />
        <Route path={"/crm/settings"} component={Settings} />
        <Route path={"/crm"} component={CRM} />
      </Switch>
    </CrmLayout>
  );
}

function Router() {
  const [location] = useLocation();
  const isCrm = location === "/crm" || location.startsWith("/crm/");

  if (isCrm) return <CrmRoutes />;

  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/join"} component={JoinBeta} />
      <Route path={"/login"} component={Login} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
