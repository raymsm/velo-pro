import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Fuel, Plus, Wallet } from 'lucide-react';

interface FuelLogProps {
  onLog: (amount: number, cost: number) => void;
}

export default function FuelLog({ onLog }: FuelLogProps) {
  const [amount, setAmount] = useState('');
  const [cost, setCost] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && cost) {
      onLog(parseFloat(amount), parseFloat(cost));
      setAmount('');
      setCost('');
    }
  };

  return (
    <Card className="bg-background border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
            <Fuel className="w-5 h-5 text-primary" />
            Refuel Log
        </CardTitle>
        <CardDescription>Keep track of your fuel expenses and consumption</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-xs uppercase font-mono flex items-center gap-2">
                 Amount (L)
              </Label>
              <Input 
                id="amount" 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-muted/50 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost" className="text-xs uppercase font-mono flex items-center gap-2">
                Cost ($)
              </Label>
              <Input 
                id="cost" 
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="bg-muted/50 font-mono"
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest">
            <Plus className="w-4 h-4 mr-2" /> Log Fuel Entry
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
