// app.tsx
import {
  BrowserRouter, Routes, Route,
} from 'react-router-dom';

// components
import { AutenticatedRoute } from "./components/AutenticatedRoute.tsx";
import { RouteAccessGuard } from "./components/RouteAccessGuard.tsx";
import { LogoutRoute } from "./components/LogoutButton.tsx";

// pages
import Home from "./pages/Home.tsx"
import Login from './pages/Login.tsx';


function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path='/login' element={<Login/>}/>
        <Route path='/logout' element={<LogoutRoute />} />

        <Route element={<AutenticatedRoute />}>

          <Route path="/" element={<Home />}></Route>

          <Route element={<RouteAccessGuard />}>
        
          </Route>

        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App