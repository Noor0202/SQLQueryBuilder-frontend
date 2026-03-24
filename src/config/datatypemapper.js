// src/config/datatypemapper.js
/* eslint-disable max-len */
/**
 * Enhanced datatype -> operator-group mapper for Postgres types.
 * - Normalizes raw DB type strings (removes length, handles arrays, synonyms)
 * - Maps the broad set of PostgreSQL types (as provided) to operator groups
 * - Provides OPERATOR_GROUPS (labels + operators + metadata)
 * - Exports helpers:
 *    - getApplicableOperatorGroups(rawType) => array of group keys
 *    - getOperatorsForType(rawType) => flat list of { groupKey, groupName, operator, requiresValue, valueCount? }
 */

export const OPERATOR_GROUPS = {
  NULL: {
    name: "Null Checks",
    operators: ["Is Null", "Is Not Null"],
    requiresValue: false
  },

  BASIC_COMPARISON: {
    name: "Basic Comparison",
    operators: ["Equals", "Does Not Equal"],
    requiresValue: true
  },

  STRING_CASE: {
    name: "Case Insensitive",
    operators: ["Equals Ignore Case", "Does Not Equal Ignore Case"],
    requiresValue: true
  },

  STRING_PATTERN: {
    name: "Pattern Matching",
    operators: [
      "Starts With",
      "Ends With",
      "Contains",
      "Does Not Contain",
      "Matches Regex",
      "Does Not Match Regex"
    ],
    requiresValue: true
  },

  STRING_LENGTH: {
    name: "Length Checks",
    operators: ["Is Empty", "Is Not Empty", "Length Equals", "Length Greater Than", "Length Less Than"],
    requiresValue: false
  },

  NUMERIC_COMPARISON: {
    name: "Numeric Comparison",
    operators: [
      "Is Greater Than",
      "Is Less Than",
      "Is Greater Than Or Equal To",
      "Is Less Than Or Equal To"
    ],
    requiresValue: true
  },

  NUMERIC_RANGE: {
    name: "Range",
    operators: ["Is Between", "Is Not Between"],
    requiresValue: true,
    valueCount: 2
  },

  NUMERIC_LIST: {
    name: "List Membership",
    operators: ["Is In List", "Is Not In List"],
    requiresValue: true,
    valueCount: "multiple"
  },

  NUMERIC_SPECIAL: {
    name: "Special Values",
    operators: [
      "Is Zero",
      "Is Not Zero",
      "Is Positive",
      "Is Negative",
      "Is Even",
      "Is Odd"
    ],
    requiresValue: false
  },

  BOOLEAN_STATE: {
    name: "Boolean State",
    operators: ["Is True", "Is False"],
    requiresValue: false
  },

  DATE_COMPARISON: {
    name: "Date Comparison",
    operators: [
      "Is Before",
      "Is After",
      "Is Before Or Equal To",
      "Is After Or Equal To",
      "Is Between",
      "Is Not Between",
      "On Date"
    ],
    requiresValue: true
  },

  DATE_RELATIVE_SIMPLE: {
    name: "Relative Dates",
    operators: [
      "Is Today",
      "Is Yesterday",
      "Is Tomorrow",
      "Is This Week",
      "Is Last Week",
      "Is Next Week",
      "Is This Month",
      "Is Last Month",
      "Is Next Month",
      "Is This Year",
      "Is Last Year",
      "Is Next Year"
    ],
    requiresValue: false
  },

  DATE_RELATIVE_ADVANCED: {
    name: "Relative Periods",
    operators: [
      "Is Last N Days",
      "Is Next N Days",
      "Is Last N Weeks",
      "Is Next N Weeks",
      "Is Within Days",
      "Is Within Weeks",
      "Is Within Months"
    ],
    requiresValue: true
  },

  TIMESTAMP_RELATIVE: {
    name: "Relative Time",
    operators: [
      "Is Last N Hours",
      "Is Next N Hours",
      "Is Within Hours",
      "Is Within Minutes"
    ],
    requiresValue: true
  },

  ARRAY_OPS: {
    name: "Array Operations",
    operators: [
      "Contains Element",
      "Does Not Contain Element",
      "Array Overlaps",
      "Array Is Contained By",
      "Array Length Equals"
    ],
    requiresValue: true
  },

  JSON_OPS: {
    name: "JSON Operations",
    operators: [
      "Has Key",
      "Contains JSON",
      "Is Contained By JSON",
      "Key Value Equals",
      "JSON Path Matches"
    ],
    requiresValue: true
  },

  NETWORK_OPS: {
    name: "Network Operations",
    operators: [
      "Contains IP",
      "Is Contained By IP",
      "Is Subnet Of",
      "Contains Subnet",
      "Is Host"
    ],
    requiresValue: true
  },

  GEOMETRY_OPS: {
    name: "Spatial Operations",
    operators: [
      "Intersects",
      "Contains",
      "Is Contained By",
      "Touches",
      "Overlaps",
      "Distance Less Than"
    ],
    requiresValue: true
  },

  FULL_TEXT_OPS: {
    name: "Full Text Search",
    operators: ["Matches Search Query"],
    requiresValue: true
  },

  BIT_OPS: {
    name: "Bit Operations",
    operators: ["Bitwise AND", "Bitwise OR", "Has Bit Set", "Length Equals"],
    requiresValue: true
  },

  RANGE_OPS: {
    name: "Range Operations",
    operators: [
      "Range Contains",
      "Range Is Contained By",
      "Range Overlaps",
      "Is Strictly Left Of",
      "Is Strictly Right Of",
      "Is Adjacent To"
    ],
    requiresValue: true
  },

  ENUM_OPS: {
    name: "Enum / Membership",
    operators: ["Equals", "Does Not Equal", "Is In List", "Is Not In List"],
    requiresValue: true,
    valueCount: "multiple"
  },

  SYSTEM_OPS: {
    name: "System / OID",
    operators: ["Equals", "Does Not Equal", "Is In List"],
    requiresValue: true
  }
};

