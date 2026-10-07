import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import "../App.css"

const API_URL = process.env.REACT_APP_API_URL

function ViewFlights() {

  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    date: "",
    roundTrip: false
  })

  const [lastSearch, setLastSearch] = useState(null)
  const navigate = useNavigate()

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

  useEffect(() => {
    loadLastSearch()
  }, [])

  // Open on the flights for whatever the user searched last time
  const loadLastSearch = async () => {
    try {
      const token = localStorage.getItem("token")

      if (!token) {
        navigate("/")
        return
      }

      const response = await axios.get(
        `${API_URL}/api/searches/latest`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      )

      const search = response.data.search

      if (!search) {
        fetchFlights()
        return
      }

      setFilters({
        from: search.from || "",
        to: search.to || "",
        date: search.date || "",
        roundTrip: search.roundTrip || false
      })

      // Use flights returned by the backend
      setFlights(response.data.flights || [])

      setLastSearch(search)
      setLoading(false)

    } catch (err) {
      console.error("Error loading last search:", err)
      fetchFlights()
    }
  }

  const fetchFlights = async (queryParams = {}) => {
    try {
      setLoading(true)
      setError("")
      setLastSearch(null)

      const token = localStorage.getItem("token")

      if (!token) {
        navigate("/")
        return
      }

      const params = new URLSearchParams()

      if (queryParams.from || filters.from) {
        params.append(
          "from",
          queryParams.from || filters.from
        )
      }

      if (queryParams.to || filters.to) {
        params.append(
          "to",
          queryParams.to || filters.to
        )
      }

      if (queryParams.date || filters.date) {
        params.append(
          "date",
          queryParams.date || filters.date
        )
      }

      // Add round trip option to the search request
      params.append(
        "roundTrip",
        queryParams.roundTrip !== undefined
          ? queryParams.roundTrip
          : filters.roundTrip
      )

      const response = await axios.get(
        `${API_URL}/api/flights${
          params.toString()
            ? "?" + params.toString()
            : ""
        }`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      )

      // Use flights returned by the backend
      setFlights(response.data.flights || [])

    } catch (err) {
      console.error("Error fetching flights:", err)

      setError(
        "Unable to load flights. Please try again."
      )

      setFlights([])

    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]:
        e.target.type === "checkbox"
          ? e.target.checked
          : e.target.value
    })
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    fetchFlights(filters)
  }

  const addToCart = (flight) => {
    const userEmail = localStorage.getItem("userEmail")
    const cartKey = `cart_${userEmail}`

    let cart =
      JSON.parse(localStorage.getItem(cartKey)) || []

    cart.push({
      ...flight,
      passengers: 1
    })

    localStorage.setItem(
      cartKey,
      JSON.stringify(cart)
    )

    alert("Flight added to cart!")
  }

  // Check if a flight is already a favourite
  const isFavourite = (flight) => {
    const userEmail =
      localStorage.getItem("userEmail")

    const favouriteKey =
      `favourites_${userEmail}`

    const favourites =
      JSON.parse(
        localStorage.getItem(favouriteKey)
      ) || []

    return favourites.some(
      item => item.flightId === flight.flightId
    )
  }

  // Add or remove a flight from favourites
  const toggleFavourite = (flight) => {
    const userEmail =
      localStorage.getItem("userEmail")

    const favouriteKey =
      `favourites_${userEmail}`

    let favourites =
      JSON.parse(
        localStorage.getItem(favouriteKey)
      ) || []

    const alreadySaved =
      favourites.some(
        item =>
          item.flightId === flight.flightId
      )

    if (alreadySaved) {

      favourites =
        favourites.filter(
          item =>
            item.flightId !== flight.flightId
        )

      localStorage.setItem(
        favouriteKey,
        JSON.stringify(favourites)
      )

      alert("Flight removed from favourites!")

    } else {

      favourites.push(flight)

      localStorage.setItem(
        favouriteKey,
        JSON.stringify(favourites)
      )

      alert("Flight saved as a favourite!")
    }

    setFlights([...flights])
  }

  if (loading) {
    return (
      <div className="page">

        <div className="header">

          <div className="logo">
            Uplift
          </div>

        </div>

        <div className="flights-container">

          <h2>
            Loading flights...
          </h2>

        </div>

      </div>
    )
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
          Available Flights
        </h1>

        {lastSearch && (
          <p className="last-search-note">

            Showing results from your last search

            {lastSearch.from &&
            lastSearch.to
              ? `: ${lastSearch.from} → ${lastSearch.to}`
              : ""}

            {lastSearch.date
              ? ` on ${lastSearch.date}`
              : ""}

          </p>
        )}

        <form
          onSubmit={handleFilterSubmit}
          className="filter-form"
        >

          <input
            type="text"
            name="from"
            placeholder="From (e.g., YYZ)"
            value={filters.from}
            onChange={handleFilterChange}
          />

          <input
            type="text"
            name="to"
            placeholder="To (e.g., LAX)"
            value={filters.to}
            onChange={handleFilterChange}
          />

          <input
            type="date"
            name="date"
            value={filters.date}
            onChange={handleFilterChange}
          />

          <label className="round-trip-option">

            <input
              type="checkbox"
              name="roundTrip"
              checked={filters.roundTrip}
              onChange={handleFilterChange}
            />

            Round Trip

          </label>

          <button type="submit">
            Search
          </button>

        </form>

        {error && (
          <p className="error-text">
            {error}
          </p>
        )}

        {flights.length === 0 ? (

          <p className="no-flights-message">
            No flights found. Try different filters.
          </p>

        ) : (

          <div className="flights-list">

            {flights.map(flight => (

              <div
                key={flight.flightId}
                className="flight-card"
              >

                <h3>
                  {flight.airline}
                </h3>

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
                  onClick={() => addToCart(flight)}
                >
                  Add to Cart
                </button>

                <button
                  onClick={() =>
                    toggleFavourite(flight)
                  }
                >
                  {isFavourite(flight)
                    ? "♥ Favourited"
                    : "♡ Favourite"}
                </button>

                {isFavourite(flight) && (

                  <p
                    onClick={() =>
                      toggleFavourite(flight)
                    }
                    style={{
                      fontSize: "12px",
                      cursor: "pointer",
                      textDecoration: "underline",
                      marginTop: "5px"
                    }}
                  >
                    Remove from favourites
                  </p>

                )}

              </div>

            ))}

          </div>

        )}

        <div className="flights-footer">

          <button
            onClick={() => navigate("/home")}
          >
            Back to Home
          </button>

          <button
            onClick={() => navigate("/cart")}
          >
            View My Cart
          </button>

        </div>

      </div>

    </div>
  )
}

export default ViewFlights
