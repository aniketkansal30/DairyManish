const bcrypt = require("bcryptjs");

const collections = {
  Category: [
    { name: "Sweets" },
    { name: "Snacks" },
    { name: "Tandoor" },
    { name: "Milk" },
    { name: "Paneer" }
  ],
  Product: [
    { id: "p1", name: "Kaju Katli", category: "Sweets", price: 800, cost: 500, unit: "kg", hasVariation: false },
    { id: "p2", name: "Samosa", category: "Snacks", price: 15, cost: 8, unit: "piece", hasVariation: false },
    { id: "p3", name: "Paneer", category: "Paneer", price: 320, cost: 260, unit: "kg", hasVariation: false },
    { id: "p4", name: "Tandoori Roti", category: "Tandoor", price: 10, cost: 5, unit: "piece", hasVariation: false },
    { id: "p5", name: "Milk", category: "Milk", price: 60, cost: 48, unit: "litre", hasVariation: false }
  ],
  User: [
    {
      username: "admin",
      password: bcrypt.hashSync("admin", 10),
      shopName: "Manish Dairy"
    }
  ],
  Customer: [
    { name: "Aniket Kansal", phone: "9876543210", bills: ["MD1", "MD2"] },
    { name: "Akshansh Mittal", phone: "9999988888", bills: ["MD3"] }
  ],
  Bill: [
    {
      id: "MD1",
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      items: [
        { id: "p1", name: "Kaju Katli", category: "Sweets", price: 800, cost: 500, unit: "kg", qty: 1, total: 800 },
        { id: "p2", name: "Samosa", category: "Snacks", price: 15, cost: 8, unit: "piece", qty: 1, total: 15 }
      ],
      subtotal: 815,
      discountPct: 0,
      discountAmt: 0,
      total: 815,
      cost: 508,
      profit: 307,
      discountApplied: false,
      paymentMode: "CASH",
      customer: { name: "Aniket Kansal", phone: "9876543210" }
    },
    {
      id: "MD2",
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      items: [
        { id: "p3", name: "Paneer", category: "Paneer", price: 320, cost: 260, unit: "kg", qty: 1, total: 320 }
      ],
      subtotal: 320,
      discountPct: 0,
      discountAmt: 0,
      total: 320,
      cost: 260,
      profit: 60,
      discountApplied: false,
      paymentMode: "CASH",
      customer: { name: "Aniket Kansal", phone: "9876543210" }
    },
    {
      id: "MD3",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      items: [
        { id: "p5", name: "Milk", category: "Milk", price: 60, cost: 48, unit: "litre", qty: 2, total: 120 }
      ],
      subtotal: 120,
      discountPct: 0,
      discountAmt: 0,
      total: 120,
      cost: 96,
      profit: 24,
      discountApplied: false,
      paymentMode: "CASH",
      customer: { name: "Manish Sharma", phone: "9999988888" }
    }
  ]
};

function matchesQuery(item, query) {
  if (!query) return true;
  for (const key in query) {
    const val = query[key];
    if (key === "$or" && Array.isArray(val)) {
      const matched = val.some(subQuery => matchesQuery(item, subQuery));
      if (!matched) return false;
    } else if (key === "customer.phone") {
      if (item.customer?.phone !== val) return false;
    } else if (val instanceof RegExp) {
      if (!val.test(item[key])) return false;
    } else if (typeof val === "object" && val !== null) {
      if (val.$in && Array.isArray(val.$in)) {
        if (!val.$in.includes(item[key])) return false;
      } else if (val.$gte || val.$lte) {
        const itemVal = item[key] instanceof Date ? item[key] : new Date(item[key]);
        if (val.$gte) {
          const gteVal = val.$gte instanceof Date ? val.$gte : new Date(val.$gte);
          if (itemVal < gteVal) return false;
        }
        if (val.$lte) {
          const lteVal = val.$lte instanceof Date ? val.$lte : new Date(val.$lte);
          if (itemVal > lteVal) return false;
        }
      }
    } else {
      if (item[key] !== val) return false;
    }
  }
  return true;
}

