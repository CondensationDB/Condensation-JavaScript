// *** Addition, subtraction ***

// x + n * y * 2 ^ (28 * d) => x
// Precondition: 0 <= n < 2 ^ 28
function addN(x, n, y, d) {
	var yk = mostSignificantElement(y);

	// Expand x
	var minLength = yk + d + 3;
	if (minLength < x[L] + 1 && x[x[L] - 1] != 0) minLength = x[L] + 1;
	expand(x, minLength);

	// Convert n in a high and a low part
	var nl = n & 0x3fff;
	var nh = n >>> 14;

	// Accumulate
	var c = 0;
	var i = 0;
	for (; i <= yk; i++, d++) {
		var yl = y[i] & 0x3fff;
		var yh = y[i] >>> 14;
		var pl = (nl * yl) | 0;
		var pm = (nh * yl + nl * yh) | 0;
		var ph = (nh * yh) | 0;
		var l = (x[d] + c + pl + ((pm & 0x3fff) << 14)) | 0;
		x[d] = l & 0xfffffff;
		c = ((l >>> 28) + (pm >>> 14) + ph) | 0;
	}

	// Propagate carry
	for (; c != 0; d++) {
		c = (c + x[d]) | 0;
		x[d] = c & 0xfffffff;
		c >>>= 28;
	}
}

// x - 1 => x
// Precondition: x > 0
function decrement(x) {
	var c = -1 | 0;
	var i = 0;
	for (; c != 0; i++) {
		c = (c + x[i]) | 0;
		x[i] = c & 0xfffffff;
		c >>= 28;
	}
}

// Returns x - 1
// Precondition: x > 0
function decremented(x) {
	var a = duplicate(x);
	decrement(a);
	return a;
}

// x - y * 2 ^ (28 * d) => x
// Precondition: x > y
function subD(x, y, d) {
	var c = 0;
	var i = 0;
	for (; i < y[L]; i++, d++) {
		c = (c + x[d] - y[i]) | 0;
		x[d] = c & 0xfffffff;
		c >>= 28;
	}
	for (; c != 0; d++) {
		c = (c + x[d]) | 0;
		x[d] = c & 0xfffffff;
		c >>= 28;
	}
}

// Returns x - y
// Precondition: x > y
function difference(x, y) {
	var a = duplicate(x);
	subD(a, y, 0);
	return a;
}

/*
function testSub() {
	var x = create();
	var y = create();
	setRandom(x, 74);
	setRandom(y, 73);

	var tBegin = new Date();
	for (var i = 0; i < 1000000; i++) {
		subD(x, y, 0);
	}
	var tEnd = new Date();
	console.log('sub', tEnd - tBegin);
}
*/

// x + n * y * 2 ^ (28 * d) => x
// Precondition: 0 <= n < 2 ^ 28, x > n * y * 2 ^ (28 * d)
function subN(x, n, y, d) {
	// Since x - n * y = x - (r - (r - n)) * y = x + (r - n) * y - r * y, we can carry out this subtraction using one addN followed by a simple subtraction.
	// We use r = 2 ^ 28 = 0x10000000
	var nNeg = 0x10000000 - n;
	addN(x, nNeg, y, d);
	subD(x, y, d + 1);
}

/*
function testAddSub() {
	var x = create();
	var y = create();
	var ans = create();

	setRandom(x, 5);
	setRandom(y, 3);
	x = fromBytes(cn.bytesFromHex('000100000000'));
	//setBytes(y, cn.bytesFromHex('000000000001'));
	var n = Math.floor(Math.random() * 0x10000000);

	// x + n * y
	ans.set(x, 0);
	addN(ans, n, y, 0);
	console.log('x+ny ' + HEX(x) + ' + ' + HEXINT(n) + ' * ' + HEX(y) + ' - ' + HEX(ans));

	// x - n * y
	ans.set(x, 0);
	subN(ans, n, y, 0);
	console.log('x-ny ' + HEX(x) + ' - ' + HEXINT(n) + ' * ' + HEX(y) + ' - ' + HEX(ans));

	// x - x
	ans.set(x, 0);
	subD(ans, x, 0);
	console.log('x-x ' + HEX(x) + ' - ' + HEX(x) + ' - ' + HEX(ans));

	// x - y
	ans.set(x, 0);
	if (compare(x, y) > 0) subD(ans, y, 0);
	console.log('x-y ' + HEX(x) + ' - ' + HEX(y) + ' - ' + HEX(ans));

	// x - 1
	ans.set(x, 0);
	decrement(ans);
	console.log('x-1 ' + HEX(x) + ' - 1 - ' + HEX(ans));
}
*/
