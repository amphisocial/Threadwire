const { MongoClient } = require("mongodb");

async function generateAndInsertDocuments() {
  const uri = "mongodb://localhost:27017"; // Replace with your MongoDB connection string
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("threadwire"); // Replace with your database name
    const collection = database.collection("salesorders"); // Replace with your collection name

    // Sample document template
    const baseDocument = {
      linenumber: 1,
      partnumber: "DWP001",
      quantity: 5,
      customer_number: "C002",
      amount: 52.5,
      customer_name: "Global Inc",
      shipping_status: "Pending",
      order_status: "Open",
      order_date: "12-11-2024", // Keeping it in MM-DD-YYYY for consistency
      due_date: "12-11-2024", // MM-DD-YYYY
    };

    // Helper function to format the date as MM-DD-YYYY
    function formatDate(date) {
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();
      return `${month}-${day}-${year}`;
    }

    // Generate 25 documents with varying shipping_date and incrementing ordernumber
    const documents = [];
    let shippingDate = new Date("2024-12-18T00:00:00.000Z");

    for (let i = 25; i < 30; i++) {
      const document = { ...baseDocument };
      document._id = `generated_id_${i + 1}`;
      document.ordernumber = `SO${1001 + i}`; // Increment ordernumber by 1
      document.shipping_date = formatDate(shippingDate); // Format date as MM-DD-YYYY
      documents.push(document);

      // Increment shipping_date by 1 day
      shippingDate.setDate(shippingDate.getDate() + 1);
      if (shippingDate > new Date("2024-12-31T00:00:00.000Z")) {
        shippingDate = new Date("2024-12-15T00:00:00.000Z"); // Loop back within range
      }
    }

    // Insert documents into MongoDB
    const result = await collection.insertMany(documents);
    console.log(`${result.insertedCount} documents successfully inserted!`);
  } finally {
    await client.close();
  }
}

generateAndInsertDocuments().catch(console.error);

