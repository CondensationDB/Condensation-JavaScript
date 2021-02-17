// *** Conversion between numbers and Uint8Arrays, and general byte functions ***

// A static zero-length byte array. This is useful as default value for functions that return byte arrays.
cn.emptyBytes = new Uint8Array(0);	// Uint8Array [length = 0]

// Takes a byte array, and interprets its content as boolean value. Returns true if the byte sequence has a non-zero length.
// Uint8Array --> Boolean
cn.booleanFromBytes = function(bytes) {
	return bytes.byteLength > 0;
}

// Takes a boolean and coverts it into a byte array of length 0 or 1.
// Boolean --> Uint8Array [length <= 1]
cn.bytesFromBoolean = function(value) {
	return value ? new Uint8Array([121]) : cn.emptyBytes;
};

// Interprets the content of a byte array as signed big-endian integer, and returns it as JavaScript number with 52 significant bits.
// Uint8Array --> Number [integer]
cn.integerFromBytes = function(bytes) {
	if (bytes.byteLength < 1) return 0;
	var value = bytes[0];
	if (value & 0x80) value -= 0x100;
	for (var i = 1; i < bytes.byteLength; i++)
		value = value * 256 + bytes[i];
	return value;
};

// Converts a signed integer into a byte array.
// Number --> Uint8Array
cn.bytesFromInteger = function(value) {
	value = Math.floor(value);
	if (value == 0) return cn.emptyBytes;
	if (value >= -0x80 && value < 0x80) return new Uint8Array([value & 0xff]);
	if (value >= -0x8000 && value < 0x8000) return new Uint8Array([(value >> 8) & 0xff, value & 0xff]);
	if (value >= -0x800000 && value < 0x800000) return new Uint8Array([(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
	if (value >= -0x80000000 && value < 0x80000000) return new Uint8Array([(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);

	var length = 5;
	for (var remaining = value / 0x100000000; remaining >= 128 || remaining < -128; remaining /= 256) length += 1;
	var bytes = new Uint8Array(length);
	while (length) {
		length -= 1;
		bytes[length] = Math.floor(value) & 0xff;
		value /= 256;
	}
	return bytes;
};

// Interprets the content of a byte array as unsigned big-endian integer, and returns it as JavaScript number with 52 significant bits.
// Uint8Array --> Number [integer, value >= 0]
cn.unsignedFromBytes = function(bytes) {
	var value = 0;
	for (var i = 0; i < bytes.byteLength; i++)
		value = value * 256 + bytes[i];
	return value;
};

// Converts an unsigned integer into a byte array.
// Number --> Uint8Array
cn.bytesFromUnsigned = function(value) {
	if (value < 1) return cn.emptyBytes;
	if (value < 0x100) return new Uint8Array([value]);
	if (value < 0x10000) return new Uint8Array([value >>> 8, value & 0xff]);
	if (value < 0x1000000) return new Uint8Array([value >>> 16, (value >>> 8) & 0xff, value & 0xff]);
	if (value < 0x100000000) return new Uint8Array([value >>> 24, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);

	var length = 5;
	for (var remaining = value / 0x100000000; remaining >= 256; remaining /= 256) length += 1;
	var bytes = new Uint8Array(length);
	while (length) {
		length -= 1;
		bytes[length] = value & 0xff;
		value /= 256;
	}
	return bytes;
};

// Takes a byte array of length 0, 4 or 8, and interprets its content as floating-point number.
// Uint8Array --> Float?
cn.floatFromBytes = function(bytes) {
	if (bytes.byteLength == 0) return 0;
	var dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (dataView.byteLength == 4) return dataView.getFloat32(0);
	if (dataView.byteLength == 8) return dataView.getFloat64(0);
	return null;
};

// Takes an floating-point number and converts it into a byte array of length 8.
// Float --> Uint8Array [length = 8]
cn.bytesFromFloat = function(value) {
	var dv = new DataView(new ArrayBuffer(8));
	dv.setFloat64(0, value);
	return new Uint8Array(dv.buffer);
};

// Checks if two byte sequences are equal.
// Uint8Array, Uint8Array --> Boolean
cn.equalBytes = function(a, b) {
	if (a.length != b.length) return false;
	for (var i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
	return true;
};

// Compares two byte sequences.
// Uint8Array, Uint8Array --> (-1 | 0 | 1)
cn.compareBytes = function(a, b) {
	var length = Math.min(a.length, b.length);
	for (var i = 0; i < length; i++) {
		if (a[i] < b[i]) return -1;
		if (a[i] > b[i]) return 1;
	}
	if (a.length < b.length) return -1;
	if (a.length > b.length) return 1;
	return 0;
};

// Returns a slice of a byte sequence.
// Uint8Array, Int, Int --> Uint8Array
cn.slice = function(bytes, start, length) {
	return new Uint8Array(bytes.buffer, bytes.byteOffset + start, length);
};

// Concatenates bytes sequences to a single byte sequence.
// Uint8Array*
cn.concatenate = function() {
	// Calculate the length
	var length = 0;
	for (var i = 0; i < arguments.length; i++) length += arguments[i].byteLength;

	// Copy the bytes
	var position = 0;
	var bytes = new Uint8Array(length);
	for (var i = 0; i < arguments.length; i++) {
		bytes.set(arguments[i], position);
		position += arguments[i].byteLength;
	}

	return bytes;
};
