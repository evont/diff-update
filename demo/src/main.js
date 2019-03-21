var a = 25;
var b = 92;
function getA(d) {
  return a + 54 + d;
}

function getB(c = 12, f = 343) {
  return a + c + f + 32;
}

function getC() {
  console.log('oykiyrfdsaf');
  return function() {
    return a + b + 522;;
  }
}

module.exports = {
  getA,
  getB,
  getC,
  a,
  b,
}