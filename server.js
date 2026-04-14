import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validateUrl } from 'safe-url-validator';
import connectDB from './config/db.js';
import {
  createUser,
  getUserByEmail,
  getUserById,
  getBookmarks,
  getBookmarkById,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from './bookmarkStore.js';
import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
} from './collectionStore.js';

const JWT_SECRET = 'super-secret-key-change-later';

const app = express();
app.use(cors());
app.use(express.json());

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Bookmark routes ──
const bookmarkRouter = express.Router();
bookmarkRouter.use(authenticate);

bookmarkRouter.get('/', async (req, res) => {
  // userId AFTER ...req.query — so the client can't override it
  res.json(await getBookmarks({ ...req.query, userId: req.user.id }));
});

bookmarkRouter.get('/:id', async (req, res) => {
  const bookmark = await getBookmarkById(req.params.id);
  if (!bookmark || bookmark.owner.toString() !== req.user.id) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }
  res.json(bookmark);
});

bookmarkRouter.post('/', async (req, res) => {
  const { url, title, tags, collectionId } = req.body;
  if (!url || !title) {
    return res.status(400).json({ error: 'url and title are required' });
  }
  const result = validateUrl(url);
  if (!result.valid) {
    return res.status(400).json({ error: result.error });
  }
  const bookmark = await createBookmark({
    url,
    title,
    tags,
    collectionId,
    userId: req.user.id,
  });
  res.status(201).json(bookmark);
});

bookmarkRouter.put('/:id', async (req, res) => {
  const updated = await updateBookmark(req.params.id, req.body, req.user.id);
  if (!updated) return res.status(404).json({ error: 'Bookmark not found' });
  res.json(updated);
});

bookmarkRouter.delete('/:id', async (req, res) => {
  const deleted = await deleteBookmark(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Bookmark not found' });
  res.json({ message: 'Bookmark deleted' });
});

// ── Collection routes ──
const collectionRouter = express.Router();
collectionRouter.use(authenticate);

collectionRouter.get('/', async (req, res) => {
  res.json(await getCollections(req.user.id));
});

collectionRouter.get('/:id', async (req, res) => {
  const collection = await getCollectionById(req.params.id, req.user.id);
  if (!collection)
    return res.status(404).json({ error: 'Collection not found' });
  res.json(collection);
});

collectionRouter.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const collection = await createCollection({ name, userId: req.user.id });
  res.status(201).json(collection);
});

collectionRouter.put('/:id', async (req, res) => {
  const updated = await updateCollection(req.params.id, req.body, req.user.id);
  if (!updated) return res.status(404).json({ error: 'Collection not found' });
  res.json(updated);
});

collectionRouter.delete('/:id', async (req, res) => {
  const deleted = await deleteCollection(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'Collection not found' });
  res.json({ message: 'Collection deleted' });
});

// ── Auth routes ──
const authRouter = express.Router();

authRouter.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: 'username, email and password are required' });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 8 characters' });
  }
  if (await getUserByEmail(email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await createUser({ username, email, hashedPassword });
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email },
  });
});

// now that we have middleware, /me is just one line
authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ── Mount routers ──
app.use('/api/auth', authRouter);
app.use('/api/bookmarks', bookmarkRouter);
app.use('/api/collections', collectionRouter);

await connectDB();

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
