import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "../ui/dialog";

interface InitialBuyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (solAmount: number) => void;
  tokenName: string;
  deployCost?: number;
}

const InitialBuyModal: React.FC<InitialBuyModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  tokenName,
  deployCost = 0.02,
}) => {
  const [amount, setAmount] = useState<string>("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full bg-[#181A20] rounded-xl p-6 flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            Choose how many [{tokenName}] you want to buy <span className="text-muted-foreground">(optional)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground text-center">
            tip: it's optional but buying a small amount of coins helps protect your coin from snipers
          </DialogDescription>
        </DialogHeader>
        {/* <div className="flex justify-end w-full">
          <button
            className="text-xs text-primary underline"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            switch to {tokenName}
          </button>
        </div> */}
        <div className="flex items-center bg-muted rounded-lg px-3 py-2">
          <input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.0 (optional)"
            className="flex-1 bg-transparent outline-none text-foreground text-lg"
          />
          <span className="mx-2 text-foreground font-semibold">SOL</span>
          <img src="/assets/images/solana-icon.png" alt="Solana" className="w-4 h-4" />
        </div>
        <button
          className="w-full bg-primary text-primary-foreground rounded-lg py-2 font-semibold text-lg mt-2 hover:bg-primary/90 transition"
          onClick={() => {
            onConfirm(Number(amount) || 0);
            onOpenChange(false);
          }}
          type="button"
        >
          Create coin
        </button>
        {/* <div className="text-xs text-muted-foreground text-center">
          Cost to deploy: ~{deployCost} SOL
        </div> */}
      </DialogContent>
    </Dialog>
  );
};

export default InitialBuyModal;

