// *** Deserializes a record ***

function RecordReader(object, data) {
	var dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
	var pos = 0;
	var hasError = false;

	// Int --> Boolean
	function use(length) {
		pos += length;
		hasError |= pos > data.byteLength;
		return hasError;
	}

	// --> Uint8
	function readUnsigned8() {
		var start = pos;
		if (use(1)) return 0;
		return dv.getUint8(start);
	}

	// --> Uint32
	function readUnsigned32() {
		var start = pos;
		if (use(4)) return 0;
		return dv.getUint32(start);
	}

	// --> Uint64
	function readUnsigned64() {
		var start = pos;
		if (use(8)) return 0;
		return dv.getUint32(start) * 0x100000000 + dv.getUint32(start + 4);
	}

	// Int --> Uint8Array
	function readBytes(length) {
		if (length == 0) return cn.emptyBytes;
		var start = pos;
		if (use(length)) return null;
		return cn.slice(data, start, length);
	}

	// cn.Record -->
	this.readChildren = function(record) {
		while (true) {
			// Flags
			var flags = readUnsigned8();

			// Data
			var length = flags & 0x1f;
			var byteLength = length == 30 ? 30 + readUnsigned8() : length == 31 ? readUnsigned64() : length;
			var bytes = readBytes(byteLength);
			var hash = (flags & 0x20) != 0 ? object.hashAtIndex(readUnsigned32()) : null;
			//console.log('read record node', flags, byteLength, hash, hasError);
			if (hasError) return false;

			// Children
			var child = record.add(bytes, hash);
			if ((flags & 0x40) != 0 && !this.readChildren(child)) return false;
			if ((flags & 0x80) == 0) return true;
		}
	};
}
