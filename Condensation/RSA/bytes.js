// *** Conversion from and to bytes ***

// Sets a value from a big-endian byte sequence.
// Uint8Array -> Uint32Array
this.fromBytes = function(bytes) {
	var x = create();
	var k = 0;
	var b = 0;
	x[k] = 0;
	for (var i = bytes.byteLength - 1; i >= 0; i--) {
		x[k] |= bytes[i] << b;
		b += 8;
		if (b >= 28) {
			x[k] &= 0xfffffff;
			k += 1;
			b -= 28;
			x[k] = bytes[i] >>> (8 - b);
		}
	}
	x[k] &= 0xfffffff;
	x[L] = k + 1;
	return x;
};

// Converts x to a byte sequence of length n.
// Uint32Array, Number -> Uint8Array
this.toBytes = function(x, n) {
	var bytes = new Uint8Array(n);
	var k = 0;
	var b = 0;
	for (var i = n - 1; i >= 0; i--) {
		bytes[i] = (x[k] >>> b) & 0xff;
		b += 8;
		if (b >= 28) {
			k += 1;
			if (k > x[L]) break;
			b -= 28;
			bytes[i] |= x[k] << (8 - b);
		}
	}
	return bytes;
};
