// *** Conversion between strings and Uint8Arrays (using UTF-8 encoding) ***

// Returns the number of bytes required to encode a UTF-8 char.
// Uint --> Uint
function utf8CharLength(charCode) {
	return charCode < 0x80 ? 1 : charCode < 0x800 ? 2 : charCode < 0x10000 ? 3 : charCode < 0x200000 ? 4 : charCode < 0x4000000 ? 5 : 6;
}

// Adds a single char to a byte array at position "offset". Returns the new offset after adding the char.
// Uint8Array, Uint, Uint --> Uint
function addUtf8CharToBytes(bytes, offset, charCode) {
	var position = offset;
	if (charCode < 0x80) {
		bytes[position++] = charCode;
	} else if (charCode < 0x800) {
		bytes[position++] = 0xc0 | (charCode >>> 6);
		bytes[position++] = 0x80 | (charCode & 0x3f);
	} else if (charCode < 0x10000) {
		bytes[position++] = 0xe0 | (charCode >>> 12);
		bytes[position++] = 0x80 | ((charCode >>> 6) & 0x3f);
		bytes[position++] = 0x80 | (charCode & 0x3f);
	} else if (charCode < 0x200000) {
		bytes[position++] = 0xf0 | (charCode >>> 18);
		bytes[position++] = 0x80 | ((charCode >>> 12) & 0x3f);
		bytes[position++] = 0x80 | ((charCode >>> 6) & 0x3f);
		bytes[position++] = 0x80 | (charCode & 0x3f);
	} else if (charCode < 0x4000000) {
		// Must never appear in a valid UTF-8 sequence
		bytes[position++] = 0xf8 | (charCode >>> 24);
		bytes[position++] = 0x80 | ((charCode >>> 18) & 0x3f);
		bytes[position++] = 0x80 | ((charCode >>> 12) & 0x3f);
		bytes[position++] = 0x80 | ((charCode >>> 6) & 0x3f);
		bytes[position++] = 0x80 | (charCode & 0x3f);
	} else {
		// Must never appear in a valid UTF-8 sequence
		bytes[position++] = 0xfc | (charCode >>> 30);
		bytes[position++] = 0x80 | ((charCode >>> 24) & 0x3f);
		bytes[position++] = 0x80 | ((charCode >>> 18) & 0x3f);
		bytes[position++] = 0x80 | ((charCode >>> 12) & 0x3f);
		bytes[position++] = 0x80 | ((charCode >>> 6) & 0x3f);
		bytes[position++] = 0x80 | (charCode & 0x3f);
	}
	return position;
}

// Converts a string into a byte array using UTF-8 encoding.
// String --> Uint8Array
cn.bytesFromText = function(text) {
	var length = 0;
	for (var i = 0; i < text.length; i++)
		length += utf8CharLength(text.charCodeAt(i));

	var offset = 0;
	var bytes = new Uint8Array(length);
	for (var i = 0; i < text.length; i++)
		offset = addUtf8CharToBytes(bytes, offset, text.charCodeAt(i));

	return bytes;
};

// Converts a byte array to a string, interpreting the bytes as UTF-8 sequence. Invalid bytes are silently discarded.
// Uint8Array --> String
cn.textFromBytes = function(bytes) {
	var text = '';
	var offset = 0;
	while (offset < bytes.length) {
		var byte = bytes[offset];
		if (byte < 0x80) {
			text += String.fromCharCode(byte);
			offset += 1;
		} else if (byte < 0xc0) {
			// continuation byte, ignore
			offset += 1;
		} else if (byte < 0xe0) {
			if (offset + 2 > bytes.length) break;
			var charCode = (byte & 0x1f) << 6;
			charCode |= bytes[offset + 1] & 0x7f;
			text += String.fromCharCode(charCode);
			offset += 2;
		} else if (byte < 0xf0) {
			if (offset + 3 > bytes.length) break;
			var charCode = (byte & 0xf) << 12;
			charCode |= (bytes[offset + 1] & 0x7f) << 6;
			charCode |= bytes[offset + 2] & 0x7f;
			text += String.fromCharCode(charCode);
			offset += 3;
		} else if (byte < 0xf8) {
			if (offset + 4 > bytes.length) break;
			var charCode = (byte & 0x7) << 18;
			charCode |= (bytes[offset + 1] & 0x7f) << 12;
			charCode |= (bytes[offset + 2] & 0x7f) << 6;
			charCode |= bytes[offset + 3] & 0x7f;
			text += String.fromCharCode(charCode);
			offset += 4;
		} else if (byte < 0xfc) {
			// Must never appear in a valid UTF-8 sequence
			if (offset + 5 > bytes.length) break;
			var charCode = (byte & 0x3) << 24;
			charCode |= (bytes[offset + 1] & 0x7f) << 18;
			charCode |= (bytes[offset + 2] & 0x7f) << 12;
			charCode |= (bytes[offset + 3] & 0x7f) << 6;
			charCode |= bytes[offset + 4] & 0x7f;
			text += String.fromCharCode(charCode);
			offset += 5;
		} else if (byte < 0xfe) {
			// Must never appear in a valid UTF-8 sequence
			if (offset + 6 > bytes.length) break;
			var charCode = (byte & 0x1) << 30;
			charCode |= (bytes[offset + 1] & 0x7f) << 24;
			charCode |= (bytes[offset + 2] & 0x7f) << 18;
			charCode |= (bytes[offset + 3] & 0x7f) << 12;
			charCode |= (bytes[offset + 4] & 0x7f) << 6;
			charCode |= bytes[offset + 5] & 0x7f;
			text += String.fromCharCode(charCode);
			offset += 6;
		} else {
			// Must never appear in a valid UTF-8 sequence
			offset += 1;
		}
	}

	return text;
};
