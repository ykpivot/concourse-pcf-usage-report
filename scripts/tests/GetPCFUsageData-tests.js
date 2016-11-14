var chai = require('chai');
var expect = chai.expect
  , should = chai.should();

var GetPCFUsageData = require(__dirname+'/../GetPCFUsageData.js');

describe('GetPCFUsageData Unit tests', function() {

  var getPCFUsageData = new GetPCFUsageData();

  // execError
  it('execError() should return false for a null error object', function() {
    expect(getPCFUsageData.execError("test",null,null)).to.be.false;
  });
  it('execError() should return true for a null error object', function() {
    expect(getPCFUsageData.execError("test",{},null)).to.be.true;
    // .to.not.be.NaN;
  });

  // ADD
  // it('add() should return resulting number', function() {
  //   expect(numberBlackBox.add(1)).to.equal(numberBlackBox.getNumber());
  // });
  //
  // it('add() should return NaN if a NaN value is passed in as argument', function() {
  //   expect(numberBlackBox.add('hello')).to.be.NaN;
  // });
  //
  // // subtract
  // it('subtract() should return resulting number', function() {
  //   expect(numberBlackBox.subtract(1)).to.equal(numberBlackBox.getNumber());
  // });
  //
  // it('subtract() should return NaN if a NaN value is passed in as argument', function() {
  //   expect(numberBlackBox.subtract('hello')).to.be.NaN;
  // });

});
