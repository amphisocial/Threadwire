const { MongoClient } = require("mongodb");

async function generateAndInsertDocuments() {
  const uri = "mongodb://localhost:27017"; // Replace with your MongoDB connection string
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("threadwire"); // Replace with your database name
    const collection = database.collection("salesorders"); // Replace with your collection name
    collection.find({}).forEach(function(doc) {
	const oldId = doc._id;
	doc._id = ObjectId();
	collection.deleteOne({ _id: oldId});
	const result = collection.insertOne(doc);
	});

  } finally {
    await client.close();
  }
}

generateAndInsertDocuments().catch(console.error);
