import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import "../userProfile.css"

const API_URL = process.env.REACT_APP_API_URL

function UserProfile() {

  const [isEditing, setIsEditing] = useState(false)

  // Profile information will come from the backend API
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    userType: ""
  })

  // Stores the original profile so Cancel can restore it
  const [originalProfile, setOriginalProfile] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")


  // Load the logged-in user's profile
  useEffect(() => {

    const getProfile = async () => {

      try {

        const token = localStorage.getItem("token")

        const response = await fetch(`${API_URL}/api/profile`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error("Failed to load profile")
        }

        const data = await response.json()

        setProfile(data)
        setOriginalProfile(data)

      } catch (err) {

        setError("Unable to load your profile information.")

      } finally {

        setLoading(false)

      }
    }

    getProfile()

  }, [])


  // Update profile information while typing
  const handleChange = (e) => {

    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    })

  }


  // Save profile changes
  const handleSave = async () => {

    setError("")
    setSuccess("")

    // Check required fields
    if (
      !profile.fullName.trim() ||
      !profile.phone.trim() ||
      !profile.country.trim()
    ) {

      setError("Please fill in all required fields.")
      return

    }

    // Basic phone number validation
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
          "Authorization": `Bearer ${token}`
        },

        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone,
          country: profile.country
        })
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


  // Cancel editing and restore original information
  const handleCancel = () => {

    if (originalProfile) {
      setProfile(originalProfile)
    }

    setIsEditing(false)

    setError("")
    setSuccess("")

  }


  // Log out the user
  const handleLogout = async () => {

    try {

      const token = localStorage.getItem("token")

      if (token) {
        await fetch(`${API_URL}/api/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
      }

    } catch (err) {

      console.error("Logout error:", err)

    }

    // Clear the session the same way the other pages do
    const userEmail = localStorage.getItem("userEmail")

    if (userEmail) {
      localStorage.removeItem(`cart_${userEmail}`)
    }

    localStorage.removeItem("token")
    localStorage.removeItem("userEmail")

    window.location.href = "/"

  }


  // Show loading message
  if (loading) {

    return (
      <div className="profile-page">

        <div className="profile-container">

          <p>Loading profile...</p>

        </div>

      </div>
    )

  }


  return (
    <div className="profile-page">

      {/* Header */}
      <div className="profile-header">

        <div className="logo">
          Uplift
        </div>

        <Link
          to="/flights"
          className="back-link"
        >
          Back to Flights
        </Link>

      </div>


      <div className="profile-container">

        <h1>My Profile</h1>

        <p className="profile-subtitle">
          View and manage your account information
        </p>


        {/* Error message */}
        {error && (
          <p className="error-message">
            {error}
          </p>
        )}


        {/* Success message */}
        {success && (
          <p className="success-message">
            {success}
          </p>
        )}


        {/* Profile Summary */}
        <div className="profile-card">

          <div className="profile-picture">

            <span>
              {profile.fullName
                ? profile.fullName
                    .split(" ")
                    .map(name => name[0])
                    .join("")
                    .toUpperCase()
                : "U"
              }
            </span>

          </div>


          <h2>
            {profile.fullName}
          </h2>

          <p>
            {profile.email}
          </p>


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

              <button
                className="save-btn"
                onClick={handleSave}
              >
                Save Changes
              </button>

              <button
                className="cancel-btn"
                onClick={handleCancel}
              >
                Cancel
              </button>

            </div>

          )}

        </div>


        {/* Personal Information */}
        <div className="information-card">

          <h2>Personal Information</h2>


          {/* Full Name */}
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


          {/* Email */}
          <div className="profile-field">

            <label>Email</label>

            <p>{profile.email}</p>

          </div>


          {/* Phone Number */}
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


          {/* Country */}
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


          {/* Account Type */}
          <div className="profile-field">

            <label>Account Type</label>

            <p>{profile.userType}</p>

          </div>

        </div>


        {/* Trips */}
        <div className="information-card">

          <h2>My Trips</h2>

          <p>
            View your upcoming and previous flights.
          </p>

          <Link
            to="/cart"
            className="trips-btn"
          >
            View My Trips
          </Link>

        </div>


        {/* Logout */}
        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Log Out
        </button>

      </div>

    </div>
  )
}

export default UserProfile
