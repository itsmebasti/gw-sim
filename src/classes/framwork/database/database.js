export default class Database {
    static NO_DB_SUPPORT = 'Dein Browser unterstützt keine Zwischenspeicherung!'
    static NAME = 'SIM';
    version = 4;
    
    constructor() {
        const openRequest = window.indexedDB.open(Database.NAME, this.version);
        openRequest.onupgradeneeded = ({ oldVersion, target : { result : db } }) => {
            db.onerror = () => console.error(db.error);
            
            if(oldVersion < 1) {
                db.createObjectStore('Raw', { keyPath: 'name' });
                db.createObjectStore('Queue', { keyPath: 'coords' });
                const fleets = db.createObjectStore('Fleets', { keyPath: 'id' });
        
                fleets.createIndex('deliveryCoords', 'delivery.planet.coords');
                fleets.createIndex('deployCoords', 'deploy.planet.coords');
                fleets.createIndex('deliveryTime', 'delivery.time');
                fleets.createIndex('deployTime', 'deploy.time');
            }
            if(oldVersion < 2) {
                try {
                    this.clear('Raw');
                } catch(ignored) {}
                
                db.createObjectStore('AccountData', { keyPath: 'player' });
            }
            if(oldVersion < 3) {
                db.createObjectStore('Paths', { keyPath: 'name' });
            }
            if(oldVersion < 4) {
                db.deleteObjectStore('Queue');
            }
            
            db.close();
        };
    }
    
    add(tableName, ...data) {
        return new DbPromise((db, resolve) => {
            const table = db.transaction(tableName, 'readwrite').objectStore(tableName);
            
            data.forEach((row) => table.put(row));
    
            resolve();
        });
    }
    
    getAll(tableName) {
        return new DbPromise((db, resolve) => {
            db.transaction(tableName)
                .objectStore(tableName)
                .getAll()
                .onsuccess = ({ target : { result }}) => resolve(result);
        });
    }
    
    getAllBy(tableName, index, range) {
        return new DbPromise((db, resolve) => {
            db.transaction(tableName)
                .objectStore(tableName)
                .index(index)
                .getAll(range)
                .onsuccess = ({ target : { result }}) => resolve(result);
        });
    }
    
    deleteAllBy(tableName, index, range) {
        return new DbPromise((db, resolve) => {
            db.transaction(tableName, 'readwrite')
                .objectStore(tableName)
                .index(index)
                .openCursor(range)
                .onsuccess = ({ target : { result : cursor }}) => {
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    }
                    resolve();
                };
        });
    }
    
    clear(tableName) {
        return new DbPromise((db, resolve) => {
            db.transaction(tableName, 'readwrite')
                .objectStore(tableName)
                .clear()
            resolve();
        });
    }
    
    get(tableName, key) {
        return new DbPromise((db, resolve) => {
            db.transaction(tableName)
              .objectStore(tableName)
              .get(key)
                .onsuccess = ({ target : { result }}) => resolve(result);
        });
    }
    
    delete(tableName, key) {
        return new DbPromise((db, resolve) => {
            db.transaction(tableName, 'readwrite')
              .objectStore(tableName)
              .delete(key)
                .onsuccess = ({ target : { result }}) => resolve(result);
        });
    }
    
    upsert(tableName, row) {
        return new DbPromise((db, resolve) => {
            db.transaction(tableName, 'readwrite')
                .objectStore(tableName)
                .put(row)
                .onsuccess = ({ target : { result }}) => resolve(result);
        });
    }
}

class DbPromise {
    constructor(callback) {
        return new Promise((resolve, reject) => {
            const openRequest = window.indexedDB.open(Database.NAME);
            openRequest.onerror = () => {
                if(openRequest.error.code === 11 && openRequest.error.name === 'InvalidStateError') {
                    reject(Database.NO_DB_SUPPORT);
                }
                else {
                    reject(openRequest.error);
                }
            }
            
            openRequest.onsuccess = ({ target: { result: db } }) =>  {
                db.onerror = () => reject(db.error);
                
                try {
                    callback(db, resolve);
                }
                catch(e) {
                    reject(e);
                }
                
                db.close();
            }
        });
    }
}
