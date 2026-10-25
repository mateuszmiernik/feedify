import { BrowserRouter, Route, Routes } from 'react-router';
import RegisterForm from '@/pages/RegisterForm';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CreateProjectPage from './pages/CreateProjectPage';

export function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/register' element={<RegisterForm />} />
        <Route path='/login' element={<LoginPage />} />
        <Route path='/forgot-password' element={<ForgotPasswordPage />} />
        <Route path='/reset-password' element={<ResetPasswordPage />} />
        <Route path='/projects/new' element={<CreateProjectPage />} />
      </Routes>
    </BrowserRouter>
  )
}