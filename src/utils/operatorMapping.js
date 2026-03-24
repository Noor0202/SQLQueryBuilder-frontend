// frontend/src/utils/operatorMapping.js

/**
 * Maps UI Operator names to PostgreSQL syntax templates.
 * * formatting:
 * - {field}: The column name
 * - {value}: The user input value (already quoted/sanitized)
 * - {raw_value}: The user input value (raw, for numbers/logic)
 */
export const SQL_TEMPLATES = {
    // --- NULL CHECKS ---
    'Is Null': '{field} IS NULL',
    'Is Not Null': '{field} IS NOT NULL',
  
    // --- BASIC COMPARISON ---
    'Equals': '{field} = {value}',
    'Does Not Equal': '{field} != {value}',
  
    // --- STRING CASE ---
    'Equals Ignore Case': 'LOWER({field}) = LOWER({value})',
    'Does Not Equal Ignore Case': 'LOWER({field}) != LOWER({value})',
  
    // --- STRING PATTERN ---
    'Starts With': '{field} ILIKE {value} || \'%\'',
    'Ends With': '{field} ILIKE \'%\' || {value}',
    'Contains': '{field} ILIKE \'%\' || {value} || \'%\'',
    'Does Not Contain': '{field} NOT ILIKE \'%\' || {value} || \'%\'',
    'Matches Regex': '{field} ~ {value}',
    'Does Not Match Regex': '{field} !~ {value}',
  
    // --- STRING LENGTH ---
    'Is Empty': '{field} = \'\'',
    'Is Not Empty': '{field} != \'\'',
    'Length Equals': 'LENGTH({field}) = {raw_value}',
    'Length Greater Than': 'LENGTH({field}) > {raw_value}',
    'Length Less Than': 'LENGTH({field}) < {raw_value}',
  
    // --- NUMERIC COMPARISON ---
    'Is Greater Than': '{field} > {raw_value}',
    'Is Less Than': '{field} < {raw_value}',
    'Is Greater Than Or Equal To': '{field} >= {raw_value}',
    'Is Less Than Or Equal To': '{field} <= {raw_value}',
  
    // --- NUMERIC RANGE/LIST ---
    // Note: Range values usually come as "10,20" string or array. handled in generator.
    'Is Between': '{field} BETWEEN {min} AND {max}', 
    'Is Not Between': '{field} NOT BETWEEN {min} AND {max}',
    'Is In List': '{field} IN ({list})',
    'Is Not In List': '{field} NOT IN ({list})',
  
    // --- NUMERIC SPECIAL ---
    'Is Zero': '{field} = 0',
    'Is Not Zero': '{field} != 0',
    'Is Positive': '{field} > 0',
    'Is Negative': '{field} < 0',
    'Is Even': '({field} % 2) = 0',
    'Is Odd': '({field} % 2) != 0',
  
    // --- BOOLEAN ---
    'Is True': '{field} IS TRUE',
    'Is False': '{field} IS FALSE',
  
    // --- DATE COMPARISON ---
    'Is Before': '{field} < {value}',
    'Is After': '{field} > {value}',
    'Is Before Or Equal To': '{field} <= {value}',
    'Is After Or Equal To': '{field} >= {value}',
    'On Date': '{field}::DATE = {value}::DATE',
  
    // --- DATE RELATIVE SIMPLE (Dynamic Dates) ---
    'Is Today': '{field}::DATE = CURRENT_DATE',
    'Is Yesterday': '{field}::DATE = CURRENT_DATE - INTERVAL \'1 day\'',
    'Is Tomorrow': '{field}::DATE = CURRENT_DATE + INTERVAL \'1 day\'',
    'Is This Week': 'DATE_TRUNC(\'week\', {field}) = DATE_TRUNC(\'week\', CURRENT_DATE)',
    'Is Last Week': 'DATE_TRUNC(\'week\', {field}) = DATE_TRUNC(\'week\', CURRENT_DATE - INTERVAL \'1 week\')',
    'Is Next Week': 'DATE_TRUNC(\'week\', {field}) = DATE_TRUNC(\'week\', CURRENT_DATE + INTERVAL \'1 week\')',
    'Is This Month': 'DATE_TRUNC(\'month\', {field}) = DATE_TRUNC(\'month\', CURRENT_DATE)',
    'Is Last Month': 'DATE_TRUNC(\'month\', {field}) = DATE_TRUNC(\'month\', CURRENT_DATE - INTERVAL \'1 month\')',
    'Is Next Month': 'DATE_TRUNC(\'month\', {field}) = DATE_TRUNC(\'month\', CURRENT_DATE + INTERVAL \'1 month\')',
    'Is This Year': 'DATE_TRUNC(\'year\', {field}) = DATE_TRUNC(\'year\', CURRENT_DATE)',
    'Is Last Year': 'DATE_TRUNC(\'year\', {field}) = DATE_TRUNC(\'year\', CURRENT_DATE - INTERVAL \'1 year\')',
    'Is Next Year': 'DATE_TRUNC(\'year\', {field}) = DATE_TRUNC(\'year\', CURRENT_DATE + INTERVAL \'1 year\')',
  
    // --- DATE RELATIVE ADVANCED (Parameter driven) ---
    // Assumes {raw_value} is an integer N
    'Is Last N Days': '{field} >= CURRENT_DATE - INTERVAL \'{raw_value} days\'',
    'Is Next N Days': '{field} <= CURRENT_DATE + INTERVAL \'{raw_value} days\'',
    'Is Last N Weeks': '{field} >= CURRENT_DATE - INTERVAL \'{raw_value} weeks\'',
    'Is Next N Weeks': '{field} <= CURRENT_DATE + INTERVAL \'{raw_value} weeks\'',
    'Is Within Days': '{field} BETWEEN CURRENT_DATE - INTERVAL \'{raw_value} days\' AND CURRENT_DATE + INTERVAL \'{raw_value} days\'',
  
    // --- ARRAY OPS (Postgres Specific) ---
    'Contains Element': '{raw_value} = ANY({field})', // OR {field} @> ARRAY[{value}]
    'Does Not Contain Element': '{raw_value} != ALL({field})',
    'Array Overlaps': '{field} && ARRAY[{list}]', // Requires list format
    'Array Is Contained By': '{field} <@ ARRAY[{list}]',
  
    // --- JSON OPS ---
    'Has Key': '{field} ? {value}',
    'Contains JSON': '{field} @> {value}::jsonb',
    'Is Contained By JSON': '{field} <@ {value}::jsonb',
    'Key Value Equals': '{field}->>{key} = {value}', // Requires parsing "Key:Value" logic if complex
  
    // --- NETWORK OPS ---
    'Contains IP': '{field} >>= {value}::inet',
    'Is Contained By IP': '{field} <<= {value}::inet',
    'Is Subnet Of': '{field} << {value}::inet',
    'Contains Subnet': '{field} >> {value}::inet',
  
    // --- FULL TEXT ---
    'Matches Search Query': 'to_tsvector({field}) @@ to_tsquery({value})',
    
    // --- BIT OPS ---
    'Has Bit Set': 'get_bit({field}, {raw_value}) = 1',
  };
  
  /**
   * Helper to determine if an operator needs specific value formatting
   */
  export const needsQuotes = (operator) => {
    const numericOps = [
      'Is Greater Than', 'Is Less Than', 'Is Greater Than Or Equal To', 'Is Less Than Or Equal To',
      'Length Equals', 'Length Greater Than', 'Length Less Than',
      'Is Last N Days', 'Is Next N Days', 'Is Last N Weeks', 'Is Next N Weeks',
      'Has Bit Set'
    ];
    // If it's in the list, it uses {raw_value} which we usually don't quote if it's a number
    return !numericOps.includes(operator);
  };