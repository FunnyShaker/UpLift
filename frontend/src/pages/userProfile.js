
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import "../userProfile.css"

const API_URL = process.env.REACT_APP_API_URL

function UserProfile() {
  const [isEditing, setIsEditing] = useState(false)

  // Profile information
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    userType: "",
  })

  const [originalProfile, setOriginalProfile] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Booking information
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsError, setBookingsError] = useState("")
  const [bookingMessage, setBookingMessage] = useState("")
  const [cancellingId, setCancellingId] = useState(null)

  // Load the logged-in user's profile
  useEffect(() => {
    const getProfile = async () => {
      try {
        const token = localStorage.getItem("token")

        if (!token) {
          throw new Error("Please log in to view your profile.")
        }

        const response = await fetch(`${API_URL}/api/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to load profile")
        }

        const data = await response.json()

        setProfile(data)
        setOriginalProfile(data)
      } catch (err) {
        setError(err.message || "Unable to load your profile information.")
      } finally {
        setLoading(false)
      }
    }

    getProfile()
  }, [])

  // Load the logged-in user's bookings
  const fetchBookings = async () => {
    try {
      setBookingsLoading(true)
      setBookingsError("")

      const token = localStorage.getItem("token")

      if (!token) {
        throw new Error("Please log in to view your bookings.")
      }

      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Unable to load your bookings.")
      }

      const data = await response.json()

      setBookings(data.bookings || [])
    } catch (err) {
      setBookingsError(
        err.message || "Unable to load your bookings."
      )
    } finally {
      setBookingsLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  // Update profile information while typing
  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    })
  }

  // Save profile changes
  const handleSave = async () => {
    setError("")
    setSuccess("")

    if (
      !profile.fullName.trim() ||
      !profile.phone.trim() ||
      !profile.country.trim()
    ) {
      setError("Please fill in all required fields.")
      return
    }

    const phonePattern = /^[0-9+\-() ]{7,20}$/

    if (!phonePattern.test(profile.phone)) {
      setError("Please enter a valid phone number.")
      return
    }

    try {
      const token = localStorage.getItem("token")

      const response = await fetch(`${API_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone,
          country: profile.country,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const updatedProfile = await response.json()

      setProfile(updatedProfile)
      setOriginalProfile(updatedProfile)
      setIsEditing(false)
      setSuccess("Profile updated successfully.")
    } catch (err) {
      setError("Unable to update your profile.")
    }
  }

  // Cancel editing and restore the original profile information
  const handleCancel = () => {
    if (originalProfile) {
      setProfile(originalProfile)
    }

    setIsEditing(false)
    setError("")
    setSuccess("")
  }

  // Request cancellation of a booking
  const handleCancelBooking = async (booking) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this flight booking?"
    )

    if (!confirmed) {
      return
    }

    const token = localStorage.getItem("token")
    const bookingId = booking.bookingId

    if (!token) {
      setBookingsError("Please log in again.")
      return
    }

    if (bookingId === undefined || bookingId === null) {
      setBookingsError("The booking ID is missing.")
      return
    }

    try {
      setCancellingId(bookingId)
      setBookingsError("")
      setBookingMessage("")

      // The backend must support this cancellation endpoint.
      const response = await fetch(
        `${API_URL}/api/bookings/${encodeURIComponent(bookingId)}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))

        throw new Error(
          data.message || "Unable to cancel this booking."
        )
      }

      // Update the local list after the backend confirms cancellation.
      setBookings((currentBookings) =>
        currentBookings.map((item) =>
          item.bookingId === bookingId
            ? { ...item, status: "cancelled" }
            : item
        )
      )

      setBookingMessage(
        `Booking #${bookingId} was cancelled successfully.`
      )
    } catch (err) {
      setBookingsError(
        err.message || "Unable to cancel this booking. Please try again."
      )
    } finally {
      setCancellingId(null)
    }
  }

  // Log out the user
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token")

      if (token) {
        await fetch(`${API_URL}/api/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

    window.location.href = "/"
  }

  // Show loading message while the profile loads
  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  // Split bookings into active and cancelled lists
  const activeBookings = bookings.filter(
    (booking) =>
      (booking.status || "active").toLowerCase() !== "cancelled"
  )

  const cancelledBookings = bookings.filter(
    (booking) =>
      (booking.status || "active").toLowerCase() === "cancelled"
  )

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <div className="logo">Uplift</div>

        <Link to="/flights" className="back-link">
          Back to Flights
        </Link>
      </div>

      <div className="profile-container">
        <h1>My Profile</h1>

        <p className="profile-subtitle">
          View and manage your account information
        </p>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}

        {/* Profile Summary */}
        <div className="profile-card">
          <div className="profile-picture">
            <span>
              {profile.fullName
                ? profile.fullName
                    .split(" ")
                    .map((name) => name[0])
                    .join("")
                    .toUpperCase()
                : "U"}
            </span>
          </div>

          <h2>{profile.fullName}</h2>
          <p>{profile.email}</p>

          {!isEditing ? (
            <button
              className="edit-btn"
              onClick={() => {
                setError("")
                setSuccess("")
                setIsEditing(true)
              }}
            >
              Edit Profile
            </button>
          ) : (
            <div className="edit-buttons">
              <button className="save-btn" onClick={handleSave}>
                Save Changes
              </button>

              <button className="cancel-btn" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Personal Information */}
        <div className="information-card">
          <h2>Personal Information</h2>

          <div className="profile-field">
            <label>Full Name</label>

            {isEditing ? (
              <input
                type="text"
                name="fullName"
                value={profile.fullName}
                onChange={handleChange}
                required
              />
            ) : (
              <p>{profile.fullName}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Email</label>
            <p>{profile.email}</p>
          </div>

          <div className="profile-field">
            <label>Phone Number</label>

            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                required
              />
            ) : (
              <p>{profile.phone}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Country</label>

            {isEditing ? (
              <input
                type="text"
                name="country"
                value={profile.country}
                onChange={handleChange}
                required
              />
            ) : (
              <p>{profile.country}</p>
            )}
          </div>

          <div className="profile-field">
            <label>Account Type</label>
            <p>{profile.userType}</p>
          </div>
        </div>

        {/* My Trips / Bookings */}
        <div className="information-card">
          <h2>My Trips</h2>

          <p>View your booked flights and manage your reservations.</p>

          {bookingsError && (
            <p className="error-message">{bookingsError}</p>
          )}

          {bookingMessage && (
            <p className="success-message">{bookingMessage}</p>
          )}

          {bookingsLoading ? (
            <p>Loading your bookings...</p>
          ) : (
            <>
              <h3>Active Bookings</h3>

              {activeBookings.length === 0 ? (
                <p>You have no active bookings.</p>
              ) : (
                activeBookings.map((booking) => {
                  const flight = booking.flight || {}

                  return (
                    <div
                      className="profile-field"
                      key={booking.bookingId}
                    >
                      <h4>Booking #{booking.bookingId}</h4>

                      <p>
                        <strong>Passenger:</strong>{" "}
                        {booking.fullName || "Not provided"}
                      </p>

                      <p>
                        <strong>Airline:</strong>{" "}
                        {flight.airline || "Not available"}
                      </p>

                      <p>
                        <strong>Flight:</strong>{" "}
                        {flight.flightId || flight.flightNumber || "Not available"}
                      </p>

                      <p>
                        <strong>From:</strong>{" "}
                        {flight.from || "Not available"}
                      </p>

                      <p>
                        <strong>To:</strong>{" "}
                        {flight.to || "Not available"}
                      </p>

                      <p>
                        <strong>Departure date:</strong>{" "}
                        {flight.departureDate || "Not available"}
                      </p>

                      <p>
                        <strong>Departure time:</strong>{" "}
                        {flight.departureTime || "Not available"}
                      </p>

                      {flight.price !== undefined && (
                        <p>
                          <strong>Price:</strong> {flight.price}
                        </p>
                      )}

                      <button
                        className="cancel-btn"
                        onClick={() => handleCancelBooking(booking)}
                        disabled={cancellingId === booking.bookingId}
                      >
                        {cancellingId === booking.bookingId
                          ? "Cancelling..."
                          : "Cancel Booking"}
                      </button>
                    </div>
                  )
                })
              )}

              {cancelledBookings.length > 0 && (
                <>
                  <h3>Cancelled Bookings</h3>

                  {cancelledBookings.map((booking) => (
                    <div
                      className="profile-field"
                      key={booking.bookingId}
                    >
                      <p>
                        <strong>Booking:</strong> #{booking.bookingId}
                      </p>

                      <p>
                        <strong>Passenger:</strong>{" "}
                        {booking.fullName || "Not provided"}
                      </p>

                      <p>
                        <strong>Status:</strong> Cancelled
                      </p>
                    </div>
                  ))}
                </>
              )}

              <button
                className="trips-btn"
                onClick={fetchBookings}
                disabled={bookingsLoading}
              >
                Refresh Bookings
              </button>
            </>
          )}
        </div>

        {/* Logout */}
        <button className="logout-btn" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  )
}

export default UserProfile
