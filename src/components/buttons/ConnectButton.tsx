'use client';
import { FC, useContext, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  successAlert,
  errorAlert,
  infoAlert,
} from '@/components/others/ToastGroup';
import base58 from 'bs58';
import UserContext from '@/context/UserContext';
import { confirmWallet, walletConnect } from '@/utils/util';
import { userInfo } from '@/utils/types';
import { useRouter } from 'next/navigation';
import { RiExchangeDollarLine } from 'react-icons/ri';
import { VscDebugDisconnect } from 'react-icons/vsc';
import { TbMoodEdit } from 'react-icons/tb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { Wallet, User, LogOut, Settings } from 'lucide-react';

export const ConnectButton: FC = () => {
  const { user, setUser, login, setLogin, isLoading, setIsLoading } =
    useContext(UserContext);
  const { publicKey, disconnect, connect, signMessage } = useWallet();
  const { visible, setVisible } = useWalletModal();
  const router = useRouter();

  const tempUser = useMemo(() => user, [user]);
  
  useEffect(() => {
    const handleClick = async () => {
      if (publicKey && !login) {
        const updatedUser: userInfo = {
          name: publicKey.toBase58().slice(0, 6),
          wallet: publicKey.toBase58(),
          isLedger: false,
        };
        await sign(updatedUser);
      }
    };
    handleClick();
  }, [publicKey, login]);

  const sign = async (updatedUser: userInfo) => {
    try {
      const connection = await walletConnect({ data: updatedUser });
      if (!connection) return;
      if (connection.nonce === undefined) {
        const newUser = {
          name: connection.name,
          wallet: connection.wallet,
          _id: connection._id,
          avatar: connection.avatar,
        };
        setUser(newUser as userInfo);
        setLogin(true);
        return;
      }

      const msg = new TextEncoder().encode(
        `Nonce to confirm: ${connection.nonce}`
      );

      const sig = await signMessage?.(msg);
      const res = base58.encode(sig as Uint8Array);
      const signedWallet = { ...connection, signature: res };
      const confirm = await confirmWallet({ data: signedWallet });

      if (confirm) {
        setUser(confirm);
        setLogin(true);
        setIsLoading(false);
      }
      successAlert('Message signed.');
    } catch (error) {
      errorAlert('Sign-in failed.');
    }
  };

  const logOut = async () => {
    if (typeof disconnect === 'function') {
      await disconnect();
    }
    setUser({} as userInfo);
    setLogin(false);
    localStorage.clear();
  };

  const handleToProfile = (id: string) => {
    router.push(id);
  };

  if (login && publicKey) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button variant="outline" className="p-3 text-primary flex flex-col justify-center items-center border-2 border-primary/30 rounded-full cursor-pointer bg-card hover:bg-accent transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-2">
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt="Avatar"
                    className="w-5 h-5 rounded-full"
                  />
                )}
                <span className="text-sm font-medium text-primary">
                  {user.name}
                </span>
              </div>
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-popover border-border w-48">
          <DropdownMenuItem onClick={() => handleToProfile(`/profile/${tempUser._id}`)}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setVisible(true)}>
            <Wallet className="mr-2 h-4 w-4" />
            <span>Change Wallet</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Disconnect</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button 
        onClick={() => setVisible(true)}
        className="p-3 text-primary flex flex-col justify-center items-center border-2 border-primary/30 rounded-full cursor-pointer bg-card hover:bg-accent transition-all duration-200 shadow-lg hover:shadow-xl backdrop-blur-sm"
      >
        <Wallet className="h-5 w-5" />
      </Button>
    </motion.div>
  );
};
