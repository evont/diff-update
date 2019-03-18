var a = 3;
var b = 12;
function getA(d) {
  return a + b + d;
}

function getB() {
  return a + b + 12;
}

function getC() {
  return a + b + 42;
}

module.exports = {
  getA,
  getB,
  getC,
  a,
  b,
}