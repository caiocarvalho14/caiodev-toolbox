// app.tsx
import {
  BrowserRouter, Routes, Route,
} from 'react-router-dom';

// useSyncOnReconnect() // <- desativado por enquanto; sync agora é manual via SyncButton

// components
import { AutenticatedRoute } from "./components/AutenticatedRoute.tsx";
import { RouteAccessGuard } from "./components/RouteAccessGuard.tsx";
import { LogoutRoute } from "./components/LogoutButton.tsx";

// pages
import Home from "./pages/Home.tsx"
import Login from './pages/Login.tsx';
import NotFound from './pages/NotFound.tsx';

// modules
import ConferenciaPage from './pages/modules/Conferencia.tsx';
import Admin from './pages/modules/Admin.tsx';
import { Toaster } from './components/Toaster'
// ...
<Toaster />

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path='/login' element={<Login />} />
        <Route path='/logout' element={<LogoutRoute />} />

        <Route element={<AutenticatedRoute />}>

          <Route path="/" element={<Home />}></Route>

          <Route element={<RouteAccessGuard />}>
            <Route path='/conferencia' element={<ConferenciaPage />} />
            <Route path='/admin' element={<Admin />} />
          </Route>

        </Route>

        <Route path='/*' element={<NotFound/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App