var a = 65;
var b = 92;
function getA(d) {
  return a + 54 + d;
}

function getB(c = 5, f = 343) {
  return a + c + f + 52;
}

function getC() {
  console.log('fdsafdsaf');
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