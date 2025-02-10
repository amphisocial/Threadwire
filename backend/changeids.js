db.salesorders.find({}).forEach(function(doc) {
	const oldId = doc._id;
	doc._id = ObjectId();
	db.salesorders.deleteOne({ _id: oldId});
	db.salesorders.insertOne(doc);
});
