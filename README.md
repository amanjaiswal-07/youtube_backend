# YouTube Backend

This project is a robust backend solution for a video-sharing platform like YouTube. It provides a comprehensive set of features for managing users, videos, subscriptions, playlists, tweets, comments, and likes. The application is built with a modern technology stack, ensuring scalability and maintainability.

---

## Key Features

* **User Management:**
    * User registration with avatar and cover image uploads.
    * Secure user login and logout functionality.
    * JWT-based authentication and authorization using access and refresh tokens.
    * Password management, including changing the current password.
    * User profile management, including updating account details, avatars, and cover images.
    * Ability to view user channel profiles and watch history.

* **Video Management:**
    * Publish videos with titles, descriptions, and thumbnails.
    * Retrieve a list of all videos with support for pagination, sorting, and searching.
    * Fetch a specific video by its ID.
    * Update video details, including title, description, and thumbnail.
    * Delete videos and associated cloud-based assets.
    * Toggle the publish status of a video.

* **Subscription Management:**
    * Subscribe to and unsubscribe from channels.
    * View a list of subscribers for a given channel.
    * View a list of channels that a user is subscribed to.

* **Playlist Management:**
    * Create, update, and delete playlists.
    * Add and remove videos from playlists.
    * View user-created playlists and the videos within them.

* **Tweet Management:**
    * Create, update, and delete tweets, with optional image uploads.
    * Retrieve all tweets from a specific user.

* **Comment and Like Management:**
    * Add, update, and delete comments on videos and tweets.
    * Toggle likes on videos, comments, and tweets.
    * View all videos liked by a user.

---

## Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB with Mongoose for object data modeling
* **Authentication:** JSON Web Tokens (JWT)
* **File Uploads:** Multer for handling multipart/form-data
* **Cloud Storage:** Cloudinary for storing and managing images and videos
* **API Development:**
    * `asyncHandler` for handling asynchronous operations in Express routes.
    * Custom `ApiError` and `ApiResponse` classes for consistent error handling and responses.

---

## 🚀 Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/amanjaiswal-07/youtube_backend.git](https://github.com/amanjaiswal-07/youtube_backend.git)
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add the following variables:
    ```
    PORT=8000
    MONGO_URI=<your_mongodb_connection_string>
    CORS_ORIGIN=*
    ACCESS_TOKEN_SECRET=<your_access_token_secret>
    ACCESS_TOKEN_EXPIRY=1d
    REFRESH_TOKEN_SECRET=<your_refresh_token_secret>
    REFRESH_TOKEN_EXPIRY=10d
    CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
    CLOUDINARY_API_KEY=<your_cloudinary_api_key>
    CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>
    ```
4.  **Start the development server:**
    ```bash
    npm run dev
    ```

---

## 📝 API Endpoints

The API is structured into the following resources:

* **Users:** `/api/v1/users`
* **Videos:** `/api/v1/videos`
* **Subscriptions:** `/api/v1/subscriptions`
* **Playlists:** `/api/v1/playlists`
* **Tweets:** `/api/v1/tweets`
* **Comments:** `/api/v1/comments`
* **Likes:** `/api/v1/likes`

For detailed information on each endpoint, please refer to the route definitions within the [src/routes](src/routes) directory.

---

