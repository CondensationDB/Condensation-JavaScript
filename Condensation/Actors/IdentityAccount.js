// *** Account of an identity ***
// An identity account always belongs to the identity it was created for, and shall not be passed to other identities.

// TODO: This is not used any more in like this, since Actors (formerly Identities) do not manage an actor group by default any more. There is, however, an ActorGroupFromSelector in the "ActorWithDataTree" part, which manages an actor group.

// cn.Account --> new
function IdentityAccount(account) {
	this.account = account;
	this.isNative = cn.equalHashes(account.hash, identity.publicKey.hash);
	this.type = cn.AccountTypes.ACTIVE;
}

IdentityAccount.prototype.isActive = function() { return this.type == cn.AccountTypes.ACTIVE; };
IdentityAccount.prototype.isActiveOrIdle = function() { return this.type == cn.AccountTypes.ACTIVE || this.type == cn.AccountTypes.IDLE; };
IdentityAccount.prototype.isEntrusted = function() { return this.type == cn.AccountTypes.ENTRUSTED; };
