// *** Montgomery calculation ***
// In all these function, m must be odd. For RSA, this is always the case, as m = p * q, the product of two large prime numbers p and q.

// Returns mp = -(q ^ -1) mod 0x1000000, where q = m mod 0x1000000.
// x must be odd, and m is therefore odd as well.
// This is a fast version, based on the fact that
//       y = x^-1 mod m ====> y(2 - xy) = x^-1 mod m^2.
// Hence we can work our way up from 2^2 to 2^28
function montInverse(m) {
	var q = m[0];
	var mp = q & 0x3;		// mp = q^-1 mod 2^2 (for odd q, 1 * 1 = 1 % 4, and 3 * 3 = 1 % 4)
	mp = (mp * (2 - (q & 0xf) * mp)) & 0xf;			// mp = q^-1 mod 2^4
	mp = (mp * (2 - (q & 0xff) * mp)) & 0xff;		// mp = q^-1 mod 2^8
	mp = (mp * (2 - ((q * mp) & 0xffff))) & 0xffff;	// mp = q^-1 mod 2^16
	mp = (mp * (2 - ((q * mp) & 0xfffffff))) & 0xfffffff;	// mp = q^-1 mod 2^28
	return mp > 0 ? 0x10000000 - mp : -mp;
}

/*
// An more general way of calculating mp = -(m ^ -1) mod radix
function montInverseGeneral(x) {
	var a = 1;
	var b = 0;
	var n = radix;
	var m = x[0] & 0xfffffff;
	while (true) {
		if (m == 1) return radix - a;
		if (m == 0) return radix - 0;
		b -= a * Math.floor(n / m);
		n %= m;

		if (n == 1) return radix - b;
		if (n == 0) return radix - 0;
		a -= b * Math.floor(m / n);
		m %= n;
	}
}

function testMontInverse() {
	var r = create();
	var v = create();
	for (var i = 0; i < 100000; i++) {
		// Random odd number
		setRandom(r, 10);
		r[0] |= 1;
		var rNegInv = montInverse(r);
		//console.log('r', HEX(r));

		// Verify
		setZero(v);
		addN(v, rNegInv, r, 0);
		if (v[0] != 0xfffffff) console.log('wrong', HEX(r), rNegInv, HEX(v));
	}
	console.log('Test montInverse done');
}
*/

// Montgomery conversion
// xR mod m => a
// ans = 0, and ans.length > x.length + m.length.
function montConversion(a, x, m) {
	// Prepare xR, with R = radix ^ l such that R > m
	var mk = mostSignificantElement(m);
	copy(a, x, mk + 1);

	// a % m => a
	mod(a, m);
}

// Montgomery conversion for x = 1
// R mod m => a
// ans = 0, and ans.length > 1 + m.length.
function montConversionOne(a, m) {
	// Prepare R, with R = radix ^ l such that R > m
	var mk = mostSignificantElement(m);
	setZero(a);
	expand(a, mk + 2);
	a[mk + 1] = 1;

	// a % m => a
	mod(a, m);
}

/*
function testMontConversion() {
	var length = 10;
	var m = create();
	var x = create();
	var r = create();
	for (var i = 0; i < 1; i++) {
		setRandom(m, 8);
		m[0] |= 1;
		setRandom(x, 8);
		mod(x, m);

		var mBI = toBigInt(m);
		var xBI = toBigInt(x);
		var R = create();
		var mk = mostSignificantElement(m);
		R[mk + 1] = 1;
		R[L] = mk + 2;
		var rBI = toBigInt(R);

		setZero(r);
		montConversion(r, x, m);

		multMod_(xBI, rBI, mBI);
		var xArr = fromBigInt(xBI);

		if (compare(r, xArr) != 0) {
			console.log(HEX(x), HEX(m), HEX(r), HEX(xArr));
			break;
		}
	}
	console.log('Test montConversion done');
}
*/

