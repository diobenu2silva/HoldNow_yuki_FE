'use client';
import { ChangeEvent, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/loadings/Spinner';
import { errorAlert, infoAlert } from '@/components/others/ToastGroup';
import UserContext from '@/context/UserContext';
import { useSocket } from '@/contexts/SocketContext';
import { createToken } from '@/program/web3';
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
import SelectInput from '../select/SelectInput';
import SellTaxRange from '../select/SellTaxRange';
import ImageUpload from '../upload/ImageUpload';

export default function CreateToken() {
  const { user, isCreated, setIsCreated } = useContext(UserContext);
  const { isLoading, setIsLoading } = useSocket();
  const [newCoin, setNewCoin] = useState<createCoinInfo>({} as createCoinInfo);

  const [profilImageUrl, setProfileIamgeUrl] = useState<string>('');
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  );
  const [csvFileUrl, setCsvFileUrl] = useState<string>('');
  const [csvFilePreview, setCsvFilePreview] = useState<string | null>(null);
  const [bannerImageUrl, setBannerImageUrl] = useState<string>('');
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(
    null
  );
  const [tokenNumberStages, setTokenNumberStages] = useState<number>(1);
  const [tokenStageDuration, setTokenStageDuration] = useState<number>(1);
  const [tokenSellTaxDecay, setTokenSellTaxDecay] = useState<number>(10);
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

  const handleToRouter = (path: string) => {
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

  const createCoin = async () => {
    if (!validateForm()) {
      errorAlert(`${errors}`);
      return;
    }

    try {
      setIsLoading(true);
      // Process image upload
      const uploadedImageUrl = await uploadImage(profilImageUrl);
      if (!uploadedImageUrl) {
        errorAlert('Image upload failed.');
        setIsLoading(false);
        return;
      }
      const jsonData: metadataInfo = {
        name: newCoin.name,
        symbol: newCoin.ticker,
        image: uploadedImageUrl,
        description: newCoin.description,
        createdOn: new Date(),
        twitter: newCoin.twitter || undefined, // Only assign if it exists
        website: newCoin.website || undefined, // Only assign if it exists
        telegram: newCoin.telegram || undefined, // Only assign if it exists
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

      const res = await createToken(wallet, coinData);
      if (res !== 'WalletError' && !res) {
        errorAlert('Payment failed or was rejected.');
        setIsLoading(false);
        return;
      }
      router.push('/');
    } catch (error) {
      errorAlert('An unexpected error occurred.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formValid =
    newCoin.name && newCoin.ticker && newCoin.description && profilImageUrl;

  return (
    <div className="w-full mx-auto px-3 pb-16">
      <div className="w-full flex flex-col gap-3 mx-4">
        <div
          onClick={() => handleToRouter('/')}
          className="cursor-pointer text-white text-2xl flex flex-row items-center gap-2 pb-2"
        >
          <IoMdArrowRoundBack />
          Back
        </div>
        <h2 className="text-center text-2xl xs:text-4xl font-bold text-white">
          Solana Token Creator
        </h2>
        <div className="w-full text-center text-sm text-white max-w-lg mx-auto">
          Lorem ipsum dolor sit amet consectetur. Rhoncus nunc blandit mattis
          mattis arcu posuere cursus.
        </div>
      </div>
      {isLoading && Spinner()}
      <div className="w-full h-full justify-between items-start flex flex-col sm2:flex-row sm2:gap-10">
        <div className="w-full flex flex-col gap-4 py-5">
          <div className="flex flex-col gap-4 pt-6">
            <div>
              <label
                htmlFor="name"
                className="text-lg font-semibold text-white"
              >
                Token Name
              </label>
              <input
                id="name"
                type="text"
                value={newCoin.name || ''}
                onChange={handleChange}
                className={`block w-full p-2.5 ${errors.name ? 'border-red-700' : 'border-gray-300'} rounded-lg bg-gray-800 text-white outline-none border-[#64ffda] border-[1px]`}
              />
            </div>

            <div>
              <label
                htmlFor="ticker"
                className="text-lg font-semibold text-white"
              >
                Ticker
              </label>
              <input
                id="ticker"
                type="text"
                value={newCoin.ticker || ''}
                onChange={handleChange}
                className={`block w-full p-2.5 ${errors.ticker ? 'border-red-700' : 'border-gray-300'} rounded-lg bg-gray-800 text-white outline-none border-[#64ffda] border-[1px]`}
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="text-lg font-semibold text-white"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={2}
                value={newCoin.description || ''}
                onChange={handleChange}
                className={`block w-full p-2.5 ${errors.name ? 'border-red-700' : 'border-gray-300'} rounded-lg bg-gray-800 text-white outline-none border-[#64ffda] border-[1px]`}
              />
            </div>

            <ImageUpload
              header="Project Profile Image"
              setFilePreview={(fileName) => setProfileImagePreview(fileName)}
              setFileUrl={(fileUrl) => setProfileIamgeUrl(fileUrl)}
              type="image/*"
            />
            <SelectInput
              header="Number fo Stages"
              data={StagesData}
              setSelectData={(inputData) => setTokenNumberStages(inputData.id)}
              style="h-[162px]"
              firstData="One"
            />
            <SelectInput
              header="Stage Duration"
              data={StageDurationData}
              setSelectData={(inputData) => setTokenStageDuration(inputData.id)}
              style="h-[280px]"
              firstData="1 Day"
            />
            <SellTaxRange
              header="Sell Tax Range"
              setSelectRange={(changeRange) =>
                setTokenSellTaxRange(changeRange)
              }
            />
            <SelectInput
              header="Sell Tax Decay"
              data={SellTaxDecayData}
              setSelectData={(inputData) => setTokenSellTaxDecay(inputData.id)}
              style="h-[200px] overflow-y-scroll z-10"
              firstData="Unitill halfqy throgh - 10%"
            />
          </div>
        </div>
        <div className="w-full flex flex-col gap-4 sm2:py-5">
          <div className="flex flex-col gap-4 sm2:pt-6">
            <SelectInput
              header="Final Token Pool Destination"
              data={FinalTokenPoolData}
              setSelectData={(inputData) =>
                setTokenPollDestination(inputData.id)
              }
              style="h-[162px]"
              firstData="NEWLP / SOL"
            />
            <ImageUpload
              header="Airdrop List (Optional) - CSV Upload"
              setFilePreview={(fileName) => setCsvFilePreview(fileName)}
              setFileUrl={(fileUrl) => setCsvFileUrl(fileUrl)}
              type=".csv"
            />
          </div>

          <div>
            <label htmlFor="name" className="text-lg font-semibold text-white">
              Website (Optional)
            </label>
            <input
              type="text"
              id="website"
              value={newCoin.website || ''}
              onChange={handleChange}
              className={`block w-full p-2.5 rounded-lg bg-gray-800 text-white outline-none border-[#64ffda] border-[1px]`}
            />
          </div>

          <div>
            <label htmlFor="name" className="text-lg font-semibold text-white">
              Twitter (Optional)
            </label>
            <input
              type="text"
              id="twitter"
              value={newCoin.twitter || ''}
              onChange={handleChange}
              className={`block w-full p-2.5 rounded-lg bg-gray-800 text-white outline-none border-[#64ffda] border-[1px]`}
            />
          </div>

          <div>
            <label htmlFor="name" className="text-lg font-semibold text-white">
              Telegram (Optional)
            </label>
            <input
              type="text"
              id="telegram"
              value={newCoin.telegram || ''}
              onChange={handleChange}
              className={`block w-full p-2.5 rounded-lg bg-gray-800 text-white outline-none border-[#64ffda] border-[1px]`}
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
      <button
        onClick={createCoin}
        disabled={!formValid || isLoading}
        className={`w-40 flex flex-col py-2 mt-16 mb-10 mx-auto px-8 rounded-lg bg-blue-700 text-white ${!formValid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
      >
        {isLoading ? 'Creating...' : 'Create Coin'}
      </button>
    </div>
  );
}
