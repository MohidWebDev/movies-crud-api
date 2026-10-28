// Escapes characters that have a special meaning in regular expressions,
// so user input is always searched as plain text
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default escapeRegex;
