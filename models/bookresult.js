var BookResult = function BookResult(searchTitle, bibId, author, publisher, callNumber, status) {
	this.searchTitle = searchTitle; 
	this.bibId = bibId;
	this.author = author;
	this.publisher = publisher;
	this.callNumber = callNumber;
	this.bookStatus = status;
}

module.exports = BookResult;