// Pegar en el sheet PORTFOLIO PERSONAL: Extensiones > Apps Script.
// Cambiá la CLAVE por una tuya y publicá como aplicación web (ver README).
const CLAVE = 'CAMBIAR-ESTA-CLAVE';
const SHEET_ID = '1y_172i5-JwFvpvQTyalqzUUOf1z5yeNNJX9xbVtDqqw';
const RANGOS = {
  resumen: 'INICIO!B3:M6',
  evolucion: 'INICIO!B31:G45',
  resultados: 'INICIO!B48:H60',
  portfolio: 'PORTFOLIO!B5:BZ40',
  on: 'ON!A1:L250',
  bonos: 'BONOS!A1:N250',
  carry: "'CARRY TRADE'!A30:I45",
  prestamo: 'PRESTAMO!A1:P12',
  cash: 'CASH!A1:P20'
};

function doGet(e) {
  const out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  if (!e || !e.parameter || e.parameter.k !== CLAVE) return out.setContent(JSON.stringify({error: 'clave'}));
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ranges = {};
  Object.keys(RANGOS).forEach(function (id) {
    ranges[id] = {values: recortar(ss.getRange(RANGOS[id]).getDisplayValues())};
  });
  return out.setContent(JSON.stringify({at: new Date().toISOString(), ranges: ranges}));
}

// Saca celdas y filas vacías del final, igual que la API de Sheets.
function recortar(v) {
  const filas = v.map(function (r) { var n = r.length; while (n > 0 && r[n - 1] === '') n--; return r.slice(0, n); });
  var m = filas.length; while (m > 0 && filas[m - 1].length === 0) m--;
  return filas.slice(0, m);
}