// Montgomery reduction (HAC 14.32)
// x * R mod m => ans
// mp is the precalculated negative inverse of m.
// x must have enough space to hold m.
function montReduction(x, m, mp) {
	//console.log('# reduce ' + HEX(x), HEXINT(mp));
	var xk = mostSignificantElement(x);
	var mk = mostSignificantElement(m);
	var mpl = mp & 0x3fff;
	var mph = mp >>> 14;
	for (var i = 0; i <= mk; i++) {
		// u = (x[0] * mp) & 0xfffffff
		var x0l = x[0] & 0x3fff;
		var x0h = x[0] >>> 14;
		var u = (mpl * x0l + (mph * x0l + mpl * x0h << 14)) & 0xfffffff;
		//console.log('u', HEXINT(mp) + '*' + HEXINT(x[0]) + ' - ' + HEXINT(u), HEXINT(mpl), HEXINT(mph), HEXINT(x0l), HEXINT(x0h));

		// x += u * m
		//var t = HEX(x) + ' + ' + HEXINT(u) + '*' + HEX(m);
		addN(x, u, m, 0);
		//console.log(t + ' - ' + HEX(x));

		// x >>= 28
		for (var n = 0; n < x[L] - 1; n++)
			x[n] = x[n + 1];
		x[L] -= 1;
	}

	if (compare(x, m) >= 0) subD(x, m, 0);
	trim(x);
}

/*
function testMontReduction() {
	var m = create();
	var x = create();
	var r = create();
	for (var i = 0; i < 1; i++) {
		setRandom(m, 74);
		m[0] |= 1;
		setRandom(x, 74);
		mod(x, m);
		//setBytes(m, cn.bytesFromHex(''));
		//setBytes(r, cn.bytesFromHex(''));

		var mp = montInverse(m);
		//setZero(r);
		//montConversion(r, x, m);
		montReduction(r, m, mp);
		//if (compare(x, r) != 0) {
		//	console.log(HEX(x), HEX(m), HEX(r));
		//	break;
		//}
	}
	console.log('Test montReduction done');
}
*/

// Montgomery multiplication (HAC 14.36)
// x * y * R mod m => a
// mp is the precalculated negative inverse of m.
// x < m, y < m.
// This is about 5 - 10 % faster than mul() followed by montReduction().
function montMul(a, x, y, m, mp) {
	setZero(a);
	expand(a, m[L] + 2);
	var mk = mostSignificantElement(m);
	expand(x, mk + 1);
	var mpl = mp & 0x3fff;
	var mph = mp >>> 14;
	for (var i = 0; i <= mk; i++) {
		// a += x[i] * y
		addN(a, x[i], y, 0);

		// u = (a[0] * mp) & 0xfffffff
		var a0l = a[0] & 0x3fff;
		var a0h = a[0] >>> 14;
		var u = (mpl * a0l + (mph * a0l + mpl * a0h << 14)) & 0xfffffff;

		// a += u * m
		addN(a, u, m, 0);

		// a >>= 28
		for (var n = 0; n < a[L] - 1; n++)
			a[n] = a[n + 1];
		a[L] -= 1;
	}

	if (compare(a, m) >= 0) subD(a, m, 0);
	trim(a);
}

/*
function testMontMul() {
	var m = create();
	var x = create();
	var y = create();
	var xR = create();
	var yR = create();
	var aRmulRed = create();
	var aRmontMul = create();
	for (var i = 0; i < 1; i++) {
		setRandom(m, 74);
		m[0] |= 1;
		setRandom(x, 74);
		mod(x, m);
		setRandom(y, 74);
		mod(y, m);
		//setBytes(m, cn.bytesFromHex(''));
		//setBytes(r, cn.bytesFromHex(''));

		var mp = montInverse(m);
		montConversion(xR, x, m);
		montConversion(yR, y, m);

		// mul + reduction
		var tStart = new Date();
		for (var n = 0; n < 1000; n++) {
			setZero(aRmulRed);
			mul(aRmulRed, xR, yR);
			montReduction(aRmulRed, m, mp);
		}
		var tEnd = new Date();
		console.log('mul + red', (tEnd - tStart) + ' ms');

		// montMul
		var tStart = new Date();
		for (var n = 0; n < 1000; n++) {
			montMul(aRmontMul, xR, yR, m, mp);
		}
		var tEnd = new Date();
		console.log('montMul', (tEnd - tStart) + ' ms');

		if (compare(aRmulRed, aRmontMul) != 0) {
			console.log(HEX(x), HEX(m), HEX(aRmulRed), HEX(aRmontMul));
			break;
		}
	}
	console.log('Test montReduction done');
}
*/