class QueryChain {
  constructor(data) {
    this.data = JSON.parse(JSON.stringify(data));
  }
  sort(sortObj) {
    if (sortObj) {
      const key = Object.keys(sortObj)[0];
      const dir = sortObj[key];
      this.data.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        if (valA instanceof Date) valA = valA.getTime();
        if (valB instanceof Date) valB = valB.getTime();
        if (valA < valB) return dir === -1 ? 1 : -1;
        if (valA > valB) return dir === -1 ? -1 : 1;
        return 0;
      });
    }
    return this;
  }
  skip(n) {
    if (typeof n === "number") {
      this.data = this.data.slice(n);
    }
    return this;
  }
  limit(n) {
    if (typeof n === "number") {
      this.data = this.data.slice(0, n);
    }
    return this;
  }
  lean() {
    return this;
  }
  then(onFulfilled, onRejected) {
    return Promise.resolve(this.data).then(onFulfilled, onRejected);
  }
}

class SingleQueryChain {
  constructor(item) {
    this.item = item ? JSON.parse(JSON.stringify(item)) : null;
  }
  lean() {
    return this;
  }
  toObject() {
    return this.item;
  }
  then(onFulfilled, onRejected) {
    return Promise.resolve(this.item).then(onFulfilled, onRejected);
  }
}

class MockDocument {
  constructor(collectionName, data) {
    Object.assign(this, JSON.parse(JSON.stringify(data)));
    this._collectionName = collectionName;
  }
  toObject() {
    const copy = { ...this };
    delete copy._collectionName;
    return copy;
  }
  async save() {
    const list = collections[this._collectionName];
    let idx = -1;
    if (this._collectionName === "Product") {
      idx = list.findIndex(item => item.id === this.id);
    } else if (this._collectionName === "User") {
      idx = list.findIndex(item => item.username === this.username);
    } else if (this._collectionName === "Customer") {
      idx = list.findIndex(item => item.phone === this.phone);
    } else if (this._collectionName === "Bill") {
      idx = list.findIndex(item => item.id === this.id);
    } else if (this._collectionName === "Category") {
      idx = list.findIndex(item => item.name === this.name);
    }

    const plainData = this.toObject();
    if (idx !== -1) {
      list[idx] = plainData;
    } else {
      list.push(plainData);
    }
    return this;
  }
}

function runBillAggregation(pipeline) {
  const billsList = collections.Bill || [];
  const groupStage = pipeline.find(stage => stage.$group);
  if (groupStage) {
    const groupFields = groupStage.$group;
    
    // Query 1: Daily revenue
    if (groupFields._id && typeof groupFields._id === 'object' && groupFields._id.$dateToString) {
      const dailyMap = {};
      billsList.forEach(bill => {
        const d = new Date(bill.date);
        const utc = d.getTime() + d.getTimezoneOffset() * 60000;
        const istDate = new Date(utc + (3600000 * 5.5));
        const dateStr = istDate.toISOString().split('T')[0];
        
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { date: dateStr, revenue: 0, profit: 0, bills: 0 };
        }
        dailyMap[dateStr].revenue += bill.total;
        dailyMap[dateStr].profit += bill.profit;
        dailyMap[dateStr].bills += 1;
      });
      
      const result = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
      return result;
    }
    
    // Query 2: Top products
    if (groupFields._id === "$items.id") {
      const prodMap = {};
      billsList.forEach(bill => {
        bill.items.forEach(item => {
          const id = item.id;
          if (!prodMap[id]) {
            prodMap[id] = { id, name: item.name, revenue: 0, qty: 0 };
          }
          prodMap[id].revenue += item.total || (item.price * item.qty);
          prodMap[id].qty += item.qty;
        });
      });
      const result = Object.values(prodMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      return result;
    }
    
    // Query 3: Category-wise revenue
    if (groupFields._id && groupFields._id.$ifNull && groupFields._id.$ifNull[0] === "$items.category") {
      const catMap = {};
      billsList.forEach(bill => {
        bill.items.forEach(item => {
          const category = item.category || "Other";
          if (!catMap[category]) {
            catMap[category] = { category, revenue: 0 };
          }
          catMap[category].revenue += item.total || (item.price * item.qty);
        });
      });
      return Object.values(catMap);
    }
    
    // Query 4: Overall totals
    if (groupFields._id === null) {
      let revenue = 0;
      let profit = 0;
      let bills = 0;
      billsList.forEach(bill => {
        revenue += bill.total;
        profit += bill.profit;
        bills += 1;
      });
      return [{ revenue, profit, bills }];
    }
  }
  return [];
}

