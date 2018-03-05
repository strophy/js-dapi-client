const lowdb = require('lowdb');
const FileAdapterAsync = require('lowdb/adapters/FileAsync');
const LocalStorageAdapter = require('lowdb/adapters/LocalStorage');
const { NODE, BROWSER } = require('../constants').storage;

const isNode = typeof window === 'undefined';
const Adapter = isNode ? FileAdapterAsync : LocalStorageAdapter;

class Storage {
  /**
   * @constructor
   * @param {object} [options]
   * @param {string} [options.path] - Only for node - custom path to file in which data
   * will be saved.
   * @param {string} [options.dbName] - Only for browser - custom name for db in localStorage
   */
  constructor(options) {
    let adapter;
    if (isNode) {
      const path = options && options.path ? options.path : NODE.DEFAULT_STORAGE_PATH;
      adapter = new Adapter(path);
    } else {
      const dbName = options && options.dbName ? options.dbName : BROWSER.DEFAULT_DB_NAME;
      adapter = new Adapter(dbName);
    }
    this.db = lowdb(adapter);
    this.isReady = false;
  }

  /**
   * If the adapter is created asynchronously, waits for it to be created and assigns
   * it to this.db
   * @return {Promise<void>}
   */
  async initDb() {
    if (this.db.then) {
      this.db = await this.db;
    }
    this.isReady = true;
  }

  /**
   * Returns collection. If there is not collection with such name, creates it.
   * @param {string} collectionName
   * @return {Promise<*>}
   */
  async getCollection(collectionName) {
    if (!this.isReady) {
      await this.initDb();
    }
    const collectionExists = await this.db.has(collectionName).value();
    if (!collectionExists) {
      await this.db.set(collectionName, []).write();
    }
    return this.db.get(collectionName);
  }

  /**
   * Puts object to collection
   * @param {string} collectionName
   * @param {object} data
   * @return {Promise<*>}
   */
  async insert(collectionName, data) {
    const collection = await this.getCollection(collectionName);
    return collection.push(data).write();
  }

  /**
   * Finds objects in collection
   * @param {string} collectionName
   * @param {Object|Function} predicate - object to match or iterator function
   * @return {Promise<*>}
   */
  async findAll(collectionName, predicate) {
    const collection = await this.getCollection(collectionName);
    return collection.filter(predicate).value();
  }

  /**
   * Finds one object in collection
   * @param {string} collectionName
   * @param {Object|Function} predicate - object to match or iterator function
   * @return {Promise<*>}
   */
  async findOne(collectionName, predicate) {
    const collection = await this.getCollection(collectionName);
    return collection.find(predicate).value();
  }

  /**
   * Updates every document in collection that matches specified criteria
   * @param {string} collectionName
   * @param {Object|Function} predicate - object to match or iterator function
   * @param {Object} data - data to update
   * @return {Promise<*>}
   */
  async update(collectionName, predicate, data) {
    const collection = await this.getCollection(collectionName);
    return collection
      .filter(predicate)
      .forEach(object => this.db._.assign(object, data))
      .write();
  }

  /**
   * Updates one document that matches specified criteria
   * @param {string} collectionName
   * @param {Object|Function} predicate - object to match or iterator function
   * @param {Object} data - data to update
   * @return {Promise<*>}
   */
  async updateOne(collectionName, predicate, data) {
    const collection = await this.getCollection(collectionName);
    return collection
      .find(predicate)
      .assign(data)
      .write();
  }

  /**
   * Removes all matched documents
   * @param collectionName
   * @param predicate
   * @return {Promise<*>}
   */
  async remove(collectionName, predicate) {
    const collection = await this.getCollection(collectionName);
    return collection.remove(predicate).write();
  }
}

module.exports = Storage;
