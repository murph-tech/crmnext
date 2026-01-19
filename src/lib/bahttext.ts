/**
 * Converts a number to Thai Baht text format.
 * Example: 121.50 -> หนึ่งร้อยยี่สิบเอ็ดบาทห้าสิบสตางค์
 */
export function bahttext(number: number): string {
    const num = parseFloat(number.toString().replace(/,/g, ''));

    if (isNaN(num)) return 'จำนวนเงินไม่ถูกต้อง';
    if (num === 0) return 'ศูนย์บาทถ้วน';

    const thaiNumbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    let text = '';
    const parts = num.toFixed(2).split('.');

    // Process integer part
    let integerPart = parts[0];
    const integerLen = integerPart.length;

    // Handle millions separately if needed, but for simplicity let's handle up to millions
    // If number is very large, this simple logic might need recursion, but this handles standard business cases.

    // Reverse loop to handle positions
    for (let i = 0; i < integerLen; i++) {
        const digit = parseInt(integerPart.charAt(i));
        const unitIndex = (integerLen - i - 1) % 6;

        if (digit !== 0) {
            if (unitIndex === 0 && digit === 1 && integerLen > 1 && i !== 0) {
                text += 'เอ็ด';
            } else if (unitIndex === 1 && digit === 2) {
                text += 'ยี่';
            } else if (unitIndex === 1 && digit === 1) {
                // Do nothing for 'sip'
            } else {
                text += thaiNumbers[digit];
            }
            text += units[unitIndex];
        } else if (unitIndex === 0 && (integerLen - i - 1) >= 6) {
            // Handle 'Million' for zeroes like 10,000,000
            text += 'ล้าน';
        }
    }

    // Fix trailing 'ล้าน' issue if logic was imperfect, but specifically:
    // If > 1 million, we need to handle the 'million' word correctly in loop.
    // Let's use a robust library approach or simpler standard algorithm.
    // For now, let's use a simpler known standard block logic.

    // Better Standard Logic for BahtText
    const BAHT_TEXT_NUMBERS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const BAHT_TEXT_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    function convertToThai(n: string): string {
        let res = '';
        for (let i = 0; i < n.length; i++) {
            const digit = parseInt(n[i]);
            const pos = n.length - i - 1;

            if (digit !== 0) {
                if (pos === 0 && digit === 1 && n.length > 1) {
                    res += 'เอ็ด';
                } else if (pos === 1 && digit === 2) {
                    res += 'ยี่';
                } else if (pos === 1 && digit === 1) {
                    // Skip
                } else {
                    res += BAHT_TEXT_NUMBERS[digit];
                }
                res += BAHT_TEXT_UNITS[pos];
            }
        }
        return res;
    }

    // Handle integer part chunks of millions
    let intText = '';
    if (parseInt(integerPart) === 0) {
        // handled above
    } else {
        // Split into chunks of 6 (millions) - simplified for standard usage (max trillions)
        // Actually, just handle generic loop for millions
        // Let's rely on a simpler single-pass for < 1 trillion
        // But for reliability, let's stick to simple implementation for now.
        // Assuming max < 100 Million for typical Quotations.

        // Re-implement simple robust logic
        text = '';
        const len = integerPart.length;
        for (let i = 0; i < len; i++) {
            const digit = parseInt(integerPart[i]);
            const pos = len - i - 1;
            const unit = BAHT_TEXT_UNITS[pos % 6];

            if (digit === 0) {
                // Determine if we need to add 'Million'
                if (pos > 0 && pos % 6 === 0) {
                    text += 'ล้าน';
                }
                continue;
            }

            if (digit === 1 && pos % 6 === 0 && len > 1 && i !== 0) { // Fix for 101, 201 etc within chunks needs care, but general rule: 
                // Logic: 1 at position 0 (ones) -> 'ED' unless it's single digit
                // Actually, if (pos % 6 == 0) and digit is 1 and it's not the only digit in that group?
                // Use a library logic replacement:
                // If position is ends in 1 (unit position)
                text += 'เอ็ด';
            } else if (digit === 2 && pos % 6 === 1) {
                text += 'ยี่';
            } else if (digit === 1 && pos % 6 === 1) {
                // Skip
            } else {
                text += BAHT_TEXT_NUMBERS[digit];
            }
            text += unit;
        }

        // Wait, the logic above is buggy for 'เอ็ด'. Let's use the simplest reliable open source logic logic inline
    }

    // Let's rewrite with the most correct simple logic:
    // 1. Split integer and decimal
    // 2. Process Integer
    // 3. Process Decimal

    // --- Safe Implementation ---
    const txtNum = BAHT_TEXT_NUMBERS;
    const txtUnit = BAHT_TEXT_UNITS;

    function numberToWords(numStr: string): string {
        let result = '';
        const len = numStr.length;
        for (let i = 0; i < len; i++) {
            const digit = parseInt(numStr.charAt(i));
            const pos = len - i - 1;

            if (digit === 0) {
                // if million position and not empty...
                if (pos % 6 === 0 && pos > 0 && len > pos) result += 'ล้าน';
                continue;
            }

            let digitText = txtNum[digit];

            // Adjustments
            if (pos % 6 === 1 && digit === 1) digitText = ''; // สิบ not หนึ่งสิบ
            if (pos % 6 === 1 && digit === 2) digitText = 'ยี่'; // ยี่สิบ not สองสิบ
            if (pos % 6 === 0 && digit === 1 && len > 1 && i > 0) digitText = 'เอ็ด'; // เอ็ด at end

            result += digitText + txtUnit[pos % 6];

            if (pos % 6 === 0 && pos > 0) result += 'ล้าน';
        }
        return result;
    }

    let baht = numberToWords(parts[0]);
    if (baht === '') baht = 'ศูนย์';
    baht += 'บาท';

    let satang = '';
    if (parts.length > 1 && parseInt(parts[1]) > 0) {
        let satangStr = parts[1].substring(0, 2);
        if (satangStr.length === 1) satangStr += '0'; // 0.5 -> 50 satang

        let s = numberToWords(satangStr);
        // Fix เอ็ด for satang e.g. 11, 21, 31...
        // Logic inside numberToWords handles 21 (yee-sib-ed) but for 1, it might just say 'neung'.
        // Satang always 2 digits.
        // If 01 -> neung-satang. If 11 -> sib-ed-satang.
        // Our numberToWords logic:
        // 01 -> len 2. i=0(0) -> skip. i=1(1) -> pos 0. digit 1. -> neung?
        // Wait, pos % 6 == 0 (unit). digit 1. len>1 (2). i>0 (1). -> 'เอ็ด'. Correct.
        // What about 1? '01' passed? Yes.
        // What about 0.1 -> 10 satang. '10' passed. -> sib-satang. Correct.

        satang = s + 'สตางค์';
    } else {
        satang = 'ถ้วน';
    }

    return baht + satang;
}
