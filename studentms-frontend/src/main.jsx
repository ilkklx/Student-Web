import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import { ThemeProvider } from './context/ThemeContext.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <ThemeProvider> 
        <AuthProvider>
          <App />
          <ToastContainer
            position="top-right"
            theme="dark"
            newestOnTop
            closeOnClick
            pauseOnFocusLoss={false}
          />
        </AuthProvider>
        </ThemeProvider> 
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
