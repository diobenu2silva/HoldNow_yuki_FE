'use client';
import React, {
  useState,
  useEffect,
  ChangeEvent,
  useContext,
} from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/loadings/Spinner';
import { errorAlert, infoAlert } from '@/components/others/ToastGroup';
import UserContext from '@/context/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { claimTx, createToken } from '@/program/web3';
import {
  coinInfo,
  createCoinInfo,
  launchDataInfo,
  metadataInfo,
} from '@/utils/types';
import { useWallet } from '@solana/wallet-adapter-react';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { uploadImage, uploadMetadata } from '@/utils/fileUpload';
import {
  FinalTokenPoolData,
  SellTaxDecayData,
  StageDurationData,
  StagesData,
} from '@/config/TextData';
import { parseCSV } from '@/utils/csvParser';
import SelectInput from '../select/SelectInput';
import SellTaxRange from '../select/SellTaxRange';
import ImageUpload from '../upload/ImageUpload';
import { BACKEND_URL, getCoinInfo } from '@/utils/util';
import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import InitialBuyModal from '@/components/modals/InitialBuyModal';

export default function CreateToken() {
  const { user, isCreated, setIsCreated } = useContext(UserContext);
  const { isLoading, setIsLoading } = useSocket();
  const [newCoin, setNewCoin] = useState<createCoinInfo>({} as createCoinInfo);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [profilImageUrl, setProfileIamgeUrl] = useState<string>('');
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
  const [csvFileContent, setCsvFileContent] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvFilePreview, setCsvFilePreview] = useState<string | null>(null);
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('');
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(
    null
  );
  const [tokenNumberStages, setTokenNumberStages] = useState<number>(1);
  const [tokenStageDuration, setTokenStageDuration] = useState<number>(1);
  const [tokenSellTaxDecay, setTokenSellTaxDecay] = useState<number>(100);
  const [tokenSellTaxRange, setTokenSellTaxRange] = useState<number[]>([
    0, 100,
  ]);
  const [tokenPoolDestination, setTokenPollDestination] = useState<number>(3);
  const wallet = useWallet();
  const router = useRouter();
  const [errors, setErrors] = useState({
    name: false,
    ticker: false,
    image: false,
    numberStages: false,
    stageDuration: false,
    sellTaxDecay: false,
    sellTaxRange: false,
    poolDestination: false,
  });

  useEffect(() => {
    // Clear errors when newCoin changes
    setErrors({
      name: !newCoin.name,
      ticker: !newCoin.ticker,
      image: !profilImageUrl,
      numberStages: !tokenNumberStages,
      stageDuration: !tokenStageDuration,
      sellTaxDecay: !tokenSellTaxDecay,
      sellTaxRange: !tokenSellTaxRange,
      poolDestination: !tokenPoolDestination,
    });
  }, [newCoin, profilImageUrl]);

  useEffect(() => {
    // Set page as loaded after a short delay for smooth transition
    const timer = setTimeout(() => {
      setPageLoaded(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleToRouter = async (path: string) => {
    // Add a small delay for smooth transition
    await new Promise(resolve => setTimeout(resolve, 150));
    router.push(path);
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setNewCoin({ ...newCoin, [e.target.id]: e.target.value });
  };

  const validateForm = () => {
    const validationErrors = {
      name: !newCoin.name,
      ticker: !newCoin.ticker,
      description: !newCoin.description,
      image: !profilImageUrl,
      numberStages: !tokenNumberStages,
      stageDuration: !tokenStageDuration,
      sellTaxDecay: !tokenSellTaxDecay,
      sellTaxRange: !tokenSellTaxRange,
      poolDestination: !tokenPoolDestination,
    };
    setErrors(validationErrors);
    return !Object.values(validationErrors).includes(true);
  };

  const createCoin = async (solAmount: number) => {
    if (!validateForm()) {
      errorAlert(`${errors}`);
      return;
    }

    try {
      setIsLoading(true);
      
      // Process profile image upload (required)
      const uploadedImageUrl = await uploadImage(profilImageUrl);
      if (!uploadedImageUrl) {
        errorAlert('Profile image upload failed.');
        setIsLoading(false);
        return;
      }

      // Process banner image upload if provided
      let uploadedBannerUrl: string | undefined;
      if (bannerImageUrl) {
        const bannerResult = await uploadImage(bannerImageUrl);
        if (bannerResult) {
          uploadedBannerUrl = bannerResult;
        } else {
          errorAlert('Banner image upload failed.');
          setIsLoading(false);
          return;
        }
      }

      // Process CSV file for direct airdrop
      let csvAllocators: any[] = [];
      if (csvFile && csvFileContent) {
        try {
      
          csvAllocators = await parseCSV(csvFileContent);
        } catch (error) {
          console.error('__yuki__ Error reading CSV file:', error);
          errorAlert('Failed to read CSV file. Please check the format.');
          setIsLoading(false);
          router.push('/');
          return;
        }
      }

      const jsonData: metadataInfo = {
        name: newCoin.name,
        symbol: newCoin.ticker,
        image: uploadedImageUrl,
        description: newCoin.description,
        createdOn: new Date(),
        twitter: newCoin.twitter || undefined,
        website: newCoin.website || undefined,
        telegram: newCoin.telegram || undefined,
        frontBanner: uploadedBannerUrl,
      };
      // Process metadata upload
      const uploadMetadataUrl = await uploadMetadata(jsonData);
      if (!uploadMetadataUrl) {
        errorAlert('Metadata upload failed.');
        setIsLoading(false);
        return;
      }
      const coinData: launchDataInfo = {
        name: newCoin.name,
        symbol: newCoin.ticker,
        uri: uploadMetadataUrl,
        decimals: 6,
        tokenNumberStages,
        tokenStageDuration,
        tokenSellTaxDecay,
        tokenSellTaxRange,
        tokenPoolDestination,
      };

      const result = await createToken(wallet, coinData, csvAllocators, solAmount);
      if (result === 'WalletError' || !result) {
        errorAlert('Payment failed or was rejected.');
        setIsLoading(false);
        return;
      }

      // Handle claim amount exceeded error
      if (result === 'ClaimAmountExceeded') {
        // Reset CSV upload
        setCsvFile(null);
        setCsvFileContent('');
        setCsvFilePreview(null);
        setIsLoading(false);
        return; // Stay on create page, don't redirect
      }

      // Process CSV airdrop data if provided
      /*if (csvAllocators.length > 0 && result.mint && wallet.publicKey) {
        try {
          let successfulTransfers = 0;
          let failedTransfers = 0;
          
          const coinId = await axios.get(`${BACKEND_URL}/coinTrade/coinID/${result.mint}`);

          const coinInfo = await getCoinInfo(coinId.data.coinId._id);
          if (coinInfo.error) {
            errorAlert('Failed to get coin information for airdrop.');
          }

          for (const allocator of csvAllocators) {
            try {
              const signedTx = await claimTx(
                coinInfo,
                wallet,
                new PublicKey(allocator.wallet),
                allocator.amount,
                true,
              );

              if (!signedTx) {
                failedTransfers++;
                console.error(`Failed to create transaction for ${allocator.wallet}`);
                continue;
              }

              const data = {
                signedTxBase64: Buffer.from(signedTx).toString('base64'),
                token: coinInfo.token,
                user: wallet.publicKey.toString(),
              };
             
              const response = await axios.post(
                `${BACKEND_URL}/user/claim/`,
                data,
                config
              );
              if (response.data.error) {
                console.log('__yuki__ Claim axios error: ', response.data.error);
              }

              if (response.data === 'success') {
                successfulTransfers++;
              }
            } catch (error) {
              failedTransfers++;
              console.error(`__yuki__ Error processing airdrop for ${allocator.wallet}:`, error);
            }
          }
          
          if (successfulTransfers > 0) {
            infoAlert(`Airdrop completed: ${successfulTransfers} successful, ${failedTransfers} failed`);
          } else {
            errorAlert('All airdrop transfers failed. Please check the CSV format and try again.');
          }
        } catch (error) {
          console.error('__yuki__ Error processing airdrop:', error);
          errorAlert('Failed to process Airdrop.');
        }
      }*/

    } catch (error) {
      errorAlert('An unexpected error occurred.');
      console.error(error);
    } finally {
      setIsLoading(false);
      router.push('/');
    }

  };

  const formValid =
    newCoin.name && newCoin.ticker && newCoin.description && profilImageUrl;

  return (
    <div
      className={`w-full mx-auto px-4 pb-16 max-w-7xl transition-all duration-500 ease-out ${
        pageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      <div className="w-full flex flex-col gap-4 mb-8">
        <div
          onClick={() => handleToRouter('/')}
          className="cursor-pointer text-foreground hover:text-primary text-2xl flex flex-row items-center gap-2 pb-2 transition-colors duration-200"
        >
          <IoMdArrowRoundBack />
          Back
        </div>
        <h2 className="text-center text-2xl xs:text-4xl font-bold text-foreground">
          Solana Token Creator
        </h2>
        <div className="w-full text-center text-sm text-muted-foreground max-w-lg mx-auto">
          Create your next 1000X meme token in minutes. Launch with fair distribution and transparent mechanics.
        </div>
      </div>
      {isLoading && Spinner()}
      {!pageLoaded ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground">Loading token creator...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="w-full h-full justify-between items-start flex flex-col lg:flex-row lg:gap-10">
            <div className="w-full flex flex-col gap-6 py-5">
              <div className="flex flex-col gap-6 pt-6">
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-lg font-semibold text-foreground"
                  >
                    Token Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={newCoin.name || ''}
                    onChange={handleChange}
                    className={`block w-full p-3 ${errors.name ? 'border-red-500' : 'border-border'} rounded-lg bg-background text-foreground outline-none border-2 focus:border-primary transition-colors duration-200`}
                    placeholder="Enter token name"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="ticker"
                    className="text-lg font-semibold text-foreground"
                  >
                    Ticker
                  </label>
                  <input
                    id="ticker"
                    type="text"
                    value={newCoin.ticker || ''}
                    onChange={handleChange}
                    className={`block w-full p-3 ${errors.ticker ? 'border-red-500' : 'border-border'} rounded-lg bg-background text-foreground outline-none border-2 focus:border-primary transition-colors duration-200`}
                    placeholder="Enter ticker symbol"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="text-lg font-semibold text-foreground"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    value={newCoin.description || ''}
                    onChange={handleChange}
                    className={`block w-full p-3 ${errors.name ? 'border-red-500' : 'border-border'} rounded-lg bg-background text-foreground outline-none border-2 focus:border-primary transition-colors duration-200 resize-none`}
                    placeholder="Describe your token project"
                  />
                </div>

                <ImageUpload
                  header="Project Profile Image"
                  setFilePreview={(fileName) => setProfileImagePreview(fileName)}
                  setFileUrl={(fileUrl) => setProfileIamgeUrl(fileUrl)}
                  type="image/*"
                />
                <SelectInput
                  header="Number of Stages"
                  data={StagesData}
                  setSelectData={(inputData) => setTokenNumberStages(inputData.id)}
                  style="h-[200px] overflow-y-scroll z-10"
                  firstData="One"
                />
                <SelectInput
                  header="Stage Duration"
                  data={StageDurationData}
                  setSelectData={(inputData) => setTokenStageDuration(inputData.id)}
                  style="h-[200px] overflow-y-scroll z-10"
                  firstData="1 Day"
                />
                <SellTaxRange
                  header="Sell Tax Range"
                  setSelectRange={(changeRange) =>
                    setTokenSellTaxRange(changeRange)
                  }
                  hasCsvUpload={!!csvFileContent}
                />
                <SelectInput
                  header="Sell Tax Decay"
                  data={SellTaxDecayData}
                  setSelectData={(inputData) => setTokenSellTaxDecay(inputData.id)}
                  style="h-[200px] overflow-y-scroll z-10"
                  firstData="Until halfway through - 100%"
                />
              </div>
            </div>
            <div className="w-full flex flex-col gap-6 lg:py-5">
              <div className="flex flex-col gap-6 lg:pt-6">
                <SelectInput
                  header="Final Token Pool Destination"
                  data={FinalTokenPoolData}
                  setSelectData={(inputData) =>
                    setTokenPollDestination(inputData.id)
                  }
                  style="h-[162px]"
                  firstData="NEWLP / SOL"
                />
                <div className="space-y-2">
                  <ImageUpload
                    header="Airdrop List (Optional) - CSV Upload"
                    setFilePreview={(fileName) => setCsvFilePreview(fileName)}
                    setFileUrl={() => {}} // No longer needed for CSV
                    type=".csv"
                    onFileRead={(file, textContent) => {
                      setCsvFile(file);
                      setCsvFileContent(textContent);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a CSV file with wallet addresses and amounts. Format: wallet_address,amount (one per line) <br />
                    Total Airdrop amount must be less than 3,000,000 HODL
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="website" className="text-lg font-semibold text-foreground">
                  Website (Optional)
                </label>
                <input
                  type="text"
                  id="website"
                  value={newCoin.website || ''}
                  onChange={handleChange}
                  className="block w-full p-3 rounded-lg bg-background text-foreground outline-none border-2 border-border focus:border-primary transition-colors duration-200"
                  placeholder="https://your-website.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="twitter" className="text-lg font-semibold text-foreground">
                  Twitter (Optional)
                </label>
                <input
                  type="text"
                  id="twitter"
                  value={newCoin.twitter || ''}
                  onChange={handleChange}
                  className="block w-full p-3 rounded-lg bg-background text-foreground outline-none border-2 border-border focus:border-primary transition-colors duration-200"
                  placeholder="@your-twitter-handle"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="telegram" className="text-lg font-semibold text-foreground">
                  Telegram (Optional)
                </label>
                <input
                  type="text"
                  id="telegram"
                  value={newCoin.telegram || ''}
                  onChange={handleChange}
                  className="block w-full p-3 rounded-lg bg-background text-foreground outline-none border-2 border-border focus:border-primary transition-colors duration-200"
                  placeholder="https://t.me/your-channel"
                />
              </div>

              <ImageUpload
                header="FP Banner Image (Optional)"
                setFilePreview={(fileName) => setBannerImagePreview(fileName)}
                setFileUrl={(fileUrl) => setBannerImageUrl(fileUrl)}
                type="image/*"
              />
            </div>
          </div>
          <div className="flex justify-center mt-16 mb-10">
            <button
              onClick={() => setShowModal(true)}
              disabled={!formValid || isLoading}
              className={`px-8 py-3 rounded-lg font-semibold text-lg shadow-lg transition-all duration-300 transform hover:scale-105 relative overflow-hidden ${
                !formValid || isLoading
                  ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-xl'
              }`}
            >
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine"></div>
              <span className="relative z-10">
                {isLoading ? 'Creating...' : 'Create Token'}
              </span>
            </button>
            <InitialBuyModal
              open={showModal}
              onOpenChange={setShowModal}
              onConfirm={(solAmount) => {
                createCoin(solAmount);
              }}
              tokenName={newCoin.name}
              deployCost={0.02}
            />
          </div>
        </>
      )}
    </div>
  );
}

