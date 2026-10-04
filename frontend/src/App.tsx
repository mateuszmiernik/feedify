import { BrowserRouter, Route, Routes } from 'react-router';
import RegisterForm from '@/pages/RegisterForm';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

export function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/register' element={<RegisterForm />} />
        <Route path='/login' element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  )
}