// -------------------------
// Type Definitions Mapping
// -------------------------
/**
 * Each entry lists normalized type names (upper-case, parentheses removed)
 * and the operator group keys that should be exposed for that type.
 *
 * This list aims to cover the large set of Postgres type names you provided.
 */
const TYPE_DEFINITIONS = [
  // Numeric / serial / money
  {
    types: ["SMALLINT", "INTEGER", "INT", "BIGINT", "SMALLSERIAL", "SERIAL", "BIGSERIAL", "DECIMAL", "NUMERIC", "REAL", "DOUBLE PRECISION", "MONEY"],
    groups: ["BASIC_COMPARISON", "NULL", "NUMERIC_COMPARISON", "NUMERIC_RANGE", "NUMERIC_LIST", "NUMERIC_SPECIAL"]
  },

  // Character types
  {
    types: ["CHARACTER VARYING", "CHARACTER", "VARCHAR", "CHAR", "TEXT", "\"CHAR\"", "NAME"],
    groups: ["BASIC_COMPARISON", "NULL", "STRING_CASE", "STRING_PATTERN", "STRING_LENGTH", "NUMERIC_LIST"]
  },

  // Binary
  {
    types: ["BYTEA"],
    groups: ["BASIC_COMPARISON", "NULL", "STRING_LENGTH"]
  },

  // Date / time / interval / legacy
  {
    types: ["DATE"],
    groups: ["BASIC_COMPARISON", "NULL", "DATE_COMPARISON", "DATE_RELATIVE_SIMPLE", "DATE_RELATIVE_ADVANCED"]
  },
  {
    types: ["TIME", "TIME WITHOUT TIME ZONE", "TIME WITH TIME ZONE", "TIMETZ"],
    groups: ["BASIC_COMPARISON", "NULL", "DATE_COMPARISON"]
  },
  {
    types: ["TIMESTAMP", "TIMESTAMP WITHOUT TIME ZONE", "TIMESTAMP WITH TIME ZONE", "TIMESTAMPTZ"],
    groups: ["BASIC_COMPARISON", "NULL", "DATE_COMPARISON", "DATE_RELATIVE_SIMPLE", "DATE_RELATIVE_ADVANCED", "TIMESTAMP_RELATIVE"]
  },
  {
    types: ["INTERVAL", "ABSTIME", "RELTIME", "TINTERVAL"],
    groups: ["BASIC_COMPARISON", "NULL", "NUMERIC_COMPARISON"]
  },

  // Boolean
  {
    types: ["BOOLEAN", "BOOL"],
    groups: ["BOOLEAN_STATE", "NULL"]
  },

  // UUID
  {
    types: ["UUID"],
    groups: ["BASIC_COMPARISON", "NULL", "NUMERIC_LIST"]
  },

  // JSON
  {
    types: ["JSON", "JSONB"],
    groups: ["NULL", "JSON_OPS"]
  },

  // XML
  {
    types: ["XML"],
    groups: ["NULL", "BASIC_COMPARISON"]
  },

  // Bit strings
  {
    types: ["BIT", "BIT VARYING", "VARBIT"],
    groups: ["BASIC_COMPARISON", "NULL", "BIT_OPS"]
  },

  // Geometric
  {
    types: ["POINT", "LINE", "LSEG", "BOX", "PATH", "POLYGON", "CIRCLE"],
    groups: ["BASIC_COMPARISON", "NULL", "GEOMETRY_OPS"]
  },

  // Network
  {
    types: ["CIDR", "INET", "MACADDR", "MACADDR8"],
    groups: ["BASIC_COMPARISON", "NULL", "NETWORK_OPS"]
  },

  // Full text
  {
    types: ["TSVECTOR", "TSQUERY"],
    groups: ["NULL", "FULL_TEXT_OPS"]
  },

  // Range types
  {
    types: ["INT4RANGE", "INT8RANGE", "NUMRANGE", "TSRANGE", "TSTZRANGE", "DATERANGE"],
    groups: ["NULL", "RANGE_OPS", "BASIC_COMPARISON"]
  },

  // Multirange types
  {
    types: ["INT4MULTIRANGE", "INT8MULTIRANGE", "NUMMULTIRANGE", "TSMULTIRANGE", "TSTMULTIRANGE", "DATEMULTIRANGE"],
    groups: ["NULL", "RANGE_OPS", "NUMERIC_LIST"]
  },

  // Array base handled by array detection (fallback uses LIST)
  {
    types: ["INTEGER[]", "TEXT[]", "VARCHAR[]", "UUID[]", "JSONB[]"], // examples; generic arrays handled via strip '[]' logic
    groups: ["NULL", "ARRAY_OPS", "STRING_LENGTH"]
  },

  // Object identifier / system
  {
    types: ["OID", "REGPROC", "REGPROCEDURE", "REGOPER", "REGOPERATOR", "REGCLASS", "REGTYPE", "REGCONFIG", "REGDICTIONARY", "REGNAMESPACE", "REGROLE", "REGCOLLATION"],
    groups: ["BASIC_COMPARISON", "NULL", "NUMERIC_LIST", "SYSTEM_OPS"]
  },

  // Enum, composite, domain, pseudo & others
  {
    types: ["ENUM"],
    groups: ["BASIC_COMPARISON", "NULL", "ENUM_OPS"]
  },
  {
    types: ["COMPOSITE", "RECORD", "DOMAIN"],
    groups: ["BASIC_COMPARISON", "NULL"]
  },
  {
    types: ["ANY", "ANYELEMENT", "ANYARRAY", "ANYNONARRAY", "ANYENUM", "ANYRANGE", "ANYMULTIRANGE", "CSTRING", "INTERNAL", "LANGUAGE_HANDLER", "TRIGGER", "EVENT_TRIGGER", "VOID", "UNKNOWN"],
    groups: ["BASIC_COMPARISON", "NULL"]
  },

  // Transaction / LSN / snapshot types
  {
    types: ["TXID_SNAPSHOT", "PG_LSN", "PG_SNAPSHOT"],
    groups: ["BASIC_COMPARISON", "NULL"]
  },

  // XID / other internal
  {
    types: ["XID", "XID8", "CID", "PG_NODE_TREE", "PG_NDISTINCT", "PG_DEPENDENCIES", "PG_MCV_LIST", "SMGR", "REFCURSOR", "ACLITEM"],
    groups: ["BASIC_COMPARISON", "NULL"]
  }
];

