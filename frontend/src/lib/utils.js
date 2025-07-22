import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a JSON string and returns the corresponding JavaScript object.
 *
 * @param {string} data - The JSON string to parse.
 * @returns {Object} The parsed JavaScript object.
 * @throws {SyntaxError} If the JSON string is invalid.
 *
 * @example
 * const jsonString = '{"name":"John","age":30}';
 * const obj = jP(jsonString);
 * console.log(obj); // { name: 'John', age: 30 }
 */
export function jP(data) {
  return JSON.parse(data);
}

/**
 * Converts a JavaScript object or value to a JSON string.
 *
 * @param {any} data - The data to be converted to a JSON string.
 * @returns {string} The JSON string representation of the input data.
 *
 * @example
 * const obj = { name: 'John', age: 30 };
 * const jsonString = jS(obj);
 * console.log(jsonString); // '{"name":"John","age":30}'
 */
export function jS(data) {
  return JSON.stringify(data);
}

/**
 * Formats a given number by removing any plus signs, spaces, or hyphens, and also checks if it includes the country code. If not, it adds the country code.
 *
 * @param {string} number - The number to be formatted.
 * @param {number} countryCode - The country code to be added if not present.
 * @returns {string} - The formatted number with plus signs, spaces, and hyphens removed.
 * @example
 * const number = "+1 123-456-7890";
 * const formattedNumber = numberFormat(number, 91);
 * console.log(formattedNumber); // "11234567890"
 */
export function numberFormat(number, countryCode = 91) {
  let num = number.replace(/[+\s-]/g, "");
  if (!num.startsWith(countryCode)) {
    num = `${countryCode}${num}`;
  }
  return num;
}
