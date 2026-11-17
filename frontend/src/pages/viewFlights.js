
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import "../App.css"

const API_URL = process.env.REACT_APP_API_URL

function ViewFlights() {
  const [flights, setFlights] = useState([])
  const [returnFlights, setReturnFlights] = useState([])
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

  // Flight preference filters
  const [selectedAirlines, setSelectedAirlines] = useState([])
  const [selectedSeat, setSelectedSeat] = useState("")
  const [selectedCabinClass, setSelectedCabinClass] = useState("")

  const [lastSearch, setLastSearch] = useState(null)
  const [favouriteIds, setFavouriteIds] = useState([])
  const [savingFavourite, setSavingFavourite] = useState(null)

  const navigate = useNavigate()

  // Apply all selected filters to a flight list
  const applyFlightFilters = (flightList) => {
    return flightList.filter(flight => {
      const matchesAirline =
        selectedAirlines.length === 0 ||
        selectedAirlines.includes(flight.airline)

      const matchesSeat =
        !selectedSeat ||
        (flight.availableSeatPreferences || []).includes(selectedSeat)

      const matchesCabin =
        !selectedCabinClass ||
        (flight.availableCabinClasses || []).includes(selectedCabinClass)

      return matchesAirline && matchesSeat && matchesCabin
    })
  }

  // Filter outbound and return flights
  const filteredFlights = applyFlightFilters(flights)
  const filteredReturnFlights = applyFlightFilters(returnFlights)

  // Add or remove an airline from the selected filters
  const handleAirlineChange = (airline) => {
    setSelectedAirlines(previous => {
      if (previous.includes(airline)) {
        return previous.filter(item => item !== airline)
      }

      return [...previous, airline]
    })
  }

  // Clear all preference filters
  const clearAllFilters = () => {
    setSelectedAirlines([])
    setSelectedSeat("")
    setSelectedCabinClass("")
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token")

      if (token) {
        await axios.post(
          `${API_URL}/api/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        )
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

  // Load the user's most recent search
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
            Authorization: `Bearer ${token}`
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

  // Fetch flights from the backend
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

      const roundTrip =
        queryParams.roundTrip !== undefined
          ? queryParams.roundTrip
          : filters.roundTrip

      params.append("roundTrip", roundTrip)

      const returnDate =
        queryParams.returnDate || filters.returnDate

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
            Authorization: `Bearer ${token}`
          }
        }
      )

      setFlights(response.data.flights || [])
      setReturnFlights(response.data.returnFlights || [])

      setRoundTripRoute(
        roundTrip && from && to
          ? {
              from: from.toUpperCase(),
              to: to.toUpperCase()
            }
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

  // Add a flight to the shopping cart
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
            Authorization: `Bearer ${token}`
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
    if (savingFavourite) return

    setSavingFavourite(flight.flightId)

    try {
      const token = localStorage.getItem("token")

      const headers = {
        Authorization: `Bearer ${token}`
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

      alert(
        err.response?.data?.message ||
        "Unable to update favourites. Please try again."
      )

    } finally {
      setSavingFavourite(null)
    }
  }

  // Display an individual flight
  const renderFlightCard = (flight) => (
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
        onClick={() => addToCart(flight)}
      >
        Add to Cart
      </button>

      <button
        onClick={() => toggleFavourite(flight)}
        disabled={savingFavourite !== null}
      >
        {savingFavourite === flight.flightId
          ? "Saving..."
          : isFavourite(flight)
            ? "♥ Favourited"
            : "♡ Favourite"}
      </button>

      {isFavourite(flight) && (
        <p
          onClick={() => toggleFavourite(flight)}
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
          <div className="logo">Uplift</div>
        </div>

        <div className="flights-container">
          <h2>Loading flights...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="header">
        <div className="logo">Uplift</div>

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

            {lastSearch.from && lastSearch.to
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

        {/* Flight search form */}
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

        {/* Flight preference filters */}
        <div className="flight-preferences">
          <h2>Filter Flights</h2>

          {/* Airline filter */}
          <div className="filter-group">
            <div className="filter-heading">
              <strong>Airline</strong>

              <button
                type="button"
                onClick={() => setSelectedAirlines([])}
                disabled={selectedAirlines.length === 0}
              >
                Clear
              </button>
            </div>

            <div className="filter-options">
              {[...new Set(flights.map(flight => flight.airline))]
                .filter(Boolean)
                .map(airline => (
                  <label key={airline}>
                    <input
                      type="checkbox"
                      checked={selectedAirlines.includes(airline)}
                      onChange={() => handleAirlineChange(airline)}
                    />
                    {airline}
                  </label>
                ))}
            </div>

            <small>
              Select one or more airlines. Leave all unchecked to show every airline.
            </small>
          </div>

          {/* Seat preference filter */}
          <div className="filter-group">
            <div className="filter-heading">
              <strong>Seat Preference</strong>

              <button
                type="button"
                onClick={() => setSelectedSeat("")}
                disabled={!selectedSeat}
              >
                Clear
              </button>
            </div>

            <select
              value={selectedSeat}
              onChange={(e) => setSelectedSeat(e.target.value)}
            >
              <option value="">All Seat Preferences</option>
              <option value="Window">Window</option>
              <option value="Aisle">Aisle</option>
              <option value="Middle">Middle</option>
            </select>
          </div>

          {/* Cabin class filter */}
          <div className="filter-group">
            <div className="filter-heading">
              <strong>Cabin Class</strong>

              <button
                type="button"
                onClick={() => setSelectedCabinClass("")}
                disabled={!selectedCabinClass}
              >
                Clear
              </button>
            </div>

            <select
              value={selectedCabinClass}
              onChange={(e) => setSelectedCabinClass(e.target.value)}
            >
              <option value="">All Cabin Classes</option>
              <option value="Economy">Economy</option>
              <option value="Premium Economy">Premium Economy</option>
              <option value="Business">Business</option>
              <option value="First Class">First Class</option>
            </select>
          </div>

          {/* Clear all filters */}
          <button
            type="button"
            className="clear-all-filters"
            onClick={clearAllFilters}
            disabled={
              selectedAirlines.length === 0 &&
              !selectedSeat &&
              !selectedCabinClass
            }
          >
            Clear All Filters
          </button>
        </div>

        {error && (
          <p className="error-text">
            {error}
          </p>
        )}

        {/* Outbound flight results */}
        {roundTripRoute && (
          <h2 className="flights-title">
            Outbound: {roundTripRoute.from} → {roundTripRoute.to}
          </h2>
        )}

        <h2 className="flights-title">
          Flight Results ({filteredFlights.length})
        </h2>

        {filteredFlights.length === 0 ? (
          <p className="no-flights-message">
            No flights match your selected filters. Try changing or clearing your filters.
          </p>
        ) : (
          <div className="flights-list">
            {filteredFlights.map(renderFlightCard)}
          </div>
        )}

        {/* Return flight results */}
        {roundTripRoute && (
          <>
            <h2 className="flights-title">
              Return: {roundTripRoute.to} → {roundTripRoute.from}
            </h2>

            <h2 className="flights-title">
              Return Flight Results ({filteredReturnFlights.length})
            </h2>

            {filteredReturnFlights.length === 0 ? (
              <p className="no-flights-message">
                No return flights match your selected filters.
              </p>
            ) : (
              <div className="flights-list">
                {filteredReturnFlights.map(renderFlightCard)}
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
