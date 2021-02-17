// *** Condensation Object ***

// A CondensationObject to read header (referenced hashes) and data.
function CondensationObject(hashesCount, header_, data_) {	// Uint, Uint8Array, Uint8Array, Uint8Array | null, Hash | null
	this.hashesCount = hashesCount;	// Uint
	this.header = header_;	// Uint8Array
	this.data = data_;	// Uint8Array

	// Returns the hash at a specific index in the object's header.
	// Uint --> Hash?
	this.hashAtIndex = function(i) { return i < 0 || i >= hashesCount ? null : cn.hashFromBytes(cn.slice(this.header, 4 + i * 32, 32)); };

	// Returns an array of all hashes referenced in the object's header. If the object does not reference any hashes, an empty array is returned.
	// --> Array[Hash]
	this.hashes = function() {
		var hashes = [];
		for (var i = 0; i < hashesCount; i++)
			hashes.push(cn.hashFromBytes(cn.slice(this.header, 4 + i * 32, 32)));
		return hashes;
	};

	// Calculates the hash of this object.
	this.calculateHash = function() {
		var sha256 = new cn.SHA256();
		sha256.update(this.header);
		sha256.update(this.data);
		return new Hash(sha256.finish());
	};

	// Calculates the hash of this object asynchronously.
	this.calculateHashAsynchronously = function() {
		var done = {};
		done.onDone = cn.ignore;	// Hash -->

		var sha256 = new cn.SHA256();
		sha256.update(this.header);

		var pos = 0;
		var chunkSize = 64000;
		var data = this.data;
		setTimeout(addNextDataChunk, 10);
		return done;

		function addNextDataChunk() {
			// Are we done?
			if (pos > data.byteLength) return done.onDone(new Hash(sha256.finish()));

			// Add the next chunk
			sha256.update(cn.slice(data, pos, Math.min(chunkSize, data.byteLength - pos)));
			pos += chunkSize;
			setTimeout(addNextDataChunk, 10);
		}
	};

	// Returns a copy of the bytes of this object. To avoid copying the bytes, consider using condensationObject.header and condensationObject.data.
	// --> Uint8Array
	this.toBytes = function() {
		return cn.concatenate(this.header, this.data);
	};

	// Returns the size (in bytes) of the object.
	this.byteLength = function() { return this.header.byteLength + this.data.byteLength; }

	this.clone = function() {
		var bytes = cn.concatenate(this.header, this.data);
		return new CondensationObject(this.hashesCount, cn.slice(bytes, 0, this.header.byteLength), cn.slice(bytes, this.header.byteLength, this.data.byteLength));
	};
}

// Creates a condensation object from a Uint8Array.
// (Uint8Array --> CondensationObject?) | (null --> null)
cn.objectFromBytes = function(bytes) {
	if (bytes == null || bytes.buffer == null) return null;
	if (bytes.byteLength < 4) return null;
	var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	var hashesCount = dv.getUint32(0);
	var dataOffset = 4 + hashesCount * 32;
	var dataLength = bytes.byteLength - dataOffset;
	if (dataLength < 0) return null;
	return new CondensationObject(hashesCount, cn.slice(bytes, 0, dataOffset), cn.slice(bytes, dataOffset, dataLength));
};

cn.emptyHeader = new Uint8Array(4);

cn.createObject = function(header, data) {
	if (header.byteLength < 4) return null;
	var dv = new DataView(header.buffer, header.byteOffset, header.byteLength);
	var hashesCount = dv.getUint32(0);
	if (header.byteLength != 4 + hashesCount * 32) return null;
	return new CondensationObject(hashesCount, header, data);
};
