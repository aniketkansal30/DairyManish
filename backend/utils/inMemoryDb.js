const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

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

function getTimeVal(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  return new Date(v).getTime();
}

function matchesQuery(item, query) {
  if (!query) return true;
  for (const key in query) {
    const val = query[key];
    if (key === "$or" && Array.isArray(val)) {
      const matched = val.some(subQuery => matchesQuery(item, subQuery));
      if (!matched) return false;
    } else if (key === "customer.phone") {
      if (item.customer?.phone !== val) return false;
    } else if (key === "customer.name") {
      if (val instanceof RegExp) {
        if (!val.test(item.customer?.name || "")) return false;
      } else if (item.customer?.name !== val) {
        return false;
      }
    } else if (val instanceof RegExp) {
      if (!val.test(item[key])) return false;
    } else if (typeof val === "object" && val !== null) {
      if (val.$in && Array.isArray(val.$in)) {
        if (!val.$in.includes(item[key])) return false;
      } else if (val.$gte !== undefined || val.$lte !== undefined) {
        const itemTime = getTimeVal(item[key]);
        if (val.$gte !== undefined) {
          const gteTime = getTimeVal(val.$gte);
          if (itemTime < gteTime) return false;
        }
        if (val.$lte !== undefined) {
          const lteTime = getTimeVal(val.$lte);
          if (itemTime > lteTime) return false;
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
    this.data = data ? data.slice() : [];
  }
  sort(sortObj) {
    if (sortObj) {
      const key = Object.keys(sortObj)[0];
      const dir = sortObj[key];
      this.data.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        if (valA instanceof Date || (typeof valA === "string" && key === "date")) {
          valA = getTimeVal(valA);
        }
        if (valB instanceof Date || (typeof valB === "string" && key === "date")) {
          valB = getTimeVal(valB);
        }
        if (valA < valB) return dir === -1 ? 1 : -1;
        if (valA > valB) return dir === -1 ? -1 : 1;
        return 0;
      });
    }
    return this;
  }
  skip(n) {
    if (typeof n === "number" && n > 0) {
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
  select() {
    return this;
  }
  then(onFulfilled, onRejected) {
    return Promise.resolve(this.data).then(onFulfilled, onRejected);
  }
}

class SingleQueryChain {
  constructor(item) {
    this.item = item ? { ...item } : null;
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
    Object.assign(this, data);
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
  let billsList = collections.Bill || [];

  // 1. Process $match stage if present
  const matchStage = pipeline.find(stage => stage.$match);
  if (matchStage && matchStage.$match) {
    billsList = billsList.filter(bill => matchesQuery(bill, matchStage.$match));
  }

  // 2. Process $group stage
  const groupStage = pipeline.find(stage => stage.$group);
  if (groupStage) {
    const groupFields = groupStage.$group;

    // Grouping: Daily revenue
    if (groupFields._id && typeof groupFields._id === "object" && groupFields._id.$dateToString) {
      const dailyMap = {};
      for (let i = 0; i < billsList.length; i++) {
        const bill = billsList[i];
        const d = new Date(bill.date);
        const utc = d.getTime() + d.getTimezoneOffset() * 60000;
        const istDate = new Date(utc + (3600000 * 5.5));
        const dateStr = istDate.toISOString().split("T")[0];

        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { date: dateStr, sales: 0, revenue: 0, profit: 0, count: 0 };
        }
        const tot = Number(bill.total) || 0;
        const prof = Number(bill.profit) || 0;
        dailyMap[dateStr].revenue += tot;
        dailyMap[dateStr].sales += tot;
        dailyMap[dateStr].profit += prof;
        dailyMap[dateStr].count += 1;
      }

      return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    }

    // Grouping: Item-wise (topItems or item-report)
    if (groupFields._id === "$items.name" || groupFields._id === "$items.id") {
      const prodMap = {};
      for (let i = 0; i < billsList.length; i++) {
        const bill = billsList[i];
        if (!bill.items || !bill.items.length) continue;
        for (let j = 0; j < bill.items.length; j++) {
          const item = bill.items[j];
          const key = groupFields._id === "$items.name" ? item.name : item.id;
          if (!key) continue;
          if (!prodMap[key]) {
            prodMap[key] = {
              name: item.name || key,
              category: item.category || "Other",
              unit: item.unit || "piece",
              revenue: 0,
              qty: 0,
            };
          }
          const itemTot = Number(item.total) || (Number(item.price || 0) * Number(item.qty || 0));
          prodMap[key].revenue += itemTot;
          prodMap[key].qty += Number(item.qty || 0);
        }
      }

      let result = Object.values(prodMap);

      // Sort if $sort specified
      const sortStage = pipeline.find(stage => stage.$sort);
      if (sortStage && sortStage.$sort) {
        const sortKey = Object.keys(sortStage.$sort)[0];
        const dir = sortStage.$sort[sortKey];
        result.sort((a, b) => (dir === -1 ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]));
      } else {
        result.sort((a, b) => b.revenue - a.revenue);
      }

      // Limit if $limit specified
      const limitStage = pipeline.find(stage => stage.$limit);
      if (limitStage && typeof limitStage.$limit === "number") {
        result = result.slice(0, limitStage.$limit);
      }

      return result;
    }

    // Grouping: Category-wise
    if (groupFields._id && groupFields._id.$ifNull && groupFields._id.$ifNull[0] === "$items.category") {
      const catMap = {};
      for (let i = 0; i < billsList.length; i++) {
        const bill = billsList[i];
        if (!bill.items) continue;
        for (let j = 0; j < bill.items.length; j++) {
          const item = bill.items[j];
          const category = item.category || "Other";
          if (!catMap[category]) catMap[category] = { category, revenue: 0 };
          catMap[category].revenue += Number(item.total) || (Number(item.price || 0) * Number(item.qty || 0));
        }
      }
      return Object.values(catMap);
    }

    // Grouping: Overall totals (_id: null)
    if (groupFields._id === null) {
      let revenue = 0;
      let profit = 0;
      let bills = 0;
      for (let i = 0; i < billsList.length; i++) {
        const bill = billsList[i];
        revenue += Number(bill.total) || 0;
        profit += Number(bill.profit) || 0;
        bills += 1;
      }
      return [{ revenue, profit, bills }];
    }
  }

  // Handle Customers aggregation pipeline
  const firstAddFields = pipeline.find(stage => stage.$addFields && stage.$addFields.cPhone);
  if (firstAddFields) {
    const custMap = {};
    for (let i = 0; i < billsList.length; i++) {
      const bill = billsList[i];
      const phone = (bill.customer?.phone || "").trim();
      const name = (bill.customer?.name || "").trim();
      if (!phone && !name) continue;
      const key = phone ? `phone:${phone}` : `name:${name.toLowerCase()}`;
      if (!custMap[key]) {
        custMap[key] = {
          key,
          phone,
          name,
          bills: [],
          last: bill.date,
        };
      }
      custMap[key].bills.push(bill.id);
      if (getTimeVal(bill.date) > getTimeVal(custMap[key].last)) {
        custMap[key].last = bill.date;
      }
    }
    let list = Object.values(custMap);
    list.sort((a, b) => getTimeVal(b.last) - getTimeVal(a.last));
    return list.slice(0, 500);
  }

  return [];
}

function wrapModel(modelName, originalModel) {
  const proxy = new Proxy(originalModel, {
    construct(target, args) {
      if (mongoose.connection.readyState === 1) {
        return new target(...args);
      } else {
        return new MockDocument(modelName, args[0]);
      }
    },
    get(target, prop) {
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
          const matched = query ? list.filter(item => matchesQuery(item, query)) : list;
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
          const count = query ? list.filter(item => matchesQuery(item, query)).length : list.length;
          return Promise.resolve(count);
        };
      }
      if (prop === "create") {
        return async (data) => {
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
            const count = collections[modelName].length;
            collections[modelName] = [];
            return { deletedCount: count };
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
