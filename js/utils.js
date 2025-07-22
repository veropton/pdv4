// Converte um ficheiro para uma string Base64.
export const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

// Normaliza uma string: remove acentos e converte para minúsculas.
export const normalizarString = (str) => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// "Higieniza" uma string, convertendo caracteres HTML para as suas entidades.
// Isto previne a injeção de HTML (Cross-Site Scripting - XSS).
export const sanitizar = (texto) => {
  if (!texto) return '';
  const element = document.createElement('div');
  element.innerText = texto;
  return element.innerHTML;
};

// Ajusta o brilho de uma cor em formato hexadecimal.
export const ajustarBrilhoCor = (hex, percent) => {
  hex = hex.replace(/^\s*#|\s*$/g, '');
  if(hex.length === 3){
      hex = hex.replace(/(.)/g, '$1$1');
  }
  let r = parseInt(hex.substr(0, 2), 16),
      g = parseInt(hex.substr(2, 2), 16),
      b = parseInt(hex.substr(4, 2), 16);

  const amount = Math.floor(255 * (percent / 100));
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  
  return "#" + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
};