function wrapModel(modelName, originalModel) {
  const proxy = new Proxy(originalModel, {
    construct(target, args) {
      const mongoose = require("mongoose");
      if (mongoose.connection.readyState === 1) {
        return new target(...args);
      } else {
        return new MockDocument(modelName, args[0]);
      }
    },
    get(target, prop) {
      const mongoose = require("mongoose");
      if (mongoose.connection.readyState === 1) {
        const val = target[prop];
        if (typeof val === "function") {
          return val.bind(target);
        }
        return val;
      }
      
      // Offline mode
      if (prop === "find") {
        return (query) => {
          const list = collections[modelName] || [];
          const matched = list.filter(item => matchesQuery(item, query));
          return new QueryChain(matched);
        };
      }
      if (prop === "findOne") {
        return (query) => {
          const list = collections[modelName] || [];
          const matched = list.find(item => matchesQuery(item, query));
          return new SingleQueryChain(matched ? new MockDocument(modelName, matched) : null);
        };
      }
      if (prop === "countDocuments") {
        return (query) => {
          const list = collections[modelName] || [];
          const matched = list.filter(item => matchesQuery(item, query));
          return Promise.resolve(matched.length);
        };
      }
      if (prop === "create") {
        return async (data) => {
          const list = collections[modelName] || [];
          const doc = new MockDocument(modelName, data);
          await doc.save();
          return doc;
        };
      }
      if (prop === "findOneAndUpdate") {
        return async (query, update, options) => {
          const list = collections[modelName] || [];
          const idx = list.findIndex(item => matchesQuery(item, query));
          if (idx === -1) {
            // Some calls create if not found, we handle it if requested
            return null;
          }
          
          let updatedItem = { ...list[idx] };
          if (update.$set) {
            Object.assign(updatedItem, update.$set);
          } else {
            Object.assign(updatedItem, update);
          }
          list[idx] = updatedItem;
          return new MockDocument(modelName, updatedItem);
        };
      }
      if (prop === "findOneAndDelete") {
        return async (query) => {
          const list = collections[modelName] || [];
          const idx = list.findIndex(item => matchesQuery(item, query));
          if (idx === -1) return null;
          const removed = list.splice(idx, 1)[0];
          return new MockDocument(modelName, removed);
        };
      }
      if (prop === "updateOne") {
        return async (query, update) => {
          const list = collections[modelName] || [];
          const idx = list.findIndex(item => matchesQuery(item, query));
          if (idx === -1) return { nModified: 0 };
          
          let updatedItem = { ...list[idx] };
          if (update.$set) {
            Object.assign(updatedItem, update.$set);
          } else {
            Object.assign(updatedItem, update);
          }
          list[idx] = updatedItem;
          return { nModified: 1 };
        };
      }
      if (prop === "deleteMany") {
        return async (query) => {
          if (!query || Object.keys(query).length === 0) {
            collections[modelName] = [];
            return { deletedCount: collections[modelName].length };
          }
          const list = collections[modelName] || [];
          const remaining = list.filter(item => !matchesQuery(item, query));
          const deletedCount = list.length - remaining.length;
          collections[modelName] = remaining;
          return { deletedCount };
        };
      }
      if (prop === "bulkWrite") {
        return async (bulkOps) => {
          const list = collections[modelName] || [];
          let modifiedCount = 0;
          for (const op of bulkOps) {
            if (op.updateOne) {
              const { filter, update } = op.updateOne;
              const idx = list.findIndex(item => matchesQuery(item, filter));
              if (idx !== -1) {
                let updatedItem = { ...list[idx] };
                if (update.$set) {
                  Object.assign(updatedItem, update.$set);
                } else {
                  Object.assign(updatedItem, update);
                }
                list[idx] = updatedItem;
                modifiedCount++;
              }
            }
          }
          return { modifiedCount };
        };
      }
      if (prop === "aggregate") {
        return (pipeline) => {
          if (modelName === "Bill") {
            return Promise.resolve(runBillAggregation(pipeline));
          }
          return Promise.resolve([]);
        };
      }
      
      const val = target[prop];
      if (typeof val === "function") {
        return val.bind(target);
      }
      return val;
    }
  });
  return proxy;
}

module.exports = {
  collections,
  wrapModel
};
