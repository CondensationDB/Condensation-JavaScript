// *** Account of a peer ***

function PeerAccount(account) {
	this.account = account;		// final
	this.revision = 0;
	this.type = 0;
}

PeerAccount.prototype.isActive = function() { return this.type == cn.AccountTypes.ACTIVE; };
PeerAccount.prototype.isActiveOrIdle = function() { return this.type == cn.AccountTypes.ACTIVE || this.type == cn.AccountTypes.IDLE; };
PeerAccount.prototype.isEntrusted = function() { return this.type == cn.AccountTypes.ENTRUSTED; };
