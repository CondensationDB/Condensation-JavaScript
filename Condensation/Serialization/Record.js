// *** Record ***

// Reads a record from a condensation object.
// CondensationObject --> Record? | null --> null
cn.recordFromObject = function(object) {
	if (object == null) return null;
	var root = new cn.Record();
	return root.addFromObject(object) ? root : null;
};

// Record?, Record? --> Boolean
cn.equalRecords = function(a, b) {
	if (a == null && b == null) return true;
	if (a == null || b == null) return false;
	if (! cn.equalBytes(a.bytes, b.bytes)) return false;
	if (! cn.equalHashes(a.hash, b.hash)) return false;
	if (a.children.length != b.children.length) return false;
	for (var i = 0; i < a.children.length; i++)
		if (! cn.equalRecords(a.children[i], b.children[i])) return false;
	return true;
};

// Uint8Array, Hash --> Record
cn.Record = function(bytes, hash) {
	// Basic properties
	this.bytes = bytes || cn.emptyBytes;
	this.hash = hash;
	this.children = [];
}

// *** Add values

// Adds a record
// Uint8Array, Hash? --> cn.Record
cn.Record.prototype.add = function(bytes, hash) {
	var record = new cn.Record(bytes, hash);
	this.children.push(record);
	return record;
};

cn.Record.prototype.addText = function(value, hash) { return this.add(cn.bytesFromText(value), hash); }
cn.Record.prototype.addBoolean = function(value, hash) { return this.add(cn.bytesFromBoolean(value), hash); };
cn.Record.prototype.addInteger = function(value, hash) { return this.add(cn.bytesFromInteger(value), hash); };
cn.Record.prototype.addUnsigned = function(value, hash) { return this.add(cn.bytesFromUnsigned(value), hash); };
cn.Record.prototype.addFloat = function(value, hash) { return this.add(cn.bytesFromFloat(value), hash); };
cn.Record.prototype.addHash = function(hash) { return this.add(cn.emptyBytes, hash); };
cn.Record.prototype.addReference = function(reference) { return this.add(reference.key, reference.hash); };
cn.Record.prototype.addRecord = function(record) { this.children.push(record); };
cn.Record.prototype.addRecords = function(records) { for (var i = 0; i < records.length; i++) this.children.push(records[i]); }

// CondensationObject --> Boolean
cn.Record.prototype.addFromObject = function(object) {
	if (object.data.byteLength == 0) return true;
	return new RecordReader(object, object.data).readChildren(this);
};

// *** Set value

// Uint8Array, Hash? -->
cn.Record.prototype.set = function(bytes, hash) {
	this.bytes = bytes;
	this.hash = hash;
};

cn.Record.prototype.setText = function(value, hash) { this.set(cn.bytesFromText(value), hash); }
cn.Record.prototype.setBoolean = function(value, hash) { this.set(cn.bytesFromBoolean(value), hash); };
cn.Record.prototype.setInteger = function(value, hash) { this.set(cn.bytesFromInteger(value), hash); };
cn.Record.prototype.setUnsigned = function(value, hash) { this.set(cn.bytesFromUnsigned(value), hash); };
cn.Record.prototype.setFloat = function(value, hash) { this.set(cn.bytesFromFloat(value), hash); };
cn.Record.prototype.setHash = function(hash) { this.set(cn.emptyBytes, hash); };
cn.Record.prototype.setReference = function(reference) { this.set(reference.key, reference.hash); };

// *** Querying

// Returns true if the record contains a child with the indicated bytes.
// Uint8Array --> Boolean
cn.Record.prototype.contains = function(bytes) {
	for (var i = 0; i < this.children.length; i++)
		if (cn.equalBytes(this.children[i].bytes, bytes)) return true;
	return false;
};

// Returns true if the record contains a child with the indicated text.
// String --> Boolean
cn.Record.prototype.containsText = function(text) {
	return this.contains(cn.bytesFromText(text));
};

// Returns the child record for the given bytes. If no such record exist, an empty record is returned (but not added).
// Uint8Array --> Record
cn.Record.prototype.child = function(bytes) {
	for (var i = 0; i < this.children.length; i++) {
		var child = this.children[i];
		if (cn.equalBytes(child.bytes, bytes)) return child;
	}
	return new cn.Record(bytes);
};

// Returns the child record for the given text. If no such record exist, an empty record is returned (but not added).
// String --> Record
cn.Record.prototype.childWithText = function(text) {
	return this.child(cn.bytesFromText(text));
}

// Returns the first child, or an empty record.
// --> Record
cn.Record.prototype.firstChild = function() {
	return this.children[0] || new cn.Record();
};

// Returns the nth child, or an empty record.
// --> Record
cn.Record.prototype.nthChild = function(index) {
	return this.children[index] || new cn.Record();
};

// *** Get value

cn.Record.prototype.asText = function() { return cn.textFromBytes(this.bytes) || ''; };		// --> String
cn.Record.prototype.asBoolean = function() { return cn.booleanFromBytes(this.bytes); };		// --> Boolean
cn.Record.prototype.asInteger = function() { return cn.integerFromBytes(this.bytes); };		// --> Int
cn.Record.prototype.asUnsigned = function() { return cn.unsignedFromBytes(this.bytes); };	// --> Uint
cn.Record.prototype.asFloat = function() { return cn.floatFromBytes(this.bytes) || 0; };	// --> Float

cn.Record.prototype.asReference = function() {	// --> Reference?
	if (! this.hash) return;
	if (this.bytes.length != 32) return;
	return new cn.Reference(this.hash, this.bytes);
};

cn.Record.prototype.bytesValue = function() { return this.firstChild().bytes; };				// --> Uint8Array
cn.Record.prototype.hashValue = function() { return this.firstChild().hash; };					// --> Hash
cn.Record.prototype.textValue = function() { return this.firstChild().asText(); };				// --> String
cn.Record.prototype.booleanValue = function() { return this.firstChild().asBoolean(); };		// --> Boolean
cn.Record.prototype.integerValue = function() { return this.firstChild().asInteger(); };		// --> Int
cn.Record.prototype.unsignedValue = function() { return this.firstChild().asUnsigned(); };		// --> Uint
cn.Record.prototype.floatValue = function() { return this.firstChild().asFloat(); };			// --> Float
cn.Record.prototype.referenceValue = function() { return this.firstChild().asReference(); };	// --> Reference?

// *** Data serialization

// Serializes this record into an object.
// --> CondensationObject
cn.Record.prototype.toObject = function() {
	return new RecordWriter(this).toObject();
};

// Serializes this record into an encrypted object.
// key --> CondensationObject
cn.Record.prototype.toEncryptedObject = function(aesKey) {
	var object = new RecordWriter(this).toObject();
	aes.crypt(object.data, aesKey);
	return object;
};

// Serializes this record into an encrypted object.
// --> Done
cn.Record.prototype.createEncryptedObject = function() {
	var done = {};
	done.onDone = cn.ignore;	// Reference, Object -->

	var object = new RecordWriter(this).toObject();
	var aesKey = cn.randomBytes(32);
	var crypt = aes.cryptAsynchronously(object.data, aesKey);

	crypt.onDone = function() {
		var calculateHash = object.calculateHashAsynchronously();

		calculateHash.onDone = function(hash) {
			done.onDone(new cn.Reference(hash, aesKey), object);
		};
	};

	return done;
}
