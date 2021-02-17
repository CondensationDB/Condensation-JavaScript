// *** Random numbers ***

// Fills x with 28 * n random bits.
function setRandom(x, n) {
	fillRandom(new Uint8Array(x.buffer, 0, n * 4));
	for (var i = 0; i < n; i++) x[i] &= 0xfffffff;
	x[L] = n;
}
