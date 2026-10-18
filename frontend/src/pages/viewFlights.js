import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import "../App.css"

const API_URL = process.env.REACT_APP_API_URL

function ViewFlights() {

  const [flights, setFlights] = useState([])
  const [returnFlights, setReturnFlights] = useState([])
  // The route of the round trip on screen, or null for a one-way search
  const [roundTripRoute, setRoundTripRoute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [filters, setFilters] = useState({
    from: "",
    to: "",
    date: "",
    roundTrip: false,
    returnDate: ""
  })

  const [lastSearch, setLastSearch] = useState(null)
  const [favouriteIds, setFavouriteIds] = useState([])
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
    loadFavourites()
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
        roundTrip: search.roundTrip || false,
        returnDate: search.returnDate || ""
      })

      // Use flights returned by the backend
      setFlights(response.data.flights || [])
      setReturnFlights(response.data.returnFlights || [])
      setRoundTripRoute(
        search.roundTrip && search.from && search.to
          ? { from: search.from, to: search.to }
          : null
      )

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
      const roundTrip =
        queryParams.roundTrip !== undefined
          ? queryParams.roundTrip
          : filters.roundTrip

      params.append("roundTrip", roundTrip)

      // The return date only matters for a round trip
      const returnDate = queryParams.returnDate || filters.returnDate

      if (roundTrip && returnDate) {
        params.append("returnDate", returnDate)
      }

      const from = queryParams.from || filters.from
      const to = queryParams.to || filters.to

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
      setReturnFlights(response.data.returnFlights || [])
      setRoundTripRoute(
        roundTrip && from && to
          ? { from: from.toUpperCase(), to: to.toUpperCase() }
          : null
      )

    } catch (err) {
      console.error("Error fetching flights:", err)

      setError(
        err.response?.data?.message ||
        "Unable to load flights. Please try again."
      )

      setFlights([])
      setReturnFlights([])
      setRoundTripRoute(null)

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

  // Load the IDs of the user's favourite flights
  const loadFavourites = async () => {
    try {
      const token = localStorage.getItem("token")

      if (!token) return

      const response = await axios.get(
        `${API_URL}/api/favourites`,
        {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      )

      setFavouriteIds(
        (response.data.flights || []).map(item => item.flightId)
      )

    } catch (err) {
      console.error("Error loading favourites:", err)
    }
  }

  // Check if a flight is already a favourite
  const isFavourite = (flight) => {
    return favouriteIds.includes(flight.flightId)
  }

  // Add or remove a flight from favourites
  const toggleFavourite = async (flight) => {
    try {
      const token = localStorage.getItem("token")

      const headers = {
        "Authorization": `Bearer ${token}`
      }

      const response = isFavourite(flight)
        ? await axios.delete(
            `${API_URL}/api/favourites/${flight.flightId}`,
            { headers }
          )
        : await axios.post(
            `${API_URL}/api/favourites`,
            { flightId: flight.flightId },
            { headers }
          )

      setFavouriteIds(
        (response.data.flights || []).map(item => item.flightId)
      )

      alert(response.data.message)

    } catch (err) {
      console.error("Error updating favourites:", err)
      alert("Unable to update favourites. Please try again.")
    }
  }

  const renderFlightCard = (flight) => (
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
  )

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

            {lastSearch.roundTrip && lastSearch.returnDate
              ? `, returning ${lastSearch.returnDate}`
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

          {filters.roundTrip && (

            <input
              type="date"
              name="returnDate"
              title="Return date"
              value={filters.returnDate}
              min={filters.date}
              onChange={handleFilterChange}
            />

          )}

          <button type="submit">
            Search
          </button>

        </form>

        {error && (
          <p className="error-text">
            {error}
          </p>
        )}

        {roundTripRoute && (
          <h2 className="flights-title">
            Outbound: {roundTripRoute.from} → {roundTripRoute.to}
          </h2>
        )}

        {flights.length === 0 ? (

          <p className="no-flights-message">
            No flights found. Try different filters.
          </p>

        ) : (

          <div className="flights-list">
            {flights.map(renderFlightCard)}
          </div>

        )}

        {roundTripRoute && (
          <>
            <h2 className="flights-title">
              Return: {roundTripRoute.to} → {roundTripRoute.from}
            </h2>

            {returnFlights.length === 0 ? (

              <p className="no-flights-message">
                No return flights found. Try a different return date.
              </p>

            ) : (

              <div className="flights-list">
                {returnFlights.map(renderFlightCard)}
              </div>

            )}
          </>
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
