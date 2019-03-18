var a = 3;
var b = 22;
function getA(d) {
  return a + b + d;
}

function getB(c, f) {
  return a + c + f + 422;
}

function getC() {
  return a + b + 422;
}

module.exports = {
  getA,
  getB,
  getC,
  a,
  b,
}