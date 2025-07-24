'use client';
import { CoinBlog } from '@/components/cards/CoinBlog';
import Modal from '@/components/modals/Modal';
import { errorAlert, successAlert } from '@/components/others/ToastGroup';
import UserContext from '@/context/UserContext';
import { coinInfo, userInfo } from '@/utils/types';
import { 
  getCoinsInfoBy, 
  getUser, 
  followUser, 
  unfollowUser, 
  getFollowers, 
  getFollowing, 
  getUserCoinsHeld,
  updateUser
} from '@/utils/util';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useContext } from 'react';
import { LuUsers, LuUserPlus, LuUserMinus } from 'react-icons/lu';
import { HiOutlinePencil } from 'react-icons/hi2';
import { MdContentCopy } from 'react-icons/md';
import { ProfileMenuList } from '@/config/TextData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import ImageUpload from '@/components/upload/ImageUpload';
import { uploadImage } from '@/utils/fileUpload';
import { useWallet } from '@solana/wallet-adapter-react';

export default function ProfilePage() {
  const { user, setProfileEditModal, profileEditModal, setUser, setSolPrice } =
    useContext(UserContext);
  const { publicKey } = useWallet();
  const pathname = usePathname();
  const [param, setParam] = useState<string | null>(null);
  const [userData, setUserData] = useState<userInfo>({} as userInfo);
  const [option, setOption] = useState<number>(1);
  const [coins, setCoins] = useState<coinInfo[]>([]);
  const [userCoinsHeld, setUserCoinsHeld] = useState<any[]>([]);
  const [followers, setFollowers] = useState<userInfo[]>([]);
  const [following, setFollowing] = useState<userInfo[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<string>('');
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [coinsHeldLoading, setCoinsHeldLoading] = useState(false);
  const [coinsLoading, setCoinsLoading] = useState(false);
  const router = useRouter();

  const handleToRouter = (id: string) => {
    if (id.startsWith('http')) {
      window.location.href = id; // For external links
    } else {
      router.push(id); // For internal routing
    }
  };

  const fetchUserData = async (id: string) => {
    try {
      const response = await getUser({ id });
      console.log('__yuki__ fetchUserData: Received user data:', response);
      
      if (response.error) {
        console.log('__yuki__ fetchUserData: User not found for ID:', id);
        setUserData({} as userInfo);
        return;
      }
      
      setUserData(response);
      
      // Check if current user is following this user
      if (publicKey?.toBase58() && response.wallet && response.wallet.trim() !== '') {
        const userFollowers = await getFollowers(response.wallet);
        console.log('__yuki__ User followers:', userFollowers);
        console.log('__yuki__ Current user wallet:', publicKey.toBase58());
        setIsFollowing(userFollowers.some(f => f.wallet === publicKey.toBase58()));
      } else {
        console.log('__yuki__ fetchUserData: Skipping follow check - missing wallet or publicKey');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUserData({} as userInfo);
    }
  };

  const fetchCoinsData = async (userId: string) => {
    try {
      console.log('__yuki__ fetchCoinsData: Starting fetch for user ID:', userId);
      setCoinsLoading(true);
      const coinsBy = await getCoinsInfoBy(userId);
      console.log('__yuki__ fetchCoinsData: Received coins:', coinsBy);
      setCoins(coinsBy);
    } catch (error) {
      console.error('Error fetching coins:', error);
    } finally {
      setCoinsLoading(false);
    }
  };

  const fetchUserCoinsHeld = async (wallet: string) => {
    try {
      console.log('__yuki__ fetchUserCoinsHeld: Starting fetch for wallet:', wallet);
      setCoinsHeldLoading(true);
      
      // Call the main function directly for better performance
      const coinsHeld = await getUserCoinsHeld(wallet);
      console.log('__yuki__ fetchUserCoinsHeld: Received coins:', coinsHeld);
      setUserCoinsHeld(coinsHeld);
    } catch (error) {
      console.error('Error fetching user coins held:', error);
    } finally {
      setCoinsHeldLoading(false);
    }
  };

  const fetchFollowers = async (wallet: string) => {
    try {
      if (!wallet || wallet.trim() === '') {
        console.log('__yuki__ fetchFollowers: Skipping fetch - wallet is undefined or empty');
        return;
      }
      console.log('__yuki__ fetchFollowers: Starting fetch for wallet:', wallet);
      const followersData = await getFollowers(wallet);
      console.log('__yuki__ fetchFollowers: Received data:', followersData);
      setFollowers(followersData);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const fetchFollowing = async (wallet: string) => {
    try {
      if (!wallet || wallet.trim() === '') {
        console.log('__yuki__ fetchFollowing: Skipping fetch - wallet is undefined or empty');
        return;
      }
      console.log('__yuki__ fetchFollowing: Starting fetch for wallet:', wallet);
      const followingData = await getFollowing(wallet);
      console.log('__yuki__ fetchFollowing: Received data:', followingData);
      setFollowing(followingData);
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  useEffect(() => {
    const segments = pathname.split('/');
    const id = segments[segments.length - 1];
    if (id && id !== param) {
      setParam(id);
      fetchUserData(id);
    }
  }, [pathname]);

  useEffect(() => {
    if (param) {
      if (option === 4) {
        fetchCoinsData(param);
      } else if (option === 1 && userData.wallet) {
        console.log('__yuki__ Fetching coins held for wallet:', userData.wallet);
        fetchUserCoinsHeld(userData.wallet);
      } else if (option === 5 && userData.wallet) {
        fetchFollowers(userData.wallet);
      } else if (option === 6 && userData.wallet) {
        fetchFollowing(userData.wallet);
      }
    }
  }, [option, param, userData.wallet]);

  // Fetch followers and following data when userData is loaded
  useEffect(() => {
    if (userData.wallet && userData.wallet.trim() !== '') {
      console.log('__yuki__ User data loaded, fetching followers and following for:', userData.wallet);
      fetchFollowers(userData.wallet);
      fetchFollowing(userData.wallet);
    } else {
      console.log('__yuki__ User data loaded but wallet is undefined or empty:', userData.wallet);
    }
  }, [userData.wallet]);

  // Fetch coins data when userData is loaded to update the count in profile header
  useEffect(() => {
    if (userData._id) {
      console.log('__yuki__ User data loaded, fetching coins created for user ID:', userData._id);
      fetchCoinsData(userData._id);
    }
  }, [userData._id]);

  // Fetch solPrice for CoinBlog components
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const { getSolPriceInUSD } = await import('@/utils/util');
        const price = await getSolPriceInUSD();
        if (price > 0) {
          setSolPrice(price);
        }
      } catch (error) {
        console.error('__yuki__ Error fetching solPrice in profile page:', error);
      }
    };

    fetchSolPrice();
  }, [setSolPrice]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('Copied!');
      successAlert('Copied to clipboard!');
    } catch (err) {
      setCopySuccess('Failed to copy!');
      errorAlert('Failed to copy!');
    }
  };

  const handleFollow = async () => {
    if (!publicKey?.toBase58()) {
      errorAlert('Please connect your wallet first');
      return;
    }

    setFollowLoading(true);
    try {
      console.log('__yuki__ handleFollow: Starting follow/unfollow process');
      console.log('__yuki__ handleFollow: Current user wallet:', publicKey.toBase58());
      console.log('__yuki__ handleFollow: Target user wallet:', userData.wallet);
      console.log('__yuki__ handleFollow: Current isFollowing state:', isFollowing);
      
      if (isFollowing) {
        console.log('__yuki__ handleFollow: Unfollowing user');
        await unfollowUser(publicKey.toBase58(), userData.wallet);
        setIsFollowing(false);
        successAlert('Unfollowed successfully!');
      } else {
        console.log('__yuki__ handleFollow: Following user');
        await followUser(publicKey.toBase58(), userData.wallet);
        setIsFollowing(true);
        successAlert('Followed successfully!');
      }
      
      console.log('__yuki__ handleFollow: Refreshing followers and following data');
      // Refresh followers and following data
      if (userData.wallet && userData.wallet.trim() !== '') {
        await fetchFollowers(userData.wallet);
        await fetchFollowing(userData.wallet);
      } else {
        console.log('__yuki__ handleFollow: Skipping refresh - userData.wallet is undefined or empty');
      }
      
    } catch (error) {
      console.error('Follow/Unfollow error:', error);
      errorAlert(isFollowing ? 'Failed to unfollow' : 'Failed to follow');
    } finally {
      setFollowLoading(false);
    }
  };

  // Avatar upload logic
  const handleAvatarUpload = async (fileUrl: string) => {
    setAvatarLoading(true);
    try {
      const uploadedUrl = await uploadImage(fileUrl);
      if (!uploadedUrl) {
        errorAlert('Failed to upload avatar to IPFS.');
        return;
      }
      const updatedUser = { ...userData, avatar: uploadedUrl };
      // Remove _id before sending to backend
      const { _id, ...userUpdatePayload } = updatedUser;
      if (userData._id) {
        const backendResult = await updateUser(userData._id, userUpdatePayload);
        if (backendResult?.error) {
          errorAlert('Failed to update avatar in backend.');
          return;
        }
      }
      setUserData(updatedUser);
      setUser(updatedUser);
      successAlert('Avatar updated!');
      setAvatarDialogOpen(false);
    } catch (err) {
      errorAlert('Failed to upload avatar.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const isOwnProfile = publicKey?.toBase58() === userData.wallet;

  // Show loading or user not found state
  if (!userData || !userData.wallet) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6 w-full overflow-hidden">
          <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="text-center space-y-4">
                  <h1 className="text-2xl font-bold text-foreground">User Not Found</h1>
                  <p className="text-muted-foreground">
                    The user with ID "{param}" was not found in our database.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This user may not have registered yet or the user ID may be incorrect.
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 overflow-hidden">
      <div className="max-w-4xl mx-auto space-y-6 w-full overflow-hidden">
        {/* Profile Header */}
        <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar Section */}
              <div className="relative">
                {isOwnProfile ? (
                  <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                    <DialogTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="cursor-pointer"
                      >
                        <Avatar className="w-24 h-24 border-4 border-primary/30 shadow-lg">
                          <AvatarImage src={userData.avatar} alt={userData.name} />
                          <AvatarFallback className="text-2xl font-bold bg-primary/10">
                            {userData.name?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>
                    </DialogTrigger>
                    <DialogContent className="border-2 border-primary/30 bg-card max-w-xs w-full">
                      <DialogHeader>
                        <DialogTitle>Change Avatar</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col gap-4 items-center">
                        <ImageUpload
                          header="Select a new avatar image"
                          setFilePreview={setAvatarPreview}
                          setFileUrl={setAvatarPreview}
                          type="image/*"
                        />
                        {avatarPreview && (
                          <img
                            src={avatarPreview}
                            alt="Preview"
                            className="w-24 h-24 rounded-full object-cover border"
                          />
                        )}
                        <Button
                          disabled={avatarLoading || !avatarPreview}
                          onClick={() => avatarPreview && handleAvatarUpload(avatarPreview)}
                          className="w-full"
                        >
                          {avatarLoading ? 'Uploading...' : 'Save Avatar'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Avatar className="w-24 h-24 border-4 border-primary/30 shadow-lg">
                    <AvatarImage src={userData.avatar} alt={userData.name} />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10">
                      {userData.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 text-center sm:text-left space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">@{userData.name}</h1>
                    {isOwnProfile && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setProfileEditModal(true)}
                        className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                      >
                        <HiOutlinePencil className="w-5 h-5 text-primary" />
                      </motion.button>
                    )}
                  </div>
                  
                  {!isOwnProfile && publicKey?.toBase58() && (
                    <Button
                      onClick={handleFollow}
                      disabled={followLoading}
                      variant={isFollowing ? "outline" : "default"}
                      className="flex items-center gap-2"
                    >
                      {followLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : isFollowing ? (
                        <>
                          <LuUserMinus className="w-4 h-4" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <LuUserPlus className="w-4 h-4" />
                          Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Wallet Address */}
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 max-w-md">
                  <code className="text-sm font-mono text-muted-foreground flex-1 truncate">
                    {userData.wallet}
                  </code>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyToClipboard(userData.wallet)}
                    className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <MdContentCopy className="w-4 h-4 text-primary" />
                  </motion.button>
                </div>

                {/* Stats */}
                <div className="flex gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {followers.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Followers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {following.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Following</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {coinsLoading ? (
                        <div className="animate-pulse bg-muted h-8 w-8 rounded"></div>
                      ) : (
                        coins.length
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Coins Created</div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Profile Tabs */}
        <Tabs value={option.toString()} onValueChange={(value) => setOption(parseInt(value))} className="w-full max-w-full overflow-hidden">
          <TabsList className="grid w-full grid-cols-5 bg-muted/50">
            {ProfileMenuList.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id.toString()}
                className="flex items-center gap-2"
              >
                {item.text}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Contents */}
          <div className="mt-6 w-full max-w-full overflow-hidden">
            {/* Coins Held Tab */}
            <TabsContent value="1" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LuUsers className="w-5 h-5" />
                    Coins Held
                  </CardTitle>
                  <CardDescription>
                    Tokens owned by {userData.name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {coinsHeldLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading coins...
                    </div>
                  ) : userCoinsHeld.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No coins held
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {userCoinsHeld.map((coinData, index) => (
                        <motion.div
                          key={coinData.token}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleToRouter(`/trading/${coinData.token}`)}
                          className="cursor-pointer"
                        >
                          <Card className="hover:shadow-lg transition-all duration-300 border-primary/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <img
                                  src={coinData.url || '/assets/images/test-token-bg~.png'}
                                  alt={coinData.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/assets/images/test-token-bg~.png';
                                  }}
                                />
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground">{coinData.name}</h3>
                                  <p className="text-sm text-muted-foreground">{coinData.ticker}</p>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-foreground">
                                    {coinData.balance.toLocaleString()}
                                  </div>
                                  <div className="text-sm text-muted-foreground">tokens</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Followers Tab */}
            <TabsContent value="5" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LuUsers className="w-5 h-5" />
                    Followers ({followers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {followers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No followers yet
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {followers.map((follower, index) => (
                        <motion.div
                          key={follower.wallet}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleToRouter(`/profile/${follower._id}`)}
                          className="cursor-pointer"
                        >
                          <Card className="hover:shadow-lg transition-all duration-300 border-primary/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage src={follower.avatar} alt={follower.name} />
                                  <AvatarFallback className="bg-primary/10">
                                    {follower.name?.charAt(0)?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground">@{follower.name}</h3>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {follower.wallet}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Coins Created Tab */}
            <TabsContent value="4" className="space-y-4 w-full max-w-full overflow-hidden">
              <Card className="w-full max-w-full overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Coins Created ({coins.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="w-full max-w-full overflow-hidden p-4">
                  {coins.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No coins created yet
                    </div>
                  ) : (
                    <div className="grid gap-4 w-full max-w-full overflow-hidden">
                      {coins.map((coin, index) => (
                        <motion.div
                          key={coin.token}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleToRouter(`/trading/${coin.token}`)}
                          className="cursor-pointer w-full max-w-full overflow-hidden"
                        >
                          <CoinBlog coin={coin} componentKey="coin" compact={true} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Following Tab */}
            <TabsContent value="6" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LuUsers className="w-5 h-5" />
                    Following ({following.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {following.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Not following anyone yet
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {following.map((followedUser, index) => (
                        <motion.div
                          key={followedUser.wallet}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleToRouter(`/profile/${followedUser._id}`)}
                          className="cursor-pointer"
                        >
                          <Card className="hover:shadow-lg transition-all duration-300 border-primary/20">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <Avatar className="w-12 h-12">
                                  <AvatarImage src={followedUser.avatar} alt={followedUser.name} />
                                  <AvatarFallback className="bg-primary/10">
                                    {followedUser.name?.charAt(0)?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground">@{followedUser.name}</h3>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {followedUser.wallet}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {profileEditModal && <Modal data={userData} />}
    </div>
  );
}
