import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import "../App.css"

const API_URL = process.env.REACT_APP_API_URL

function Home() {

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("token")
    
    if (!token) {
      setError("No authentication token found. Please login again.")
      setLoading(false)
      return
    }

    axios.get(`${API_URL}/api/home`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(res => {
        console.log("Home response:", res.data)
        if (res.data.user) {
          setUser(res.data.user)
        } else {
          setError("User data not available")
        }
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to load home:", err)
        setError(err.response?.data?.message || "Failed to load user info")
        setLoading(false)
      })
  }, [])

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/api/logout`, {})
    } catch (err) {
      console.error("Logout error:", err)
    }
    // Clear token and redirect
    localStorage.removeItem("token")
    navigate("/")
  }

  if (loading) {
    return (
      <div className="page">
        <div className="header">
          <div className="logo">Uplift</div>
        </div>
        <div className="content">
          <h2>Loading...</h2>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="page">
        <div className="header">
          <div className="logo">Uplift</div>

          <div>
            <button
              className="header-profile"
              onClick={() => navigate("/profile")}
            >
              Profile
            </button>

            <button className="header-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>

        </div>

        <div className="home-content">
          <div className="user-welcome-card">
            <p className="error-text">{error || "Unable to load user information"}</p>
            <div className="home-actions">
              <button className="primary-link-btn" onClick={() => navigate("/flights")}>
                View Available Flights
              </button>
              <button className="secondary-link-btn" onClick={() => navigate("/cart")}>
                View My Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">

      <div className="header">
        <div className="logo">Uplift</div>

        <div>
          <button
            className="header-profile"
            onClick={() => navigate("/profile")}
          >
            Profile
          </button>

          <button className="header-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>

      </div>

      <div className="home-content">
        <div className="user-welcome-card">
          <h1>Welcome, {user.fullName}!</h1>
          <p className="user-email">{user.email}</p>
          <p className="user-type">Traveling as: <strong>{user.userType}</strong></p>
          
          <div className="home-actions">
            <button className="primary-link-btn" onClick={() => navigate("/flights")}>
              View Available Flights
            </button>
            <button className="secondary-link-btn" onClick={() => navigate("/cart")}>
              View My Cart
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Home
