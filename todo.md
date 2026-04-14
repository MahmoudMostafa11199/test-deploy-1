# Lab: Authentication Middleware, Collections - Authorization & MongoDB

In this lab you will implement the **authenticate middleware**, then add **authorization** and **MongoDB/Mongoose queries** for the Collections feature.

---

## Part 1: Authentication Middleware (`server.js`)

- [ ] Implement the `authenticate` function that:
  1. Reads the `Authorization` header from the request
  2. Extracts the token (format: `"Bearer <token>"`)
  3. If no header exists, responds with `401` and `{ error: "No token provided" }`
  4. Verifies the token using `jwt.verify(token, JWT_SECRET)`
  5. Looks up the user with `getUserById(decoded.id)`
  6. If user not found, responds with `401` and `{ error: "User not found" }`
  7. Attaches the user to the request: `req.user = user`
  8. Calls `next()` to continue to the route handler
  9. If token verification fails (catch block), responds with `401` and `{ error: "Invalid token" }`

> **Note:** This middleware is already applied to bookmark routes. Once implemented, both bookmarks and collections will use it.

---

## Part 2: Collection Schema (`models/Collection.js`)

- [ ] Define the Mongoose schema with the following fields:
  - `name` — String, required, trimmed
  - `owner` — ObjectId, references the `"User"` model
- [ ] Enable `timestamps: true` so Mongoose adds `createdAt` / `updatedAt`

> **Hint:** Look at `models/Bookmark.js` for an example of how `owner` is defined.

---

## Part 3: Collection CRUD — Mongoose Queries (`bookmarkStore.js`)

Implement the body of each function. Every function already has a detailed TODO comment above it describing exactly what to do.

- [ ] `getCollections(userId)` — find collections where `owner` equals `userId`
- [ ] `getCollectionById(id, userId)` — find one collection by `_id` **and** `owner`, then also fetch its bookmarks (`Bookmark.find({ collectionId: id })`), and return them merged
- [ ] `createCollection({ name, userId })` — create a collection with `name` and `owner: userId`
- [ ] `updateCollection(id, fields, userId)` — update only if the collection belongs to the user
- [ ] `deleteCollection(id, userId)` — delete only if the collection belongs to the user, then set `collectionId: null` on any bookmarks that were in that collection

> **Hint:** Compare with the Bookmark CRUD functions in the same file — they follow the same owner-check pattern.

---

## Part 4: Protect Collection Routes (`server.js`)

- [ ] Add `collectionRouter.use(authenticate)` so all collection endpoints require a valid JWT
- [ ] In **GET /**  — pass `req.user.id` to `getCollections()`
- [ ] In **GET /:id** — pass `req.user.id` to `getCollectionById()`
- [ ] In **POST /** — pass `req.user.id` (as `userId`) to `createCollection()`
- [ ] In **PUT /:id** — pass `req.user.id` to `updateCollection()`
- [ ] In **DELETE /:id** — pass `req.user.id` to `deleteCollection()`

> **Hint:** Look at how `bookmarkRouter` uses `authenticate` and passes `req.user.id`.

---

## How to Test

1. Start the server: `npm start`
2. Sign up / log in via the UI or use the Bruno collection in `bruno-collection/`
3. Create a collection — it should be saved with your user as the owner
4. Verify another user **cannot** see or modify your collections
5. Deleting a collection should move its bookmarks to "No collection" (collectionId = null)

---

## Files to Edit

| File | What to do |
|---|---|
| `server.js` | Implement authenticate middleware |
| `models/Collection.js` | Define schema fields |
| `bookmarkStore.js` | Implement 5 collection functions |
| `server.js` | Add auth middleware to collections + pass userId to functions |