// -------------------------
// Normalization & Utilities
// -------------------------
const TYPE_CACHE = new Map();

/**
 * Normalize raw DB type string into canonical uppercase base type.
 * - Removes array suffix '[]' (but returns an indicator separately)
 * - Removes length/precision '(...)'
 * - Collapses multiple spaces, removes quotes
 * Examples:
 *  - character varying(255)[]  -> CHARACTER VARYING
 *  - timestamp without time zone -> TIMESTAMP WITHOUT TIME ZONE
 */
function normalizeType(rawType) {
  if (!rawType) return "UNKNOWN";

  // Use cache key as provided (raw string)
  if (TYPE_CACHE.has(rawType)) return TYPE_CACHE.get(rawType);

  let working = String(rawType).trim();

  // remove surrounding quotes if any
  if (working.startsWith('"') && working.endsWith('"')) {
    working = working.slice(1, -1);
  }

  // detect and strip array suffixes like [] or typname[]
  working = working.replace(/\s*\[\]$/u, "");

  // remove length/precision "(...)" groups
  working = working.replace(/\(.*\)/u, "");

  // normalize whitespace and uppercase
  working = working.replace(/\s+/g, " ").toUpperCase().trim();

  // cache normalized result
  TYPE_CACHE.set(rawType, working);
  return working;
}

