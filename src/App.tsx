import { Route, Routes } from "react-router-dom"
import HomePage from "./pages/HomePage"
import { SettingsPage } from "./pages/SettingsPage"
import { ExpenseReportsPage } from "./pages/ExpenseReportsPage"
import { Toaster } from "./components/ui/toaster"
import { ThemeProvider } from "./components/theme-provider"
import { MainLayout } from "./components/layouts/MainLayout"

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/expense-reports" element={<ExpenseReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </MainLayout>
      <Toaster />
    </ThemeProvider>
  )
}

export default App