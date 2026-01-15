
export const exportToCsv = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(','), // Header row
        ...data.map(row =>
            headers.map(header => {
                const cell = row[header] === null || row[header] === undefined ? '' : row[header];
                // Escape quotes and wrap in quotes if contains comma or quotes
                const stringCell = String(cell);
                if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
                    return `"${stringCell.replace(/"/g, '""')}"`;
                }
                return stringCell;
            }).join(',')
        )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const parseCsv = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) {
                resolve([]);
                return;
            }

            // Simple CSV parser
            // Note: This is a basic implementation. For production with complex CSVs, use a library like PapaParse.
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length === 0) {
                resolve([]);
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

            const result: any[] = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                // Handle basic quoted CSV
                const row: string[] = [];
                let inQuotes = false;
                let currentValue = '';

                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        row.push(currentValue.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                        currentValue = '';
                    } else {
                        currentValue += char;
                    }
                }
                row.push(currentValue.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));

                if (row.length === headers.length) {
                    const obj: any = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    result.push(obj);
                }
            }

            resolve(result);
        };

        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};
