var a = 65;
var b = 92;
function getA(d) {
  return a + 54 + d;
}

function getB(c, f) {
  return a + c + f + 992;
}

function getC() {
  console.log('st4qdsaf');
  return function() {
    return a + b + 2422;;
  }
}

module.exports = {
  getA,
  getB,
  getC,
  a,
  b,
}