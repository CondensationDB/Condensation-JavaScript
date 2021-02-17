// *** General ***

// The length (number of elements used) is stored in element 151 (74 * 2 + 3).
var L = 151;

// Creates a new big integer holding 0.
function create() {
	return new Uint32Array(152);
}

// Duplicates an existing big integer.
function duplicate(x) {
	var a = create();
	a.set(x, 0);
	return a;
}

// Resets x to zero.
function setZero(x) {
	x[L] = 0;
}

// Sets x to an unsigned 28-bit integer.
function setUint28(x, uint28) {
	x[0] = uint28;
	x[L] = 1;
}

// Trims the length to avoid trailing zeros.
function trim(x) {
	while (x[L] > 0 && x[x[L] - 1] == 0) x[L] -= 1;
}

// Expands the length to a minimum of n elements and adds zeros if necessary.
function expand(x, n) {
	if (n > L) throw new Error('expand: n=' + n + ' too big');
	while (x[L] < n) {
		x[x[L]] = 0;
		x[L] += 1;
	}
}

// Returns the index of the most significant non-zero element.
function mostSignificantElement(x) {
	for (var i = x[L] - 1; i >= 0; i--)
		if (x[i] != 0) return i;
	return 0;
}

// a <= x * 2 ^ (32 * d)
// Preconditions: x[L] < 80 - d
function copy(a, x, d) {
	var i = 0;
	for (; i < d; i++) a[i] = 0;
	for (var k = 0; k < x[L]; k++, i++) a[i] = x[k];
	a[L] = x[L] + d;
}

function smallestNonZeroBit(n) {
	var s = 0;
	if ((n & 0b1111111111111100000000000000) != 0) { s += 14; n >>>= 14; }
	if ((n & 0b11111110000000) != 0) { s += 7; n >>>= 7; }
	if ((n & 0b11110000) != 0) { s += 4; n >>>= 4; }
	if ((n & 0b1100) != 0) { s += 2; n >>>= 2; }
	if ((n & 0b10) != 0) { s += 1; n >>>= 1; }
	if (n != 0) s += 1;
	return s;
}

// Returns the number of significant bits of x.
function bitLength(x) {
	var i = mostSignificantElement(x);
	console.log(x, i);
	return i * 28 + smallestNonZeroBit(x[i]);
}
