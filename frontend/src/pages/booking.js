
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import "../App.css"

const API_URL = process.env.REACT_APP_API_URL

function Booking() {
  const location = useLocation()
  const navigate = useNavigate()

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  // Start with one passenger.
  const [passengers, setPassengers] = useState([
    { id: 1, fullName: "" }
  ])

  const [nextPassengerId, setNextPassengerId] = useState(2)

  // Store payment form information.
  const [paymentInfo, setPaymentInfo] = useState({
    cardholderName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: ""
  })

  // Get the actual flight selected on the previous page.
  const flight = location.state?.flight

  // Log out and clear the current user's local cart.
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token")

      if (token && API_URL) {
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

  // Update the name of a specific passenger.
  const handlePassengerChange = (id, value) => {
    setPassengers((currentPassengers) =>
      currentPassengers.map((passenger) =>
        passenger.id === id
          ? { ...passenger, fullName: value }
          : passenger
      )
    )

    setMessage("")
    setError("")
  }

  // Add another passenger.
  const handleAddPassenger = () => {
    setPassengers((currentPassengers) => [
      ...currentPassengers,
      { id: nextPassengerId, fullName: "" }
    ])

    setNextPassengerId((id) => id + 1)
    setMessage("")
    setError("")
  }

  // Remove a passenger, but always keep at least one.
  const handleRemovePassenger = (id) => {
    if (passengers.length <= 1) {
      setError("At least one passenger is required.")
      return
    }

    setPassengers((currentPassengers) =>
      currentPassengers.filter((passenger) => passenger.id !== id)
    )

    setMessage("")
    setError("")
  }

  // Update payment form fields.
  const handlePaymentChange = (e) => {
    const { name, value } = e.target

    setPaymentInfo((currentInfo) => ({
      ...currentInfo,
      [name]: value
    }))

    setMessage("")
    setError("")
  }

  // Use the selected flight's price for each passenger.
  const pricePerPassenger = Number(flight?.price ?? 0)

  // Recalculate the total whenever the passenger count changes.
  const totalPrice = pricePerPassenger * passengers.length

  // Confirm the booking.
  const handleConfirmBooking = async () => {
    setMessage("")
    setError("")

    // Make sure a valid flight price is available.
    if (
      !flight ||
      !Number.isFinite(pricePerPassenger) ||
      pricePerPassenger <= 0
    ) {
      setError("The selected flight has an invalid price. Please select the flight again.")
      return
    }

    // Ensure every passenger has a name.
    const hasMissingName = passengers.some(
      (passenger) => !passenger.fullName.trim()
    )

    if (hasMissingName) {
      setError("Please enter the full name for every passenger.")
      return
    }

    // Check that all payment fields are completed.
    if (
      !paymentInfo.cardholderName.trim() ||
      !paymentInfo.cardNumber.trim() ||
      !paymentInfo.expiryDate.trim() ||
      !paymentInfo.cvv.trim()
    ) {
      setError("Please complete all payment fields.")
      return
    }

    // Remove spaces from the card number.
    const cardNumber = paymentInfo.cardNumber.replace(/\s/g, "")

    if (!/^\d{16}$/.test(cardNumber)) {
      setError("Please enter a valid 16-digit card number.")
      return
    }

    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(paymentInfo.expiryDate)) {
      setError("Please enter a valid expiry date in MM/YY format.")
      return
    }

    if (!/^\d{3,4}$/.test(paymentInfo.cvv)) {
      setError("Please enter a valid CVV.")
      return
    }

    // Ensure the API URL is configured.
    if (!API_URL) {
      setError("The API URL is not configured. Please check your frontend environment settings.")
      return
    }

    try {
      const token = localStorage.getItem("token")

      // Require the user to be logged in.
      if (!token) {
        navigate("/")
        return
      }

      // Send the selected flight and all passengers to the backend.
      // The backend must support the passengers array.
      const response = await axios.post(
        `${API_URL}/api/bookings`,
        {
          flightId: flight.flightId,
          passengers: passengers.map((passenger) => ({
            fullName: passenger.fullName.trim()
          })),
          payment: {
            cardholderName: paymentInfo.cardholderName.trim(),
            cardNumber,
            expiryDate: paymentInfo.expiryDate,
            cvv: paymentInfo.cvv
          }
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const bookingId = response.data.booking?.bookingId

      setMessage(
        bookingId
          ? `Booking confirmed! Booking #${bookingId}`
          : response.data.message || "Booking confirmed successfully!"
      )
    } catch (err) {
      console.error("Booking error:", err)

      setError(
        err.response?.data?.message ||
        "Unable to complete the booking. Please try again."
      )
    }
  }

  // If no flight was passed from the previous page, ask the user to select one.
  if (!flight) {
    return (
      <div className="page">
        <div className="header">
          <div className="logo">Uplift</div>

          <button className="header-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <div className="content">
          <div className="card booking-card">
            <h1>No Flight Selected</h1>
            <p>Please select a flight before booking.</p>

            <button onClick={() => navigate("/flights")}>
              Browse Flights
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="header">
        <div className="logo">Uplift</div>

        <button className="header-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="content">
        <div className="booking-layout">

          {/* Passenger and flight information */}
          <div className="card booking-card">
            <h1>Confirm Your Booking</h1>

            <h2>Passenger Information</h2>

            {passengers.map((passenger, index) => (
              <div className="booking-form" key={passenger.id}>
                <h3>Passenger {index + 1}</h3>

                <input
                  type="text"
                  name={`fullName-${passenger.id}`}
                  placeholder="Full Name"
                  value={passenger.fullName}
                  onChange={(e) =>
                    handlePassengerChange(passenger.id, e.target.value)
                  }
                />

                {passengers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePassenger(passenger.id)}
                  >
                    Remove Passenger
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={handleAddPassenger}>
              + Add Passenger
            </button>

            <h2>Flight Information</h2>

            <div className="flight-booking-info">
              <p>
                <strong>Flight ID:</strong> {flight.flightId}
              </p>

              <h3>{flight.airline}</h3>

              <p>
                <strong>
                  {flight.from} → {flight.to}
                </strong>
              </p>

              <p>Date: {flight.departureDate}</p>
              <p>Departure: {flight.departureTime}</p>
              <p>Arrival: {flight.arrivalTime}</p>
              <p>Duration: {flight.duration}</p>
              <p>Passengers: {passengers.length}</p>

              <p>
                <strong>
                  Price per passenger: ${pricePerPassenger.toFixed(2)}
                </strong>
              </p>

              <p>
                <strong>
                  Total Price: ${totalPrice.toFixed(2)}
                </strong>
              </p>
            </div>
          </div>

          {/* Payment information */}
          <div className="card booking-card">
            <h2>Payment Information</h2>

            <div className="payment-form">
              <input
                type="text"
                name="cardholderName"
                placeholder="Cardholder Name"
                value={paymentInfo.cardholderName}
                onChange={handlePaymentChange}
              />

              <input
                type="text"
                name="cardNumber"
                placeholder="Card Number"
                value={paymentInfo.cardNumber}
                onChange={handlePaymentChange}
              />

              <input
                type="text"
                name="expiryDate"
                placeholder="MM/YY"
                value={paymentInfo.expiryDate}
                onChange={handlePaymentChange}
              />

              <input
                type="text"
                name="cvv"
                placeholder="CVV"
                value={paymentInfo.cvv}
                onChange={handlePaymentChange}
              />
            </div>

            {message && (
              <p className="success-text">{message}</p>
            )}

            {error && (
              <p className="error-text">{error}</p>
            )}

            {!message && (
              <button onClick={handleConfirmBooking}>
                Confirm Booking
              </button>
            )}

            <button onClick={() => navigate("/cart")}>
              Back to Cart
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Booking
