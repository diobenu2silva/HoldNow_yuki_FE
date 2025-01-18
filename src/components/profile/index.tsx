"use client";
import { CoinBlog } from "@/components/cards/CoinBlog";
import Modal from "@/components/modals/Modal";
import { errorAlert, successAlert } from "@/components/others/ToastGroup";
import UserContext from "@/context/UserContext";
import { coinInfo, userInfo } from "@/utils/types";
import { getCoinsInfoBy, getUser } from "@/utils/util";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useContext } from "react";
import { LuFileEdit } from "react-icons/lu";
import { MdContentCopy } from "react-icons/md";
import { ProfileMenuList } from "@/config/TextData";

export default function ProfilePage() {
  const { user, setProfileEditModal, profileEditModal } = useContext(UserContext);
  const pathname = usePathname();
  const [param, setParam] = useState<string | null>(null);
  const [userData, setUserData] = useState<userInfo>({} as userInfo);
  const [option, setOption] = useState<number>(1);
  const [coins, setCoins] = useState<coinInfo[]>([]);
  const [copySuccess, setCopySuccess] = useState<string>("");
  const router = useRouter();

  const handleToRouter = (id: string) => {
    if (id.startsWith("http")) {
      window.location.href = id; // For external links
    } else {
      router.push(id); // For internal routing
    }
  };

  const fetchUserData = async (id: string) => {
    try {
      const response = await getUser({ id });
      setUserData(response);
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchCoinsData = async (userId: string) => {
    try {
      const coinsBy = await getCoinsInfoBy(userId);
      setCoins(coinsBy);
    } catch (error) {
      console.error("Error fetching coins:", error);
    }
  };

  useEffect(() => {
    const segments = pathname.split("/");
    const id = segments[segments.length - 1];
    if (id && id !== param) {
      setParam(id);
      fetchUserData(id);
    }
  }, [pathname]);

  useEffect(() => {
    if (option === 4 && param) {
      fetchCoinsData(param);
    }
  }, [option, param]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess("Copied!");
      successAlert("Copied to clipboard!");
    } catch (err) {
      setCopySuccess("Failed to copy!");
      errorAlert("Failed to copy!");
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-8 px-2">
      <div className="grid gap-6 justify-center">
        <div className="flex flex-col xs:flex-row gap-6 m-auto justify-center">
          <img
            src={userData.avatar || "/placeholder-avatar.png"}
            alt="Avatar"
            className="object-cover w-28 h-28 rounded-full mx-auto"
          />
          <div className="w-full flex flex-col text-white font-bold gap-2">
            <div className="flex flex-row items-center text-xl gap-2 justify-center xs:justify-start">
              @{userData.name}
              <LuFileEdit
                onClick={() => setProfileEditModal(true)}
                className="cursor-pointer text-2xl hover:text-[#143F72] text-white"
              />
            </div>
            <div
              className="flex flex-col w-[165px] text-lg cursor-pointer border-b-[1px] hover:text-[#143F72] text-white hover:border-b-[#143F72] border-b-white px-2 justify-center xs:justify-start"
              onClick={() => handleToRouter(`https://solscan.io/account/${userData.wallet}`)}
            >
              View on Solscan
            </div>
          </div>
        </div>
        <div className="w-[94%] flex flex-row items-center gap-2 border-[1px] border-[#143F72] rounded-lg px-2 xs:px-3 py-1 xs:py-2 font-semibold text-white mx-auto object-cover overflow-hidden">
          <p className="w-[90%] object-cover overflow-hidden truncate ">{userData.wallet}</p>
          <MdContentCopy
            className="text-2xl hover:text-[#143F72] text-white cursor-pointer"
            onClick={() => copyToClipboard(userData.wallet)}
          />
        </div>
        <div className="w-full flex flex-row border-t-4 border-t-[#0F3159] border-b-4 border-b-[#0F3159] py-2 xs:py-3 items-center justify-between">
          <div className="w-full flex flex-col justify-center gap-1 xs:gap-3 text-center">
            <div className="text-md xs:text-lg text-[#B0B0B0]">Followers</div>
            <div className="text-lg xs:text-2xl text-white font-extrabold">10.1K</div>
          </div>
          <div className="w-full flex flex-col justify-center gap-1 xs:gap-3 text-center">
            <div className="text-md xs:text-lg text-[#B0B0B0]">Following</div>
            <div className="text-lg xs:text-2xl text-white font-extrabold">452</div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 xs:gap-3 rounded-lg xs:rounded-full p-1 xs:p-3 text-white text-sm sm:text-lg font-semibold bg-[#0F3159] mx-auto">
        {ProfileMenuList.map((item) => (
          <div
            key={item.id}
            onClick={() => setOption(item.id)}
            className={`${option === item.id ? "bg-custom-gradient" : "bg-none"
              } rounded-lg xs:rounded-full px-5 py-2 font-semibold cursor-pointer mx-auto capitalize `}
          >
            {item.text}
          </div>
        ))}
      </div>
      {profileEditModal && <Modal data={userData} />}
      <div>
        {option === 4 && (
          <div className="flex justify-center">
            {coins.map((coin) => (
              <div
                key={coin.token}
                onClick={() => handleToRouter(`/trading/${coin.token}`)}
                className="cursor-pointer"
              >
                <CoinBlog coin={coin} componentKey="coin" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