/**
 * Detect if raw type is an array (trailing []).
 */
function isArrayType(rawType) {
  if (!rawType) return false;
  return /\[\]\s*$/.test(String(rawType).trim());
}

/**
 * Returns matching TYPE_DEFINITIONS entry for a normalized type, or null.
 */
function findTypeDef(normalized) {
  return TYPE_DEFINITIONS.find(d => d.types.includes(normalized)) || null;
}

// -------------------------
// Public helpers
// -------------------------

/**
 * Returns the operator group keys applicable for a raw DB type string.
 * Handles arrays (maps array base type to ARRAY_OPS + base groups),
 * strips length/precision, and falls back to safe defaults.
 */
export function getApplicableOperatorGroups(rawType) {
  const normalized = normalizeType(rawType);

  // If the original rawType was an array (e.g., integer[]), prefer array handling
  const isArray = isArrayType(rawType);

  // Try exact match in definitions
  const def = findTypeDef(normalized);

  // If array and we didn't explicitly list example array type, attempt to find base type entry
  if (isArray) {
    const baseNormalized = normalized; // normalizeType already strips []
    const baseDef = findTypeDef(baseNormalized);
    const baseGroups = baseDef ? baseDef.groups.slice() : ["BASIC_COMPARISON", "NULL"];

    // Ensure array ops & string length are included for arrays where applicable
    // Avoid duplicates by using a Set
    const groupSet = new Set(baseGroups);
    groupSet.add("ARRAY_OPS");
    // If base is a text-like, include STRING_LENGTH
    if (baseGroups.includes("STRING_PATTERN") || baseGroups.includes("BASIC_COMPARISON")) {
      groupSet.add("STRING_LENGTH");
    }
    return Array.from(groupSet);
  }

  // Non-array handling
  if (def) {
    return def.groups.slice();
  }

  // Best-effort mapping for known synonyms: e.g., TIMESTAMPTZ -> TIMESTAMP WITH TIME ZONE
  // (normalizeType already converts to canonical uppercase form)
  // Fallback default groups
  return ["BASIC_COMPARISON", "NULL"];
}

/**
 * Returns an array of operator objects for convenience in UI rendering.
 * Each entry: { groupKey, groupName, operator, requiresValue, valueCount? }
 */
export function getOperatorsForType(rawType) {
  const groupKeys = getApplicableOperatorGroups(rawType);
  const result = [];

  groupKeys.forEach((gk) => {
    const group = OPERATOR_GROUPS[gk];
    if (!group) return;
    const operators = Array.isArray(group.operators) ? group.operators : [];
    operators.forEach((op) => {
      result.push({
        groupKey: gk,
        groupName: group.name,
        operator: op,
        requiresValue: !!group.requiresValue,
        valueCount: group.valueCount || (group.requiresValue ? 1 : 0)
      });
    });
  });

  return result;
}

export default {
  OPERATOR_GROUPS,
  getApplicableOperatorGroups,
  getOperatorsForType
};
