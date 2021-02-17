// *** Multiplication ***

// a + x * y => a
function mul(a, x, y) {
	for (var i = 0; i < y[L]; i++)
		if (y[i] != 0) addN(a, y[i], x, i);
	trim(a);
}

// Returns x * y
function product(x, y) {
	var a = create();
	mul(a, x, y);
	return a;
}

// Returns b + x * y
function sumProduct(b, x, y) {
	var a = duplicate(b);
	mul(a, x, y);
	return a;
}

/*
function testMul() {
	var x = create();
	var y = create();
	setRandom(x, 74);
	setRandom(y, 74);

	var yMinusOne = create();
	var prod1 = create();
	var prod2 = create();
	var tStart = new Date();
	for (var i = 0; i < 10000; i++) {
		decrement(x);
		decrement(y);

		// x * y
		setZero(prod1);
		mul(prod1, x, y);

		// x * (y - 1) + x
		setZero(prod2);
		yMinusOne.set(y, 0);
		decrement(yMinusOne);
		mul(prod2, x, yMinusOne);
		addN(prod2, 1, x, 0);

		if (compare(prod1, prod2) != 0) {
			console.log('x*y', HEX(x) + ' * ' + HEX(y) + ' - ' + HEX(prod1));
			console.log('prod2', HEX(prod2));
			break;
		}
	}
	var tEnd = new Date();
	console.log('Test mul 28 done', (tEnd - tStart) + ' ms');
}
*/

// a + x * x => a
function sqr(a, x) {
	var xk = mostSignificantElement(x);
	expand(a, (xk + 1) * 2);
	if (a[a[L] - 1] != 0) expand(a, a[L] + 1);
	for (var i = 0; i <= xk; i++) {
		if (x[i] == 0) continue;
		var w = i * 2;

		// Convert x[i] in a high and a low part
		var xil = x[i] & 0x3fff;
		var xih = x[i] >>> 14;

		// Diagonal element
		var pl = (xil * xil) | 0;
		var pm = (2 * xih * xil) | 0;
		var ph = (xih * xih) | 0;
		var l = (a[w] + pl + ((pm & 0x3fff) << 14)) | 0;
		a[w] = l & 0xfffffff;
		var c = ((l >>> 28) + (pm >>> 14) + ph) | 0;
		w += 1;

		// All other elements
		var r = i + 1;
		for (; r <= xk; r++, w++) {
			var xr = x[r] << 1;		// 29 bits
			var xrl = xr & 0x3fff;	// 14 bits
			var xrh = xr >>> 14;	// 15 bits
			var pl = (xil * xrl) | 0;
			var pm = (xih * xrl + xil * xrh) | 0;
			var ph = (xih * xrh) | 0;
			var l = (a[w] + c + pl + ((pm & 0x3fff) << 14)) | 0;
			a[w] = l & 0xfffffff;
			c = ((l >>> 28) + (pm >>> 14) + ph) | 0;
		}

		// Propagate carry
		for (; c != 0; w++) {
			c = (c + a[w]) | 0;
			a[w] = c & 0xfffffff;
			c >>>= 28;
		}
	}
}

/*
function testSqr() {
	var x = create();
	var sqr1 = create();
	var sqr2 = create();

	for (var i = 0; i < 10000; i++) {
		setRandom(x, 128);
		//setBytes(x, cn.bytesFromHex('FFFFE000FFFF2000'));
		//setBytes(x, cn.bytesFromHex('10001000'));

		// x * x
		mul(sqr1, x, x);

		// x^2
		sqr(sqr2, x);

		if (compare(sqr1, sqr2) != 0) {
			console.log('x', HEX(x));
			console.log('sqr1', HEX(sqr1));
			console.log('sqr2', HEX(sqr2));
			break;
		}
	}

	console.log('Test sqr done');
}
*/
