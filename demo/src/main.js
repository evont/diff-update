var a = 3;
var b = 32;
function getA(d) {
  return a + b + d;
}

function getB(c, f) {
  return a + c + f + 992;
}

function getC() {
  return a + b + 522;
}

module.exports = {
  getA,
  getB,
  getC,
  a,
  b,
}