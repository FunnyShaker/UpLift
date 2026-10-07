import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import "../App.css"

function Booking() {

  const location = useLocation()
  const navigate = useNavigate()

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [passengerInfo, setPassengerInfo] = useState({
    fullName: ""
  })

  const [paymentInfo, setPaymentInfo] = useState({
    cardholderName: "",
    cardNumber: "",
    expiryDate: "",
    cvv: ""
  })

  // Get the selected flight from the Cart page
  const flight = location.state?.flight

  // Get the logged-in user's ID
  const userId = localStorage.getItem("userId") || "Not available"

  // Handle passenger information changes
  const handlePassengerChange = (e) => {
    setPassengerInfo({
      ...passengerInfo,
      [e.target.name]: e.target.value
    })
  }

  // Handle payment information changes
  const handlePaymentChange = (e) => {
    setPaymentInfo({
      ...paymentInfo,
      [e.target.name]: e.target.value
    })
  }

  // If no flight was selected
  if (!flight) {
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

        <div className="content">

          <div className="card booking-card">

            <h1>No Flight Selected</h1>

            <p>
              Please select a flight before booking.
            </p>

            <button onClick={() => navigate("/flights")}>
              Browse Flights
            </button>

          </div>

        </div>

      </div>
    )
  }

  const handleConfirmBooking = async () => {

    setMessage("")
    setError("")

    // Check passenger information
    if (!passengerInfo.fullName) {
      setError("Please enter the passenger's full name.")
      return
    }

    // Check that all payment fields are filled
    if (
      !paymentInfo.cardholderName ||
      !paymentInfo.cardNumber ||
      !paymentInfo.expiryDate ||
      !paymentInfo.cvv
    ) {
      setError("Please complete all payment fields.")
      return
    }

    // Remove spaces from card number
    const cardNumber = paymentInfo.cardNumber.replace(/\s/g, "")

    // Check card number
    if (!/^\d{16}$/.test(cardNumber)) {
      setError("Please enter a valid 16-digit card number.")
      return
    }

    // Check expiry date
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(paymentInfo.expiryDate)) {
      setError("Please enter a valid expiry date in MM/YY format.")
      return
    }

    // Check CVV
    if (!/^\d{3,4}$/.test(paymentInfo.cvv)) {
      setError("Please enter a valid CVV.")
      return
    }

    try {

      /*
       * Backend booking and payment request
       * will be connected here.
       *
       * Passenger information:
       * passengerInfo.fullName
       * userId
       *
       * Flight information:
       * flight.flightId
       *
       * Payment information:
       * paymentInfo
       */

      console.log("Passenger information:", passengerInfo)
      console.log("User ID:", userId)
      console.log("Flight ID:", flight.flightId)

      // Do not store full payment information
      console.log("Payment submitted successfully")

      // Temporary message until backend endpoint is connected
      setMessage("Booking confirmed successfully!")

    } catch (err) {

      console.error("Booking error:", err)

      setError(
        "Unable to complete the booking. Please try again."
      )
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
          onClick={() => navigate("/")}
        >
          Logout
        </button>

      </div>

      <div className="content">

        <div className="booking-layout">

          {/* Passenger and Flight Information */}

          <div className="card booking-card">

            <h1>Confirm Your Booking</h1>

            <h2>Passenger Information</h2>

            <div className="booking-form">

              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={passengerInfo.fullName}
                onChange={handlePassengerChange}
              />

              <input
                type="text"
                value={userId}
                placeholder="User ID"
                readOnly
              />

            </div>

            <button
              type="button"
              onClick={() =>
                alert("Additional passenger feature coming soon.")
              }
            >
              + Add Passenger
            </button>

            <h2>Flight Information</h2>

            <div className="flight-booking-info">

              <p>
                <strong>Flight ID:</strong>{" "}
                {flight.flightId}
              </p>

              <h3>{flight.airline}</h3>

              <p>
                <strong>
                  {flight.from} → {flight.to}
                </strong>
              </p>

              <p>
                Date: {flight.departureDate}
              </p>

              <p>
                Departure: {flight.departureTime}
              </p>

              <p>
                Arrival: {flight.arrivalTime}
              </p>

              <p>
                Duration: {flight.duration}
              </p>

              <p>
                Passengers: {flight.passengers}
              </p>

              <p>
                <strong>
                  Flight Price: ${flight.price}
                </strong>
              </p>

            </div>

          </div>

          {/* Payment Information */}

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
              <p className="success-text">
                {message}
              </p>
            )}

            {error && (
              <p className="error-text">
                {error}
              </p>
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
