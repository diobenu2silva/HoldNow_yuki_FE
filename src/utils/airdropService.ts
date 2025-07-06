import { AirdropAllocator } from './csvParser';

const BACKEND_URL = process.env.NEXT_BACKEND_URL;

export const sendAirdropData = async (
  allocators: AirdropAllocator[],
  mintAddress: string,
  creatorWallet: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/claim/airdrop/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allocators,
        mintAddress,
        creatorWallet,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending airdrop data:', error);
    return false;
  }
}; 