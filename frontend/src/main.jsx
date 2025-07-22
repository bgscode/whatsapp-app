// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./app/dashboard/page";
import ComposeMessage from "./app/dashboard/ComposeMessage";
import GroupsPage from "./app/dashboard/Groups";
import SettingsPage from "./app/dashboard/settings";
import SchedulePage from "./app/dashboard/Shedule";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ContactsPage from "./app/dashboard/Contacts";
import { Toaster } from "react-hot-toast";
import MessageLogs from "./app/dashboard/message-logs";
import TemplatePage from "./app/dashboard/Templet";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index path="/" element={<App />} />
          <Route path="/setup" element={<App />} />
          <Route path="/dashboard" element={<ComposeMessage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/templates" element={<TemplatePage />} />
          <Route path="/logs" element={<MessageLogs />} />
          <Route path="*" element={<div>404</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
    <Toaster position="top-center" reverseOrder={false} />
  </QueryClientProvider>
);
