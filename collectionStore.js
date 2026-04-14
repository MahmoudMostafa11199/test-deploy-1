import Bookmark from './models/Bookmark.js';
import Collection from './models/Collection.js';

// ── Collection CRUD ──
export async function getCollections(userId) {
  return Collection.find({ owner: userId }).sort({ createdAt: -1 });
}

export async function getCollectionById(id, userId) {
  const collection = await Collection.findOne({ _id: id, owner: userId });
  if (!collection) return null;

  const bookmarks = await Bookmark.find({ collectionId: id }).sort({
    createdAt: -1,
  });

  return {
    ...collection.toJSON(),
    bookmarks,
  };
}

export async function createCollection({ name, userId }) {
  return Collection.create({ name, owner: userId });
}

export async function updateCollection(id, fields, userId) {
  return Collection.findOneAndUpdate({ _id: id, owner: userId }, fields, {
    new: true,
    runValidators: true,
  });
}

export async function deleteCollection(id, userId) {
  const deleted = await Collection.findOneAndDelete({ _id: id, owner: userId });
  if (deleted) {
    await Bookmark.updateMany({ collectionId: id }, { collectionId: null });
  }
  return !!deleted;
}
