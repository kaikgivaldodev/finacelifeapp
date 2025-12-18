/**
 * CSV and OFX parsers for credit card statements
 */

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  externalId?: string;
  category?: string;
}

export interface ColumnMapping {
  date: number;
  description: number;
  amount: number;
}

/**
 * Parse a CSV string into rows
 */
export function parseCSVRows(content: string): string[][] {
  const lines = content.trim().split(/\r?\n/);
  return lines.map(line => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';') && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
}

/**
 * Parse amount string to number
 * Handles Brazilian format (1.234,56) and international format (1,234.56)
 */
export function parseAmount(value: string): number {
  // Remove any whitespace
  let cleaned = value.trim();
  
  // Remove currency symbols
  cleaned = cleaned.replace(/[R$€£¥]/g, '').trim();
  
  // Detect format
  const hasCommaAsDecimal = /\d,\d{2}$/.test(cleaned);
  const hasPeriodAsDecimal = /\d\.\d{2}$/.test(cleaned);
  
  if (hasCommaAsDecimal) {
    // Brazilian format: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasPeriodAsDecimal) {
    // International format: 1,234.56
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Try to handle other cases
    cleaned = cleaned.replace(/,/g, '.');
  }
  
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Parse date string to YYYY-MM-DD format
 */
export function parseDate(value: string): string | null {
  const cleaned = value.trim();
  
  // Try different formats
  // DD/MM/YYYY or DD-MM-YYYY
  let match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // YYYY-MM-DD
  match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return cleaned;
  }
  
  // YYYYMMDD (OFX format)
  match = cleaned.match(/^(\d{4})(\d{2})(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month}-${day}`;
  }
  
  // Try native Date parsing
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null;
}

/**
 * Parse CSV content with column mapping
 */
export function parseCSV(
  content: string, 
  mapping: ColumnMapping, 
  skipHeader: boolean = true
): ParsedTransaction[] {
  const rows = parseCSVRows(content);
  const startRow = skipHeader ? 1 : 0;
  const transactions: ParsedTransaction[] = [];
  
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < Math.max(mapping.date, mapping.description, mapping.amount) + 1) {
      continue;
    }
    
    const dateStr = parseDate(row[mapping.date]);
    if (!dateStr) continue;
    
    const amount = parseAmount(row[mapping.amount]);
    if (amount === 0) continue;
    
    const description = row[mapping.description].replace(/^["']|["']$/g, '').trim();
    if (!description) continue;
    
    transactions.push({
      date: dateStr,
      description,
      amount: Math.abs(amount), // Credit card transactions are always positive
    });
  }
  
  return transactions;
}

/**
 * Parse OFX content
 */
export function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Find all STMTTRN blocks
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  
  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const block = match[1];
    
    // Extract fields
    const dtPosted = extractOFXField(block, 'DTPOSTED');
    const trnAmt = extractOFXField(block, 'TRNAMT');
    const name = extractOFXField(block, 'NAME');
    const memo = extractOFXField(block, 'MEMO');
    const fitId = extractOFXField(block, 'FITID');
    
    if (!dtPosted || !trnAmt) continue;
    
    const dateStr = parseDate(dtPosted);
    if (!dateStr) continue;
    
    const amount = parseAmount(trnAmt);
    const description = name || memo || 'Sem descrição';
    
    transactions.push({
      date: dateStr,
      description: description.trim(),
      amount: Math.abs(amount),
      externalId: fitId || undefined,
    });
  }
  
  return transactions;
}

function extractOFXField(block: string, field: string): string | null {
  // Try tag format: <FIELD>value</FIELD>
  const tagMatch = block.match(new RegExp(`<${field}>([^<]*)<\/${field}>`, 'i'));
  if (tagMatch) return tagMatch[1].trim();
  
  // Try SGML format: <FIELD>value (no closing tag)
  const sgmlMatch = block.match(new RegExp(`<${field}>([^<\n\r]+)`, 'i'));
  if (sgmlMatch) return sgmlMatch[1].trim();
  
  return null;
}

/**
 * Auto-detect column mapping from CSV headers
 */
export function autoDetectMapping(headers: string[]): ColumnMapping | null {
  const datePatterns = /^(data|date|dt|data\s*da\s*compra|transaction\s*date)$/i;
  const descPatterns = /^(descri[çc][ãa]o|description|desc|estabelecimento|merchant|name|memo)$/i;
  const amountPatterns = /^(valor|amount|value|vlr|quantia|total|price)$/i;
  
  let dateIdx = -1;
  let descIdx = -1;
  let amountIdx = -1;
  
  headers.forEach((header, idx) => {
    const h = header.trim();
    if (datePatterns.test(h) && dateIdx === -1) dateIdx = idx;
    if (descPatterns.test(h) && descIdx === -1) descIdx = idx;
    if (amountPatterns.test(h) && amountIdx === -1) amountIdx = idx;
  });
  
  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    return null;
  }
  
  return { date: dateIdx, description: descIdx, amount: amountIdx };
}

/**
 * Generate file hash for deduplication
 */
export async function generateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
