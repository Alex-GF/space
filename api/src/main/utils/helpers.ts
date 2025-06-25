import { addDays, addHours, addMinutes, addMonths, addSeconds, addYears } from 'date-fns';

import type { LeanPeriod } from '../types/models/Pricing.js';

/**
 * Converts all keys in an object to lowercase.
 *
 * @template T - The type of values in the object
 * @param {Record<string, T> | undefined} obj - The object whose keys should be converted to lowercase
 * @returns {Record<string, T>} A new object with all keys converted to lowercase
 * @example
 * // Returns { "name": "John", "age": 30 }
 * convertKeysToLowercase({ "Name": "John", "AGE": 30 });
 *
 * // Returns {}
 * convertKeysToLowercase(undefined);
 */
function convertKeysToLowercase<T>(obj: Record<string, T> | undefined): Record<string, T> {
  if (!obj) return {};

  return Object.entries(obj).reduce(
    (result, [key, value]) => {
      result[key.toLowerCase()] = value;
      return result;
    },
    {} as Record<string, T>
  );
}


/**
 * Adds a specified time period to a given date.
 *
 * @param currentDate - The starting date to which the period will be added
 * @param period - The time period to add, containing a value and unit
 * @param period.value - The numeric value of the period to add
 * @param period.unit - The unit of time ('SEC', 'MIN', 'HOUR', 'DAY', 'MONTH', 'YEAR')
 * @returns A new Date object with the specified period added
 * @throws {Error} Throws an error if an invalid period unit is provided
 *
 * @example
 * const date = new Date('2023-01-01');
 * const period = { value: 5, unit: 'DAY' };
 * const newDate = addPeriodToDate(date, period); // Returns 2023-01-06
 */
function addPeriodToDate(currentDate: Date, period: LeanPeriod): Date {
  
  let result: Date;
  
  switch (period.unit.toLowerCase()) {
    case 'sec':
      result = addSeconds(currentDate, period.value);
      break;
    case 'min':
      result = addMinutes(currentDate, period.value);
      break;
    case 'hour':
      result = addHours(currentDate, period.value);
      break;
    case 'day':
      result = addDays(currentDate, period.value);
      break;
    case 'month':
      result = addMonths(currentDate, period.value);
      break;
    case 'year':
      result = addYears(currentDate, period.value);
      break;
    default:
      throw new Error(`Invalid period unit: ${period.unit}`);
  }

  return result;
}

function escapeVersion(version: string) {
  return version.replace(/\./g, '_');
}

function resetEscapeVersion(version: string) {
  return version.replace(/_/g, '.');
}

export { convertKeysToLowercase, addPeriodToDate, escapeVersion, resetEscapeVersion };
