import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppLayout } from './components/layout'
import { BookingDetail, Bookings, Cities, Configuration, Dashboard, Pricing } from './pages'
import { Services } from './pages/services-v2'
import { LoginPage } from './pages/login'
import { getSession } from './lib/auth'
import './index.css'

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 20_000, refetchOnWindowFocus: false } } })
function RequireAuth({children}:{children:React.ReactNode}){const location=useLocation();return getSession()?children:<Navigate to="/login" state={{from:location}} replace/>}
export default function App(){return <QueryClientProvider client={client}><BrowserRouter><Routes><Route path="/login" element={getSession()?<Navigate to="/admin" replace/>:<LoginPage/>}/><Route path="/admin" element={<RequireAuth><AppLayout/></RequireAuth>}><Route index element={<Dashboard/>}/><Route path="booking-requests" element={<Bookings/>}/><Route path="booking-requests/:id" element={<BookingDetail/>}/><Route path="services" element={<Services/>}/><Route path="cities" element={<Cities/>}/><Route path="service-city-pricing" element={<Pricing/>}/><Route path="configuration" element={<Configuration/>}/></Route><Route path="*" element={<Navigate to="/admin" replace/>}/></Routes><Toaster richColors position="top-right"/></BrowserRouter></QueryClientProvider>}
import { createRoot } from 'react-dom/client'
createRoot(document.getElementById('root')!).render(<App/>)
