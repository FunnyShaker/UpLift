import { BrowserRouter, Routes, Route } from "react-router-dom" 
 
import Login from "./pages/login" 
import Signup from "./pages/signUp" 
import Home from "./pages/home" 
import ViewFlights from "./pages/viewFlights" 
import Cart from "./pages/cart" 
import UserProfile from "./pages/userProfile"
 
function App() { 
  return ( 
    <BrowserRouter> 
 
      <Routes> 
 
        <Route path="/" element={<Login />} /> 
        <Route path="/signup" element={<Signup />} /> 
        <Route path="/home" element={<Home />} /> 
        <Route path="/flights" element={<ViewFlights />} /> 
        <Route path="/cart" element={<Cart />} /> 
        <Route path="/profile" element={<UserProfile />} />
 
      </Routes> 
 
    </BrowserRouter> 
  ) 
} 
 
export default App
