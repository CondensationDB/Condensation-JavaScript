// *** Serializes a record ***

function RecordWriter(record) {
	var dataLength = 0;
	var hashesCount = 0;
	prepareChildren(record);
	dataLength += hashesCount * 4;
	var headerLength = 4 + hashesCount * 32;
	var bytes = new Uint8Array(headerLength + dataLength);
	var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	dv.setUint32(0, hashesCount);
	var nextHashIndex = 0;
	var pos = headerLength;
	writeChildren(record);

	function prepareChildren(record) {
		var count = record.children.length;
		for (var i = 0; i < count; i++) {
			var child = record.children[i];
			var byteLength = child.bytes.byteLength;
			dataLength += byteLength < 30 ? 1 : byteLength < 286 ? 2 : 9;
			dataLength += byteLength;
			if (child.hash) hashesCount += 1;
			prepareChildren(child);
		}
	}

	function writeChildren(record) {
		var count = record.children.length;
		for (var i = 0; i < count - 1; i++) writeNode(record.children[i], true);
		if (count > 0) writeNode(record.children[count - 1], false);
	};

	function writeNode(record, hasMoreSiblings) {
		// Flags
		var byteLength = record.bytes.byteLength;
		var flags = byteLength < 30 ? byteLength : byteLength < 286 ? 30 : 31;
		if (record.hash) flags |= 0x20;
		var countChildren = record.children.length;
		if (countChildren > 0) flags |= 0x40;
		if (hasMoreSiblings) flags |= 0x80;
		writeUnsigned8(flags);

		// Data
		if ((flags & 0x1f) == 30) writeUnsigned8(byteLength - 30);
		if ((flags & 0x1f) == 31) writeUnsigned64(byteLength);
		writeBytes(record.bytes);
		if ((flags & 0x20) != 0) writeUnsigned32(addHash(record.hash));

		// Children
		writeChildren(record);
	};

	function writeUnsigned8(value) {
		dv.setUint8(pos, value);
		pos += 1;
	};

	function writeUnsigned32(value) {
		dv.setUint32(pos, value);
		pos += 4;
	};

	function writeUnsigned64(value) {
		dv.setUint32(pos, value / 0x100000000 | 0);
		dv.setUint32(pos + 4, value & 0xffffffff);
		pos += 8;
	};

	function writeBytes(newBytes) {
		bytes.set(newBytes, pos);
		pos += newBytes.byteLength;
	};

	// Hash --> Int
	function addHash(hash) {
		var index = nextHashIndex;
		bytes.set(hash.bytes, 4 + index * 32);
		nextHashIndex += 1;
		return index;
	};

	this.toObject = function() {
		var header = cn.slice(bytes, 0, headerLength);
		var data = cn.slice(bytes, headerLength, dataLength);
		return new CondensationObject(hashesCount, header, data);
	};
}
