import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import "../cart.css"

const API_URL = process.env.REACT_APP_API_URL

function Cart() {

  const [cartItems, setCartItems] = useState([])
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token")
      if (token) {
        await axios.post(`${API_URL}/api/logout`, {}, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      }
    } catch (err) {
      console.error("Logout error:", err)
    }

    // Clear user-specific cart
    const userEmail = localStorage.getItem("userEmail")
    if (userEmail) {
      localStorage.removeItem(`cart_${userEmail}`)
    }

    localStorage.removeItem("token")
    localStorage.removeItem("userEmail")
    navigate("/")
  }

  useEffect(() => {
    const userEmail = localStorage.getItem("userEmail")
    const cartKey = `cart_${userEmail}`
    const storedCart = JSON.parse(localStorage.getItem(cartKey)) || []
    setCartItems(storedCart)
  }, [])

  const removeFromCart = (id) => {

    const updatedCart = cartItems.filter(item => item.flightId !== id)

    setCartItems(updatedCart)

    const userEmail = localStorage.getItem("userEmail")
    const cartKey = `cart_${userEmail}`
    localStorage.setItem(cartKey, JSON.stringify(updatedCart))
  }

  // Open the booking page for the selected flight
  const handleBookFlight = (flight) => {
    navigate("/booking", {
      state: {
        flight: flight
      }
    })
  }

  const getTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.passengers,
      0
    )
  }

  const totalPassengers = cartItems.reduce(
    (total, item) => total + item.passengers,
    0
  )

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="header">
          <div className="logo">Uplift</div>

          <button className="header-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <h2>Your cart is empty</h2>

        <button onClick={() => navigate("/flights")}>
          Browse Flights
        </button>
      </div>
    )
  }

  return (
    <div className="cart-page">

      <div className="header">
        <div className="logo">Uplift</div>

        <button className="header-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <h1>Flight Summary</h1>

      {cartItems.map(item => (
        <div key={item.flightId} className="flight-card">

          <h3>{item.airline}</h3>

          <p>{item.from} → {item.to}</p>
          <p>{item.departureTime} - {item.arrivalTime}</p>
          <p>{item.duration}</p>

          <p>${item.price}</p>

          <button onClick={() => removeFromCart(item.flightId)}>
            Remove
          </button>

          <button onClick={() => handleBookFlight(item)}>
            Book Flight
          </button>

        </div>
      ))}

      <div>
        <h3>Passengers: {totalPassengers}</h3>
        <h3>Total: ${getTotal() + 49}</h3>
      </div>

      <div style={{
        display: "flex",
        gap: "10px",
        justifyContent: "center",
        marginTop: "20px"
      }}>
        <button onClick={() => navigate("/home")}>
          Back to Home
        </button>

        <button onClick={() => navigate("/flights")}>
          Change Flight
        </button>
      </div>

    </div>
  )
}

export default Cart
