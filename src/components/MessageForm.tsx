import { msgInfo, userInfo } from '@/utils/types';

interface MessageFormProps {
  msg: msgInfo;
}

export const MessageForm: React.FC<MessageFormProps> = ({ msg }) => {
  return (
    <div className="py-2 flex flex-col">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2 items-center px-1">
          <img
            src={(msg.sender as userInfo)?.avatar || '/assets/images/user-avatar.png'}
            alt="User Avatar"
            className="rounded-full"
            width={32}
            height={32}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/assets/images/user-avatar.png';
            }}
          />
          <div className="text-sm text-gray-300">
            {msg.sender && (msg.sender as userInfo).name}
          </div>
          {msg.time && (
            <div className="text-sm text-gray-300">{msg.time.toString()}</div>
          )}
        </div>
        <div className="flex flex-row w-full border-[1px] border-[#143F72] rounded-lg object-cover overflow-hidden gap-1 items-start justify-start min-h-[100px]">
          {(msg.img !== undefined || (msg.images && msg.images.length > 0)) && (
            <div className="w-[25%] mr-3 h-full">
              {msg.images && msg.images.length > 0 ? (
                // Handle new images array
                msg.images.map((img: string, imgIndex: number) => (
                  <img
                    key={imgIndex}
                    src={img}
                    className="w-full h-full object-contain rounded-lg border-2 border-border bg-card shadow-sm"
                    alt="Message image"
                  />
                ))
              ) : (
                // Handle old single img field
                <img
                  src={msg.img}
                  className="w-full h-full object-contain rounded-lg border-2 border-border bg-card shadow-sm"
                  alt="Message image"
                />
              )}
            </div>
          )}
          <div className="w-full h-full flex flex-col text-white font-semibold py-3 text-sm px-3">
            {msg.msg}
          </div>
        </div>
      </div>
    </div>
  );
};
