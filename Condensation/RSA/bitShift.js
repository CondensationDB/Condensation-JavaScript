// *** Bit shift ***

// a <= x << bits
// a may be x (in-place operation), and bits may be 0.
function smallShiftLeft(a, x, bits) {
	var i = 0;
	var c = 0;
	for (; i < x[L]; i++) {
		var value = x[i];
		a[i] = (value << bits) & 0xfffffff | c;
		c = value >>> (28 - bits);
	}
	a[i] = c;
	a[L] = x[L];
	if (c != 0) a[L] += 1;
}

// a <= x >> bits
// a may be x (in-place operation), and bits may be 0.
function smallShiftRight(a, x, bits) {
	a[L] = x[L];
	var i = 0;
	for (; i < x[L] - 1; i++)
		a[i] = (x[i] >>> bits | x[i + 1] << (28 - bits)) & 0xfffffff;
	a[i] = x[i] >>> bits;
}
