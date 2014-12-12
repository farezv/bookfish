var BookResult = function BookResult(holdingInfoLink, author, publisher, callNumber, status) {
	this.holdingInfoLink = holdingInfoLink;
	this.author = author;
	this.publisher = publisher;
	this.callNumber = callNumber;
	this.bookStatus = status;

	this.print = function() {
		console.log('Name: ' + this.holdingInfoLink);
		console.log('Author: ' + this.author);
		console.log('Publisher: ' + this.publisher);
		console.log('CallNumber: ' + this.callNumber);
		console.log('Status: ' + this.bookStatus);
	}
}

module.exports = BookResult;