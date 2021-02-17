var crypto = require('crypto');

function fillRandom(typedArray) {
	crypto.randomFillSync(typedArray);
}
