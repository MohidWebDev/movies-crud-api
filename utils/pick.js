// Returns a new object with only the listed keys that are present in `source`
const pick = (source = {}, keys) =>
  Object.fromEntries(
    keys
      .filter((key) => source[key] !== undefined)
      .map((key) => [key, source[key]]),
  );

export default pick;
