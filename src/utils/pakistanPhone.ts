/**
 * Pakistan Standard Mobile Number Specification & Formatter
 * Format: 03XX-XXXXXXX (11 digits: 4-digit code + 7-digit subscriber number)
 * Operators:
 *   - Jazz / Mobilink (0300 - 0309)
 *   - Zong 4G (0310 - 0318)
 *   - Warid Telecom (0320 - 0325)
 *   - Onic (0326 - 0329)
 *   - Ufone 4G (0330 - 0337)
 *   - Telenor 4G (0340 - 0349)
 *   - SCOM (0355)
 */

export const PK_PHONE_GUIDANCE = 
  'Enter 11-digit Pakistani mobile number: 03XX-XXXXXXX (e.g. 0300-1234567, 0321-7654321, 0345-9876543). You will receive instant SMS & WhatsApp token call alerts, live queue updates, and auto-reissued passes.';

export interface PakistanPhoneValidation {
  isValid: boolean;
  error?: string;
  formatted: string;
  operator?: string;
  operatorColor?: string;
}

/**
 * Identify Pakistan telecom operator based on the first 4 digits
 */
export function getPakistanOperator(digits: string): { name: string; color: string } | undefined {
  if (digits.length < 4) return undefined;
  const prefix = digits.slice(0, 4);

  // Jazz / Mobilink: 0300-0309
  if (/^030[0-9]/.test(prefix)) {
    return { name: 'Jazz 🇵🇰', color: 'bg-red-50 text-red-700 border-red-200' };
  }
  // Zong 4G: 0310-0319
  if (/^031[0-9]/.test(prefix)) {
    return { name: 'Zong 4G 🇵🇰', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  // Warid: 0320-0325
  if (/^032[0-5]/.test(prefix)) {
    return { name: 'Warid 🇵🇰', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  // Onic: 0326-0329
  if (/^032[6-9]/.test(prefix)) {
    return { name: 'Onic 🇵🇰', color: 'bg-purple-50 text-purple-700 border-purple-200' };
  }
  // Ufone 4G: 0330-0337
  if (/^033[0-7]/.test(prefix)) {
    return { name: 'Ufone 🇵🇰', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  // Telenor 4G: 0340-0349
  if (/^034[0-9]/.test(prefix)) {
    return { name: 'Telenor 🇵🇰', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  }
  // SCOM: 0355
  if (/^0355/.test(prefix)) {
    return { name: 'SCOM 🇵🇰', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }

  return undefined;
}

/**
 * Automatically formats digits into Pakistan standard 03XX-XXXXXXX format as user types
 */
export function formatPakistanPhone(input: string): string {
  // Strip all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // Format with dash after 4 digits: 0300-1234567
  if (digits.length <= 4) {
    return digits;
  }
  
  return `${digits.slice(0, 4)}-${digits.slice(4, 11)}`;
}

/**
 * Validates whether the number complies with Pakistan telecom mobile standards
 */
export function validatePakistanPhone(phone: string): PakistanPhoneValidation {
  const digits = phone.replace(/\D/g, '');
  const formatted = formatPakistanPhone(phone);
  const operatorInfo = getPakistanOperator(digits);
  
  if (!digits) {
    return { 
      isValid: false, 
      error: 'Pakistani mobile number is required to receive queue alerts',
      formatted: '' 
    };
  }
  
  if (!digits.startsWith('03')) {
    return { 
      isValid: false, 
      error: 'Pakistan mobile numbers must start with 03 (e.g., 0300, 0321, 0333)',
      formatted 
    };
  }
  
  if (digits.length < 11) {
    return { 
      isValid: false, 
      error: `Incomplete: ${digits.length}/11 digits entered. Format must be 03XX-XXXXXXX`,
      formatted,
      operator: operatorInfo?.name,
      operatorColor: operatorInfo?.color
    };
  }
  
  if (digits.length > 11) {
    return { 
      isValid: false, 
      error: 'Number exceeds 11 digits. Standard Pakistan format is 03XX-XXXXXXX',
      formatted: formatted.slice(0, 12),
      operator: operatorInfo?.name,
      operatorColor: operatorInfo?.color
    };
  }

  // Validate 3rd digit: 0, 1, 2, 3, 4, 5
  const thirdDigit = digits[2];
  if (!['0', '1', '2', '3', '4', '5'].includes(thirdDigit)) {
    return {
      isValid: false,
      error: 'Invalid operator code. Valid Pakistan mobile prefixes start with 030X through 035X',
      formatted,
    };
  }
  
  return { 
    isValid: true,
    formatted,
    operator: operatorInfo?.name || 'Pakistan Mobile 🇵🇰',
    operatorColor: operatorInfo?.color || 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };
}
