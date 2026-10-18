import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import "../App.css"

const API_URL = process.env.REACT_APP_API_URL

function Favourites() {

  const [favourites, setFavourites] = useState([])
  const navigate = useNavigate()

  // Load the user's saved favourite flights
  useEffect(() => {

    const token = localStorage.getItem("token")

    if (!token) {
      navigate("/")
      return
    }

    axios.get(`${API_URL}/api/favourites`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(response => setFavourites(response.data.flights || []))
      .catch(err => console.error("Error loading favourites:", err))

  }, [navigate])

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token")

      if (token) {
        await axios.post(`${API_URL}/api/logout`, {}, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
      }
    } catch (err) {
      console.error("Logout error:", err)
    }

    const userEmail = localStorage.getItem("userEmail")

    if (userEmail) {
      localStorage.removeItem(`cart_${userEmail}`)
    }

    localStorage.removeItem("token")
    localStorage.removeItem("userEmail")

    navigate("/")
  }

  // Remove a flight from favourites
  const removeFavourite = async (flightId) => {

    try {
      const token = localStorage.getItem("token")

      const response = await axios.delete(
        `${API_URL}/api/favourites/${flightId}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      )

      setFavourites(response.data.flights || [])

    } catch (err) {
      console.error("Error removing favourite:", err)
    }
  }

  return (
    <div className="page">

      <div className="header">

        <div className="logo">
          Uplift
        </div>

        <button
          className="header-logout"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>

      <div className="flights-container">

        <h1 className="flights-title">
          My Favourite Flights
        </h1>

        {favourites.length === 0 ? (

          <div className="card">

            <h2>No Favourite Flights</h2>

            <p>
              You have not saved any flights as favourites yet.
            </p>

            <button onClick={() => navigate("/flights")}>
              Browse Flights
            </button>

          </div>

        ) : (

          <div className="flights-list">

            {favourites.map(flight => (

              <div
                key={flight.flightId}
                className="flight-card"
              >

                <h3>{flight.airline}</h3>

                <p>
                  <strong>
                    {flight.from} → {flight.to}
                  </strong>
                </p>

                <p>
                  {flight.departureDate}{" "}
                  {flight.departureTime} -{" "}
                  {flight.arrivalTime}
                </p>

                <p>
                  Duration: {flight.duration}
                </p>

                <p
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#2c3e50"
                  }}
                >
                  ${flight.price}
                </p>

                <button
                  onClick={() => removeFavourite(flight.flightId)}
                >
                  Remove from Favourites
                </button>

              </div>

            ))}

          </div>

        )}

        <div className="flights-footer">

          <button onClick={() => navigate("/flights")}>
            Browse Flights
          </button>

          <button onClick={() => navigate("/home")}>
            Back to Home
          </button>

        </div>

      </div>

    </div>
  )
}

export default Favourites
