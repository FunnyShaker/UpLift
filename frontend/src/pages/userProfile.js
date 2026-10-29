
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import "../userProfile.css";

const API_URL = process.env.REACT_APP_API_URL;

function UserProfile() {
  // User profile information
  const [profile, setProfile] = useState({
    fullName: "",
    email: localStorage.getItem("userEmail") || "",
    phone: "",
    country: "",
    userType: "",
  });

  const [editing, setEditing] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Real bookings loaded from the backend
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  // Load the user's profile
  useEffect(() => {
    const token = localStorage.getItem("token");

    // Keep the profile page accessible if the token is missing.
    if (!token) {
      setProfileError("Please log in to load your profile information.");
      return;
    }

    if (!API_URL) {
      setProfileError("The API URL is not configured.");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/api/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Could not load your profile.");
        }

        const data = await response.json();

        setProfile({
          fullName: data.fullName || "",
          email: data.email || localStorage.getItem("userEmail") || "",
          phone: data.phone || data.phoneNumber || "",
          country: data.country || "",
          userType: data.userType || "",
        });

        setProfileError("");
      } catch (error) {
        setProfileError(error.message);
      }
    };

    fetchProfile();
  }, []);

  // Load the user's actual bookings from the backend
  const fetchBookings = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token || !API_URL) {
      setBookingsError(
        !token
          ? "Please log in to view your bookings."
          : "The API URL is not configured."
      );
      setBookingsLoading(false);
      return;
    }

    setBookingsLoading(true);
    setBookingsError("");

    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Could not load your bookings.");
      }

      const data = await response.json();

      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (error) {
      setBookingsError(error.message);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Update profile form fields
  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfile((previousProfile) => ({
      ...previousProfile,
      [name]: value,
    }));
  };

  // Save profile changes
  const handleSaveProfile = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || !API_URL) {
      setProfileError("You must be logged in to update your profile.");
      return;
    }

    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");

    try {
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
      });

      if (!response.ok) {
        throw new Error("Could not save your profile.");
      }

      setEditing(false);
      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Request cancellation from the backend
  const handleCancelBooking = async (booking) => {
    const bookingId = booking.bookingId || booking.id;

    if (!bookingId) {
      setBookingMessage(
        "This booking does not have an ID that can be used for cancellation."
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    if (!token || !API_URL) {
      setBookingMessage("Please log in before cancelling a booking.");
      return;
    }

    setCancellingId(bookingId);
    setBookingMessage("");
    setBookingsError("");

    try {
      const response = await fetch(
        `${API_URL}/api/bookings/${encodeURIComponent(bookingId)}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.message ||
            "Could not cancel this booking. The cancellation endpoint may not be available yet."
        );
      }

      setBookingMessage("Booking cancelled successfully.");

      // Reload bookings to reflect the backend's latest data.
      await fetchBookings();
    } catch (error) {
      setBookingMessage(error.message);
    } finally {
      setCancellingId(null);
    }
  };

  // Log out
  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    const userEmail = localStorage.getItem("userEmail");

    if (token && API_URL) {
      try {
        await fetch(`${API_URL}/api/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error("Logout request failed:", error);
      }
    }

    if (userEmail) {
      localStorage.removeItem(`cart_${userEmail}`);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");

    window.location.href = "/";
  };

  // Format departure information if available
  const formatDeparture = (flight) => {
    const date = flight?.departureDate || flight?.date;
    const time = flight?.departureTime || flight?.time;

    if (date && time) return `${date} at ${time}`;
    if (date) return date;
    if (time) return time;

    return "Not available";
  };

  const getFlightName = (flight) => {
    if (!flight) return "Flight details unavailable";

    const airline = flight.airline || "Airline";
    const flightNumber = flight.flightId || flight.flightNumber;

    return flightNumber
      ? `${airline} — ${flightNumber}`
      : airline;
  };

  const getPassengerNames = (booking) => {
    const names = Array.isArray(booking.passengers)
      ? booking.passengers
          .map((passenger) => passenger?.fullName)
          .filter((name) => typeof name === "string" && name.trim())
      : [];

    return names.length ? names.join(", ") : booking.fullName || "Not available";
  };

  const activeBookings = bookings.filter(
    (booking) =>
      !["cancelled", "canceled"].includes(
        String(booking.status || "").toLowerCase()
      )
  );

  const cancelledBookings = bookings.filter((booking) =>
    ["cancelled", "canceled"].includes(
      String(booking.status || "").toLowerCase()
    )
  );

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>

        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Personal information */}
      <section className="profile-card">
        <h2>Personal Information</h2>

        {profileMessage && (
          <p role="status" className="success-message">
            {profileMessage}
          </p>
        )}

        {profileError && (
          <p role="alert" className="error-message">
            {profileError}
          </p>
        )}

        {editing ? (
          <form onSubmit={handleSaveProfile}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              value={profile.fullName}
              onChange={handleProfileChange}
              required
            />

            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={profile.email}
              readOnly
            />

            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              value={profile.phone}
              onChange={handleProfileChange}
            />

            <label htmlFor="country">Country</label>
            <input
              id="country"
              name="country"
              value={profile.country}
              onChange={handleProfileChange}
            />

            <p>
              <strong>Account Type:</strong>{" "}
              {profile.userType || "Not specified"}
            </p>

            <button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setProfileError("");
                setProfileMessage("");
              }}
            >
              Cancel Editing
            </button>
          </form>
        ) : (
          <>
            <p>
              <strong>Full Name:</strong>{" "}
              {profile.fullName || "Not available"}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {profile.email || "Not available"}
            </p>

            <p>
              <strong>Phone:</strong>{" "}
              {profile.phone || "Not available"}
            </p>

            <p>
              <strong>Country:</strong>{" "}
              {profile.country || "Not available"}
            </p>

            <p>
              <strong>Account Type:</strong>{" "}
              {profile.userType || "Not specified"}
            </p>

            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setProfileError("");
                setProfileMessage("");
              }}
            >
              Edit Profile
            </button>
          </>
        )}
      </section>

      {/* Existing My Trips section */}
      <section className="profile-card">
        <h2>My Trips</h2>
        <p>View and manage your upcoming and previous flights.</p>

        <Link to="/cart" className="trips-btn">
          View My Trips
        </Link>
      </section>

      {/* Real bookings and cancellation */}
      <section className="profile-card">
        <h2>My Bookings</h2>
        <p>View your bookings and cancel a reservation when needed.</p>

        <button
          type="button"
          onClick={fetchBookings}
          disabled={bookingsLoading}
        >
          {bookingsLoading ? "Loading..." : "Refresh Bookings"}
        </button>

        {bookingMessage && (
          <p role="status" className="success-message">
            {bookingMessage}
          </p>
        )}

        {bookingsError && (
          <p role="alert" className="error-message">
            {bookingsError}
          </p>
        )}

        {bookingsLoading ? (
          <p>Loading your bookings...</p>
        ) : (
          <>
            {activeBookings.length === 0 && (
              <p>No active bookings found.</p>
            )}

            {activeBookings.map((booking) => {
              const flight = booking.flight || {};
              const bookingId = booking.bookingId || booking.id;
              const price = flight.price;

              return (
                <div className="booking-card" key={bookingId}>
                  <h3>{getFlightName(flight)}</h3>

                  <p>
                    <strong>Booking ID:</strong>{" "}
                    {booking.bookingId || booking.id || "Not available"}
                  </p>

                  <p>
                    <strong>Passengers:</strong>{" "}
                    {getPassengerNames(booking)}
                  </p>

                  <p>
                    <strong>From:</strong>{" "}
                    {flight.from || flight.origin || "Not available"}
                  </p>

                  <p>
                    <strong>To:</strong>{" "}
                    {flight.to || flight.destination || "Not available"}
                  </p>

                  <p>
                    <strong>Departure:</strong>{" "}
                    {formatDeparture(flight)}
                  </p>

                  {price !== undefined && price !== null && (
                    <p>
                      <strong>Price:</strong> ${price}
                    </p>
                  )}

                  <p>
                    <strong>Status:</strong>{" "}
                    {booking.status || "Active"}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleCancelBooking(booking)}
                    disabled={
                      cancellingId === bookingId ||
                      !bookingId
                    }
                  >
                    {cancellingId === bookingId
                      ? "Cancelling..."
                      : "Cancel Booking"}
                  </button>
                </div>
              );
            })}

            {cancelledBookings.length > 0 && (
              <>
                <h3>Cancelled Bookings</h3>

                {cancelledBookings.map((booking) => {
                  const flight = booking.flight || {};

                  return (
                    <div
                      className="booking-card"
                      key={booking.bookingId || booking.id}
                    >
                      <h3>{getFlightName(flight)}</h3>

                      <p>
                        <strong>Booking ID:</strong>{" "}
                        {booking.bookingId || booking.id || "Not available"}
                      </p>

                      <p>
                        <strong>Passengers:</strong>{" "}
                        {getPassengerNames(booking)}
                      </p>

                      <p>
                        <strong>From:</strong>{" "}
                        {flight.from || flight.origin || "Not available"}
                      </p>

                      <p>
                        <strong>To:</strong>{" "}
                        {flight.to || flight.destination || "Not available"}
                      </p>

                      <p>
                        <strong>Status:</strong> Cancelled
                      </p>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default UserProfile;
