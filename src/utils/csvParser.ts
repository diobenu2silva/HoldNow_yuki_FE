export interface AirdropAllocator {
  wallet: string;
  amount: number;
}

export const parseCSV = async (csvText: string): Promise<AirdropAllocator[]> => {
  try {
    const lines = csvText.split('\n').filter(line => line.trim());
    const allocators: AirdropAllocator[] = [];
    
    // Skip header row if it exists
    const dataLines = lines.slice(1);
    console.log("__yuki__ csv dataLines", dataLines);
    for (const line of dataLines) {
      const fields = line.split(',').map(field => field.trim());
      console.log("__yuki__ csv fields", fields);
      // Handle different CSV formats
      let wallet: string;
      let amountStr: string;
      
      if (fields.length >= 2) {
        // Standard format: wallet,amount
        wallet = fields[0];
        amountStr = fields[1];
        console.log("__yuki__ csv wallet", wallet, "amountStr", amountStr);
      } else if (fields.length === 1) {
        // Single column format: assume it's wallet address
        wallet = fields[0];
        amountStr = '0'; // Default amount
      } else {
        continue; // Skip invalid lines
      }
      
      if (wallet && amountStr) {
        wallet = wallet.replace(/"/g, '').trim();
        const amount = parseFloat(amountStr.replace(/"/g, '').trim());
        console.log("__yuki__ csv amount", amount);
        if (!isNaN(amount) && amount >= 0) {
          // Basic wallet address validation (Solana addresses are 32-44 characters)
          if (wallet.length >= 32 && wallet.length <= 44) {
            allocators.push({
              wallet,
              amount
            });
          }
        }
      }
    }
    console.log("__yuki__ csv allocators", allocators);
    return allocators;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw new Error('Failed to parse CSV file');
  }
};

export const validateCSVFormat = (csvText: string): boolean => {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return false; // Need at least header + 1 data row
  
  const firstLine = lines[0];
  const columns = firstLine.split(',').map(col => col.trim().toLowerCase());
  
  // Check if CSV has wallet and amount columns
  return columns.includes('wallet') && columns.includes('amount');
}; 