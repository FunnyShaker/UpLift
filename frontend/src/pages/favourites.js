import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../App.css"

function Favourites() {

  const [favourites, setFavourites] = useState([])
  const navigate = useNavigate()

  // Load the user's saved favourite flights
  useEffect(() => {

    const userEmail = localStorage.getItem("userEmail")

    if (!userEmail) {
      navigate("/")
      return
    }

    const favouriteKey = `favourites_${userEmail}`

    const savedFavourites =
      JSON.parse(localStorage.getItem(favouriteKey)) || []

    setFavourites(savedFavourites)

  }, [navigate])

  // Remove a flight from favourites
  const removeFavourite = (flightId) => {

    const userEmail = localStorage.getItem("userEmail")
    const favouriteKey = `favourites_${userEmail}`

    const updatedFavourites = favourites.filter(
      flight => flight.flightId !== flightId
    )

    localStorage.setItem(
      favouriteKey,
      JSON.stringify(updatedFavourites)
    )

    setFavourites(updatedFavourites)
  }

  return (
    <div className="page">

      <div className="header">

        <div className="logo">
          Uplift
        </div>

        <button
          className="header-logout"
          onClick={() => navigate("/")}
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
