// *** Comparison ***

// Returns true if x is even.
function isEven(x) {
	return x[L] == 0 || (x[0] & 1) == 0;
}

// x == 0
function isZero(x) {
	return mostSignificantElement(x) == -1;
}

// x == 1
function isOne(x) {
	return mostSignificantElement(x) == 0 && x[0] == 1;
}

// Compares x and y, and returns 0 if they are equal, -1 if x < y, and +1 if x > y.
function compare(x, y) {
	var xk = mostSignificantElement(x);
	var yk = mostSignificantElement(y);
	if (xk < yk) return -1;
	if (xk > yk) return 1;
	for (var i = xk; i >= 0; i--) {
		if (x[i] < y[i]) return -1;
		if (x[i] > y[i]) return 1;
	}
	return 0;
}

// Compares x / 2 ^ (28 * d) and y, and returns 0 if they are equal, -1 if x < y, and +1 if x > y.
function compareShifted(x, y, d) {
	var xk = mostSignificantElement(x);
	var yk = mostSignificantElement(y);
	if (xk < yk + d) return -1;
	if (xk > yk + d) return 1;
	for (var i = yk; i >= 0; i--) {
		if (x[i + d] < y[i]) return -1;
		if (x[i + d] > y[i]) return 1;
	}
	return 0;
}

