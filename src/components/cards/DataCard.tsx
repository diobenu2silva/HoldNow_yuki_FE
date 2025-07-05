import { HiOutlinePuzzle } from 'react-icons/hi';
import { TbWorld } from 'react-icons/tb';
import { FaXTwitter } from 'react-icons/fa6';
import { FaTelegramPlane } from 'react-icons/fa';

interface CoinBlogProps {
  text: string;
  data: string | number;
}

export const DataCard: React.FC<CoinBlogProps> = ({ text, data }) => {
  return (
    <div className="w-full flex flex-col justify-center items-center gap-2 py-3 rounded-lg border-2 border-primary/30 bg-card shadow-sm">
      <p className="font-medium text-muted-foreground">{text}</p>
      <p className="font-semibold text-foreground">{data}</p>
    </div>
  );
};
